-- Run after the function, its secrets, and the Vault secret below are configured.
-- In Supabase Vault create: se4_push_worker_secret = your PUSH_WORKER_SECRET.
-- The token value is not stored in this file or cron.job.command.
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
do $check$
begin
 if not exists(select 1 from vault.decrypted_secrets where name='se4_push_worker_secret' and length(decrypted_secret)>0) then
  raise exception 'Create the se4_push_worker_secret Vault secret first';
 end if;
end;
$check$;
select cron.schedule('se4-turn-push','* * * * *',$job$
 select net.http_post(
  url := 'https://boydalkiyyylhzhlweok.supabase.co/functions/v1/send-turn-push',
  headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='se4_push_worker_secret' limit 1)),
  body := '{}'::jsonb
 );
$job$);
