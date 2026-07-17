-- Ocean Peak Logistics tracking schema
-- Run this in the Supabase SQL editor.
-- After running this SQL, create an admin user in Supabase:
-- Authentication > Users > Add user
-- Then use that email/password on the admin portal.

create extension if not exists pgcrypto;

create table if not exists public.shipments (
  id uuid primary key default gen_random_uuid(),
  tracking_number text not null unique,
  customer text not null default '',
  service text not null default 'Security Logistics',
  origin text not null default '',
  destination text not null default '',
  weight text not null default '',
  value_class text not null default 'Controlled',
  security text not null default '',
  status text not null default 'Shipment Created',
  eta date,
  signed_by text not null default '',
  origin_service_area text not null default '',
  destination_service_area text not null default '',
  piece_count text not null default '1',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.shipment_events (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.shipments(id) on delete cascade,
  event_date date not null,
  event_time time not null,
  description text not null default '',
  location text not null default '',
  piece text not null default '1 Piece',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists shipment_events_shipment_id_idx
  on public.shipment_events (shipment_id);

create index if not exists shipment_events_order_idx
  on public.shipment_events (shipment_id, event_date desc, event_time desc, sort_order desc);

create index if not exists shipments_tracking_number_idx
  on public.shipments (tracking_number);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_shipments_updated_at on public.shipments;
create trigger set_shipments_updated_at
before update on public.shipments
for each row
execute function public.set_updated_at();

drop trigger if exists set_shipment_events_updated_at on public.shipment_events;
create trigger set_shipment_events_updated_at
before update on public.shipment_events
for each row
execute function public.set_updated_at();

alter table public.shipments enable row level security;
alter table public.shipment_events enable row level security;

drop policy if exists "Public can read tracking shipments" on public.shipments;
create policy "Public can read tracking shipments"
on public.shipments
for select
to anon, authenticated
using (true);

drop policy if exists "Authenticated admin can create shipments" on public.shipments;
create policy "Authenticated admin can create shipments"
on public.shipments
for insert
to authenticated
with check (true);

drop policy if exists "Authenticated admin can update shipments" on public.shipments;
create policy "Authenticated admin can update shipments"
on public.shipments
for update
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated admin can delete shipments" on public.shipments;
create policy "Authenticated admin can delete shipments"
on public.shipments
for delete
to authenticated
using (true);

drop policy if exists "Public can read tracking events" on public.shipment_events;
create policy "Public can read tracking events"
on public.shipment_events
for select
to anon, authenticated
using (true);

drop policy if exists "Authenticated admin can create tracking events" on public.shipment_events;
create policy "Authenticated admin can create tracking events"
on public.shipment_events
for insert
to authenticated
with check (true);

drop policy if exists "Authenticated admin can update tracking events" on public.shipment_events;
create policy "Authenticated admin can update tracking events"
on public.shipment_events
for update
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated admin can delete tracking events" on public.shipment_events;
create policy "Authenticated admin can delete tracking events"
on public.shipment_events
for delete
to authenticated
using (true);

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'shipments'
      and column_name = 'scans'
  ) then
    insert into public.shipment_events (
      shipment_id,
      event_date,
      event_time,
      description,
      location,
      piece,
      sort_order
    )
    select
      s.id,
      coalesce(nullif(scan.value->>'date', '')::date, current_date),
      coalesce(nullif(scan.value->>'time', '')::time, localtime(0)),
      coalesce(scan.value->>'description', ''),
      coalesce(scan.value->>'location', ''),
      coalesce(scan.value->>'piece', s.piece_count || ' Piece'),
      greatest(0, 1000 - scan.ordinality::integer)
    from public.shipments s
    cross join lateral jsonb_array_elements(s.scans) with ordinality as scan(value, ordinality)
    where not exists (
      select 1
      from public.shipment_events existing
      where existing.shipment_id = s.id
        and existing.event_date = coalesce(nullif(scan.value->>'date', '')::date, current_date)
        and existing.event_time = coalesce(nullif(scan.value->>'time', '')::time, localtime(0))
        and existing.description = coalesce(scan.value->>'description', '')
    );

    alter table public.shipments drop column scans;
  end if;
end;
$$;

insert into public.shipments (
  tracking_number,
  customer,
  service,
  origin,
  destination,
  weight,
  value_class,
  security,
  status,
  eta,
  signed_by,
  origin_service_area,
  destination_service_area,
  piece_count
) values
(
  'OPL-9472-6813',
  'Aurum Vault Partners',
  'Precious Minerals Logistics',
  'Reno, NV',
  'New York, NY',
  '42 kg',
  'High Value',
  'Dual-custody armored route',
  'In Transit',
  '2026-06-29',
  '',
  'RENO - UNITED STATES',
  'NEW YORK - UNITED STATES',
  '1'
),
(
  'OPL-1280-4439',
  'Northline Medical Systems',
  'Security Logistics',
  'Chicago, IL',
  'Miami, FL',
  '18 kg',
  'Restricted Access',
  'Tamper-evident case with live exception alerts',
  'Processing',
  '2026-06-28',
  '',
  'CHICAGO - UNITED STATES',
  'MIAMI - UNITED STATES',
  '1'
)
on conflict (tracking_number) do nothing;

insert into public.shipment_events (shipment_id, event_date, event_time, description, location, piece, sort_order)
select s.id, e.event_date::date, e.event_time::time, e.description, e.location, e.piece, e.sort_order
from public.shipments s
join (
  values
    ('OPL-9472-6813', '2026-06-26', '15:30', 'Departed secure facility', 'IN TRANSIT', '1 Piece', 3),
    ('OPL-9472-6813', '2026-06-26', '11:45', 'Security screening complete', 'LAS VEGAS AIRSIDE VAULT', '1 Piece', 2),
    ('OPL-9472-6813', '2026-06-26', '08:10', 'Shipment accepted', 'RENO SECURE HUB', '1 Piece', 1),
    ('OPL-1280-4439', '2026-06-26', '09:10', 'Documentation reviewed', 'CHICAGO SECURE HUB', '1 Piece', 2),
    ('OPL-1280-4439', '2026-06-26', '07:20', 'Shipment created', 'CHICAGO CONTROL CENTER', '1 Piece', 1)
) as e(tracking_number, event_date, event_time, description, location, piece, sort_order)
on s.tracking_number = e.tracking_number
where not exists (
  select 1
  from public.shipment_events existing
  where existing.shipment_id = s.id
    and existing.event_date = e.event_date::date
    and existing.event_time = e.event_time::time
    and existing.description = e.description
);

notify pgrst, 'reload schema';
