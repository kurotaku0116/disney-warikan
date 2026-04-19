create extension if not exists "pgcrypto";

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_date date,
  created_at timestamptz not null default now()
);

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  sort_order int not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  paid_by_member_id uuid not null references public.members(id) on delete restrict,
  amount int not null check (amount > 0),
  category text not null check (category in ('食事', '交通', 'グッズ', 'その他')),
  memo text,
  created_at timestamptz not null default now()
);

create table if not exists public.expense_participants (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade
);

create index if not exists idx_members_event_id on public.members(event_id);
create index if not exists idx_expenses_event_id on public.expenses(event_id);
create index if not exists idx_expense_participants_expense_id on public.expense_participants(expense_id);
create index if not exists idx_expense_participants_member_id on public.expense_participants(member_id);

alter table public.events enable row level security;
alter table public.members enable row level security;
alter table public.expenses enable row level security;
alter table public.expense_participants enable row level security;

create policy "public read events" on public.events for select using (true);
create policy "public insert events" on public.events for insert with check (true);

create policy "public read members" on public.members for select using (true);
create policy "public insert members" on public.members for insert with check (true);

create policy "public read expenses" on public.expenses for select using (true);
create policy "public insert expenses" on public.expenses for insert with check (true);

create policy "public read expense_participants" on public.expense_participants for select using (true);
create policy "public insert expense_participants" on public.expense_participants for insert with check (true);
