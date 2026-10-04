import {LEADERBOARD_METRICS,type LeaderboardRow} from '../../shared/leaderboards.js';
import express from 'express';
import {monitorEventLoopDelay} from 'node:perf_hooks';
import {createServer} from 'node:http';
import {Server} from 'socket.io';
import {createHash,timingSafeEqual} from 'node:crypto';
import path from 'node:path';import {fileURLToPath} from 'node:url';
import {Rooms,type GameRoom} from './rooms.js';import {RoomSocial} from './social.js';
import {cleanName} from './simulation.js';
import {FileProfiles,MemoryProfiles,SupabaseProfiles,EdgeProfiles,SaveQueue,type Profile} from './profiles.js';
import type {ClientEvents,ServerEvents} from '../../shared/types.js';
const eventLoop=monitorEventLoopDelay({resolution:20});eventLoop.enable();let tickMs=0,frameBytes=0;
const bundled=import.meta.url.includes('/dist-server/'),production=process.env.NODE_ENV==='production'||bundled;
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),bundled?'..':'../..');
const origins=((process.env.CLIENT_ORIGINS||'http://localhost:3000,http://127.0.0.1:3000')+','+(process.env.EXTRA_CLIENT_ORIGINS||'')).split(',').map(s=>s.trim()).filter(Boolean);
const allowed=(origin:string|undefined)=>!origin||origins.includes(origin)||(process.env.LOCAL_ONLY==='true'&&/^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+):5173$/.test(origin));
const app=express();app.disable('x-powered-by');const http=createServer(app);
const io=new Server<ClientEvents,ServerEvents>(http,{maxHttpBufferSize:8192,perMessageDeflate:{threshold:512},serveClient:false,cors:{origin:(origin,done)=>done(null,allowed(origin))},allowRequest:(req,done)=>done(null,allowed(req.headers.origin)),pingInterval:20000,pingTimeout:30000});
if(process.env.LOCAL_ONLY==='true')for(const key of Object.keys(process.env))if(key.startsWith('SUPABASE_')||key==='REQUIRE_PERSISTENCE'||key==='VITE_SERVER_URL')delete process.env[key];
const store=process.env.LOCAL_ONLY==='true'&&process.env.LOCAL_SAVE_DIR?new FileProfiles(path.resolve(process.env.LOCAL_SAVE_DIR)):process.env.SUPABASE_PROFILE_TOKEN?new EdgeProfiles(process.env.SUPABASE_URL||'',process.env.SUPABASE_PROFILE_TOKEN):process.env.SUPABASE_URL?new SupabaseProfiles(process.env.SUPABASE_URL,process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||''):new MemoryProfiles();
if(process.env.REQUIRE_PERSISTENCE==='true'&&store instanceof MemoryProfiles)throw Error('Configure persistent saves before starting production.');
await store.check();const moderationHistory=await store.recentModeration();
const capacity=Math.max(2,Math.min(15,Number(process.env.ROOM_CAPACITY)||15)),rooms=new Rooms(capacity);
const reconnectGrace=Math.max(0,Math.min(60000,Number(process.env.RECONNECT_GRACE_MS??20000)||0));
const sessions=new Map<string,{socket:string;room:string}>(),signatures=new Map<string,string>(),lastProfiles=new Map<string,Profile>(),joining=new Set<string>();
const resumes=new Map<string,{x:number;z:number;yaw:number;room:string;expires:number}>();
const boardCache=new Map<string,{at:number;rows:LeaderboardRow[]}>();
const socials=new Map<string,RoomSocial>();let closing=false;
function social(room:GameRoom){let value=socials.get(room.id);if(!value){value=new RoomSocial(room.id,record=>store.record(record));value.restore(moderationHistory);socials.set(room.id,value);}return value;}
const saves=new SaveQueue(store,(id,status)=>{const session=sessions.get(id);if(session)io.to(session.socket).emit('saveStatus',store instanceof MemoryProfiles?'Temporary local saves':status);});
function checkpoint(force=false){for(const room of rooms.all.values())for(const p of room.sim.state.players){const signature=JSON.stringify([p.name,p.progress,p.settings]);if(force||signatures.get(p.id)!==signature){const profile={id:p.id,name:p.name,progress:p.progress,settings:p.settings,updated_at:new Date().toISOString()};lastProfiles.set(p.id,structuredClone(profile));saves.enqueue(profile);signatures.set(p.id,signature);}}}
app.get('/health',(_req,res)=>res.json({ok:!closing,version:'2.0.0-rc.1',players:[...rooms.all.values()].reduce((n,r)=>n+r.sim.state.players.length,0),capacity,rooms:rooms.all.size,transport:'Socket.IO',persistence:!(store instanceof MemoryProfiles)}));
app.get('/api/join',(_req,res)=>res.status(410).json({message:'This release uses Socket.IO. Refresh the game.'}));
app.post('/api/moderation',express.json({limit:'4kb'}),async(req,res)=>{
 const secret=process.env.MODERATOR_TOKEN||'',given=(req.headers.authorization||'').replace(/^Bearer /,'');
 if(secret.length<32||Buffer.byteLength(secret)!==Buffer.byteLength(given)||!timingSafeEqual(Buffer.from(secret),Buffer.from(given))){res.status(403).json({error:'Moderator authorization required.'});return;}
 const {room:roomId,target,kind,minutes,reason}=req.body||{},room=rooms.all.get(roomId);
 if(!room||typeof target!=='string'||!/^[a-f0-9]{64}$/.test(target)||typeof reason!=='string'){res.status(400).json({error:'Invalid moderation request.'});return;}
 try{await social(room).moderate(target,kind,minutes,reason);if(kind==='kick'||kind==='ban'){const sid=sessions.get(target);if(sid?.room===room.id){const socket=io.sockets.sockets.get(sid.socket);if(socket){socket.data.deliberateLeave=true;socket.emit('notice','A moderator ended this room session.');socket.disconnect(true);}}}res.json({ok:true});}catch{res.status(400).json({error:'Action could not be recorded or validated. No action applied.'});}
});
io.on('connection',socket=>{
 let lastLeaderboard=0,pendingJoin=false,id='',room=rooms.get(),count=0,actions=0,windowStart=Date.now(),blocked=new Set<string>();
 const expires=setTimeout(()=>{if(!id)socket.disconnect(true);},20000);
 socket.on('leave',()=>{socket.data.deliberateLeave=true;});
 socket.on('rooms',reply=>{if(typeof reply==='function')reply(rooms.list());});
 socket.on('join',async(data,reply)=>{
  if(typeof reply!=='function'||closing)return;if(id||pendingJoin){reply({ok:false,message:'Already joined or joining.'});return;}
  const name=cleanName(data?.name);if(!name){reply({ok:false,message:'Enter a traveller name.'});return;}
  const token=data?.token;if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token)){reply({ok:false,message:'Invalid traveller identity. Reload the game.'});return;}
  const key=createHash('sha256').update(token).digest('hex');
  if(joining.has(key)||sessions.has(key)){reply({ok:false,message:'This traveller is already playing. Use a different name in the second tab.'});return;}
  pendingJoin=true;joining.add(key);
  try{
   const reserved=rooms.findPlayer(key);room=reserved||rooms.get(data.room||'public-1',data.createPrivate===true);
   if(social(room).banned(key))throw Error('Your access to this room is temporarily suspended.');
   await saves.flush(key);const profile=lastProfiles.get(key)||await store.load(key);if(!socket.connected)return;
   const p=room.sim.join(key,name,profile?.progress);if(profile?.settings)p.settings=profile.settings;
   const resume=resumes.get(key);if(resume&&resume.room===room.id&&resume.expires>Date.now())Object.assign(p,{x:resume.x,z:resume.z,yaw:resume.yaw});resumes.delete(key);room.reserved.delete(key);
   blocked=new Set((Array.isArray(data.blocked)?data.blocked:[]).filter(v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v)).slice(0,100));socket.data.blocked=blocked;
   id=key;sessions.set(key,{socket:socket.id,room:room.id});await socket.join(room.id);delete room.sim.state.inputs[key];clearTimeout(expires);
   reply({ok:true,welcome:{id:key,...room.sim.snapshot(),roomId:room.id,privateRoom:room.privateRoom,chat:social(room).messages.filter(m=>!blocked.has(m.player)),capacity,saveMode:store.mode,clock:room.clock.sample()}});checkpoint();
  }catch(error){reply({ok:false,message:room.sim.state.players.length>=capacity?'This room is full. Please try again later.':error instanceof Error&&/room|suspended/i.test(error.message)?error.message:'Could not load saved progress. Please retry; your save has not been reset.'});}finally{joining.delete(key);pendingJoin=false;}
 });
 const rate=()=>{if(Date.now()-windowStart>=1000){count=0;actions=0;windowStart=Date.now();}};
 socket.on('input',input=>{if(!id)return;rate();if(++count<=35)room.sim.input(id,input);});
 socket.on('action',(action,reply)=>{if(!id||typeof reply!=='function')return;rate();if(++actions>8){reply({ok:false,message:'Please wait before trying again.'});return;}const result=room.sim.action(id,action);room.sim.advance();reply(result);checkpoint();});
 socket.on('settings',(settings,reply)=>{if(!id||typeof reply!=='function')return;const p=room.sim.state.players.find(p=>p.id===id);if(!p||!settings||!['auto','low','medium','high'].includes(settings.quality)||typeof settings.muted!=='boolean'){reply({ok:false});return;}p.settings={quality:settings.quality,muted:settings.muted};checkpoint();reply({ok:true});});
 socket.on('leaderboard',async(metric,reply)=>{if(!id||typeof reply!=='function')return;if(!LEADERBOARD_METRICS.includes(metric)||Date.now()-lastLeaderboard<1500){reply({ok:false,message:'Please wait before refreshing.'});return;}lastLeaderboard=Date.now();try{let cached=boardCache.get(metric);if(!cached||Date.now()-cached.at>30000){await saves.flush();cached={at:Date.now(),rows:await store.leaderboard(metric)};boardCache.set(metric,cached);}reply({ok:true,rows:cached.rows});}catch{reply({ok:false,message:'Leaderboard unavailable. Your progress is unchanged.'});}});
 socket.on('chat',(text,reply)=>{if(!id||typeof reply!=='function')return;try{const message=social(room).send(id,room.sim.state.players.find(p=>p.id===id)!.name,text);for(const sid of io.sockets.adapter.rooms.get(room.id)||[]){const recipient=io.sockets.sockets.get(sid);if(!recipient?.data.blocked?.has(id))recipient?.emit('chat',message);}reply({ok:true});}catch(error){reply({ok:false,message:(error as Error).message});}});
 socket.on('block',(target,value)=>{if(id&&typeof value==='boolean'&&typeof target==='string'&&/^[a-f0-9]{64}$/.test(target)&&target!==id){if(value&&blocked.size<100)blocked.add(target);else if(!value)blocked.delete(target);}});
 socket.on('report',async(request,reply)=>{if(!id||typeof reply!=='function')return;try{await social(room).report(id,request,[...room.sim.state.players.map(p=>p.id),...social(room).messages.map(m=>m.player)]);reply({ok:true,message:'Report saved for review. Reports do not automatically ban players.'});}catch(error){reply({ok:false,message:'Report not saved: '+(error as Error).message});}});
 socket.on('ping',reply=>{if(typeof reply==='function')reply();});
 socket.on('emote',text=>{if(id)room.sim.action(id,{type:'emote',target:text});});
 socket.on('disconnect',reason=>{
  clearTimeout(expires);if(!id)return;const p=room.sim.state.players.find(p=>p.id===id);if(p)resumes.set(id,{x:p.x,z:p.z,yaw:p.yaw,room:room.id,expires:Date.now()+60000});
  if(process.env.LOCAL_ONLY==='true')console.log('disconnect',reason);checkpoint();sessions.delete(id);
  if(reconnectGrace>0&&!socket.data.deliberateLeave){room.reserved.set(id,Date.now()+reconnectGrace);delete room.sim.state.inputs[id];const bus=room.sim.state.buses.find(b=>b.driver===id);if(bus){bus.speed=0;bus.handbrake=true;}}
  else room.sim.disconnect(id);void saves.flush(id);
 });
});
const clock=setInterval(()=>{
 const now=Date.now(),start=performance.now();for(const room of rooms.all.values()){
  for(const [id,session] of sessions)if(session.room===room.id)room.sim.state.seen[id]=now;
  for(const [id,until] of room.reserved)if(until>now)room.sim.state.seen[id]=now;else{room.reserved.delete(id);room.sim.disconnect(id,now);}
  if(room.sim.state.players.length){room.sim.minute=room.clock.sample(now).minute;room.sim.advance(now);}
 }
 tickMs=performance.now()-start;for(const [key,r] of resumes)if(r.expires<now){resumes.delete(key);if(!saves.dirty&&!sessions.has(key)){lastProfiles.delete(key);signatures.delete(key);}}
 rooms.prune(now);for(const id of socials.keys())if(!rooms.all.has(id))socials.delete(id);
},1000/30);
const broadcast=setInterval(()=>{
 for(const room of rooms.all.values()){if(!room.sim.state.players.length)continue;const frame=room.encoder.encode(room.sim.snapshot());io.to(room.id).emit('snapshot',frame);
  if(++room.tick%30===0){checkpoint();if(process.env.LOCAL_ONLY==='true'){frameBytes=Buffer.byteLength(JSON.stringify(frame));io.to(room.id).emit('diagnostics' as any,{tickMs,frameBytes,eventLoopMs:Number(eventLoop.mean/1e6)||0,heapMB:process.memoryUsage().heapUsed/1048576,sockets:io.engine.clientsCount});}}
 }
},1000/15);
const timeSync=setInterval(()=>{for(const room of rooms.all.values())if(room.sim.state.players.length)io.to(room.id).emit('clock',room.clock.sample());eventLoop.reset();},5000);
const retry=setInterval(()=>void saves.retry(),10000);
if(production)app.use(express.static(path.join(root,'dist/client')));else{const {createServer:createVite}=await import('vite');app.use((await createVite({configFile:path.join(root,'client/vite.config.ts'),server:{middlewareMode:true},appType:'spa'})).middlewares);}
http.listen(Number(process.env.PORT)||3000,'0.0.0.0',()=>console.log(`Kerala Routes V2 alpha ready on port ${Number(process.env.PORT)||3000} · ${store.mode}`));
async function shutdown(){if(closing)return;closing=true;clearInterval(clock);clearInterval(broadcast);clearInterval(retry);clearInterval(timeSync);checkpoint(true);io.emit('notice','Server restarting. Reconnecting shortly…');await Promise.race([saves.flush(),new Promise(r=>setTimeout(r,8000))]);io.close();http.close(()=>process.exit(0));setTimeout(()=>process.exit(0),1000).unref();}
process.on('SIGTERM',()=>void shutdown());process.on('SIGINT',()=>void shutdown());
