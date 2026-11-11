-- Trusted private games: the active player runs WASM locally and passes the complete save.
-- This mode is deliberately separate from host-authoritative/redacted online orders.
create function public.se4_start_handoff(g uuid, expected_revision bigint, initial_save jsonb, first_empire integer)
returns bigint language plpgsql security definer set search_path='' as $$
declare game public.se4_games; begin
 select * into game from public.se4_games where id=g for update;
 if not public.se4_is_host(g) or game.mode<>'async' or game.phase<>'lobby' or game.revision<>expected_revision then raise exception 'Lobby unavailable'; end if;
 if not exists(select 1 from public.se4_members where game_id=g and empire=first_empire) then raise exception 'Active empire must have a member'; end if;
 if octet_length(initial_save::text)>73400320 then raise exception 'Save too large'; end if;
 insert into public.se4_checkpoints values(g,1,initial_save);
 update public.se4_games set revision=1, phase='playing',active_empire=first_empire,setup=jsonb_set(setup,'{local_handoff}','true') where id=g;
 insert into public.se4_notifications(game_id,user_id,revision) select g,user_id,1 from public.se4_members where game_id=g and empire=first_empire;
 return 1; end $$;
create function public.se4_take_turn(g uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare game public.se4_games; checkpoint public.se4_checkpoints; begin
 select * into game from public.se4_games where id=g;
 if game.phase<>'playing' or (game.setup->>'local_handoff') is distinct from 'true' or not exists(select 1 from public.se4_members where game_id=g and user_id=auth.uid() and empire=game.active_empire) then raise exception 'It is not your turn'; end if;
 select * into checkpoint from public.se4_checkpoints where game_id=g;
 return jsonb_build_object('revision',checkpoint.revision,'save',checkpoint.save); end $$;
create function public.se4_handoff(g uuid, expected_revision bigint, next_turn integer, next_empire integer, next_save jsonb)
returns bigint language plpgsql security definer set search_path='' as $$
declare game public.se4_games; rev bigint; begin
 select * into game from public.se4_games where id=g for update;
 if game.mode<>'async' or game.phase<>'playing' or (game.setup->>'local_handoff') is distinct from 'true' or not exists(select 1 from public.se4_members where game_id=g and user_id=auth.uid() and empire=game.active_empire) then raise exception 'It is not your turn'; end if;
 if game.revision<>expected_revision then raise exception 'Turn changed; reload'; end if;
 if not exists(select 1 from public.se4_members where game_id=g and empire=next_empire) then raise exception 'Next empire has no member'; end if;
 if next_turn<game.turn_number or next_turn>game.turn_number+1 or octet_length(next_save::text)>73400320 then raise exception 'Invalid turn handoff'; end if;
 rev:=game.revision+1;
 update public.se4_checkpoints set revision=rev,save=next_save where game_id=g;
 update public.se4_games set revision=rev,turn_number=next_turn,active_empire=next_empire where id=g;
 insert into public.se4_notifications(game_id,user_id,revision) select g,user_id,rev from public.se4_members where game_id=g and empire=next_empire;
 return rev; end $$;
revoke all on function public.se4_start_handoff(uuid,bigint,jsonb,integer),public.se4_take_turn(uuid),public.se4_handoff(uuid,bigint,integer,integer,jsonb) from public,anon;
grant execute on function public.se4_start_handoff(uuid,bigint,jsonb,integer),public.se4_take_turn(uuid),public.se4_handoff(uuid,bigint,integer,integer,jsonb) to authenticated;
