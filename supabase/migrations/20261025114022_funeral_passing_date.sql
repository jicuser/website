begin;
set local lock_timeout = '3s';
set local statement_timeout = '30s';
do $migration$
declare
  form public.custom_forms;
  previous public.custom_form_versions;
  field jsonb;
  definition jsonb;
  next_version integer;
begin
  select * into form from public.custom_forms where slug = 'funeral-enquiry' for update;
  if form.id is null then return; end if;
  select * into previous from public.custom_form_versions
    where form_id = form.id and version = form.published_version;
  if previous.form_id is null then return; end if;
  if form.schema is distinct from previous.schema then
    raise exception 'Funeral form has unpublished changes; review before changing its date question.';
  end if;
  select item into field from jsonb_array_elements(form.schema->'fields') item where item->>'id' = 'when_passed';
  if field is null then return; end if;
  if field->>'type' = 'date' then return; end if;
  if field->>'type' <> 'select' or field->'options' is distinct from '["Today","Yesterday","Earlier","Not sure"]'::jsonb then
    raise exception 'The funeral date question has been customised; review before changing it.';
  end if;
  select jsonb_set(form.schema, '{fields}', jsonb_agg(
    case when item->>'id' = 'when_passed' then
      (item - 'options') || jsonb_build_object(
        'type', 'date',
        'label', 'Please tell us the date your loved one passed away.',
        'help', 'We are sorry for your loss. You can leave this blank if you are unsure.',
        'required', false)
    else item end order by position)) into definition
    from jsonb_array_elements(form.schema->'fields') with ordinality as fields(item, position);
  perform private.validate_custom_schema(definition);
  select coalesce(max(version), 0) + 1 into next_version
    from public.custom_form_versions where form_id = form.id;
  -- Retain the existing publisher provenance; this maintenance change is recorded in migration history.
  insert into public.custom_form_versions(form_id, version, title, description, schema, published_by)
    values(form.id, next_version, form.title, form.description, definition, previous.published_by);
  update public.custom_forms set schema = definition, published_version = next_version, updated_at = now()
    where id = form.id;
end $migration$;
commit;
