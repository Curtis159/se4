-- New schema only: migrations 001, 002 and 003.
BEGIN;
-- Private, host-authoritative games. Simulation remains in the host's C++ WASM.
create extension if not exists pgcrypto with schema extensions;
create table public.se4_games (
 id uuid primary key default gen_random_uuid(), host_id uuid not null references auth.users(id),
 name text not null check(length(name) between 1 and 128), mode text not null check(mode in ('live','async')),
 phase text not null default 'lobby' check(phase in ('lobby','playing','finished')),
 revision bigint not null default 0, turn_number integer not null default 0,
 active_empire integer, setup jsonb not null, created_at timestamptz not null default now()
);
create table public.se4_members (
 game_id uuid references public.se4_games on delete cascade, user_id uuid references auth.users on delete cascade,
 empire integer not null check(empire between 0 and 19), primary key(game_id,user_id), unique(game_id,empire)
);
create table public.se4_invites (
 id uuid primary key default gen_random_uuid(),game_id uuid not null references public.se4_games on delete cascade,
 email text not null,empire integer not null check(empire between 0 and 19),token_hash bytea not null unique,
 expires_at timestamptz not null default now()+interval '7 days', accepted_by uuid references auth.users
);
create table public.se4_checkpoints (
 game_id uuid primary key references public.se4_games on delete cascade,revision bigint not null,save jsonb not null
);
create table public.se4_views (
 game_id uuid references public.se4_games on delete cascade, user_id uuid references auth.users,
 revision bigint not null,snapshot jsonb not null,primary key(game_id,user_id)
);
create table public.se4_orders (
 id uuid primary key default gen_random_uuid(),game_id uuid not null references public.se4_games on delete cascade,
 user_id uuid not null references auth.users,revision bigint not null,nonce uuid not null,commands jsonb not null,
 created_at timestamptz not null default now(), unique(game_id,user_id,nonce)
);
create table public.se4_push_subscriptions (
 user_id uuid not null references auth.users on delete cascade,endpoint text not null,subscription jsonb not null,
 primary key(user_id,endpoint)
);
create table public.se4_notifications (
 id uuid primary key default gen_random_uuid(),game_id uuid references public.se4_games on delete cascade,
 user_id uuid not null references auth.users,revision bigint not null,delivered_at timestamptz,
 unique(game_id,user_id,revision)
);
create function public.se4_is_host(g uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.se4_games where id=g and host_id=auth.uid()); $$;
create function public.se4_is_member(g uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.se4_members where game_id=g and user_id=auth.uid()) or public.se4_is_host(g); $$;
alter table public.se4_games enable row level security;
alter table public.se4_members enable row level security;
alter table public.se4_invites enable row level security;
alter table public.se4_checkpoints enable row level security;
alter table public.se4_views enable row level security;
alter table public.se4_orders enable row level security;
alter table public.se4_push_subscriptions enable row level security;
alter table public.se4_notifications enable row level security;
create policy game_read on public.se4_games for select to authenticated using(public.se4_is_member(id));
create policy members_read on public.se4_members for select to authenticated using(public.se4_is_member(game_id));
create policy invites_host_read on public.se4_invites for select to authenticated using(public.se4_is_host(game_id));
create policy checkpoint_host_read on public.se4_checkpoints for select to authenticated using(public.se4_is_host(game_id));
create policy view_read on public.se4_views for select to authenticated using(user_id=auth.uid());
create policy order_read on public.se4_orders for select to authenticated using(user_id=auth.uid() or public.se4_is_host(game_id));
create policy push_own on public.se4_push_subscriptions for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy notification_read on public.se4_notifications for select to authenticated using(user_id=auth.uid());
create function public.se4_create_game(title text,play_mode text,configuration jsonb) returns uuid
language plpgsql security definer set search_path='' as $$ declare g uuid; begin
 if auth.uid() is null then raise exception 'Sign in first'; end if;
 insert into public.se4_games(host_id,name,mode,setup) values(auth.uid(),title,play_mode,configuration) returning id into g;
 insert into public.se4_members values(g,auth.uid(),0); return g; end $$;
create function public.se4_invite(g uuid,recipient text,slot integer) returns text
language plpgsql security definer set search_path='' as $$ declare token text; begin
 if not public.se4_is_host(g) then raise exception 'Host only'; end if;
 if not exists(select 1 from public.se4_games where id=g and phase='lobby') then raise exception 'Game already started'; end if;
 token:=encode(extensions.gen_random_bytes(32),'hex');
 insert into public.se4_invites(game_id,email,empire,token_hash) values(g,lower(trim(recipient)),slot,extensions.digest(token,'sha256'));
 return token; end $$;
