// Private scheduled outbox worker. Never put either secret in the browser.
import {createClient} from 'npm:@supabase/supabase-js@2.81.1';
import webpush from 'npm:web-push@3.6.7';
Deno.serve(async request=>{
 const secret=Deno.env.get('PUSH_WORKER_SECRET');
 if(!secret||request.headers.get('authorization')!==`Bearer ${secret}`)return new Response('Unauthorized',{status:401});
 if(request.method!=='POST')return new Response('POST required',{status:405});
 const origin=Deno.env.get('APP_ORIGIN')?.replace(/\/$/,'');
 if(!origin||!Deno.env.get('VAPID_PUBLIC_KEY')||!Deno.env.get('VAPID_PRIVATE_KEY')||!Deno.env.get('VAPID_SUBJECT'))return new Response('Push configuration incomplete',{status:503});
 const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
 webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT')!,Deno.env.get('VAPID_PUBLIC_KEY')!,Deno.env.get('VAPID_PRIVATE_KEY')!);
 const {data:pending,error}=await db.from('se4_notifications').select('id,game_id,user_id,revision,kind,se4_games(phase,paused,revision,active_empire)').is('delivered_at',null).order('id').limit(50);
 if(error)return new Response('Outbox unavailable',{status:500});
 let delivered=0,sent=0,waitingForDevice=0,skipped=0,failed=0;
 for(const item of pending??[]){
  const {data:member,error:memberError}=await db.from('se4_members').select('user_id,empire').eq('game_id',item.game_id).eq('user_id',item.user_id).is('left_at',null).maybeSingle();
  if(memberError){failed++;continue;}
  const game=Array.isArray(item.se4_games)?item.se4_games[0]:item.se4_games;
  if(!member||(item.kind==='turn'&&(!game||game.phase!=='playing'||game.paused||Number(game.revision)!==Number(item.revision)||game.active_empire!==member.empire))){await db.from('se4_notifications').update({delivered_at:new Date().toISOString()}).eq('id',item.id);skipped++;continue;}
  const {data:subscriptions,error:queryError}=await db.from('se4_push_subscriptions').select('endpoint,subscription').eq('user_id',item.user_id);
  if(queryError){failed++;continue;}
  if(!subscriptions?.length){waitingForDevice++;continue;}
  let anyFailed=false,noticeSent=0;
  for(const row of subscriptions){try{
   const endpoint=new URL(row.subscription?.endpoint);
   const provider=['fcm.googleapis.com','updates.push.services.mozilla.com','web.push.apple.com'].includes(endpoint.hostname)||endpoint.hostname.endsWith('.notify.windows.com');
   if(endpoint.href!==new URL(row.endpoint).href||endpoint.protocol!=='https:'||endpoint.username||endpoint.password||(endpoint.port&&endpoint.port!=='443')||!provider)throw Error('Unsupported push service');
   await webpush.sendNotification(row.subscription,JSON.stringify({title:item.kind==='turn'?'Your turn':'Game cleanup notice',body:item.kind==='turn'?'Your Space Empires game is ready.':item.kind==='closed'?'This closed game is scheduled for cleanup. Open it to save a local copy.':'This inactive game is scheduled for cleanup. Open it to keep the game or save a copy.',url:`${origin}/?game=${item.game_id}`,tag:`${item.game_id}:${item.revision}`}),{TTL:86400,timeout:10000});
   sent++;noticeSent++;
  }catch(error){if([404,410].includes(Number((error as {statusCode?:number})?.statusCode)))await db.from('se4_push_subscriptions').delete().eq('user_id',item.user_id).eq('endpoint',row.endpoint);else anyFailed=true;}}
  if(!anyFailed&&noticeSent>0){const {error:updateError}=await db.from('se4_notifications').update({delivered_at:new Date().toISOString()}).eq('id',item.id);if(updateError)failed++;else delivered++;}
  else if(anyFailed)failed++;else waitingForDevice++;
 }
 return Response.json({delivered,sent,waitingForDevice,skipped,failed});
});
