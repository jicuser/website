-- Presentation hints belong to the published schema snapshot, not the answers.
-- Keep the existing validator, access rights and publication rules intact.
begin;
set local lock_timeout='3s';
set local statement_timeout='30s';

create or replace function private.validate_custom_schema(p_schema jsonb) returns void language plpgsql immutable set search_path='' as $$
 declare field jsonb; prior jsonb; option jsonb; ids text[]='{}'; option_values text[]; id text; kind text; file_count integer=0;
 begin
 if p_schema is null or jsonb_typeof(p_schema)<>'object' or octet_length(p_schema::text)>48000 or jsonb_typeof(p_schema->'fields') is distinct from 'array' then raise exception 'Invalid form schema'; end if;
 if jsonb_array_length(p_schema->'fields') not between 1 and 40 then raise exception 'Provide 1 to 40 fields'; end if;
 for field in select value from jsonb_array_elements(p_schema->'fields') loop
 id=field->>'id'; kind=field->>'type';
 if jsonb_typeof(field)<>'object' or id is null or id !~ '^[a-z][a-z0-9_]{0,39}$' or id=any(ids) or kind is null or kind<>all(array['text','textarea','email','phone','number','date','select','multiselect','checkbox','image','file']) or jsonb_typeof(field->'label') is distinct from 'string' or coalesce(length(trim(field->>'label')),0) not between 1 and 160 or (field ? 'required' and jsonb_typeof(field->'required')<>'boolean') then raise exception 'Invalid or duplicate field'; end if;
 if (field ? 'help' and (jsonb_typeof(field->'help') is distinct from 'string' or length(field->>'help')>300)) or (field ? 'placeholder' and (jsonb_typeof(field->'placeholder') is distinct from 'string' or length(field->>'placeholder')>160)) then raise exception 'Use short text for question help and examples'; end if;
 if kind in('file','image') then file_count=file_count+1; if file_count>5 then raise exception 'Maximum 5 upload fields'; end if; end if;
 if kind in('select','multiselect') then
 if jsonb_typeof(field->'options') is distinct from 'array' or jsonb_array_length(field->'options') not between 1 and 50 then raise exception 'Options required'; end if;
 option_values='{}'; for option in select value from jsonb_array_elements(field->'options') loop
 if jsonb_typeof(option)<>'string' or length(trim(option#>>'{}')) not between 1 and 120 or (option#>>'{}')=any(option_values) then raise exception 'Invalid duplicate option'; end if;
 option_values=array_append(option_values,option#>>'{}'); end loop;
 end if;
 if field ? 'show_when' and field->'show_when'<>'null'::jsonb then
 if jsonb_typeof(field->'show_when')<>'object' or not coalesce((field->'show_when'->>'field')=any(ids),false) or coalesce(field->'show_when'->>'operator','') not in('equals','not_equals') or coalesce(jsonb_typeof(field->'show_when'->'value'),'null') not in('string','boolean','number') then raise exception 'Invalid visibility condition'; end if;
 select value into prior from jsonb_array_elements(p_schema->'fields') where value->>'id'=field->'show_when'->>'field';
 if prior->>'type' in('file','image','multiselect') or (prior ? 'show_when' and prior->'show_when'<>'null'::jsonb) then raise exception 'Condition must use an earlier unconditioned scalar field'; end if;
 end if;
 ids=array_append(ids,id);
 end loop;
 end; $$;
commit;
