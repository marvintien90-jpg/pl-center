-- 損益分析中心第二階段：網頁上傳損益表、自動分類建檔、待確認審核、專案燈號設定
-- 只新增資料表、函式與權限；既有資料不刪不改（科目對應表由既有明細初始化）。

-- 1. 科目對應：每個客戶自己的「原始科目 → 標準科目」，建檔時自動學習
create table if not exists public.pl_account_map (
  client_name  text not null,
  account_name text not null,
  section      text not null check (section in ('營業收入','營業成本','營業費用')),
  category     text not null,
  updated_at   timestamptz not null default now(),
  primary key (client_name, account_name)
);
insert into public.pl_account_map (client_name, account_name, section, category)
select distinct on (s.client_name, li.account_name) s.client_name, li.account_name, li.section, li.category
from public.pl_line_items li join public.pl_statements s on s.id = li.statement_id
order by s.client_name, li.account_name, s.period_month desc
on conflict do nothing;
alter table public.pl_account_map enable row level security;
create policy pl_account_map_select on public.pl_account_map for select to authenticated
  using (pl_private.is_admin() or (pl_private.is_active() and exists (
    select 1 from public.pl_access a where a.user_id = (select auth.uid()) and a.client_name = pl_account_map.client_name)));

-- 2. 上傳紀錄：每一次上傳都留一筆，含讀出的明細、核對結果與處理狀態
create table if not exists public.pl_uploads (
  id            bigint generated always as identity primary key,
  user_id       uuid not null default auth.uid() references public.pl_profiles(user_id) on delete cascade,
  uploader      text not null default '',
  client_name   text not null,
  brand_name    text not null,
  store_name    text not null,
  unit_type     text not null check (unit_type in ('門市','總部')),
  period_month  date not null,
  file_name     text not null default '',
  file_path     text,
  items         jsonb not null,
  stated        jsonb not null default '{}'::jsonb,
  computed      jsonb not null default '{}'::jsonb,
  reasons       text[] not null default '{}',
  status        text not null default 'review' check (status in ('imported','review','rejected')),
  statement_id  bigint references public.pl_statements(id) on delete set null,
  note          text not null default '',
  created_at    timestamptz not null default now(),
  decided_by    uuid,
  decided_at    timestamptz
);
create index if not exists pl_uploads_status_idx on public.pl_uploads (status, created_at desc);
alter table public.pl_uploads enable row level security;
create policy pl_uploads_select on public.pl_uploads for select to authenticated
  using (user_id = (select auth.uid()) or pl_private.is_admin());

-- 3. 專案燈號設定：管理員可新增與調整
create policy pl_brand_settings_insert on public.pl_brand_settings for insert to authenticated
  with check (pl_private.is_admin());
create policy pl_brand_settings_update on public.pl_brand_settings for update to authenticated
  using (pl_private.is_admin()) with check (pl_private.is_admin());

-- 4. 原始檔保存：私人儲存區，每人只能放進自己的資料夾；管理員可讀全部
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pl-uploads', 'pl-uploads', false, 10485760, array[
  'application/pdf','text/csv','application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/octet-stream'])
on conflict (id) do nothing;
create policy pl_uploads_obj_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'pl-uploads' and pl_private.is_active()
    and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy pl_uploads_obj_select on storage.objects for select to authenticated
  using (bucket_id = 'pl-uploads' and ((storage.foldername(name))[1] = (select auth.uid())::text or pl_private.is_admin()));

