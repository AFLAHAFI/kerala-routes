-- Prepared only. Service-role RPC; browsers receive only name/score via the game server.
begin;
create or replace function public.kr_leaderboard(p_metric text)
returns table(name text,score numeric)
language plpgsql stable security invoker set search_path = public
as $$
begin
 if p_metric not in ('KP','Driver XP','Passenger XP','Routes completed','Safe driver','Districts explored','Missions','Journal') then
  raise exception 'Unknown leaderboard';
 end if;
 return query
 select ranked.name,ranked.score from (select p.name, case p_metric
  when 'KP' then coalesce((p.progress->>'kp')::numeric,0)
  when 'Driver XP' then coalesce((p.progress->'v2'->>'driverXP')::numeric,0)
  when 'Passenger XP' then coalesce((p.progress->'v2'->>'passengerXP')::numeric,0)
  when 'Routes completed' then coalesce((p.progress->'v2'->>'routesCompleted')::numeric,0)
  when 'Safe driver' then coalesce((p.progress->'v2'->>'rating')::numeric,100)
  when 'Districts explored' then coalesce(jsonb_array_length(p.progress->'v2'->'districts'),1)::numeric
  when 'Missions' then coalesce(jsonb_array_length(p.progress->'missions'),0)::numeric
  when 'Journal' then coalesce(jsonb_array_length(p.progress->'journal'),0)::numeric
 end as score
 from public.kr_profiles p) ranked order by ranked.score desc,ranked.name asc limit 20;
end;
$$;
revoke all on function public.kr_leaderboard(text) from public,anon,authenticated;
grant execute on function public.kr_leaderboard(text) to service_role;
commit;
