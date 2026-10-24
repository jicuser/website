-- Version the existing funeral inbox; preserve old responses, staff and open/closed state.
begin;
set local lock_timeout='3s';
set local statement_timeout='30s';
do $migration$
declare
  form public.custom_forms;
  previous public.custom_form_versions;
  next_version integer;
  definition jsonb := $schema${
    "fields": [
      {"id":"request","type":"select","label":"What do you need help with?","required":true,"options":["Arranging a funeral","Janazah prayer only","Collection or transport","Washing or other facilities","Advice or planning ahead"]},
      {"id":"when_passed","type":"select","label":"When did your loved one pass away?","required":true,"options":["Today","Yesterday","Earlier","Not sure"],"show_when":{"field":"request","operator":"not_equals","value":"Advice or planning ahead"}},
      {"id":"current_location","type":"select","label":"Current location","required":true,"options":["At home","Hospital","Hospice or care home","With a funeral director","Elsewhere","Not sure"],"show_when":{"field":"request","operator":"not_equals","value":"Advice or planning ahead"}},
      {"id":"location_details","type":"text","label":"Place or area (optional)","help":"The hospital, care home or town is enough for now. You can leave this blank if you are unsure.","show_when":{"field":"request","operator":"not_equals","value":"Advice or planning ahead"}},
      {"id":"collection_needed","type":"select","label":"Do you need us to collect your loved one?","required":true,"options":["Yes","No, collection is already arranged","Not sure"],"help":"The team will check release and paperwork with you before confirming collection.","show_when":{"field":"request","operator":"not_equals","value":"Advice or planning ahead"}},
      {"id":"transport","type":"select","label":"Which transport do you need?","required":true,"options":["Ambulance collection","Hearse","Both","Not sure"],"show_when":{"field":"request","operator":"equals","value":"Collection or transport"}},
      {"id":"facilities","type":"multiselect","label":"Which facilities would you like to ask about?","required":true,"options":["Washing area","Cold room","Family and viewing room","Not sure"],"show_when":{"field":"request","operator":"equals","value":"Washing or other facilities"}},
      {"id":"message","type":"textarea","label":"Anything else you would like us to know?","help":"Optional: a preferred date, existing funeral arrangements or a question for the team. Please do not include identity documents or payment details."},
      {"id":"name","type":"text","label":"Your name","required":true},
      {"id":"phone","type":"phone","label":"Phone number","required":true},
      {"id":"email","type":"email","label":"Email (optional)"}
    ]
  }$schema$::jsonb;
  new_title text := 'Arrange a funeral';
  new_description text := 'Tell us what you need. Our team will contact you to confirm availability, costs and arrangements.';
begin
  select * into form from public.custom_forms where slug='funeral-enquiry' for update;
  if form.id is null then return; end if;
  select * into previous from public.custom_form_versions where form_id=form.id and version=form.published_version;
  if previous.form_id is null then raise notice 'Funeral form is unpublished; keep its current draft.'; return; end if;
  if form.schema = definition and previous.schema = definition then return; end if;
  if form.schema is distinct from previous.schema then
    raise exception 'Funeral form has unpublished changes; review before upgrading.';
  end if;
  -- Do not overwrite questions added independently by the centre.
  if exists(select 1 from jsonb_array_elements(form.schema->'fields') f where f->>'id' not in ('name','email','phone','message','deceased_name','relationship')) then
    raise exception 'Funeral form has custom questions; review before upgrading.';
  end if;
  perform private.validate_custom_schema(definition);
  select coalesce(max(version),0)+1 into next_version from public.custom_form_versions where form_id=form.id;
  insert into public.custom_form_versions(form_id,version,title,description,schema,published_by)
  values(form.id,next_version,new_title,new_description,definition,previous.published_by);
  update public.custom_forms set title=new_title,description=new_description,schema=definition,
    published_version=next_version,updated_at=now() where id=form.id;
end $migration$;
commit;
