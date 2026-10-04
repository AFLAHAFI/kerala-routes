import {Simulation} from '../server/src/simulation';
import {SnapshotEncoder} from '../shared/snapshots';
const sim=new Simulation(),bus=sim.state.buses[0];for(let i=0;i<4;i++){const p=sim.join('test'+i,'Traveller '+i);p.busId=bus.id;p.role=i?'passenger':'driver';p.seat=i-1;if(i)bus.passengers.push(p.id);else bus.driver=p.id;}
const enc=new SnapshotEncoder();enc.encode(sim.snapshot());let bytes=0;const durations:number[]=[];
for(let frame=1;frame<=600;frame++){const start=performance.now();bus.x+=.05;bus.yaw+=.001;for(const p of sim.state.players){p.x+=.05;p.yaw=bus.yaw;}bytes+=JSON.stringify(enc.encode(sim.snapshot(100000+frame*67))).length;durations.push(performance.now()-start);}
durations.sort((a,b)=>a-b);console.log(JSON.stringify({scenario:'one bus, driver plus 3 riders, 600 deterministic frames',meanFrameBytes:Math.round(bytes/600),encodeP95ms:Number(durations[570].toFixed(3))},null,2));
