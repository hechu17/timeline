create table public.stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 120),
  summary text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create table public.characters (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null,
  user_id uuid not null,
  name text not null check (char_length(trim(name)) between 1 and 100),
  role text not null default '',
  birth_date date,
  death_date date,
  color text not null default '#648073' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, story_id, user_id),
  foreign key (story_id, user_id) references public.stories(id, user_id) on delete cascade
);

create table public.timeline_events (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null,
  user_id uuid not null,
  title text not null check (char_length(trim(title)) between 1 and 160),
  event_date date,
  date_label text not null default '',
  date_color text not null default '#92734f' check (date_color ~ '^#[0-9A-Fa-f]{6}$'),
  order_index integer not null default 0,
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, story_id, user_id),
  foreign key (story_id, user_id) references public.stories(id, user_id) on delete cascade
);

create table public.event_characters (
  story_id uuid not null,
  user_id uuid not null,
  timeline_event_id uuid not null,
  character_id uuid not null,
  primary key (timeline_event_id, character_id),
  foreign key (timeline_event_id, story_id, user_id)
    references public.timeline_events(id, story_id, user_id) on delete cascade,
  foreign key (character_id, story_id, user_id)
    references public.characters(id, story_id, user_id) on delete cascade
);

create table public.relationships (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null,
  user_id uuid not null,
  source_character_id uuid not null,
  target_character_id uuid not null,
  relationship_type text not null default '其他',
  start_label text not null default '',
  end_label text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (source_character_id <> target_character_id),
  foreign key (story_id, user_id) references public.stories(id, user_id) on delete cascade,
  foreign key (source_character_id, story_id, user_id)
    references public.characters(id, story_id, user_id) on delete cascade,
  foreign key (target_character_id, story_id, user_id)
    references public.characters(id, story_id, user_id) on delete cascade
);

create index characters_story_order on public.characters(story_id, created_at);
create index timeline_events_story_order on public.timeline_events(story_id, order_index, event_date);
create index event_characters_story on public.event_characters(story_id, timeline_event_id);
create index relationships_story on public.relationships(story_id, created_at);

alter table public.stories enable row level security;
alter table public.characters enable row level security;
alter table public.timeline_events enable row level security;
alter table public.event_characters enable row level security;
alter table public.relationships enable row level security;

grant select, insert, update, delete on public.stories to authenticated;
grant select, insert, update, delete on public.characters to authenticated;
grant select, insert, update, delete on public.timeline_events to authenticated;
grant select, insert, update, delete on public.event_characters to authenticated;
grant select, insert, update, delete on public.relationships to authenticated;

create policy "Users manage their own stories" on public.stories
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users manage their own characters" on public.characters
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users manage their own timeline events" on public.timeline_events
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users manage their own event character links" on public.event_characters
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users manage their own relationships" on public.relationships
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger stories_set_updated_at before update on public.stories
  for each row execute function public.set_updated_at();
create trigger characters_set_updated_at before update on public.characters
  for each row execute function public.set_updated_at();
create trigger timeline_events_set_updated_at before update on public.timeline_events
  for each row execute function public.set_updated_at();
create trigger relationships_set_updated_at before update on public.relationships
  for each row execute function public.set_updated_at();

do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    execute 'create publication supabase_realtime';
  end if;
end;
$$;

alter publication supabase_realtime add table
  public.stories,
  public.characters,
  public.timeline_events,
  public.event_characters,
  public.relationships;
