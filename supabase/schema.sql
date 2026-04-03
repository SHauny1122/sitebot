create extension if not exists "uuid-ossp";
create extension if not exists vector;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  paystack_plan_id text,
  paystack_plan_code text,
  paystack_customer_code text,
  paystack_subscription_status text,
  paystack_subscription_code text,
  paystack_email_token text,
  paystack_next_billing_date timestamptz,
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists paystack_plan_id text;
alter table public.profiles add column if not exists paystack_plan_code text;
alter table public.profiles add column if not exists paystack_customer_code text;
alter table public.profiles add column if not exists paystack_subscription_status text;
alter table public.profiles add column if not exists paystack_subscription_code text;
alter table public.profiles add column if not exists paystack_email_token text;
alter table public.profiles add column if not exists paystack_next_billing_date timestamptz;

create table if not exists public.bots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  website_url text not null,
  status text not null default 'pending' check (status in ('pending', 'ready', 'failed')),
  button_text text not null default 'Chat',
  button_color text not null default '#0d9488',
  button_style text not null default 'circle' check (button_style in ('circle', 'pill', 'rounded')),
  header_color text not null default '#0d9488',
  widget_title text not null default 'SiteChat',
  welcome_message text not null default 'Hi! How can I help you today?',
  position text not null default 'bottom-right' check (position in ('bottom-right', 'bottom-left')),
  created_at timestamptz not null default now()
);

alter table public.bots add column if not exists button_text text not null default 'Chat';
alter table public.bots add column if not exists button_color text not null default '#0d9488';
alter table public.bots add column if not exists button_style text not null default 'circle' check (button_style in ('circle', 'pill', 'rounded'));
alter table public.bots add column if not exists header_color text not null default '#0d9488';
alter table public.bots add column if not exists widget_title text not null default 'SiteChat';
alter table public.bots add column if not exists welcome_message text not null default 'Hi! How can I help you today?';
alter table public.bots add column if not exists position text not null default 'bottom-right' check (position in ('bottom-right', 'bottom-left'));

create table if not exists public.bot_pages (
  id uuid primary key default gen_random_uuid(),
  bot_id uuid not null references public.bots(id) on delete cascade,
  url text not null,
  title text,
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.bot_chunks (
  id uuid primary key default gen_random_uuid(),
  bot_id uuid not null references public.bots(id) on delete cascade,
  page_id uuid not null references public.bot_pages(id) on delete cascade,
  content text not null,
  embedding vector(1536) not null,
  created_at timestamptz not null default now()
);

create index if not exists bot_chunks_bot_id_idx on public.bot_chunks(bot_id);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  bot_id uuid not null references public.bots(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.message_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month_key text not null,
  message_count integer not null default 0,
  unique (user_id, month_key)
);

create or replace function public.match_bot_chunks(
  in_bot_id uuid,
  query_embedding vector(1536),
  match_count int default 6
)
returns table(
  id uuid,
  content text,
  similarity float
)
language sql
as $$
  select
    c.id,
    c.content,
    1 - (c.embedding <=> query_embedding) as similarity
  from public.bot_chunks c
  where c.bot_id = in_bot_id
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles(user_id, email)
  values (new.id, new.email)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.bots enable row level security;
alter table public.bot_pages enable row level security;
alter table public.bot_chunks enable row level security;
alter table public.chat_messages enable row level security;
alter table public.message_usage enable row level security;

create policy "users read own profile" on public.profiles for select using (auth.uid() = user_id);
create policy "users update own profile" on public.profiles for update using (auth.uid() = user_id);

create policy "users manage own bots" on public.bots for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users read own pages" on public.bot_pages for select using (
  exists (select 1 from public.bots b where b.id = bot_id and b.user_id = auth.uid())
);
create policy "users read own chunks" on public.bot_chunks for select using (
  exists (select 1 from public.bots b where b.id = bot_id and b.user_id = auth.uid())
);
create policy "users read own messages" on public.chat_messages for select using (
  exists (select 1 from public.bots b where b.id = bot_id and b.user_id = auth.uid())
);
create policy "users read own usage" on public.message_usage for select using (auth.uid() = user_id);