create function public.se4_accept_invite(token text) returns uuid
language plpgsql security definer set search_path='' as $$ declare i public.se4_invites; begin
 if auth.uid() is null then raise exception 'Sign in first'; end if;
 select * into i from public.se4_invites where token_hash=extensions.digest(token,'sha256') and expires_at>now() and accepted_by is null for update;
 if i.id is null or i.email<>lower(coalesce(auth.jwt()->>'email','')) then raise exception 'Invite invalid or belongs to another email'; end if;
 if not exists(select 1 from public.se4_games where id=i.game_id and phase='lobby') then raise exception 'Game already started'; end if;
 insert into public.se4_members values(i.game_id,auth.uid(),i.empire);
 update public.se4_invites set accepted_by=auth.uid() where id=i.id;return i.game_id; end $$;
create function public.se4_submit_orders(g uuid,expected_revision bigint,request_nonce uuid,orders jsonb) returns uuid
language plpgsql security definer set search_path='' as $$ declare game public.se4_games; packet uuid; begin
 select * into game from public.se4_games where id=g for update;
 if not public.se4_is_member(g) or game.phase<>'playing' then raise exception 'Game unavailable'; end if;
 if game.revision<>expected_revision then raise exception 'Turn changed; reload'; end if;
 if not exists(select 1 from public.se4_members where game_id=g and user_id=auth.uid() and empire=game.active_empire) then raise exception 'Another player is active'; end if;
 if jsonb_typeof(orders)<>'array' or jsonb_array_length(orders)>4096 or octet_length(orders::text)>1048576 then raise exception 'Invalid order packet'; end if;
 insert into public.se4_orders(game_id,user_id,revision,nonce,commands) values(g,auth.uid(),expected_revision,request_nonce,orders)
 on conflict(game_id,user_id,nonce) do update set nonce=excluded.nonce returning id into packet;return packet; end $$;
create function public.se4_publish(g uuid,expected_revision bigint,next_turn integer,next_empire integer,checkpoint jsonb,player_views jsonb) returns bigint
language plpgsql security definer set search_path='' as $$ declare game public.se4_games; member record; next_revision bigint; begin
 if not public.se4_is_host(g) then raise exception 'Host only'; end if;
 select * into game from public.se4_games where id=g for update;
 if game.revision<>expected_revision then raise exception 'Stale host revision'; end if;
 if not exists(select 1 from public.se4_members where game_id=g and empire=next_empire) then raise exception 'Unknown active player'; end if;
 next_revision:=expected_revision+1;
 insert into public.se4_checkpoints values(g,next_revision,checkpoint) on conflict(game_id) do update set revision=excluded.revision,save=excluded.save;
 for member in select * from public.se4_members where game_id=g loop
  if player_views->(member.empire::text) is null then raise exception 'Missing player view'; end if;
  insert into public.se4_views values(g,member.user_id,next_revision,player_views->(member.empire::text)) on conflict(game_id,user_id) do update set revision=excluded.revision,snapshot=excluded.snapshot;
  if member.empire=next_empire then insert into public.se4_notifications(game_id,user_id,revision) values(g,member.user_id,next_revision) on conflict do nothing; end if;
 end loop;
 update public.se4_games set revision=next_revision,turn_number=next_turn,active_empire=next_empire,phase='playing' where id=g;
 delete from public.se4_orders where game_id=g and revision<=expected_revision; return next_revision; end $$;
-- No direct client writes to game state, memberships, invites or orders.
revoke all on function public.se4_is_host(uuid),public.se4_is_member(uuid),public.se4_create_game(text,text,jsonb),public.se4_invite(uuid,text,integer),public.se4_accept_invite(text),public.se4_submit_orders(uuid,bigint,uuid,jsonb),public.se4_publish(uuid,bigint,integer,integer,jsonb,jsonb) from public,anon;
grant execute on function public.se4_is_host(uuid),public.se4_is_member(uuid),public.se4_create_game(text,text,jsonb),public.se4_invite(uuid,text,integer),public.se4_accept_invite(text),public.se4_submit_orders(uuid,bigint,uuid,jsonb),public.se4_publish(uuid,bigint,integer,integer,jsonb,jsonb) to authenticated;
grant select on public.se4_games,public.se4_members,public.se4_invites,public.se4_checkpoints,public.se4_views,public.se4_orders,public.se4_notifications to authenticated;
grant select,insert,update,delete on public.se4_push_subscriptions to authenticated;

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

