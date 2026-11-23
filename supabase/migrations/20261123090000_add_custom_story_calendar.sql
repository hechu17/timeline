alter table public.stories
  add column calendar_mode text not null default 'gregorian'
    check (calendar_mode in ('gregorian', 'custom')),
  add column custom_eras jsonb not null
    default '[{"id":"default-era","name":"故事纪年","start_year":1}]'::jsonb
    check (jsonb_typeof(custom_eras) = 'array');

alter table public.characters
  add column birth_era_id text,
  add column birth_year integer check (birth_year is null or birth_year >= 1),
  add column birth_month integer check (birth_month is null or birth_month between 1 and 12),
  add column birth_day integer check (birth_day is null or birth_day between 1 and 31),
  add column death_era_id text,
  add column death_year integer check (death_year is null or death_year >= 1),
  add column death_month integer check (death_month is null or death_month between 1 and 12),
  add column death_day integer check (death_day is null or death_day between 1 and 31),
  add constraint characters_birth_custom_date_valid check (
    (birth_era_id is null and birth_year is null and birth_month is null and birth_day is null)
    or (birth_era_id is not null and birth_year is not null)
  ),
  add constraint characters_death_custom_date_valid check (
    (death_era_id is null and death_year is null and death_month is null and death_day is null)
    or (death_era_id is not null and death_year is not null)
  );

alter table public.timeline_events
  add column event_era_id text,
  add column event_year integer check (event_year is null or event_year >= 1),
  add column event_month integer check (event_month is null or event_month between 1 and 12),
  add column event_day integer check (event_day is null or event_day between 1 and 31),
  add constraint timeline_events_custom_date_valid check (
    (event_era_id is null and event_year is null and event_month is null and event_day is null)
    or (event_era_id is not null and event_year is not null)
  );
