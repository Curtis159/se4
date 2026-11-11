// Supabase REST boundary. Requires an authenticated user's access token.
// Nothing in this adapter simulates game rules or contains a service-role key.
export class OnlineGames {
 constructor({url,publishableKey,accessToken,fetcher=fetch}){const origin=new URL(url);if(origin.protocol!=='https:'&&origin.hostname!=='localhost'&&origin.hostname!=='127.0.0.1')throw Error('Supabase needs HTTPS');this.url=origin.origin;this.key=publishableKey;this.token=accessToken;this.fetcher=fetcher;}
 async request(path,body,method='POST'){const response=await this.fetcher(this.url+path,{method,headers:{apikey:this.key,Authorization:'Bearer '+this.token,'Content-Type':'application/json',Prefer:'resolution=merge-duplicates'},...(body===undefined?{}:{body:JSON.stringify(body)})});const text=await response.text();let data;try{data=text?JSON.parse(text):null;}catch{throw Error('Invalid online service response');}if(!response.ok)throw Error(data?.message||'Online request failed ('+response.status+')');return data;}
 rpc(name,args){return this.request('/rest/v1/rpc/'+name,args);}
 create(name,mode,setup){return this.rpc('se4_create_game',{title:name,play_mode:mode,configuration:setup});}
 invite(game,email,empire){return this.rpc('se4_invite',{g:game,recipient:email,slot:empire});}
 accept(token){return this.rpc('se4_accept_invite',{token});}
 list(){return this.rpc('se4_list_games',{});}
 members(game){return this.rpc('se4_game_members',{g:game});}
 exportGame(game){return this.rpc('se4_export_game',{g:game});}
 end(game,revision){return this.rpc('se4_end_game',{g:game,expected_revision:revision});}
 remove(game,revision){return this.rpc('se4_delete_game',{g:game,expected_revision:revision});}
 leave(game,revision,successor=null){return this.rpc('se4_leave_game',{g:game,expected_revision:revision,successor});}
 submit(game,revision,commands,nonce=crypto.randomUUID()){return this.rpc('se4_submit_orders',{g:game,expected_revision:revision,request_nonce:nonce,orders:commands});}
 publish(game,revision,turn,empire,checkpoint,views){return this.rpc('se4_publish',{g:game,expected_revision:revision,next_turn:turn,next_empire:empire,checkpoint,player_views:views});}
 view(game,user){return this.request('/rest/v1/se4_views?game_id=eq.'+encodeURIComponent(game)+'&user_id=eq.'+encodeURIComponent(user)+'&select=revision,snapshot',undefined,'GET');}
 async subscribeToPush(user,vapidPublicKey){if(!globalThis.isSecureContext||!navigator.serviceWorker||!globalThis.PushManager)throw Error('Push requires a supported browser on HTTPS');if(await Notification.requestPermission()!=='granted')throw Error('Notifications were not enabled');const registration=await navigator.serviceWorker.register('./sw.js');await navigator.serviceWorker.ready;const encoded=vapidPublicKey.replace(/-/g,'+').replace(/_/g,'/'),key=Uint8Array.from(atob(encoded+'='.repeat((4-encoded.length%4)%4)),c=>c.charCodeAt(0));const subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:key});return this.request('/rest/v1/se4_push_subscriptions?on_conflict=user_id,endpoint',{user_id:user,endpoint:subscription.endpoint,subscription:subscription.toJSON()});}
}
