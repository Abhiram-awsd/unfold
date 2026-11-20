-- Unfold: initial schema
--
-- Clerk is the auth provider. Supabase accepts Clerk session tokens (Clerk is set up
-- as a third-party auth provider), so inside policies auth.jwt()->>'sub' is the Clerk
-- user id, a text value like 'user_2abc...'. That is why every user_id column is text.
--
-- Run with the Supabase CLI (`supabase db push`) or paste into the SQL editor.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id          text primary key default (auth.jwt() ->> 'sub'),
  email       text,
  plan        text not null default 'free' check (plan in ('free', 'pro', 'teams')),
  created_at  timestamptz not null default now()
);

create table public.resumes (
  id          uuid primary key default gen_random_uuid(),
  user_id     text not null default (auth.jwt() ->> 'sub') references public.profiles (id) on delete cascade,
  file_path   text not null,
  file_name   text not null,
  parsed      jsonb not null,
  created_at  timestamptz not null default now()
);
create index resumes_user_created_idx on public.resumes (user_id, created_at desc);

create table public.portfolios (
  id             uuid primary key default gen_random_uuid(),
  user_id        text not null unique default (auth.jwt() ->> 'sub') references public.profiles (id) on delete cascade,
  slug           text not null unique
                 check (slug ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$')
                 check (slug not in ('www', 'app', 'api', 'admin', 'dashboard', 'mail', 'blog', 'help', 'docs', 'status', 'assets', 'static')),
  custom_domain  text unique,
  theme          text not null default 'graphite' check (theme in ('graphite', 'broadsheet', 'studio')),
  published      boolean not null default false,
  show_badge     boolean not null default true,
  name           text not null default '',
  headline       text not null default '',
  bio            text not null default '',
  location       text,
  email          text,
  show_email     boolean not null default true,
  skills         text[] not null default '{}',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table public.projects (
  id            uuid primary key default gen_random_uuid(),
  portfolio_id  uuid not null references public.portfolios (id) on delete cascade,
  user_id       text not null default (auth.jwt() ->> 'sub') references public.profiles (id) on delete cascade,
  position      integer not null default 0,
  title         text not null,
  organization  text,
  period        text,
  summary       text not null default '',
  story         text not null default '',
  approved      boolean not null default false,
  created_at    timestamptz not null default now()
);
create index projects_portfolio_position_idx on public.projects (portfolio_id, position);

create table public.page_views (
  id            bigint generated always as identity primary key,
  portfolio_id  uuid not null references public.portfolios (id) on delete cascade,
  path          text not null default '/',
  referrer      text,
  created_at    timestamptz not null default now()
);
create index page_views_portfolio_created_idx on public.page_views (portfolio_id, created_at desc);

-- Keep portfolios.updated_at current.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger portfolios_touch_updated_at
  before update on public.portfolios
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Column privileges
-- Plan, custom domain and the badge are paid features. Signed-in users can't
-- change them directly; the server does it with the service role (e.g. from a
-- Stripe webhook after checking the plan).
-- ---------------------------------------------------------------------------

revoke update on public.profiles from anon, authenticated;
grant update (email) on public.profiles to authenticated;

revoke update on public.portfolios from anon, authenticated;
grant update (slug, theme, published, name, headline, bio, location, email, show_email, skills)
  on public.portfolios to authenticated;

-- ---------------------------------------------------------------------------
-- Public read access
-- These run with the owner's rights (security definer) so visitors never get
-- direct select access to the portfolios table, and private columns stay private.
-- ---------------------------------------------------------------------------

create or replace function public.portfolio_is_published(pid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.portfolios where id = pid and published);
$$;

-- site is a slug ('maya') or a custom domain ('mayaiyer.com'). Returns null when
-- there is no published portfolio for it.
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
    'projects', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', pr.id,
        'title', pr.title,
        'organization', pr.organization,
        'period', pr.period,
        'summary', pr.summary,
        'story', pr.story
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

grant execute on function public.portfolio_is_published(uuid) to anon, authenticated;
grant execute on function public.get_public_portfolio(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

alter table public.profiles   enable row level security;
alter table public.resumes    enable row level security;
alter table public.portfolios enable row level security;
alter table public.projects   enable row level security;
alter table public.page_views enable row level security;

-- profiles: you can see and create only your own row, and only on the free plan.
create policy "profiles: read own" on public.profiles
  for select to authenticated
  using ((select auth.jwt() ->> 'sub') = id);

create policy "profiles: create own" on public.profiles
  for insert to authenticated
  with check ((select auth.jwt() ->> 'sub') = id and plan = 'free');

create policy "profiles: update own" on public.profiles
  for update to authenticated
  using ((select auth.jwt() ->> 'sub') = id)
  with check ((select auth.jwt() ->> 'sub') = id);

-- resumes: private to their owner.
create policy "resumes: read own" on public.resumes
  for select to authenticated
  using ((select auth.jwt() ->> 'sub') = user_id);

create policy "resumes: create own" on public.resumes
  for insert to authenticated
  with check ((select auth.jwt() ->> 'sub') = user_id);

create policy "resumes: delete own" on public.resumes
  for delete to authenticated
  using ((select auth.jwt() ->> 'sub') = user_id);

-- portfolios: owners manage their own. The public reads published portfolios only
-- through get_public_portfolio() (defined above), which hides the email unless show_email is on.
create policy "portfolios: read own" on public.portfolios
  for select to authenticated
  using ((select auth.jwt() ->> 'sub') = user_id);

create policy "portfolios: create own" on public.portfolios
  for insert to authenticated
  with check ((select auth.jwt() ->> 'sub') = user_id and custom_domain is null and show_badge);

create policy "portfolios: update own" on public.portfolios
  for update to authenticated
  using ((select auth.jwt() ->> 'sub') = user_id)
  with check ((select auth.jwt() ->> 'sub') = user_id);

create policy "portfolios: delete own" on public.portfolios
  for delete to authenticated
  using ((select auth.jwt() ->> 'sub') = user_id);

-- projects: owners manage their own (public reads go through get_public_portfolio()).
create policy "projects: manage own" on public.projects
  for all to authenticated
  using ((select auth.jwt() ->> 'sub') = user_id)
  with check (
    (select auth.jwt() ->> 'sub') = user_id
    and exists (
      select 1 from public.portfolios p
      where p.id = projects.portfolio_id and p.user_id = (select auth.jwt() ->> 'sub')
    )
  );

-- page_views: anyone can record a view of a published portfolio; only the owner can read them.
create policy "page_views: record for published" on public.page_views
  for insert to anon, authenticated
  with check (public.portfolio_is_published(portfolio_id));

create policy "page_views: read own" on public.page_views
  for select to authenticated
  using (exists (
    select 1 from public.portfolios p
    where p.id = page_views.portfolio_id and p.user_id = (select auth.jwt() ->> 'sub')
  ));

-- ---------------------------------------------------------------------------
-- Storage: private bucket for uploaded resumes, one folder per user
-- (object names look like '<clerk user id>/<uuid>.pdf').
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'resumes', 'resumes', false, 10485760,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ]
)
on conflict (id) do nothing;

create policy "resumes bucket: read own" on storage.objects
  for select to authenticated
  using (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.jwt() ->> 'sub'));

create policy "resumes bucket: upload own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.jwt() ->> 'sub'));

create policy "resumes bucket: delete own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.jwt() ->> 'sub'));
