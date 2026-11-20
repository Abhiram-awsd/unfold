-- Unfold: links and education from resumes, plus the Developer template.
-- Run once, after 0002_templates.sql.

alter table public.portfolios
  add column if not exists links jsonb not null default '[]'::jsonb
    check (jsonb_typeof(links) = 'array'),
  add column if not exists education jsonb not null default '[]'::jsonb
    check (jsonb_typeof(education) = 'array');

-- Owners may edit the new columns (the paid columns stay server-only).
grant update (links, education) on public.portfolios to authenticated;

alter table public.portfolios drop constraint if exists portfolios_theme_check;
alter table public.portfolios
  add constraint portfolios_theme_check
  check (theme in ('minimal', 'dark', 'interactive', 'creative', 'modern', 'developer'));

-- Public read now includes links and education.
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
