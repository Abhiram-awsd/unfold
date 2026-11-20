-- Unfold: production hardening. Run once, after 0004.

-- Custom domains are stored lowercase, as a bare hostname.
alter table public.portfolios drop constraint if exists portfolios_custom_domain_format;
alter table public.portfolios add constraint portfolios_custom_domain_format
  check (custom_domain is null or custom_domain ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$');

-- Owners can delete their own account row; everything else cascades from it.
grant delete on public.profiles to authenticated;
drop policy if exists "profiles: delete own" on public.profiles;
create policy "profiles: delete own" on public.profiles
  for delete to authenticated
  using ((select auth.jwt() ->> 'sub') = id);

-- Owners may list and delete their own resume files (needed to empty storage on account deletion).
drop policy if exists "resumes bucket: delete own" on storage.objects;
create policy "resumes bucket: delete own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'resumes' and (storage.foldername(name))[1] = (select auth.jwt() ->> 'sub'));

-- Upload rate limits count recent rows per user.
create index if not exists resumes_user_created_idx on public.resumes (user_id, created_at desc);