-- Apply after 001 and 002. Lifecycle operations serialize on the game row.
alter table public.se4_games add column last_activity_at timestamptz not null default now(),add column closed_at timestamptz,add column paused boolean not null default false,add column inactivity_warned_at timestamptz,add column closed_warned_at timestamptz;
alter table public.se4_members add column left_at timestamptz;
alter table public.se4_members drop constraint se4_members_game_id_empire_key;
create unique index se4_active_empire on public.se4_members(game_id,empire) where left_at is null;
alter table public.se4_notifications add column kind text not null default 'turn' check(kind in ('turn','inactive','closed'));
alter table public.se4_notifications drop constraint se4_notifications_game_id_user_id_revision_key;
alter table public.se4_notifications add unique(game_id,user_id,revision,kind);

create or replace function public.se4_is_member(g uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.se4_members where game_id=g and user_id=auth.uid() and left_at is null) or public.se4_is_host(g); $$;
create function public.se4_activity() returns trigger language plpgsql security definer set search_path='' as $$ begin
 if (new.revision,new.phase,new.setup,new.host_id,new.paused) is distinct from (old.revision,old.phase,old.setup,old.host_id,old.paused) then
  new.last_activity_at=clock_timestamp();new.inactivity_warned_at=null;
  delete from public.se4_notifications where game_id=new.id and kind='inactive';
 end if;
 if new.phase='finished' and old.phase<>'finished' then new.closed_at=clock_timestamp();new.active_empire=null;new.paused=false;delete from public.se4_notifications where game_id=new.id;end if;
 return new;end $$;
create trigger se4_game_activity before update on public.se4_games for each row execute function public.se4_activity();

create function public.se4_human_slots(configuration jsonb) returns jsonb language sql immutable set search_path='' as $$
 select coalesce(configuration->'human_slots',(select jsonb_agg(ordinality-1) from jsonb_array_elements(configuration->'players') with ordinality as p(value,ordinality) where value->>'kind'='human'),'[]'::jsonb); $$;
create function public.se4_list_games() returns setof jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',g.id,'host_id',g.host_id,'name',g.name,'mode',g.mode,'phase',g.phase,'revision',g.revision,'turn_number',g.turn_number,'active_empire',g.active_empire,'paused',g.paused,'closed_at',g.closed_at,'last_activity_at',g.last_activity_at,'inactivity_warned_at',g.inactivity_warned_at,'empire',m.empire)
 from public.se4_games g join public.se4_members m on m.game_id=g.id and m.user_id=auth.uid() and m.left_at is null order by g.created_at desc; $$;
create function public.se4_game_members(g uuid) returns setof jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('user_id',m.user_id,'empire',m.empire,'left',m.left_at is not null) from public.se4_members m where m.game_id=g and public.se4_is_member(g); $$;
create function public.se4_keep_game(g uuid) returns void language plpgsql security definer set search_path='' as $$ begin
 if not exists(select 1 from public.se4_members where game_id=g and user_id=auth.uid() and left_at is null) then raise exception 'Membership required';end if;
 update public.se4_games set last_activity_at=clock_timestamp(),inactivity_warned_at=null where id=g and phase<>'finished';delete from public.se4_notifications where game_id=g and kind='inactive';end $$;
revoke all on function public.se4_keep_game(uuid) from public,anon;
grant execute on function public.se4_keep_game(uuid) to authenticated;
create function public.se4_export_game(g uuid) returns jsonb language plpgsql security definer set search_path='' as $$ declare result jsonb; begin
 if not exists(select 1 from public.se4_members where game_id=g and user_id=auth.uid() and left_at is null) then raise exception 'Membership required';end if;
 select save into result from public.se4_checkpoints where game_id=g;if result is null then raise exception 'This lobby has no saved campaign';end if;return result;end $$;

create function public.se4_end_game(g uuid,expected_revision bigint) returns void language plpgsql security definer set search_path='' as $$ declare game public.se4_games;begin
 select * into game from public.se4_games where id=g for update;
 if not public.se4_is_host(g) then raise exception 'Host only';end if;if game.revision<>expected_revision then raise exception 'Game changed; reload';end if;
 if game.phase<>'finished' then update public.se4_games set phase='finished',revision=revision+1 where id=g;end if;end $$;
