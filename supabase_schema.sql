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
  goal_weight           numeric(6,2),
  height_cm             numeric(5,2),
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
  water_target_ml   numeric(8,2) default 2500,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);
create index if not exists daily_targets_user_effective_from_idx on public.daily_targets(user_id, effective_from desc);
create index if not exists daily_targets_user_type_effective_from_idx on public.daily_targets(user_id, target_type, effective_from desc);

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
create index if not exists meal_templates_user_created_at_idx on public.meal_templates(user_id, created_at desc);

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
  meal_type         text not null default 'snack', -- breakfast | snack | lunch | pre-workout | post-workout | dinner
  food_item_id      uuid references public.food_items(id),
  meal_template_id  uuid references public.meal_templates(id),
  confidence        numeric(4,3),
  notes             text,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);
create index if not exists meal_entries_meal_date_idx on public.meal_entries(meal_date);
create index if not exists meal_entries_user_meal_date_idx on public.meal_entries(user_id, meal_date desc);

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
  water_total_ml        numeric(8,2) default 0,
  validation_flags      jsonb,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now(),
  unique(user_id, date)
);
create index if not exists daily_rollups_user_date_idx on public.daily_rollups(user_id, date desc);

-- ─── weight_logs ─────────────────────────────────────────────────────────────
create table if not exists public.weight_logs (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  date          date not null,
  weight_value  numeric(6,2) not null,
  unit          text not null default 'kg',
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  unique(user_id, date)
);
create index if not exists weight_logs_user_date_idx on public.weight_logs(user_id, date desc);

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

drop trigger if exists trg_weight_logs_updated_at on public.weight_logs;
create trigger trg_weight_logs_updated_at
  before update on public.weight_logs
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
alter table public.weight_logs   enable row level security;
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

drop policy if exists "own weight logs" on public.weight_logs;
create policy "own weight logs"     on public.weight_logs    for all using (auth.uid() = user_id);

drop policy if exists "own parse audits" on public.parse_audit;
create policy "own parse audits"   on public.parse_audit    for all using (auth.uid() = user_id);


-- ─── exercises ─────────────────────────────────────────────────────────────
create table if not exists public.exercises (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid references auth.users(id) on delete cascade, -- can be null for 'global' ones
  name          text not null,
  category      text default 'Uncategorized',
  equipment     text default 'None',
  muscle_group_primary   text,
  muscle_group_secondary text,
  base_recovery_hours    integer default 48,
  detail        text,
  youtube_url   text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);
create index if not exists exercises_user_name_idx on public.exercises(user_id, name);
alter table public.exercises enable row level security;
drop policy if exists "own or global exercises" on public.exercises;
create policy "own or global exercises" on public.exercises for all using (auth.uid() = user_id or user_id is null);

-- ─── workout_sessions ───────────────────────────────────────────────────────
create table if not exists public.workout_sessions (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  session_date  date not null,
  total_volume  numeric(10,2) default 0,
  notes         text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);
create index if not exists workout_sessions_user_session_date_idx on public.workout_sessions(user_id, session_date desc);
alter table public.workout_sessions enable row level security;
drop policy if exists "own workouts" on public.workout_sessions;
create policy "own workouts" on public.workout_sessions for all using (auth.uid() = user_id);

-- ─── workout_sets ──────────────────────────────────────────────────────────
create table if not exists public.workout_sets (
  id            uuid primary key default uuid_generate_v4(),
  session_id    uuid not null references public.workout_sessions(id) on delete cascade,
  exercise_name text not null,
  set_index     integer not null,
  reps          integer not null,
  weight        numeric(8,2) not null,
  created_at    timestamptz default now()
);
create index if not exists workout_sets_session_id_idx on public.workout_sets(session_id);
create index if not exists workout_sets_exercise_name_idx on public.workout_sets(exercise_name);
alter table public.workout_sets enable row level security;
drop policy if exists "own workout sets" on public.workout_sets;
create policy "own workout sets" on public.workout_sets for all using (
  exists (select 1 from public.workout_sessions s where s.id = session_id and s.user_id = auth.uid())
);

