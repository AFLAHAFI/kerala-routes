import type {LeaderboardMetric,LeaderboardRow} from '../../../shared/leaderboards';
import type {ChatMessage,ReportRequest} from '../../../shared/social';
import {InputGate} from './InputGate';
import {SnapshotDecoder,type Frame} from '../../../shared/snapshots';
import {io,type Socket} from 'socket.io-client';
import type {Welcome,Snapshot,Input,Action,Emote,Settings} from '../../../shared/types';
export class Connection {
 constructor(private endpoint?:string){}
 private decoder=new SnapshotDecoder();
 diagnostics={state:'Disconnected',reason:'',packets:0,bytes:0,sentPackets:0,sentBytes:0,sentPerSecond:0,sentBytesPerSecond:0,reconnects:0,packetsPerSecond:0,bytesPerSecond:0,server:{} as Record<string,number>};private sampleAt=0;private lastPacket=0;private pingPending=false;private retryTimer=0;private joinTimer=0;private retryCount=0;
 roomId='kerala-main';private createPrivate=false;blocked=new Set<string>();onChat:(message:ChatMessage)=>void=()=>{};
 id='';private token='';private socket:Socket|null=null;private healthy=false;private name='';private lastEvent=0;private inputGate=new InputGate();private pingTimer=0;latency=0;saveMode='';
 onClock:(s:import("../../../shared/time").WorldClockState)=>void=()=>{};
 onSnapshot:(s:Snapshot)=>void=()=>{};onStatus:(s:string)=>void=()=>{};onWelcome:(w:Welcome)=>void=()=>{};onEmote:(e:{id:string;text:Emote})=>void=()=>{};onNotice:(text:string)=>void=()=>{};onSave:(text:string)=>void=()=>{};
 async join(name:string,room='kerala-main',createPrivate=false):Promise<Welcome>{this.close();this.roomId=room;this.createPrivate=createPrivate;try{this.blocked=new Set(JSON.parse(localStorage.getItem('kr-blocked')||'[]'));}catch{}this.name=name;const key='kr-traveller:'+name.trim().toLowerCase();try{this.token=localStorage.getItem(key)||'';}catch{}if(!/^[a-f0-9]{64}$/.test(this.token)){this.token=Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b=>b.toString(16).padStart(2,'0')).join('');try{localStorage.setItem(key,this.token);}catch{}}
  const configured=this.endpoint || import.meta.env?.VITE_SERVER_URL as string|undefined;const url=configured||location.origin;
  if(!configured&&location.hostname.endsWith('github.io'))throw Error('Multiplayer is not configured yet. Set VITE_SERVER_URL in GitHub Actions, or choose Practice solo.');
  const socket=io(url,{autoConnect:false,transports:['websocket','polling'],timeout:30000,reconnection:true,reconnectionDelay:1000,reconnectionDelayMax:10000,randomizationFactor:.5,tryAllTransports:true});this.socket=socket;let first=true;
  socket.on('snapshot',(frame:Frame)=>{if(!this.healthy)return;this.lastPacket=performance.now();this.diagnostics.packets++;this.diagnostics.bytes+=JSON.stringify(frame).length;const s=this.decoder.decode(frame);this.onSnapshot(s);for(const e of s.events||[])if(e.at>this.lastEvent){this.onNotice(e.text);this.lastEvent=e.at;}});
  socket.on('chat',(message:ChatMessage)=>{if(!this.blocked.has(message.player))this.onChat(message);});
  socket.on('clock',clock=>this.onClock(clock));
  socket.on('diagnostics',(value:Record<string,number>)=>this.diagnostics.server=value);
  socket.on('notice',(s:string)=>this.onNotice(s));socket.on('saveStatus',(s:string)=>this.onSave(s));
  socket.on('disconnect',(reason)=>{this.healthy=false;this.diagnostics.reason=reason;this.status('Reconnecting');});
  socket.io.on('reconnect_attempt',()=>this.status('Reconnecting'));socket.io.on('reconnect_failed',()=>this.status('Server unavailable'));
  this.sampleAt=performance.now();this.pingTimer=window.setInterval(()=>{const now=performance.now(),elapsed=(now-this.sampleAt)/1000;this.diagnostics.packetsPerSecond=this.diagnostics.packets/elapsed;this.diagnostics.bytesPerSecond=this.diagnostics.bytes/elapsed;this.diagnostics.sentPerSecond=this.diagnostics.sentPackets/elapsed;this.diagnostics.sentBytesPerSecond=this.diagnostics.sentBytes/elapsed;this.diagnostics.sentPackets=this.diagnostics.sentBytes=0;this.diagnostics.packets=this.diagnostics.bytes=0;this.sampleAt=now;if(!this.healthy||this.pingPending)return;if(now-this.lastPacket>6000)this.status('Connection unstable');this.pingPending=true;const t=performance.now();socket.timeout(8000).emit('ping',(error:Error|null)=>{this.pingPending=false;if(this.socket!==socket)return;if(!error){this.latency=Math.round(performance.now()-t);this.status(this.latency>1500||performance.now()-this.lastPacket>6000?'Connection unstable':'Connected');}else this.status('Connection unstable');});},2500);
  return await new Promise((resolve,reject)=>{const timeout=this.joinTimer=window.setTimeout(()=>{if(first){first=false;this.close();reject(Error('Server did not wake within 90 seconds. Check Render, then retry.'));}},90000);
   socket.on('connect',()=>{this.onStatus('Joining shared coast…');socket.timeout(12000).emit('join',{name:this.name,token:this.token,room:this.roomId,createPrivate:this.createPrivate,blocked:[...this.blocked]},(error:Error|null,result:any)=>{if(error||!result?.ok){const message=result?.message||'Could not join the server.';if(first){first=false;clearTimeout(timeout);this.close();reject(Error(message));}else{this.healthy=false;this.onNotice(message);this.retryCount++;this.status('Reconnecting');clearTimeout(this.retryTimer);this.retryTimer=window.setTimeout(()=>{if(this.socket===socket){socket.disconnect();socket.connect();}},Math.min(10000,1000*this.retryCount));}return;}if(this.socket!==socket)return;this.retryCount=0;this.lastPacket=performance.now();this.roomId=result.welcome.roomId||'kerala-main';this.createPrivate=false;this.id=result.welcome.id;this.inputGate.reset();this.healthy=true;this.saveMode=result.welcome.saveMode||'';this.decoder.reset({...result.welcome,events:[]});if(!first)this.diagnostics.reconnects++;if(result.welcome.clock)this.onClock(result.welcome.clock);this.onWelcome(result.welcome);this.status(first?'Connected':'Reconnected');if(first){first=false;clearTimeout(timeout);resolve(result.welcome);}});});
   socket.on('connect_error',(e)=>{this.diagnostics.reason=e.message;this.status('Server unavailable');});socket.connect();
  });
 }
 send(input:Input){if(this.healthy&&this.inputGate.accept(input,performance.now())){this.diagnostics.sentPackets++;this.diagnostics.sentBytes+=JSON.stringify(input).length;this.socket?.volatile.emit('input',input);}}
 action(action:Action):Promise<{ok:boolean;message:string}>{return new Promise(resolve=>{if(!this.healthy){resolve({ok:false,message:'Wait for the server to reconnect.'});return;}this.socket!.timeout(6000).emit('action',action,(error:Error|null,result:any)=>resolve(error?{ok:false,message:'No confirmation. Check the bus state before retrying.'}:result));});}
 leaderboard(metric:LeaderboardMetric):Promise<{ok:boolean;rows?:LeaderboardRow[];message?:string}>{return new Promise(resolve=>{if(!this.healthy)return resolve({ok:false,message:'Join a shared room to view saved rankings.'});this.socket!.timeout(10000).emit('leaderboard',metric,(error:Error|null,result:any)=>resolve(error?{ok:false,message:'Leaderboard not available.'}:result));});}
 chat(text:string):Promise<{ok:boolean;message?:string}>{return new Promise(resolve=>{if(!this.healthy)return resolve({ok:false,message:'Join a room first.'});this.socket!.timeout(6000).emit('chat',text,(error:Error|null,result:any)=>resolve(error?{ok:false,message:'Message not confirmed.'}:result));});}
 report(request:ReportRequest):Promise<{ok:boolean;message:string}>{return new Promise(resolve=>{if(!this.healthy)return resolve({ok:false,message:'Join a room first.'});this.socket!.timeout(6000).emit('report',request,(error:Error|null,result:any)=>resolve(error?{ok:false,message:'Report not confirmed.'}:result));});}
 block(id:string,value:boolean){if(value)this.blocked.add(id);else this.blocked.delete(id);try{localStorage.setItem('kr-blocked',JSON.stringify([...this.blocked].slice(-100)));}catch{}this.socket?.emit('block',id,value);}
 settings(s:Settings){if(this.healthy)this.socket?.emit('settings',s,()=>{});}
 emote(text:Emote){void this.action({type:'emote',target:text});}
 private status(value:string){if(this.diagnostics.state!==value){this.diagnostics.state=value;this.onStatus(value);}}
 get socketId(){return this.socket?.id||'—';}
 close(){clearInterval(this.pingTimer);clearTimeout(this.retryTimer);clearTimeout(this.joinTimer);this.socket?.io.removeAllListeners();this.pingPending=false;this.inputGate.reset();this.lastEvent=0;if(this.healthy)this.socket?.emit('leave');this.socket?.removeAllListeners();this.socket?.disconnect();this.socket=null;this.healthy=false;this.id='';}
 get connected(){return this.healthy;}
}
