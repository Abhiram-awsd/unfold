-- Unfold: images, GitHub projects, appearance options, contact form, resume downloads, analytics.
-- Run once, after 0003_resume_details.sql (SQL editor or `supabase db push`).

-- ---------------------------------------------------------------------------
-- Portfolio columns
-- ---------------------------------------------------------------------------

alter table public.portfolios
  add column if not exists avatar_url text
    check (avatar_url is null or avatar_url ~* '^https://'),
  add column if not exists theme_options jsonb not null default '{}'::jsonb
    check (jsonb_typeof(theme_options) = 'object'),
  add column if not exists contact_enabled boolean not null default true,
  add column if not exists resume_url text
    check (resume_url is null or resume_url ~* '^https://');

grant update (avatar_url, theme_options, contact_enabled, resume_url) on public.portfolios to authenticated;

-- ---------------------------------------------------------------------------
-- Project columns: an image, a link, and repository details for GitHub imports
-- ---------------------------------------------------------------------------

alter table public.projects
  add column if not exists image_url text
    check (image_url is null or image_url ~* '^https://'),
  add column if not exists link_url text
    check (link_url is null or link_url ~* '^https?://'),
  add column if not exists repo text
    check (repo is null or repo ~ '^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$'),
  add column if not exists stars integer
    check (stars is null or stars >= 0),
  add column if not exists language text
    check (language is null or char_length(language) <= 40);

-- One copy of each repository per portfolio.
create unique index if not exists projects_portfolio_repo_idx on public.projects (portfolio_id, lower(repo)) where repo is not null;

-- ---------------------------------------------------------------------------
-- Clicks on public portfolios (projects, links, email, resume). Write-only for visitors.
-- ---------------------------------------------------------------------------

create table if not exists public.portfolio_clicks (
  id            bigint generated always as identity primary key,
  portfolio_id  uuid not null references public.portfolios (id) on delete cascade,
  target        text not null check (char_length(target) between 1 and 300),
  created_at    timestamptz not null default now()
);
create index if not exists portfolio_clicks_portfolio_created_idx on public.portfolio_clicks (portfolio_id, created_at desc);

alter table public.portfolio_clicks enable row level security;

drop policy if exists "portfolio_clicks: record for published" on public.portfolio_clicks;
create policy "portfolio_clicks: record for published" on public.portfolio_clicks
  for insert to anon, authenticated
  with check (public.portfolio_is_published(portfolio_id));

drop policy if exists "portfolio_clicks: read own" on public.portfolio_clicks;
create policy "portfolio_clicks: read own" on public.portfolio_clicks
  for select to authenticated
  using (exists (
    select 1 from public.portfolios p
    where p.id = portfolio_clicks.portfolio_id and p.user_id = (select auth.jwt() ->> 'sub')
  ));

-- ---------------------------------------------------------------------------
-- Contact form messages. Visitors can only send through send_portfolio_message();
-- owners read, mark and delete their own.
-- ---------------------------------------------------------------------------