-- 5. 把一筆上傳寫進正式損益（只由下面兩個函式呼叫）
create or replace function pl_private.apply_upload(uid bigint)
returns bigint language plpgsql security definer set search_path = '' as $$
declare u public.pl_uploads; sid bigint;
begin
  select * into u from public.pl_uploads where id = uid for update;
  if u.id is null then raise exception 'PL_UPLOAD_NOT_FOUND'; end if;
  insert into public.pl_statements (client_name, brand_name, store_name, unit_type, period_month, source_file,
      stated_revenue, stated_cogs, stated_opex, stated_net)
  values (u.client_name, u.brand_name, u.store_name, u.unit_type, u.period_month, nullif(u.file_name,''),
      coalesce((u.stated->>'R')::numeric, (u.computed->>'R')::numeric),
      coalesce((u.stated->>'C')::numeric, (u.computed->>'C')::numeric),
      coalesce((u.stated->>'O')::numeric, (u.computed->>'O')::numeric),
      coalesce((u.stated->>'N')::numeric, (u.computed->>'N')::numeric))
  on conflict (client_name, brand_name, store_name, period_month) do update set
      unit_type = excluded.unit_type, source_file = excluded.source_file, source_url = null, printed_date = null,
      stated_revenue = excluded.stated_revenue, stated_cogs = excluded.stated_cogs,
      stated_opex = excluded.stated_opex, stated_net = excluded.stated_net
  returning id into sid;
  delete from public.pl_line_items where statement_id = sid;
  insert into public.pl_line_items (statement_id, section, category, account_name, amount, sort_order)
  select sid, e->>'s', e->>'c', e->>'n', (e->>'a')::numeric, (o - 1)::int
  from jsonb_array_elements(u.items) with ordinality as t(e, o);
  insert into public.pl_account_map (client_name, account_name, section, category, updated_at)
  select distinct on (e->>'n') u.client_name, e->>'n', e->>'s', e->>'c', now()
  from jsonb_array_elements(u.items) e
  on conflict (client_name, account_name) do update set section = excluded.section, category = excluded.category, updated_at = now();
  insert into public.pl_brand_settings (client_name, brand_name, is_hq, biz_type, thresholds, util_variable_pct, label, annual_accounts)
  values (u.client_name, u.brand_name, u.unit_type = '總部', 0, '{}'::jsonb, 50, '', '{}')
  on conflict do nothing;
  update public.pl_uploads set status = 'imported', statement_id = sid where id = uid;
  return sid;
end $$;

-- 檢查並整理送進來的明細；回傳 [整理後明細, 系統自己加總的數字]
create or replace function pl_private.clean_items(p jsonb)
returns jsonb language plpgsql immutable set search_path = '' as $$
declare e jsonb; out jsonb := '[]'::jsonb; r numeric := 0; c numeric := 0; o numeric := 0; a numeric;
begin
  if jsonb_typeof(p) <> 'array' or jsonb_array_length(p) < 1 or jsonb_array_length(p) > 500 then raise exception 'PL_BAD_ITEMS'; end if;
  for e in select * from jsonb_array_elements(p) loop
    if coalesce(e->>'s','') not in ('營業收入','營業成本','營業費用') then raise exception 'PL_BAD_SECTION'; end if;
    if length(trim(coalesce(e->>'n',''))) not between 1 and 80 or length(trim(coalesce(e->>'c',''))) not between 1 and 40 then raise exception 'PL_BAD_NAME'; end if;
    a := (e->>'a')::numeric;
    if a is null or abs(a) >= 1e11 then raise exception 'PL_BAD_AMOUNT'; end if;
    out := out || jsonb_build_array(jsonb_build_object('s', e->>'s', 'c', trim(e->>'c'), 'n', trim(e->>'n'), 'a', a, 'k', coalesce(e->>'k','')));
    if e->>'s' = '營業收入' then r := r + a; elsif e->>'s' = '營業成本' then c := c + a; else o := o + a; end if;
  end loop;
  return jsonb_build_array(out, jsonb_build_object('R', r, 'C', c, 'O', o, 'N', r - c - o));
end $$;

