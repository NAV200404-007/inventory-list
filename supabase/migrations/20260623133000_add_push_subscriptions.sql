create table public.push_subscriptions (
  endpoint text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  p256dh text not null,
  auth text not null,
  user_agent text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index push_subscriptions_user_idx on public.push_subscriptions(user_id);

create trigger push_subscriptions_set_updated_at
before update on public.push_subscriptions
for each row execute function public.set_updated_at();

alter table public.push_subscriptions enable row level security;

create policy push_subscriptions_own_read
  on public.push_subscriptions for select to authenticated
  using (user_id = auth.uid());

create policy push_subscriptions_own_insert
  on public.push_subscriptions for insert to authenticated
  with check (user_id = auth.uid());

create policy push_subscriptions_own_update
  on public.push_subscriptions for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy push_subscriptions_own_delete
  on public.push_subscriptions for delete to authenticated
  using (user_id = auth.uid());

alter table public.notifications
  add column push_sent_at timestamptz;
