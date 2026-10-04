import {randomBytes} from 'node:crypto';
import {Simulation} from './simulation';import {WorldClock,cycleDuration} from '../../shared/time';import {SnapshotEncoder} from '../../shared/snapshots';
export class GameRoom {
 sim:Simulation;clock:WorldClock;encoder=new SnapshotEncoder();reserved=new Map<string,number>();lastActive=Date.now();tick=0;
 constructor(readonly id:string,readonly privateRoom:boolean,capacity:number){this.sim=new Simulation(undefined,capacity,true);this.clock=new WorldClock(Date.now(),cycleDuration(process.env.DAY_CYCLE_SECONDS),Number.isFinite(Number(process.env.START_HOUR))?Number(process.env.START_HOUR):9);}
}
export class Rooms {
 all=new Map<string,GameRoom>();
 constructor(private capacity=15){this.all.set('public-1',new GameRoom('public-1',false,capacity));}
 get(id='public-1',createPrivate=false){
  if(createPrivate){if(this.all.size>=8)throw Error('Room limit reached. Join an existing room.');const code='P-'+randomBytes(6).toString('hex').toUpperCase();const room=new GameRoom(code,true,this.capacity);this.all.set(code,room);return room;}
  if(typeof id!=='string'||!/^public-[1-3]$|^P-[A-F0-9]{12}$/.test(id))throw Error('Enter a valid room code.');
  const old=this.all.get(id);if(old)return old;
  if(id.startsWith('P-'))throw Error('Private room not found or expired.');
  if(this.all.size>=8)throw Error('Room limit reached.');const room=new GameRoom(id,false,this.capacity);this.all.set(id,room);return room;
 }
 findPlayer(id:string){return [...this.all.values()].find(r=>r.sim.state.players.some(p=>p.id===id));}
 list(){return [...this.all.values()].filter(r=>!r.privateRoom).map(r=>({id:r.id,players:r.sim.state.players.length,capacity:r.sim.capacity}));}
 prune(now=Date.now()){for(const [id,room] of this.all){if(room.sim.state.players.length)room.lastActive=now;else if(id!=='public-1'&&now-room.lastActive>300000)this.all.delete(id);}}
}