create table if not exists public.messages (
  id            uuid primary key default gen_random_uuid(),
  portfolio_id  uuid not null references public.portfolios (id) on delete cascade,
  user_id       text not null references public.profiles (id) on delete cascade,
  sender_name   text not null check (char_length(sender_name) between 1 and 80),
  sender_email  text not null check (char_length(sender_email) between 3 and 200),
  body          text not null check (char_length(body) between 1 and 3000),
  sender_hash   text,
  read_at       timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists messages_user_created_idx on public.messages (user_id, created_at desc);
create index if not exists messages_portfolio_hash_created_idx on public.messages (portfolio_id, sender_hash, created_at desc);

alter table public.messages enable row level security;

revoke insert, update on public.messages from anon, authenticated;
grant update (read_at) on public.messages to authenticated;

drop policy if exists "messages: read own" on public.messages;
create policy "messages: read own" on public.messages
  for select to authenticated
  using ((select auth.jwt() ->> 'sub') = user_id);

drop policy if exists "messages: update own" on public.messages;
create policy "messages: update own" on public.messages
  for update to authenticated
  using ((select auth.jwt() ->> 'sub') = user_id)
  with check ((select auth.jwt() ->> 'sub') = user_id);

drop policy if exists "messages: delete own" on public.messages;
create policy "messages: delete own" on public.messages
  for delete to authenticated
  using ((select auth.jwt() ->> 'sub') = user_id);

-- Returns 'ok', 'closed' (no published portfolio with the form on), 'invalid' or 'limited'.
-- p_hash is a salted hash of the sender's IP, computed by the app; it is only used for rate limits.
create or replace function public.send_portfolio_message(
  p_portfolio uuid, p_name text, p_email text, p_message text, p_hash text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner text;
begin
  select p.user_id into v_owner
  from public.portfolios p
  where p.id = p_portfolio and p.published and p.contact_enabled;
  if v_owner is null then
    return 'closed';
  end if;

  p_name := btrim(coalesce(p_name, ''));
  p_email := btrim(coalesce(p_email, ''));
  p_message := btrim(coalesce(p_message, ''));
  if char_length(p_name) not between 1 and 80
     or char_length(p_email) not between 3 and 200
     or p_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
     or char_length(p_message) not between 1 and 3000 then
    return 'invalid';
  end if;

  -- 5 messages an hour from one sender, 50 a day per portfolio.
  if (select count(*) from public.messages m
      where m.portfolio_id = p_portfolio and m.sender_hash = p_hash and m.created_at > now() - interval '1 hour') >= 5
     or (select count(*) from public.messages m
      where m.portfolio_id = p_portfolio and m.created_at > now() - interval '1 day') >= 50 then
    return 'limited';
  end if;

  insert into public.messages (portfolio_id, user_id, sender_name, sender_email, body, sender_hash)
  values (p_portfolio, v_owner, p_name, p_email, p_message, left(p_hash, 128));
  return 'ok';
end;
$$;

grant execute on function public.send_portfolio_message(uuid, text, text, text, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Analytics for the signed-in owner. Runs with the caller's rights, so RLS applies.
-- Days are counted in p_tz (an IANA time zone such as 'Asia/Kolkata').
-- ---------------------------------------------------------------------------

create or replace function public.portfolio_stats(p_days integer default 30, p_tz text default 'UTC')
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with mine as (
    select id from public.portfolios where user_id = (select auth.jwt() ->> 'sub')
  ),
  span as (
    select greatest(1, least(coalesce(p_days, 30), 365)) as days
  ),
  views as (
    select (pv.created_at at time zone p_tz)::date as day, pv.referrer
    from public.page_views pv
    where pv.portfolio_id in (select id from mine)
      and pv.created_at >= now() - make_interval(days => (select days from span))
  ),
  clicks as (
    select pc.target
    from public.portfolio_clicks pc
    where pc.portfolio_id in (select id from mine)
      and pc.created_at >= now() - make_interval(days => (select days from span))
  )
  select jsonb_build_object(
    'total', (select count(*) from views),
    'previous', (
      select count(*) from public.page_views pv
      where pv.portfolio_id in (select id from mine)
        and pv.created_at >= now() - make_interval(days => 2 * (select days from span))
        and pv.created_at < now() - make_interval(days => (select days from span))
    ),
    'daily', coalesce((
      select jsonb_agg(jsonb_build_object('day', d.day, 'views', d.n) order by d.day)
      from (select day, count(*) as n from views group by day) d
    ), '[]'::jsonb),
    'referrers', coalesce((
      select jsonb_agg(jsonb_build_object('source', r.source, 'views', r.n) order by r.n desc, r.source)
      from (
        select coalesce(referrer, '') as source, count(*) as n
        from views group by 1 order by 2 desc, 1 limit 10
      ) r
    ), '[]'::jsonb),
    'clicks', coalesce((
      select jsonb_agg(jsonb_build_object('target', c.target, 'clicks', c.n) order by c.n desc, c.target)
      from (
        select target, count(*) as n from clicks group by 1 order by 2 desc, 1 limit 50
      ) c
    ), '[]'::jsonb)
  );
$$;

revoke execute on function public.portfolio_stats(integer, text) from public, anon;
grant execute on function public.portfolio_stats(integer, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Public read now includes the avatar, appearance, contact form, resume download and project media.
-- ---------------------------------------------------------------------------

create or replace function public.get_public_portfolio(site text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p.id,
    'slug', p.slug,
    'theme', p.theme,
    'show_badge', p.show_badge,
    'name', p.name,
    'headline', p.headline,
    'bio', p.bio,
    'location', p.location,
    'email', case when p.show_email then p.email end,
    'skills', to_jsonb(p.skills),
    'links', p.links,
    'education', p.education,
    'avatar_url', p.avatar_url,
    'theme_options', p.theme_options,
    'contact', p.contact_enabled,
    'resume_url', p.resume_url,
    'projects', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', pr.id,
        'title', pr.title,
        'organization', pr.organization,
        'period', pr.period,
        'summary', pr.summary,
        'story', pr.story,
        'image_url', pr.image_url,
        'link_url', pr.link_url,
        'stars', pr.stars,
        'language', pr.language
      ) order by pr.position, pr.created_at)
      from public.projects pr
      where pr.portfolio_id = p.id and pr.approved  -- drafts never go public
    ), '[]'::jsonb)
  )
  from public.portfolios p
  where p.published
    and (p.slug = lower(site) or p.custom_domain = lower(site))
  limit 1;
$$;

-- ---------------------------------------------------------------------------
-- Storage: public bucket for avatars, project images and resume downloads,
-- one folder per user ('<clerk user id>/<file>').
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media', 'media', true, 10485760,
  array[
    'image/png', 'image/jpeg', 'image/webp', 'image/gif',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ]
)
on conflict (id) do nothing;

drop policy if exists "media bucket: read own" on storage.objects;
create policy "media bucket: read own" on storage.objects
  for select to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = (select auth.jwt() ->> 'sub'));

drop policy if exists "media bucket: upload own" on storage.objects;
create policy "media bucket: upload own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = (select auth.jwt() ->> 'sub'));

drop policy if exists "media bucket: delete own" on storage.objects;
create policy "media bucket: delete own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = (select auth.jwt() ->> 'sub'));
