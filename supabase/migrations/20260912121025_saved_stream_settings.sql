alter table public.tv_scene_templates
  add column settings jsonb
  check (settings is null or (jsonb_typeof(settings) = 'object' and
    jsonb_typeof(settings->'scenes') is not distinct from 'array'));
