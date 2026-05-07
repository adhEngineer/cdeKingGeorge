alter table public.orders
  add column if not exists is_paid boolean not null default false,
  add column if not exists notes text not null default '';

grant update (is_paid, notes) on table public.orders to authenticated;

drop policy if exists "orders admin update" on public.orders;
create policy "orders admin update"
on public.orders for update
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));
