-- Apply as a versioned migration before deploying the updated tv-control function.
-- Existing live peer rows are preserved; browser receivers become independent.
alter table public.tv_peers
  drop constraint tv_peers_session_id_device_id_key,
  add column last_seen_at timestamptz not null default now(),
  add column receiver_state text;

alter table public.tv_peers add constraint tv_peers_receiver_state_check check (
  receiver_state is null or receiver_state in (
    'waiting', 'answering', 'answered', 'connected', 'failed', 'NotSupportedError',
    'OperationError', 'InvalidStateError', 'NetworkError', 'TimeoutError'
  )
);

create index tv_peers_session_seen_idx on public.tv_peers(session_id, last_seen_at desc);

-- The Edge function verifies the device token and input owner's staff access first.
-- Only service_role can call this RPC. Row locking enforces the receiver limit
-- even when the same approved browser opens several tabs simultaneously.
create function public.join_tv_receiver(hall text, input_session uuid, receiver_device uuid)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  receiver_id uuid;
begin
  perform 1 from public.tv_devices
    where id = receiver_device and screen_id = hall and expires_at > now()
    for update;
  if not found then raise exception 'This TV approval has expired'; end if;

  perform 1 from public.tv_inputs
    where session_id = input_session and screen_id = hall and expires_at > now();
  if not found then raise exception 'This input has ended'; end if;

  delete from public.tv_peers
    where device_id = receiver_device and screen_id = hall
      and last_seen_at < now() - interval '90 seconds';

  if (select count(*) from public.tv_peers
      where device_id = receiver_device and screen_id = hall) >= 8 then
    raise exception 'Close an unused TV tab before opening another receiver';
  end if;

  insert into public.tv_peers(screen_id, session_id, device_id, receiver_state)
    values(hall, input_session, receiver_device, 'waiting')
    returning id into receiver_id;
  return receiver_id;
end;
$$;

revoke all on function public.join_tv_receiver(text, uuid, uuid) from public, anon, authenticated;
grant execute on function public.join_tv_receiver(text, uuid, uuid) to service_role;

-- tv_peers keeps its existing RLS and service-only table grants.
