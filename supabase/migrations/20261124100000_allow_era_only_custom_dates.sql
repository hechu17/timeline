alter table public.characters
  drop constraint characters_birth_custom_date_valid,
  add constraint characters_birth_custom_date_valid check (
    (birth_era_id is null and birth_year is null and birth_month is null and birth_day is null)
    or birth_era_id is not null
  ),
  drop constraint characters_death_custom_date_valid,
  add constraint characters_death_custom_date_valid check (
    (death_era_id is null and death_year is null and death_month is null and death_day is null)
    or death_era_id is not null
  );

alter table public.timeline_events
  drop constraint timeline_events_custom_date_valid,
  add constraint timeline_events_custom_date_valid check (
    (event_era_id is null and event_year is null and event_month is null and event_day is null)
    or event_era_id is not null
  );