-- 6. 上傳：業主（有「可以交資料」權限）或管理員呼叫。核對無誤就直接建檔，否則進待確認
create or replace function public.pl_submit_upload(p jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare me public.pl_profiles; adm boolean := pl_private.is_admin(); cl text := trim(coalesce(p->>'client_name',''));
  br text := trim(coalesce(p->>'brand_name','')); st text := coalesce(nullif(trim(coalesce(p->>'store_name','')),''),'本店');
  ut text := coalesce(nullif(p->>'unit_type',''),'門市'); pm date; ci jsonb; it jsonb; comp jsonb; sd jsonb := '{}'::jsonb;
  rs text[] := '{}'; k text; uid bigint; st_out text;
begin
  select * into me from public.pl_profiles where user_id = (select auth.uid());
  if me.user_id is null or not pl_private.is_active() then raise exception 'PL_NOT_ACTIVE'; end if;
  if length(cl) not between 1 and 60 or length(br) not between 1 and 60 or length(st) > 60 or ut not in ('門市','總部') then raise exception 'PL_BAD_UNIT'; end if;
  if not adm and (me.access <> 'edit' or not pl_private.can_read(cl, br, st)) then raise exception 'PL_NO_UPLOAD_RIGHT'; end if;
  begin pm := date_trunc('month', (p->>'period_month')::date)::date; exception when others then raise exception 'PL_BAD_MONTH'; end;
  if pm is null or pm < date '2000-01-01' or pm > (now() at time zone 'Asia/Taipei')::date then raise exception 'PL_BAD_MONTH'; end if;
  ci := pl_private.clean_items(p->'items'); it := ci->0; comp := ci->1;
  foreach k in array array['R','C','O','N'] loop
    if jsonb_typeof(p->'stated'->k) = 'number' then
      sd := sd || jsonb_build_object(k, (p->'stated'->>k)::numeric);
      if abs((p->'stated'->>k)::numeric - (comp->>k)::numeric) > 0.5 then rs := rs || ('mismatch_' || k); end if;
    end if;
  end loop;
  if sd = '{}'::jsonb then rs := rs || 'no_totals'::text; end if;
  if exists (select 1 from jsonb_array_elements(it) e where e->>'k' = 'guess') then rs := rs || 'unknown_accounts'::text; end if;
  if exists (select 1 from public.pl_statements s where s.client_name = cl and s.brand_name = br and s.store_name = st and s.period_month = pm)
     and not (adm and coalesce((p->>'replace')::boolean, false)) then rs := rs || 'month_exists'::text; end if;
  if coalesce((p->>'name_mismatch')::boolean, false) then rs := rs || 'name_mismatch'::text; end if;
  if not adm and not exists (select 1 from public.pl_statements s where s.client_name = cl and s.brand_name = br and s.store_name = st) then
    rs := rs || 'new_store'::text; end if;
  insert into public.pl_uploads (user_id, uploader, client_name, brand_name, store_name, unit_type, period_month, file_name, file_path, items, stated, computed, reasons)
  values (me.user_id, me.email, cl, br, st, ut, pm, left(coalesce(p->>'file_name',''),200), nullif(left(coalesce(p->>'file_path',''),300),''), it, sd, comp, rs)
  returning id into uid;
  if rs <@ array['no_totals'] then
    perform pl_private.apply_upload(uid); st_out := 'imported';
  else st_out := 'review'; end if;
  if not adm then
    begin
      perform pl_private.send_mail('upload', 'marvintien90@gmail.com',
        case when st_out = 'imported' then '業主上傳損益表已自動建檔：' else '業主上傳損益表待你確認：' end || br || ' ' || st || ' ' || to_char(pm, 'YYYY-MM'),
        '<p>' || pl_private.esc(me.email) || ' 上傳了 ' || pl_private.esc(br || '・' || st) || ' ' || to_char(pm, 'YYYY-MM') || ' 的損益表。</p><p>'
        || case when st_out = 'imported' then '核對無誤，已自動建檔，儀表板已更新。' else '需要你確認後才會建檔。' end
        || '</p><p><a href="https://marvintien90-jpg.github.io/pl-center/#review">前往上傳審核</a></p>');
    exception when others then null; end;
  end if;
  return jsonb_build_object('id', uid, 'status', st_out, 'reasons', to_jsonb(rs));
end $$;

-- 7. 審核：管理員確認建檔（可一併修正科目分類）或退回
create or replace function public.pl_review_upload(upload_id bigint, act text, new_items jsonb default null, note text default '')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare u public.pl_uploads; ci jsonb;
begin
  if not pl_private.is_admin() then raise exception 'PL_ADMIN_ONLY'; end if;
  select * into u from public.pl_uploads where id = upload_id for update;
  if u.id is null or u.status <> 'review' then raise exception 'PL_NOT_PENDING'; end if;
  if act = 'reject' then
    update public.pl_uploads set status = 'rejected', note = left(coalesce(pl_review_upload.note,''),500), decided_by = (select auth.uid()), decided_at = now() where id = upload_id;
    return jsonb_build_object('id', upload_id, 'status', 'rejected');
  elsif act = 'approve' then
    if new_items is not null then
      ci := pl_private.clean_items(new_items);
      update public.pl_uploads set items = ci->0, computed = ci->1 where id = upload_id;
    end if;
    update public.pl_uploads set note = left(coalesce(pl_review_upload.note,''),500), decided_by = (select auth.uid()), decided_at = now() where id = upload_id;
    perform pl_private.apply_upload(upload_id);
    return jsonb_build_object('id', upload_id, 'status', 'imported');
  end if;
  raise exception 'PL_BAD_ACTION';
end $$;

revoke all on function pl_private.apply_upload(bigint) from public;
revoke all on function pl_private.clean_items(jsonb) from public;
revoke all on function public.pl_submit_upload(jsonb) from public, anon;
revoke all on function public.pl_review_upload(bigint, text, jsonb, text) from public, anon;
grant execute on function public.pl_submit_upload(jsonb) to authenticated;
grant execute on function public.pl_review_upload(bigint, text, jsonb, text) to authenticated;
