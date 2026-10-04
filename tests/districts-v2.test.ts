import test from 'node:test';import assert from 'node:assert/strict';
import {Simulation,doorPosition,seatPosition,drive} from '../server/src/simulation';
import {DISTRICTS,CONNECTIONS,ROAD_SEGMENTS,districtAt,districtBuildings,roadZ,onWorldLand} from '../shared/districts';
import {STOPS,ROUTES} from '../shared/game-data';import {blocked,move} from '../shared/world';
test('teleport requests are rejected without changing position or progress',()=>{
 const sim=new Simulation(),p=sim.join('p','Traveller');p.progress.kp=90;const before=structuredClone(p);
 for(const d of DISTRICTS)assert.equal(sim.action(p.id,{type:'district',target:d.id},1000+DISTRICTS.indexOf(d)*200).ok,false);
 assert.deepEqual(p,before);
});
test('every connecting road is continuously walkable with clear full-width bus collision samples',()=>{
 assert.equal(CONNECTIONS.length,4);const reached=new Set(['kozhikode']);for(let i=0;i<5;i++)for(const c of CONNECTIONS)if(reached.has(c.from))reached.add(c.to);assert.equal(reached.size,5);
 for(const {a,b} of ROAD_SEGMENTS){const length=Math.hypot(b.x-a.x,b.z-a.z),dx=(b.x-a.x)/length,dz=(b.z-a.z)/length;
  for(let t=0;t<=length;t+=3){const x=a.x+dx*t,z=a.z+dz*t;assert.ok(onWorldLand(x,z),JSON.stringify({x,z}));assert.equal(blocked(x,z),false);for(const side of [-1.5,1.5])assert.equal(blocked(x-dz*side,z+dx*side,.25),false);const next=move({x,z},dx,dz,false,.05);assert.ok(Math.hypot(next.x-x,next.z-z)>.2);}
 }
 assert.equal(blocked(2000,-50),true);
});
test('driven boundary crossing retains bus trip, real passenger and NPC anchors',()=>{
 const now=Date.now(),sim=new Simulation(undefined,15,true),driver=sim.join('d','Driver'),rider=sim.join('r','Rider'),bus=sim.state.buses[0];Object.assign(driver,{x:bus.x,z:bus.z});assert.ok(sim.action(driver.id,{type:'claim',target:bus.id},now).ok);Object.assign(rider,doorPosition(bus));assert.ok(sim.action(rider.id,{type:'board',target:bus.id},now).ok);
 Object.assign(bus,{x:1498,z:340,yaw:Math.PI/2,speed:10,doors:false,handbrake:false,route:'CW'});const npc=sim.npcs[0];Object.assign(npc,{state:'aboard',busId:bus.id,destination:'wayanad-terminal'});bus.passengers.push(npc.id);const trip=bus.trip;
 for(let i=0;i<30;i++){const time=now+i*34;sim.input(driver.id,{seq:i,x:0,z:0,sprint:false,throttle:1},time);sim.state.seen[rider.id]=time;sim.advance(time);}
 assert.ok(bus.x>1500);assert.equal(bus.trip,trip);assert.equal(bus.route,'CW');assert.equal(rider.busId,bus.id);assert.deepEqual({x:rider.x,z:rider.z},seatPosition(bus,rider.seat));assert.equal(npc.busId,bus.id);assert.deepEqual({x:npc.x,z:npc.z},seatPosition(bus,npc.seat));
});
test('legacy stops remain reachable and district buildings remain solid',()=>{
 for(const d of DISTRICTS){assert.ok(ROUTES[d.route]);for(const id of ROUTES[d.route].stops){const stop=STOPS.find(s=>s.id===id)!;assert.equal(districtAt(stop.x).id,d.id);assert.equal(blocked(stop.x,stop.z),false);}if(d.id!=='kozhikode'){const b=districtBuildings(d)[0];assert.ok(blocked(b.x,b.z));assert.equal(districtBuildings(d),districtBuildings(d));}}assert.notEqual(roadZ(DISTRICTS[2],250),0);
});
