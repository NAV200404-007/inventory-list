-- Keep every shared operational screen current across devices.
alter publication supabase_realtime add table public.inventory_items;
alter publication supabase_realtime add table public.inventory_assets;
alter publication supabase_realtime add table public.event_staff;
alter publication supabase_realtime add table public.event_requirements;
alter publication supabase_realtime add table public.audit_logs;

