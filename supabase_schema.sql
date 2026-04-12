-- ═══════════════════════════════════════════════════════════════════
-- MORSEL — Supabase SQL Schema
-- Paste this entire script into: Supabase Dashboard → SQL Editor → New query
-- ═══════════════════════════════════════════════════════════════════

-- Extension
create extension if not exists "uuid-ossp";

-- ─── profiles ────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id                    uuid primary key default uuid_generate_v4(),
  user_id               uuid unique not null references auth.users(id) on delete cascade,
  display_name          text not null,
  onboarding_completed  boolean not null default false,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

-- ─── daily_targets ───────────────────────────────────────────────────────────
create table if not exists public.daily_targets (
  id                uuid primary key default uuid_generate_v4(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  target_type       text not null default 'default',  -- default | training | rest | custom
  calories_target   numeric(8,2),
  protein_target_g  numeric(8,2),
  carbs_target_g    numeric(8,2),
  fat_target_g      numeric(8,2),
  effective_from    date not null,
  effective_to      date,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

-- ─── food_items ──────────────────────────────────────────────────────────────
create table if not exists public.food_items (
  id                  uuid primary key default uuid_generate_v4(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  canonical_name      text not null,
  normalized_name     text not null,
  aliases             jsonb,
  serving_description text not null,
  serving_value       numeric(8,2),
  serving_unit        text,
  calories            numeric(8,2) not null,
  protein_g           numeric(8,2) not null,
  carbs_g             numeric(8,2) not null,
  fat_g               numeric(8,2) not null,
  source_type         text not null default 'ai',   -- ai | manual
  confidence          numeric(4,3),
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);
create index if not exists food_items_normalized_name_idx on public.food_items(normalized_name);

-- ─── meal_templates ──────────────────────────────────────────────────────────
create table if not exists public.meal_templates (
  id                  uuid primary key default uuid_generate_v4(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  template_name       text not null,
  normalized_name     text not null,
  description         text,
  total_calories      numeric(8,2) not null,
  total_protein_g     numeric(8,2) not null,
  total_carbs_g       numeric(8,2) not null,
  total_fat_g         numeric(8,2) not null,
  ingredient_snapshot jsonb not null,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);
create index if not exists meal_templates_normalized_name_idx on public.meal_templates(normalized_name);

-- ─── meal_entries ────────────────────────────────────────────────────────────
create table if not exists public.meal_entries (
  id                uuid primary key default uuid_generate_v4(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  meal_name         text not null,
  entry_text_raw    text not null,
  normalized_text   text,
  logged_at         timestamptz not null,
  meal_date         date not null,
  calories          numeric(8,2) not null,
  protein_g         numeric(8,2) not null,
  carbs_g           numeric(8,2) not null,
  fat_g             numeric(8,2) not null,
  source_type       text not null,  -- ai | db | template | manual
  food_item_id      uuid references public.food_items(id),
  meal_template_id  uuid references public.meal_templates(id),
  confidence        numeric(4,3),
  notes             text,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);
create index if not exists meal_entries_meal_date_idx on public.meal_entries(meal_date);

-- ─── daily_rollups ───────────────────────────────────────────────────────────
create table if not exists public.daily_rollups (
  id                    uuid primary key default uuid_generate_v4(),
  user_id               uuid not null references auth.users(id) on delete cascade,
  date                  date not null,
  calories_total        numeric(8,2) not null default 0,
  protein_total_g       numeric(8,2) not null default 0,
  carbs_total_g         numeric(8,2) not null default 0,
  fat_total_g           numeric(8,2) not null default 0,
  calories_target       numeric(8,2),
  protein_target_g      numeric(8,2),
  adherence_score       numeric(5,2),
  hit_calorie_target    boolean,
  hit_protein_target    boolean,
  validation_flags      jsonb,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now(),
  unique(user_id, date)
);

-- ─── weight_logs ─────────────────────────────────────────────────────────────
create table if not exists public.weights (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  date          date not null,
  weight_value  numeric(6,2) not null,
  unit          text not null default 'kg',
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  unique(user_id, date)
);

-- ─── parse_audit ─────────────────────────────────────────────────────────────
create table if not exists public.parse_audit (
  id                      uuid primary key default uuid_generate_v4(),
  user_id                 uuid not null references auth.users(id) on delete cascade,
  raw_input               text not null,
  normalized_input        text,
  ai_model                text,
  ai_request_tokens       int,
  ai_response_tokens      int,
  ai_response_raw         text,
  validation_result       jsonb,
  resolved_food_item_id   uuid references public.food_items(id),
  resolved_template_id    uuid references public.meal_templates(id),
  created_at              timestamptz default now()
);

-- ═══════════════════════════════════════════════════════════════════
-- auto-update updated_at trigger
-- ═══════════════════════════════════════════════════════════════════
create or replace function public.update_updated_at_column()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Triggers (Conditional check isn't standard SQL but we'll provide the statements)
-- Note: If these already exist, Supabase will error. 
-- We recommend dropping them first or running them individually.

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at_column();

drop trigger if exists trg_daily_targets_updated_at on public.daily_targets;
create trigger trg_daily_targets_updated_at
  before update on public.daily_targets
  for each row execute function public.update_updated_at_column();

drop trigger if exists trg_food_items_updated_at on public.food_items;
create trigger trg_food_items_updated_at
  before update on public.food_items
  for each row execute function public.update_updated_at_column();

drop trigger if exists trg_meal_templates_updated_at on public.meal_templates;
create trigger trg_meal_templates_updated_at
  before update on public.meal_templates
  for each row execute function public.update_updated_at_column();

drop trigger if exists trg_meal_entries_updated_at on public.meal_entries;
create trigger trg_meal_entries_updated_at
  before update on public.meal_entries
  for each row execute function public.update_updated_at_column();

drop trigger if exists trg_daily_rollups_updated_at on public.daily_rollups;
create trigger trg_daily_rollups_updated_at
  before update on public.daily_rollups
  for each row execute function public.update_updated_at_column();

drop trigger if exists trg_weights_updated_at on public.weights;
create trigger trg_weights_updated_at
  before update on public.weights
  for each row execute function public.update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════════
-- Row Level Security
-- ═══════════════════════════════════════════════════════════════════
alter table public.profiles       enable row level security;
alter table public.daily_targets  enable row level security;
alter table public.food_items     enable row level security;
alter table public.meal_templates enable row level security;
alter table public.meal_entries   enable row level security;
alter table public.daily_rollups  enable row level security;
alter table public.weights        enable row level security;
alter table public.parse_audit    enable row level security;

-- Users see only their own data (Using 'if not exists' style via drop if you need to rerun)
drop policy if exists "own profiles" on public.profiles;
create policy "own profiles"       on public.profiles       for all using (auth.uid() = user_id);

drop policy if exists "own targets" on public.daily_targets;
create policy "own targets"        on public.daily_targets  for all using (auth.uid() = user_id);

drop policy if exists "own food items" on public.food_items;
create policy "own food items"     on public.food_items     for all using (auth.uid() = user_id);

drop policy if exists "own templates" on public.meal_templates;
create policy "own templates"      on public.meal_templates for all using (auth.uid() = user_id);

drop policy if exists "own meals" on public.meal_entries;
create policy "own meals"          on public.meal_entries   for all using (auth.uid() = user_id);

drop policy if exists "own rollups" on public.daily_rollups;
create policy "own rollups"        on public.daily_rollups  for all using (auth.uid() = user_id);

drop policy if exists "own weights" on public.weights;
create policy "own weights"        on public.weights        for all using (auth.uid() = user_id);

drop policy if exists "own parse audits" on public.parse_audit;
create policy "own parse audits"   on public.parse_audit    for all using (auth.uid() = user_id);
