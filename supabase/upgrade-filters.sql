-- 已完成舊版 Supabase 設定的專案，只需執行此檔一次。
-- 不會刪除崗位或服務員授權；分類留空，之後在後台補填。
begin;
-- 相容已存在的舊資料表：保留舊資料，不猜測分類。
alter table public.jobs add column if not exists industry text not null default '' check (length(industry) <= 100);
alter table public.jobs add column if not exists job_type text not null default '' check (length(job_type) <= 100);
create or replace function public.replace_jobs(items jsonb) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if not public.is_staff() then raise exception '沒有管理權限'; end if;
  if items is null or jsonb_typeof(items) <> 'array' then raise exception '備份必須為陣列'; end if;
  if jsonb_array_length(items) > 2000 then raise exception '備份最多 2000 個崗位'; end if;
  lock table public.jobs in share row exclusive mode;
  delete from public.jobs;
  insert into public.jobs (id,title,company,location,industry,job_type,salary,education,published,deadline,url)
  select id,title,company,location,coalesce(industry,''),coalesce(job_type,''),salary,education,published,deadline,url
  from jsonb_to_recordset(items) as x(id text,title text,company text,location text,industry text,job_type text,salary text,education text,published date,deadline date,url text);
end;
$$;
revoke all on function public.replace_jobs(jsonb) from public, anon;
grant execute on function public.replace_jobs(jsonb) to authenticated;

notify pgrst, 'reload schema';
commit;
