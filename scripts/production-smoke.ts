// Explicit deployment QA only. Uses new identities and an isolated private room.
import assert from 'node:assert/strict';import {randomBytes} from 'node:crypto';import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {io,type Socket} from 'socket.io-client';import {SnapshotDecoder} from '../shared/snapshots';import {seatPosition} from '../server/src/simulation';import type {Snapshot} from '../shared/types';
// In a managed proxy environment, point QA_PROXY_AGENT_MODULE to an installed https-proxy-agent module.
const proxyModule=process.env.QA_PROXY_AGENT_MODULE;
const agent=proxyModule?new (await import(proxyModule)).HttpsProxyAgent(process.env.WSS_PROXY||process.env.HTTPS_PROXY||process.env.https_proxy!):undefined;
const url='https://kerala-routes-server.onrender.com',sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms)),sockets:Socket[]=[],file='.local-saves/release-qa.json';
const reconnect=process.argv.includes('--reload'),record=reconnect?JSON.parse(await readFile(file,'utf8')):{tokens:Array.from({length:15},()=>randomBytes(32).toString('hex')),room:''};
const health=await(await fetch(url+'/health',{signal:AbortSignal.timeout(60000)})).json();assert.equal(health.version,'2.0.0-rc.1');assert.equal(health.persistence,true);
async function join(index:number,create=false){const socket=io(url,{agent,transports:['websocket'],reconnection:false,timeout:60000,extraHeaders:{Origin:index%2?'https://kerala-routes-first-journey.aflah123.chatgpt.site':'https://aflahafi.github.io'}}),decoder=new SnapshotDecoder();sockets.push(socket);let state:Snapshot;const welcome=await new Promise<any>((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('Join timeout')),70000);socket.on('connect_error',reject);socket.on('connect',()=>socket.emit('join',{name:'RC1 QA '+index,token:record.tokens[index],room:record.room||'public-1',createPrivate:create},(r:any)=>{clearTimeout(timeout);if(!r.ok)return reject(Error(r.message));state={...r.welcome,events:[]};decoder.reset(state);resolve(r.welcome);}));socket.on('snapshot',frame=>state=decoder.decode(frame));});return {socket,id:welcome.id,welcome,get state(){return state!;},seq:0};}
async function ack(c:Awaited<ReturnType<typeof join>>,event:string,...args:any[]){await sleep(250);return await new Promise<any>((resolve,reject)=>c.socket.timeout(20000).emit(event,...args,(e:Error|null,r:any)=>e?reject(e):resolve(r)));}
async function act(c:Awaited<ReturnType<typeof join>>,action:object){const result=await ack(c,'action',action);assert.ok(result.ok,result.message);await sleep(400);}
async function walk(c:Awaited<ReturnType<typeof join>>,x:number,z:number){for(let i=0;i<180;i++){const p=c.state.players.find(p=>p.id===c.id)!;const dx=x-p.x,dz=z-p.z,n=Math.hypot(dx,dz);if(n<1){c.socket.emit('input',{seq:++c.seq,x:0,z:0,sprint:false});await sleep(500);return;}c.socket.emit('input',{seq:++c.seq,x:dx/n,z:dz/n,sprint:true});await sleep(100);}throw Error('Walk failed');}
try{
 if(reconnect){const p=await join(0,true);assert.deepEqual(p.welcome.players.find((v:any)=>v.id===p.id).progress,record.saved);console.log(JSON.stringify({serverRestartSupabaseReload:'passed',savedKP:record.saved.kp}));}
 else{
  const d=await join(0,true);record.room=d.welcome.roomId;const p=await join(1);assert.equal(d.welcome.npcs.length,5);assert.equal(d.welcome.capacity,15);
  await Promise.all([walk(d,29,11),walk(p,29.2,14)]);await act(d,{type:'claim',target:'bus-1'});await act(p,{type:'board',target:'bus-1'});await act(d,{type:'door'});await act(d,{type:'handbrake'});
  for(let i=0;i<20;i++){d.socket.emit('input',{seq:++d.seq,x:0,z:0,sprint:false,throttle:1});await sleep(100);}assert.ok(d.state.buses[0].speed>1);
  const passenger=p.state.players.find(v=>v.id===p.id)!,bus=p.state.buses[0],seat=seatPosition(bus,passenger.seat);assert.equal(passenger.role,'passenger');assert.ok(Math.hypot(passenger.x-seat.x,passenger.z-seat.z)<.02);
  for(let i=0;i<12;i++){d.socket.emit('input',{seq:++d.seq,x:0,z:0,sprint:false,brake:true});await sleep(100);}await act(d,{type:'door'});await act(p,{type:'exit'});
  assert.ok((await ack(d,'leaderboard','KP')).ok);assert.ok((await ack(d,'chat','RC1 automated deployment check')).ok);
  const participants=[d,p];for(let i=2;i<15;i++)participants.push(await join(i));await sleep(3000);assert.equal(d.state.players.length,15);
  record.ids=participants.map(p=>p.id);record.saved=d.state.players.find(p=>p.id===d.id)!.progress;await mkdir('.local-saves',{recursive:true});await writeFile(file,JSON.stringify(record),{mode:0o600});
  console.log(JSON.stringify({health,isolatedRoom:record.room,players:15,npcs:5,origins:['Pages','Sites'],boarding:'passed',driving:'passed',seatAnchoring:'passed',exit:'passed',leaderboard:'passed',chat:'passed',testIds:record.ids,savedKP:record.saved.kp}));
 }
}finally{for(const s of sockets){s.emit('leave');s.disconnect();}}