create function public.se4_delete_game(g uuid,expected_revision bigint) returns void language plpgsql security definer set search_path='' as $$ declare game public.se4_games;begin
 select * into game from public.se4_games where id=g for update;
 if not public.se4_is_host(g) then raise exception 'Host only';end if;if game.revision<>expected_revision then raise exception 'Game changed; reload';end if;
 delete from public.se4_games where id=g;end $$;
create function public.se4_leave_game(g uuid,expected_revision bigint,successor uuid default null) returns void language plpgsql security definer set search_path='' as $$ declare game public.se4_games;remaining integer;rev bigint;begin
 select * into game from public.se4_games where id=g for update;
 if not exists(select 1 from public.se4_members where game_id=g and user_id=auth.uid() and left_at is null) then raise exception 'Not an active member';end if;
 if game.revision<>expected_revision then raise exception 'Game changed; reload';end if;
 select count(*) into remaining from public.se4_members where game_id=g and user_id<>auth.uid() and left_at is null;
 if game.host_id=auth.uid() and remaining>0 and (successor is null or not exists(select 1 from public.se4_members where game_id=g and user_id=successor and user_id<>auth.uid() and left_at is null)) then raise exception 'Choose a remaining player as host';end if;
 update public.se4_members set left_at=clock_timestamp() where game_id=g and user_id=auth.uid();
 rev=game.revision+1;
 update public.se4_games set revision=rev,host_id=case when game.host_id=auth.uid() and remaining>0 then successor else host_id end,phase=case when remaining=0 then 'finished' else phase end,paused=case when remaining>0 and phase='playing' then true else paused end where id=g;
 update public.se4_checkpoints set revision=rev where game_id=g;
 delete from public.se4_notifications where game_id=g;
 delete from public.se4_orders where game_id=g and user_id=auth.uid();
end $$;

create or replace function public.se4_invite(g uuid,recipient text,slot integer) returns text language plpgsql security definer set search_path='' as $$ declare token text;game public.se4_games;begin
 select * into game from public.se4_games where id=g for update;
 if not public.se4_is_host(g) then raise exception 'Host only';end if;
 if game.phase='finished' or (game.phase='playing' and not game.paused) then raise exception 'Pause or fill a vacant player slot first';end if;
 if not (public.se4_human_slots(game.setup) @> jsonb_build_array(slot)) then raise exception 'Choose a human empire slot';end if;
 if exists(select 1 from public.se4_members where game_id=g and empire=slot and left_at is null) then raise exception 'Slot is occupied';end if;
 if length(trim(recipient))<3 or length(recipient)>254 then raise exception 'Enter an email address';end if;
 delete from public.se4_invites where game_id=g and empire=slot and accepted_by is null;
 token=encode(extensions.gen_random_bytes(32),'hex');insert into public.se4_invites(game_id,email,empire,token_hash) values(g,lower(trim(recipient)),slot,extensions.digest(token,'sha256'));return token;end $$;
create or replace function public.se4_accept_invite(token text) returns uuid language plpgsql security definer set search_path='' as $$ declare i public.se4_invites;game public.se4_games;rev bigint;begin
 if auth.uid() is null then raise exception 'Sign in first';end if;
 -- Lock order is game then invitation, the same as lifecycle operations.
 select * into i from public.se4_invites where token_hash=extensions.digest(token,'sha256');
 if i.id is null then raise exception 'Invalid invitation';end if;
 select * into game from public.se4_games where id=i.game_id for update;
 select * into i from public.se4_invites where id=i.id for update;
 if i.expires_at<=now() or i.accepted_by is not null or i.email<>lower(coalesce(auth.jwt()->>'email','')) then raise exception 'Invite invalid or belongs to another email';end if;
 if game.phase='finished' or (game.phase='playing' and not game.paused) then raise exception 'Game is not accepting replacements';end if;
 if exists(select 1 from public.se4_members where game_id=game.id and empire=i.empire and left_at is null) then raise exception 'Slot already occupied';end if;
 if exists(select 1 from public.se4_members where game_id=game.id and user_id=auth.uid() and left_at is null) then raise exception 'Already a player in this game';end if;
 insert into public.se4_members(game_id,user_id,empire) values(game.id,auth.uid(),i.empire) on conflict(game_id,user_id) do update set empire=excluded.empire,left_at=null;
 update public.se4_invites set accepted_by=auth.uid() where id=i.id;
 rev=game.revision+1;
 update public.se4_games set revision=rev,paused=case when phase='playing' then exists(select 1 from jsonb_array_elements_text(public.se4_human_slots(game.setup)) as slot(value) where not exists(select 1 from public.se4_members where game_id=game.id and empire=slot.value::integer and left_at is null)) else false end where id=game.id;
 update public.se4_checkpoints set revision=rev where game_id=game.id;
 insert into public.se4_notifications(game_id,user_id,revision) select game.id,user_id,rev from public.se4_members where game_id=game.id and empire=game.active_empire and left_at is null and (select not paused and phase='playing' from public.se4_games where id=game.id);
 return game.id;end $$;

