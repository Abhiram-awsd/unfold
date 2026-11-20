-- Unfold: five free portfolio templates replace the original three themes.
--   graphite → dark, broadsheet → minimal, studio → creative
-- Run once, after 0001_init.sql (SQL editor or `supabase db push`).

alter table public.portfolios drop constraint if exists portfolios_theme_check;

update public.portfolios
set theme = case theme
  when 'graphite' then 'dark'
  when 'broadsheet' then 'minimal'
  when 'studio' then 'creative'
  else theme
end
where theme in ('graphite', 'broadsheet', 'studio');

alter table public.portfolios alter column theme set default 'minimal';

alter table public.portfolios
  add constraint portfolios_theme_check
  check (theme in ('minimal', 'dark', 'interactive', 'creative', 'modern'));
