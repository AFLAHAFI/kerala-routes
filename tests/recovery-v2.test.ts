import test from 'node:test';import assert from 'node:assert/strict';import {spawn} from 'node:child_process';
import {io,type Socket} from 'socket.io-client';import {SnapshotDecoder} from '../shared/snapshots';import type {Snapshot,Welcome} from '../shared/types';
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
test('V2 reconnect grace preserves driver ownership, brakes safely and releases expired reservations',{timeout:20000},async()=>{
 const child=spawn(process.execPath,['--import','tsx','server/src/index.ts'],{env:{...process.env,LOCAL_ONLY:'true',PORT:'3202',NODE_ENV:'production',RECONNECT_GRACE_MS:'1200',DAY_CYCLE_SECONDS:'1800'},stdio:'ignore'});const sockets:Socket[]=[];let state:Snapshot|undefined;
 const join=async()=>{const socket=io('http://127.0.0.1:3202',{transports:['websocket'],reconnection:false});sockets.push(socket);const decoder=new SnapshotDecoder();socket.on('snapshot',frame=>state=decoder.decode(frame));const welcome=await new Promise<Welcome>((resolve,reject)=>{socket.on('connect_error',reject);socket.on('connect',()=>socket.emit('join',{name:'Grace driver',token:'c'.repeat(64)},(r:any)=>{if(!r.ok)return reject(Error(r.message));decoder.reset({...r.welcome,events:[]});state={...r.welcome,events:[]};resolve(r.welcome);}));});return {socket,welcome};};
 try{
  for(let i=0;i<60;i++){try{if((await fetch('http://127.0.0.1:3202/health')).ok)break;}catch{}await sleep(100);}
  const first=await join();assert.equal(first.welcome.clock?.cycleSeconds,1800);const id=first.welcome.id;let seq=0;
  for(let i=0;i<130;i++){const p=state!.players.find(p=>p.id===id)!;const dx=29-p.x,dz=11-p.z,len=Math.hypot(dx,dz);if(len<.8)break;first.socket.emit('input',{seq:++seq,x:dx/len,z:dz/len,sprint:true});await sleep(50);}
  first.socket.emit('input',{seq:++seq,x:0,z:0,sprint:false});
  const result=await new Promise<any>(r=>first.socket.emit('action',{type:'claim',target:'bus-1'},r));assert.ok(result.ok,result.message);first.socket.io.engine.close();await sleep(150);
  assert.equal((await(await fetch('http://127.0.0.1:3202/health')).json()).players,1,'reservation remains in room');
  const second=await join(),p=second.welcome.players.find(p=>p.id===id)!;assert.equal(p.role,'driver');assert.equal(second.welcome.buses[0].driver,id);assert.equal(second.welcome.buses[0].handbrake,true);assert.equal(second.welcome.buses[0].speed,0);assert.ok(second.welcome.clock!.minute>=first.welcome.clock!.minute);
  second.socket.io.engine.close();await sleep(1450);assert.equal((await(await fetch('http://127.0.0.1:3202/health')).json()).players,0);
  const third=await join();assert.equal(third.welcome.players.find(p=>p.id===id)!.role,'walker');assert.equal(third.welcome.buses[0].driver,null);third.socket.emit('leave');third.socket.disconnect();await sleep(100);assert.equal((await(await fetch('http://127.0.0.1:3202/health')).json()).players,0);
 }finally{sockets.forEach(s=>s.disconnect());child.kill();}
});
