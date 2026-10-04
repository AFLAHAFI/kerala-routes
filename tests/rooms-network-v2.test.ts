import test from 'node:test';import assert from 'node:assert/strict';import {spawn} from 'node:child_process';import {io,type Socket} from 'socket.io-client';
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
test('real sockets isolate private snapshots/chat, block delivery and keep progress identity across rooms',{timeout:15000},async()=>{
 const child=spawn(process.execPath,['--import','tsx','server/src/index.ts'],{env:{...process.env,LOCAL_ONLY:'true',PORT:'3203',NODE_ENV:'production',RECONNECT_GRACE_MS:'0'},stdio:'ignore'}),clients:Socket[]=[];
 const join=async(index:number,options={})=>{const socket=io('http://127.0.0.1:3203',{transports:['websocket'],reconnection:false});clients.push(socket);const welcome=await new Promise<any>((resolve,reject)=>{socket.on('connect_error',reject);socket.on('connect',()=>socket.emit('join',{name:'Room test '+index,token:index.toString(16).padStart(64,'0'),...options},(result:any)=>result.ok?resolve(result.welcome):reject(Error(result.message))));});return {socket,welcome};};
 try{
  for(let n=0;n<50;n++){try{if((await fetch('http://127.0.0.1:3203/health')).ok)break;}catch{}await sleep(100);}
  const owner=await join(71,{createPrivate:true}),friend=await join(72,{room:owner.welcome.roomId}),publicPlayer=await join(73);
  assert.equal(friend.welcome.players.length,2);assert.equal(publicPlayer.welcome.players.length,1);assert.notEqual(owner.welcome.roomId,publicPlayer.welcome.roomId);
  const received:any[]=[],leaked:any[]=[];friend.socket.on('chat',m=>received.push(m));publicPlayer.socket.on('chat',m=>leaked.push(m));
  const send=(text:string)=>new Promise<any>(resolve=>owner.socket.emit('chat',text,resolve));assert.ok((await send('Private hello')).ok);await sleep(100);assert.equal(received.length,1);assert.equal(leaked.length,0);
  friend.socket.emit('block',owner.welcome.id,true);await sleep(50);assert.ok((await send('Another message')).ok);await sleep(100);assert.equal(received.length,1);
  const report=await new Promise<any>(resolve=>friend.socket.emit('report',{target:owner.welcome.id,reason:'Spam',messageId:received[0].id},resolve));assert.ok(report.ok);
  const list=await new Promise<any[]>(resolve=>publicPlayer.socket.emit('rooms',resolve));assert.ok(!list.some(r=>r.id===owner.welcome.roomId));
  const frames:any[]=[];publicPlayer.socket.on('snapshot',f=>frames.push(f));await sleep(150);assert.ok(frames.length);assert.ok(frames.every(f=>f.players.every((p:any)=>p.id===publicPlayer.welcome.id)));
  owner.socket.emit('leave');owner.socket.disconnect();await sleep(150);const moved=await join(71,{room:'public-2'});assert.equal(moved.welcome.id,owner.welcome.id);assert.equal(moved.welcome.roomId,'public-2');
 }finally{for(const socket of clients)socket.disconnect();child.kill();}
});
