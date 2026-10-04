import {Simulation} from './simulation';import {WorldClock,cycleDuration} from '../../shared/time';import {SnapshotEncoder} from '../../shared/snapshots';
export class GameRoom {
 sim:Simulation;clock:WorldClock;encoder=new SnapshotEncoder();reserved=new Map<string,number>();lastActive=Date.now();tick=0;
 constructor(readonly id:string,readonly privateRoom:boolean,capacity:number){this.sim=new Simulation(undefined,capacity,true);this.clock=new WorldClock(Date.now(),cycleDuration(process.env.DAY_CYCLE_SECONDS),Number.isFinite(Number(process.env.START_HOUR))?Number(process.env.START_HOUR):9);}
}
export class Rooms {
 all=new Map<string,GameRoom>();
 constructor(private capacity=15){this.all.set('kerala-main',new GameRoom('kerala-main',false,Math.min(15,capacity)));}
 // Old clients may send selectors; they always resolve to the same world.
 get(_id='kerala-main',_createPrivate=false){return this.all.get('kerala-main')!;}
 findPlayer(id:string){return [...this.all.values()].find(r=>r.sim.state.players.some(p=>p.id===id));}
 list(){return [{id:'kerala-main',players:this.get().sim.state.players.length,capacity:this.get().sim.capacity}];}
 prune(_now=Date.now()){}
}
