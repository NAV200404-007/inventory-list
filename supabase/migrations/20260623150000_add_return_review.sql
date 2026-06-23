alter table public.events
  add column return_reviewed boolean not null default false,
  add column return_reviewed_by uuid references public.profiles(id) on delete set null;

create or replace function public.protect_return_review_fields()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is not null
    and not public.is_employer()
    and (
      new.return_reviewed is distinct from old.return_reviewed
      or new.return_reviewed_by is distinct from old.return_reviewed_by
    )
  then
    raise exception 'Only an employer can review a return report.';
  end if;
  return new;
end;
$$;

create trigger events_protect_return_review
before update on public.events
for each row execute function public.protect_return_review_fields();
