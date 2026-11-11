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
