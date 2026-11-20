-- Unfold: three premium templates (Atelier, Prism, Mono). Run once, after 0005.
alter table public.portfolios drop constraint if exists portfolios_theme_check;
alter table public.portfolios
  add constraint portfolios_theme_check
  check (theme in ('minimal', 'dark', 'interactive', 'creative', 'modern', 'developer', 'atelier', 'prism', 'mono'));
