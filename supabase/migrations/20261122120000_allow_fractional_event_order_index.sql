alter table public.timeline_events
  alter column order_index type numeric
  using order_index::numeric;
