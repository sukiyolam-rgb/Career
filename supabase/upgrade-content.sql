-- 執行一次：保留現有崗位及服務員授權，新增崗位類別、培訓和政策。
begin;
alter table public.jobs add column if not exists industry text not null default '' check (length(industry) <= 100);
alter table public.jobs add column if not exists job_type text not null default '' check (length(job_type) <= 100);
alter table public.jobs add column if not exists role_category text not null default '' check (length(role_category) <= 100);

create or replace function public.valid_resource_labels(values_array text[]) returns boolean
language sql immutable set search_path = '' as $$
 select values_array is not null and cardinality(values_array) between 1 and 30
 and not exists(select 1 from unnest(values_array) value where value is null or length(trim(value)) not between 1 and 100);
$$;
create table if not exists public.trainings (
 id text primary key check (length(id) between 1 and 100),
 title text not null check (length(trim(title)) between 1 and 200),
 organizers text[] not null check (public.valid_resource_labels(organizers)),
 registration_start date not null,
 registration_end date check (registration_end is null or registration_end >= registration_start),
 url text not null check (url ~* '^https?://[^[:space:]]+$' and length(url) <= 2000),
 industries text[] not null check (public.valid_resource_labels(industries)),
 roles text[] not null check (public.valid_resource_labels(roles))
);
create table if not exists public.policies (
 id text primary key check (length(id) between 1 and 100),
 title text not null check (length(trim(title)) between 1 and 200),
 category text not null check (category in ('gba','hengqin','macau')),
 summary text not null default '' check (length(summary) <= 3000),
 published date not null,
 url text not null check (url ~* '^https?://[^[:space:]]+$' and length(url) <= 2000)
);
alter table public.trainings enable row level security;
alter table public.policies enable row level security;
revoke all on public.trainings, public.policies from anon, authenticated;
grant select on public.trainings, public.policies to anon, authenticated;
grant insert, update, delete on public.trainings, public.policies to authenticated;
-- 沿用既有 is_staff()，不新增任何帳號權限。
drop policy if exists trainings_public_read on public.trainings;
create policy trainings_public_read on public.trainings for select to anon, authenticated using (true);
drop policy if exists trainings_staff_insert on public.trainings;
create policy trainings_staff_insert on public.trainings for insert to authenticated with check (public.is_staff());
drop policy if exists trainings_staff_update on public.trainings;
create policy trainings_staff_update on public.trainings for update to authenticated using (public.is_staff()) with check (public.is_staff());
drop policy if exists trainings_staff_delete on public.trainings;
create policy trainings_staff_delete on public.trainings for delete to authenticated using (public.is_staff());
drop policy if exists policies_public_read on public.policies;
create policy policies_public_read on public.policies for select to anon, authenticated using (true);
drop policy if exists policies_staff_insert on public.policies;
create policy policies_staff_insert on public.policies for insert to authenticated with check (public.is_staff());
drop policy if exists policies_staff_update on public.policies;
create policy policies_staff_update on public.policies for update to authenticated using (public.is_staff()) with check (public.is_staff());
drop policy if exists policies_staff_delete on public.policies;
create policy policies_staff_delete on public.policies for delete to authenticated using (public.is_staff());

-- JSON 備份匯入也保留新崗位類別；舊備份缺少時留空。
create or replace function public.replace_jobs(items jsonb) returns void
language plpgsql security invoker set search_path = '' as $$
begin
 if not public.is_staff() then raise exception '沒有管理權限'; end if;
 if items is null or jsonb_typeof(items) <> 'array' then raise exception '備份必須為陣列'; end if;
 if jsonb_array_length(items) > 2000 then raise exception '備份最多 2000 個崗位'; end if;
 lock table public.jobs in share row exclusive mode;
 delete from public.jobs;
 insert into public.jobs (id,title,company,location,industry,job_type,role_category,salary,education,published,deadline,url)
 select id,title,company,location,coalesce(industry,''),coalesce(job_type,''),coalesce(role_category,''),salary,education,published,deadline,url
 from jsonb_to_recordset(items) as x(id text,title text,company text,location text,industry text,job_type text,role_category text,salary text,education text,published date,deadline date,url text);
end;
$$;
revoke all on function public.replace_jobs(jsonb) from public, anon;
grant execute on function public.replace_jobs(jsonb) to authenticated;
notify pgrst, 'reload schema';
commit;
