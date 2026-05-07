create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  parent_name text not null default '',
  student_name text not null default '',
  class_group text not null default '',
  role text not null default 'parent' check (role in ('parent', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  student_name text not null,
  class_group text not null,
  parent_name text not null,
  order_date date not null default current_date,
  signature_name text not null,
  status text not null default 'submitted',
  is_paid boolean not null default false,
  notes text not null default '',
  created_at timestamptz not null default now()
);

grant update (is_paid, notes) on table public.orders to authenticated;

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_type text not null check (product_type in ('short_sleeve', 'long_sleeve')),
  shirt_size text not null,
  quantity_set integer not null default 0 check (quantity_set >= 0),
  quantity_piece integer not null default 0 check (quantity_piece >= 0)
);

create table if not exists public.order_files (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin(check_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = check_user_id and role = 'admin'
  );
$$;

alter table public.profiles enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_files enable row level security;

drop policy if exists "profiles read own or admin" on public.profiles;
create policy "profiles read own or admin"
on public.profiles for select
using (auth.uid() = id or public.is_admin(auth.uid()));

drop policy if exists "profiles insert own" on public.profiles;
create policy "profiles insert own"
on public.profiles for insert
with check (auth.uid() = id);

drop policy if exists "profiles update own or admin" on public.profiles;
create policy "profiles update own or admin"
on public.profiles for update
using (auth.uid() = id or public.is_admin(auth.uid()))
with check (auth.uid() = id or public.is_admin(auth.uid()));

drop policy if exists "orders read own or admin" on public.orders;
create policy "orders read own or admin"
on public.orders for select
using (auth.uid() = user_id or public.is_admin(auth.uid()));

drop policy if exists "orders insert own" on public.orders;
create policy "orders insert own"
on public.orders for insert
with check (auth.uid() = user_id);

drop policy if exists "orders admin update" on public.orders;
create policy "orders admin update"
on public.orders for update
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "order items read own or admin" on public.order_items;
create policy "order items read own or admin"
on public.order_items for select
using (
  exists (
    select 1 from public.orders
    where orders.id = order_items.order_id
      and (orders.user_id = auth.uid() or public.is_admin(auth.uid()))
  )
);

drop policy if exists "order items insert own" on public.order_items;
create policy "order items insert own"
on public.order_items for insert
with check (
  exists (
    select 1 from public.orders
    where orders.id = order_items.order_id
      and orders.user_id = auth.uid()
  )
);

drop policy if exists "order files read own or admin" on public.order_files;
create policy "order files read own or admin"
on public.order_files for select
using (
  exists (
    select 1 from public.orders
    where orders.id = order_files.order_id
      and (orders.user_id = auth.uid() or public.is_admin(auth.uid()))
  )
);

drop policy if exists "order files insert own" on public.order_files;
create policy "order files insert own"
on public.order_files for insert
with check (
  exists (
    select 1 from public.orders
    where orders.id = order_files.order_id
      and orders.user_id = auth.uid()
  )
);

insert into storage.buckets (id, name, public)
values ('order-pdfs', 'order-pdfs', false)
on conflict (id) do nothing;

drop policy if exists "pdf read own or admin" on storage.objects;
create policy "pdf read own or admin"
on storage.objects for select
using (
  bucket_id = 'order-pdfs'
  and (
    owner = auth.uid()
    or public.is_admin(auth.uid())
  )
);

drop policy if exists "pdf upload own folder" on storage.objects;
create policy "pdf upload own folder"
on storage.objects for insert
with check (
  bucket_id = 'order-pdfs'
  and owner = auth.uid()
);
