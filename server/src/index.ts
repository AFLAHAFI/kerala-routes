import express from 'express';
import {SnapshotEncoder} from '../../shared/snapshots.js';
import {createServer} from 'node:http';
import {Server} from 'socket.io';
import {createHash,randomBytes} from 'node:crypto';
import path from 'node:path';import {fileURLToPath} from 'node:url';
import {Simulation,cleanName} from './simulation.js';import {MemoryProfiles,SupabaseProfiles,EdgeProfiles,SaveQueue,type Profile} from './profiles.js';
import type {ClientEvents,ServerEvents,Settings} from '../../shared/types.js';
const bundled=import.meta.url.includes('/dist-server/');const production=process.env.NODE_ENV==='production'||bundled;
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),bundled?'..':'../..');
const origins=(process.env.CLIENT_ORIGINS||'http://localhost:3000,http://127.0.0.1:3000').split(',').map(s=>s.trim()).filter(Boolean);
const allowed=(origin:string|undefined)=>!origin||origins.includes(origin);
const app=express();app.disable('x-powered-by');const http=createServer(app);
const io=new Server<ClientEvents,ServerEvents>(http,{maxHttpBufferSize:8192,perMessageDeflate:{threshold:512},serveClient:false,cors:{origin:(origin,done)=>done(null,allowed(origin))},allowRequest:(req,done)=>done(null,allowed(req.headers.origin)),pingInterval:20000,pingTimeout:15000});
const store=process.env.SUPABASE_PROFILE_TOKEN?new EdgeProfiles(process.env.SUPABASE_URL||'',process.env.SUPABASE_PROFILE_TOKEN):process.env.SUPABASE_URL?new SupabaseProfiles(process.env.SUPABASE_URL,process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY||''):new MemoryProfiles();
if(process.env.REQUIRE_PERSISTENCE==='true'&&store instanceof MemoryProfiles)throw Error('Set SUPABASE_URL and SUPABASE_SECRET_KEY to enable durable saves.');
await store.check();
const sim=new Simulation();const sessions=new Map<string,string>();const signatures=new Map<string,string>();const lastProfiles=new Map<string,Profile>();const joining=new Set<string>();let closing=false;
const saves=new SaveQueue(store,(id,status)=>{const sid=sessions.get(id);if(sid)io.to(sid).emit('saveStatus',store instanceof MemoryProfiles?'Temporary local saves':status);});
function checkpoint(force=false){for(const p of sim.state.players){const signature=JSON.stringify([p.name,p.progress,p.settings]);if(force||signatures.get(p.id)!==signature){const profile={id:p.id,name:p.name,progress:p.progress,settings:p.settings,updated_at:new Date().toISOString()};lastProfiles.set(p.id,structuredClone(profile));saves.enqueue(profile);signatures.set(p.id,signature);}}}
app.get('/health',(_req,res)=>res.json({ok:!closing,version:'1.0.0-playtest',players:sim.state.players.length,capacity:12,transport:'Socket.IO',persistence:!(store instanceof MemoryProfiles)}));
app.get('/api/join',(_req,res)=>res.status(410).json({message:'This release uses Socket.IO. Refresh the game.'}));
io.on('connection',socket=>{let id='',count=0,actions=0,windowStart=Date.now();const expires=setTimeout(()=>{if(!id)socket.disconnect(true);},20000);
 socket.on('join',async(data,reply)=>{if(typeof reply!=='function'||closing)return;if(id){reply({ok:false,message:'Already joined.'});return;}const name=cleanName(data?.name);if(!name){reply({ok:false,message:'Enter a traveller name.'});return;}const token=data?.token;if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token)){reply({ok:false,message:'Invalid traveller identity. Reload the game.'});return;}const key=createHash('sha256').update(token).digest('hex');
  if(joining.has(key)){reply({ok:false,message:'This traveller is joining elsewhere. Use another name.'});return;}if(sessions.has(key)){reply({ok:false,message:'This traveller is already playing. Use a different name in the second tab.'});return;}joining.add(key);
  try{await saves.flush(key);const profile=lastProfiles.get(key)||await store.load(key);if(!socket.connected)return;const p=sim.join(key,name,profile?.progress);if(profile?.settings)p.settings=profile.settings;id=key;sessions.set(key,socket.id);delete sim.state.inputs[key];clearTimeout(expires);reply({ok:true,welcome:{id:key,...sim.snapshot(),capacity:12,saveMode:store.mode}});checkpoint();}
  catch{reply({ok:false,message:sim.state.players.length>=12?'The room has 12 players. Please try again later.':'Could not load saved progress. Please retry; your save has not been reset.'});}finally{joining.delete(key);}
 });
 socket.on('input',input=>{if(!id)return;if(Date.now()-windowStart>=1000){count=0;actions=0;windowStart=Date.now();}if(++count<=35)sim.input(id,input);});
 socket.on('action',(action,reply)=>{if(!id||typeof reply!=='function')return;if(++actions>8){reply({ok:false,message:'Please wait before trying again.'});return;}const result=sim.action(id,action);sim.advance();reply(result);checkpoint();});
 socket.on('settings',(settings,reply)=>{if(!id||typeof reply!=='function')return;const p=sim.state.players.find(p=>p.id===id);if(!p||!settings||!['auto','low','high'].includes(settings.quality)||typeof settings.muted!=='boolean'){reply({ok:false});return;}p.settings={quality:settings.quality,muted:settings.muted};checkpoint();reply({ok:true});});
 socket.on('ping',reply=>{if(typeof reply==='function')reply();});
 socket.on('emote',text=>{if(id)sim.action(id,{type:'emote',target:text});});
 socket.on('disconnect',()=>{clearTimeout(expires);if(!id)return;checkpoint();sessions.delete(id);sim.disconnect(id);void saves.flush(id);});
});
const encoder=new SnapshotEncoder();
const clock=setInterval(()=>{const now=Date.now();for(const id of sessions.keys())sim.state.seen[id]=now;sim.advance(now);},1000/30);let tick=0;
const broadcast=setInterval(()=>{if(!sim.state.players.length)return;const snapshot=sim.snapshot();io.emit('snapshot',encoder.encode(snapshot));if(++tick%30===0)checkpoint();},1000/15);
const retry=setInterval(()=>void saves.retry(),10000);
if(production)app.use(express.static(path.join(root,'dist/client')));else{const {createServer:createVite}=await import('vite');app.use((await createVite({configFile:path.join(root,'client/vite.config.ts'),server:{middlewareMode:true},appType:'spa'})).middlewares);}
http.listen(Number(process.env.PORT)||3000,'0.0.0.0',()=>console.log(`Kerala Routes V1 ready on port ${Number(process.env.PORT)||3000} · ${store.mode}`));
async function shutdown(){if(closing)return;closing=true;clearInterval(clock);clearInterval(broadcast);clearInterval(retry);checkpoint(true);io.emit('notice','Server restarting. Reconnecting shortly…');await Promise.race([saves.flush(),new Promise(r=>setTimeout(r,8000))]);io.close();http.close(()=>process.exit(0));setTimeout(()=>process.exit(0),1000).unref();}process.on('SIGTERM',()=>void shutdown());process.on('SIGINT',()=>void shutdown());