create function public.se4_create_from_save(title text,configuration jsonb,checkpoint jsonb,host_empire integer,saved_turn integer,first_empire integer) returns uuid language plpgsql security definer set search_path='' as $$ declare g uuid;slots jsonb;begin
 if auth.uid() is null then raise exception 'Sign in first';end if;slots=public.se4_human_slots(configuration);
 if jsonb_typeof(slots)<>'array' or jsonb_array_length(slots)<2 or jsonb_array_length(slots)>20 or not slots @> jsonb_build_array(host_empire) or not slots @> jsonb_build_array(first_empire) then raise exception 'Choose at least two human slots, including the host and active empire';end if;
 if exists(select 1 from jsonb_array_elements_text(slots) x(value) where value::integer not between 0 and 19) or (select count(distinct value) from jsonb_array_elements_text(slots))<>jsonb_array_length(slots) then raise exception 'Invalid empire slots';end if;
 if checkpoint->>'format' is distinct from 'OpenSE4-save-hex-v1' or octet_length(checkpoint::text)>73400320 or saved_turn<0 then raise exception 'Invalid saved campaign';end if;
 insert into public.se4_games(host_id,name,mode,setup,turn_number,active_empire) values(auth.uid(),title,'async',configuration||jsonb_build_object('local_handoff',true,'restored',true),saved_turn,first_empire) returning id into g;
 insert into public.se4_members(game_id,user_id,empire) values(g,auth.uid(),host_empire);
 insert into public.se4_checkpoints values(g,0,checkpoint);return g;end $$;
create function public.se4_start_restored(g uuid,expected_revision bigint) returns bigint language plpgsql security definer set search_path='' as $$ declare game public.se4_games;rev bigint;begin
 select * into game from public.se4_games where id=g for update;
 if not public.se4_is_host(g) then raise exception 'Host only';end if;
 if game.phase<>'lobby' or game.revision<>expected_revision or game.setup->>'restored' is distinct from 'true' then raise exception 'Restored lobby changed; reload';end if;
 if exists(select 1 from jsonb_array_elements_text(public.se4_human_slots(game.setup)) x(value) where not exists(select 1 from public.se4_members where game_id=g and empire=x.value::integer and left_at is null)) then raise exception 'Every human slot must join first';end if;
 rev=game.revision+1;update public.se4_games set phase='playing',revision=rev where id=g;update public.se4_checkpoints set revision=rev where game_id=g;
 insert into public.se4_notifications(game_id,user_id,revision) select g,user_id,rev from public.se4_members where game_id=g and empire=game.active_empire and left_at is null;return rev;end $$;

alter function public.se4_take_turn(uuid) rename to se4_take_turn_v2;
revoke all on function public.se4_take_turn_v2(uuid) from public,anon,authenticated;
create function public.se4_take_turn(g uuid) returns jsonb language plpgsql security definer set search_path='' as $$ begin
 if not exists(select 1 from public.se4_games where id=g and not paused) or not exists(select 1 from public.se4_members where game_id=g and user_id=auth.uid() and left_at is null) then raise exception 'Game paused or membership ended';end if;return public.se4_take_turn_v2(g);end $$;