-- ─── supplement_stack ───────────────────────────────────────────────────────
create table if not exists public.supplement_stack (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  dosage        text,
  is_active     boolean not null default true,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);
create index if not exists supplement_stack_user_active_idx on public.supplement_stack(user_id, is_active);
alter table public.supplement_stack enable row level security;
drop policy if exists "own supplement stack" on public.supplement_stack;
create policy "own supplement stack" on public.supplement_stack for all using (auth.uid() = user_id);

-- ─── supplement_logs ────────────────────────────────────────────────────────
create table if not exists public.supplement_logs (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  date          date not null,
  supplement_id uuid not null references public.supplement_stack(id) on delete cascade,
  taken         boolean not null default false,
  created_at    timestamptz default now(),
  unique(user_id, date, supplement_id)
);
create index if not exists supplement_logs_user_date_idx on public.supplement_logs(user_id, date desc);
alter table public.supplement_logs enable row level security;
drop policy if exists "own supplement logs" on public.supplement_logs;
create policy "own supplement logs" on public.supplement_logs for all using (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════
-- missing app tables and policy fixes
-- ═══════════════════════════════════════════════════════════════════

-- water_logs is used by the app for hydration, dashboard, and analytics
create table if not exists public.water_logs (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  date          date not null,
  amount_ml     integer not null default 0,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  unique(user_id, date)
);
create index if not exists water_logs_user_date_idx on public.water_logs(user_id, date desc);

alter table public.water_logs enable row level security;

drop trigger if exists trg_water_logs_updated_at on public.water_logs;
create trigger trg_water_logs_updated_at
  before update on public.water_logs
  for each row execute function public.update_updated_at_column();

drop trigger if exists trg_exercises_updated_at on public.exercises;
create trigger trg_exercises_updated_at
  before update on public.exercises
  for each row execute function public.update_updated_at_column();

drop trigger if exists trg_workout_sessions_updated_at on public.workout_sessions;
create trigger trg_workout_sessions_updated_at
  before update on public.workout_sessions
  for each row execute function public.update_updated_at_column();

drop trigger if exists trg_supplement_stack_updated_at on public.supplement_stack;
create trigger trg_supplement_stack_updated_at
  before update on public.supplement_stack
  for each row execute function public.update_updated_at_column();

drop policy if exists "own water logs" on public.water_logs;
create policy "own water logs" on public.water_logs
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Recreate these with explicit WITH CHECK so inserts and upserts work correctly
drop policy if exists "own profiles" on public.profiles;
create policy "own profiles" on public.profiles
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "own targets" on public.daily_targets;
create policy "own targets" on public.daily_targets
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "own food items" on public.food_items;
create policy "own food items" on public.food_items
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "own templates" on public.meal_templates;
create policy "own templates" on public.meal_templates
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "own meals" on public.meal_entries;
create policy "own meals" on public.meal_entries
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "own rollups" on public.daily_rollups;
create policy "own rollups" on public.daily_rollups
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "own weight logs" on public.weight_logs;
create policy "own weight logs" on public.weight_logs
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "own parse audits" on public.parse_audit;
create policy "own parse audits" on public.parse_audit
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "own or global exercises" on public.exercises;
create policy "own or global exercises" on public.exercises
  for all
  using (auth.uid() = user_id or user_id is null)
  with check (auth.uid() = user_id);

drop policy if exists "own workouts" on public.workout_sessions;
create policy "own workouts" on public.workout_sessions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "own workout sets" on public.workout_sets;
create policy "own workout sets" on public.workout_sets
  for all
  using (
    exists (
      select 1
      from public.workout_sessions s
      where s.id = session_id and s.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.workout_sessions s
      where s.id = session_id and s.user_id = auth.uid()
    )
  );

drop policy if exists "own supplement stack" on public.supplement_stack;
create policy "own supplement stack" on public.supplement_stack
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "own supplement logs" on public.supplement_logs;
create policy "own supplement logs" on public.supplement_logs
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
