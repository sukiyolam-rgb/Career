-- 在 Supabase SQL Editor 執行。只存公開招聘資料，不存青年主檔或個案。
begin;

create table if not exists public.staff_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.staff_admins enable row level security;
revoke all on public.staff_admins from anon, authenticated;
grant select on public.staff_admins to authenticated;
drop policy if exists staff_read_self on public.staff_admins;
create policy staff_read_self on public.staff_admins for select to authenticated using (user_id = auth.uid());

-- 用明確固定的搜尋路徑，避免遞迴 RLS。此函式只能判斷目前登入者。
create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.staff_admins where user_id = auth.uid());
$$;
revoke all on function public.is_staff() from public, anon;
grant execute on function public.is_staff() to authenticated;

create table if not exists public.jobs (
  id text primary key check (length(id) between 1 and 100),
  title text not null check (length(trim(title)) between 1 and 200),
  company text not null check (length(trim(company)) between 1 and 200),
  location text not null check (length(trim(location)) between 1 and 200),
  salary text not null check (length(trim(salary)) between 1 and 200),
  education text not null check (length(trim(education)) between 1 and 200),
  published date not null,
  deadline date check (deadline is null or deadline >= published),
  url text not null check (url ~* '^https?://[^[:space:]]+$' and length(url) <= 2000)
);
alter table public.jobs enable row level security;
revoke all on public.jobs from anon, authenticated;
grant select on public.jobs to anon, authenticated;
grant insert, update, delete on public.jobs to authenticated;
drop policy if exists jobs_public_read on public.jobs;
create policy jobs_public_read on public.jobs for select to anon, authenticated using (true);
drop policy if exists jobs_staff_insert on public.jobs;
create policy jobs_staff_insert on public.jobs for insert to authenticated with check (public.is_staff());
drop policy if exists jobs_staff_update on public.jobs;
create policy jobs_staff_update on public.jobs for update to authenticated using (public.is_staff()) with check (public.is_staff());
drop policy if exists jobs_staff_delete on public.jobs;
create policy jobs_staff_delete on public.jobs for delete to authenticated using (public.is_staff());

-- 備份取代為單一交易；任何一筆資料不合規，全部回滾。
create or replace function public.replace_jobs(items jsonb) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if not public.is_staff() then raise exception '沒有管理權限'; end if;
  if items is null or jsonb_typeof(items) <> 'array' then raise exception '備份必須為陣列'; end if;
  if jsonb_array_length(items) > 2000 then raise exception '備份最多 2000 個崗位'; end if;
  lock table public.jobs in share row exclusive mode;
  delete from public.jobs;
  insert into public.jobs (id,title,company,location,salary,education,published,deadline,url)
  select id,title,company,location,salary,education,published,deadline,url
  from jsonb_to_recordset(items) as x(id text,title text,company text,location text,salary text,education text,published date,deadline date,url text);
end;
$$;
revoke all on function public.replace_jobs(jsonb) from public, anon;
grant execute on function public.replace_jobs(jsonb) to authenticated;

commit;

-- 建立服務員帳號後，用其 User UID 取代下方字串，單獨執行：
-- insert into public.staff_admins(user_id) values ('服務員的 User UID') on conflict do nothing;
