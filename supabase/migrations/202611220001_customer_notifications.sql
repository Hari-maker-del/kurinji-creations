create table if not exists public.store_notification_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.store_orders(id) on delete cascade,
  event_type text not null,
  recipient_email text,
  delivery_status text not null default 'pending' check (delivery_status in ('pending','sent','skipped','failed')),
  provider_message_id text,
  error_message text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  unique(order_id, event_type)
);
alter table public.store_notification_events enable row level security;
revoke all on public.store_notification_events from anon, authenticated;
grant all on public.store_notification_events to service_role;
create index if not exists store_notification_events_order_idx
  on public.store_notification_events(order_id, created_at desc);
