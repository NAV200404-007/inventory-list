drop table if exists public.push_subscriptions;

alter table public.notifications
  drop column if exists push_sent_at;