alter function public.se4_handoff(uuid,bigint,integer,integer,jsonb) rename to se4_handoff_v2;
revoke all on function public.se4_handoff_v2(uuid,bigint,integer,integer,jsonb) from public,anon,authenticated;
create function public.se4_handoff(g uuid,expected_revision bigint,next_turn integer,next_empire integer,next_save jsonb) returns bigint language plpgsql security definer set search_path='' as $$ declare game public.se4_games;rev bigint;done boolean;begin
 select * into game from public.se4_games where id=g for update;
 if game.paused or game.phase<>'playing' or not exists(select 1 from public.se4_members where game_id=g and user_id=auth.uid() and left_at is null) then raise exception 'Game paused, closed or membership ended';end if;
 done=coalesce((next_save->'onlineState'->>'finished')::boolean,false);
 -- The complete save is a trusted-private-game checkpoint, not server-validated simulation.
 rev=public.se4_handoff_v2(g,expected_revision,next_turn,next_empire,next_save);
 if done then update public.se4_games set phase='finished' where id=g;end if;return rev;end $$;

create function public.se4_cleanup(at_time timestamptz default now()) returns jsonb language plpgsql security definer set search_path='' as $$ declare game public.se4_games;deleted_count integer=0;warned_count integer=0;begin
 for game in select * from public.se4_games order by id for update skip locked loop
  if game.phase='finished' then
   if game.closed_at<=at_time-interval '23 days' and game.closed_warned_at is null then
    update public.se4_games set closed_warned_at=at_time where id=game.id;
    insert into public.se4_notifications(game_id,user_id,revision,kind) select game.id,user_id,game.revision,'closed' from public.se4_members where game_id=game.id and left_at is null on conflict do nothing;warned_count=warned_count+1;
   elsif game.closed_at<=at_time-interval '30 days' and game.closed_warned_at<=at_time-interval '7 days' then delete from public.se4_games where id=game.id;deleted_count=deleted_count+1;end if;
  else
   if game.last_activity_at<=at_time-interval '83 days' and game.inactivity_warned_at is null then
    update public.se4_games set inactivity_warned_at=at_time where id=game.id;
    insert into public.se4_notifications(game_id,user_id,revision,kind) select game.id,user_id,game.revision,'inactive' from public.se4_members where game_id=game.id and left_at is null on conflict do nothing;warned_count=warned_count+1;
   elsif game.last_activity_at<=at_time-interval '90 days' and game.inactivity_warned_at<=at_time-interval '7 days' then delete from public.se4_games where id=game.id;deleted_count=deleted_count+1;end if;
  end if;
 end loop;
 delete from public.se4_invites where expires_at<at_time;
 delete from public.se4_notifications where delivered_at<at_time-interval '7 days';
 return jsonb_build_object('deleted',deleted_count,'warned',warned_count);end $$;
revoke all on function public.se4_cleanup(timestamptz),public.se4_activity(),public.se4_human_slots(jsonb) from public,anon,authenticated;
grant execute on function public.se4_cleanup(timestamptz) to service_role;
revoke all on function public.se4_list_games(),public.se4_game_members(uuid),public.se4_export_game(uuid),public.se4_end_game(uuid,bigint),public.se4_delete_game(uuid,bigint),public.se4_leave_game(uuid,bigint,uuid),public.se4_create_from_save(text,jsonb,jsonb,integer,integer,integer),public.se4_start_restored(uuid,bigint),public.se4_take_turn(uuid),public.se4_handoff(uuid,bigint,integer,integer,jsonb) from public,anon;
grant execute on function public.se4_list_games(),public.se4_game_members(uuid),public.se4_export_game(uuid),public.se4_end_game(uuid,bigint),public.se4_delete_game(uuid,bigint),public.se4_leave_game(uuid,bigint,uuid),public.se4_create_from_save(text,jsonb,jsonb,integer,integer,integer),public.se4_start_restored(uuid,bigint),public.se4_take_turn(uuid),public.se4_handoff(uuid,bigint,integer,integer,jsonb) to authenticated;

