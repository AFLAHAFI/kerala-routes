import {SnapshotDecoder,type Frame} from '../../../shared/snapshots';
import {io,type Socket} from 'socket.io-client';
import type {Welcome,Snapshot,Input,Action,Emote,Settings} from '../../../shared/types';
export class Connection {
 private decoder=new SnapshotDecoder();
 id='';private token='';private socket:Socket|null=null;private healthy=false;private name='';private lastEvent=0;private lastSent=0;private pingTimer=0;latency=0;saveMode='';
 onSnapshot:(s:Snapshot)=>void=()=>{};onStatus:(s:string)=>void=()=>{};onWelcome:(w:Welcome)=>void=()=>{};onEmote:(e:{id:string;text:Emote})=>void=()=>{};onNotice:(text:string)=>void=()=>{};onSave:(text:string)=>void=()=>{};
 async join(name:string):Promise<Welcome>{this.close();this.name=name;const key='kr-traveller:'+name.trim().toLowerCase();try{this.token=localStorage.getItem(key)||'';}catch{}if(!/^[a-f0-9]{64}$/.test(this.token)){this.token=Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b=>b.toString(16).padStart(2,'0')).join('');try{localStorage.setItem(key,this.token);}catch{}}
  const configured=import.meta.env.VITE_SERVER_URL as string|undefined;const url=configured||location.origin;
  if(!configured&&location.hostname.endsWith('github.io'))throw Error('Multiplayer is not configured yet. Set VITE_SERVER_URL in GitHub Actions, or choose Practice solo.');
  const socket=io(url,{autoConnect:false,transports:['websocket','polling'],timeout:20000,reconnection:true,reconnectionDelay:1000,reconnectionDelayMax:6000});this.socket=socket;let first=true;
  socket.on('snapshot',(frame:Frame)=>{const s=this.decoder.decode(frame);this.onSnapshot(s);for(const e of s.events||[])if(e.at>this.lastEvent){this.onNotice(e.text);this.lastEvent=e.at;}});
  socket.on('notice',(s:string)=>this.onNotice(s));socket.on('saveStatus',(s:string)=>this.onSave(s));
  socket.on('disconnect',()=>{this.healthy=false;this.onStatus('Disconnected · reconnecting');});
  socket.io.on('reconnect_attempt',()=>this.onStatus('Waking server / reconnecting…'));
  this.pingTimer=window.setInterval(()=>{if(!this.healthy)return;const t=performance.now();socket.timeout(5000).emit('ping',(error:Error|null)=>{if(!error)this.latency=Math.round(performance.now()-t);});},2500);
  return await new Promise((resolve,reject)=>{const timeout=window.setTimeout(()=>{if(first){first=false;this.close();reject(Error('Server did not wake within 90 seconds. Check Render, then retry.'));}},90000);
   socket.on('connect',()=>{this.onStatus('Joining shared coast…');socket.timeout(12000).emit('join',{name:this.name,token:this.token},(error:Error|null,result:any)=>{if(error||!result?.ok){const message=result?.message||'Could not join the server.';if(first){first=false;clearTimeout(timeout);this.close();reject(Error(message));}else{this.healthy=false;this.onNotice(message);}return;}this.id=result.welcome.id;this.healthy=true;this.saveMode=result.welcome.saveMode||'';this.decoder.reset({...result.welcome,events:[]});this.onWelcome(result.welcome);this.onStatus('Online · Socket.IO');if(first){first=false;clearTimeout(timeout);resolve(result.welcome);}});});
   socket.on('connect_error',()=>this.onStatus('Waking server… Free hosting can take about a minute.'));socket.connect();
  });
 }
 send(input:Input){const now=performance.now();if(this.healthy&&now-this.lastSent>=50){this.lastSent=now;this.socket?.volatile.emit('input',input);}}
 action(action:Action):Promise<{ok:boolean;message:string}>{return new Promise(resolve=>{if(!this.healthy){resolve({ok:false,message:'Wait for the server to reconnect.'});return;}this.socket!.timeout(6000).emit('action',action,(error:Error|null,result:any)=>resolve(error?{ok:false,message:'No confirmation. Check the bus state before retrying.'}:result));});}
 settings(s:Settings){if(this.healthy)this.socket?.emit('settings',s,()=>{});}
 emote(text:Emote){void this.action({type:'emote',target:text});}
 close(){clearInterval(this.pingTimer);this.socket?.removeAllListeners();this.socket?.disconnect();this.socket=null;this.healthy=false;this.id='';}
 get connected(){return this.healthy;}
}
