-- Run as the project owner after migration 003. No service key is put in the browser.
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('se4-daily-game-cleanup','0 3 * * *',$job$select public.se4_cleanup();$job$);