alter function public.se4_start_handoff(uuid,bigint,jsonb,integer) rename to se4_start_handoff_v2;
revoke all on function public.se4_start_handoff_v2(uuid,bigint,jsonb,integer) from public,anon,authenticated;
create function public.se4_start_handoff(g uuid,expected_revision bigint,initial_save jsonb,first_empire integer) returns bigint language plpgsql security definer set search_path='' as $$ declare game public.se4_games;rev bigint;begin
 select * into game from public.se4_games where id=g for update;
 if not public.se4_is_host(g) then raise exception 'Host only';end if;
 if game.revision<>expected_revision then raise exception 'Lobby changed; reload';end if;
 if game.phase<>'lobby' or game.setup->>'restored'='true' then raise exception 'Use the restored campaign start action';end if;
 if exists(select 1 from jsonb_array_elements_text(public.se4_human_slots(game.setup)) x(value) where not exists(select 1 from public.se4_members where game_id=g and empire=x.value::integer and left_at is null)) then raise exception 'Every human slot must join first';end if;
 if not exists(select 1 from public.se4_members where game_id=g and empire=first_empire and left_at is null) or initial_save->>'format' is distinct from 'OpenSE4-save-hex-v1' or octet_length(initial_save::text)>73400320 then raise exception 'Invalid initial turn';end if;
 rev=game.revision+1;insert into public.se4_checkpoints values(g,rev,initial_save);update public.se4_games set revision=rev,phase='playing',active_empire=first_empire,setup=jsonb_set(setup,'{local_handoff}','true') where id=g;
 insert into public.se4_notifications(game_id,user_id,revision) select g,user_id,rev from public.se4_members where game_id=g and empire=first_empire and left_at is null;return rev;end $$;
alter function public.se4_publish(uuid,bigint,integer,integer,jsonb,jsonb) rename to se4_publish_v1;
revoke all on function public.se4_publish_v1(uuid,bigint,integer,integer,jsonb,jsonb) from public,anon,authenticated;
create function public.se4_publish(g uuid,expected_revision bigint,next_turn integer,next_empire integer,checkpoint jsonb,player_views jsonb) returns bigint language plpgsql security definer set search_path='' as $$ declare game public.se4_games;begin
 select * into game from public.se4_games where id=g for update;
 if game.phase='finished' or game.paused then raise exception 'Game paused or closed';end if;
 return public.se4_publish_v1(g,expected_revision,next_turn,next_empire,checkpoint,player_views);end $$;
create function public.se4_replace_with_ai(g uuid,expected_revision bigint,slot integer,checkpoint jsonb,saved_turn integer,first_empire integer) returns bigint language plpgsql security definer set search_path='' as $$ declare game public.se4_games;slots jsonb;rev bigint;begin
 select * into game from public.se4_games where id=g for update;
 if not public.se4_is_host(g) then raise exception 'Host only';end if;
 if game.phase<>'playing' or not game.paused or game.revision<>expected_revision then raise exception 'Paused campaign changed; reload';end if;
 if exists(select 1 from public.se4_members where game_id=g and empire=slot and left_at is null) then raise exception 'Player slot is occupied';end if;
 if not public.se4_human_slots(game.setup) @> jsonb_build_array(slot) then raise exception 'Not a human slot';end if;
 if checkpoint->>'format' is distinct from 'OpenSE4-save-hex-v1' or octet_length(checkpoint::text)>73400320 then raise exception 'Invalid checkpoint';end if;
 select coalesce(jsonb_agg(value::integer),'[]'::jsonb) into slots from jsonb_array_elements_text(public.se4_human_slots(game.setup)) x(value) where value::integer<>slot;
 if jsonb_array_length(slots)<1 or not slots @> jsonb_build_array(first_empire) then raise exception 'No active human remains';end if;
 rev=game.revision+1;
 update public.se4_games set revision=rev,turn_number=saved_turn,active_empire=first_empire,setup=jsonb_set(setup,'{human_slots}',slots),paused=exists(select 1 from jsonb_array_elements_text(slots) x(value) where not exists(select 1 from public.se4_members where game_id=g and empire=x.value::integer and left_at is null)) where id=g;
 update public.se4_checkpoints set revision=rev,save=checkpoint where game_id=g;
 delete from public.se4_invites where game_id=g and empire=slot;delete from public.se4_notifications where game_id=g;
 insert into public.se4_notifications(game_id,user_id,revision) select g,user_id,rev from public.se4_members where game_id=g and empire=first_empire and left_at is null and (select not paused from public.se4_games where id=g);return rev;end $$;
revoke all on function public.se4_start_handoff(uuid,bigint,jsonb,integer),public.se4_publish(uuid,bigint,integer,integer,jsonb,jsonb),public.se4_replace_with_ai(uuid,bigint,integer,jsonb,integer,integer) from public,anon;
grant execute on function public.se4_start_handoff(uuid,bigint,jsonb,integer),public.se4_publish(uuid,bigint,integer,integer,jsonb,jsonb),public.se4_replace_with_ai(uuid,bigint,integer,jsonb,integer,integer) to authenticated;

COMMIT;
