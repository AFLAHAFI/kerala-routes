import test from 'node:test';import assert from 'node:assert/strict';
import {Simulation,doorPosition,seatPosition} from '../server/src/simulation';
import {DISTRICTS,districtAt,districtBuildings,roadZ} from '../shared/districts';
import {STOPS,ROUTES} from '../shared/game-data';import {blocked,move} from '../shared/world';
test('district transfers validate location and preserve progress, and discoveries reward once',()=>{
 const sim=new Simulation(),p=sim.join('p','Traveller');p.progress.kp=90;
 Object.assign(p,{x:-80,z:60});assert.equal(sim.action(p.id,{type:'district',target:'wayanad'},1000).ok,false);
 Object.assign(p,{x:33,z:8});assert.equal(sim.action(p.id,{type:'district',target:'wayanad'},1200).ok,true);assert.equal(districtAt(p.x).id,'wayanad');assert.equal(p.progress.kp,115);
 Object.assign(p,{x:6033,z:8});assert.ok(sim.action(p.id,{type:'district',target:'kozhikode'},1400).ok);Object.assign(p,{x:33,z:8});assert.ok(sim.action(p.id,{type:'district',target:'wayanad'},1600).ok);assert.equal(p.progress.kp,115);
});
test('completed bus transfers preserve real riders and NPCs and reset route state coherently',()=>{
 const sim=new Simulation(undefined,15,true),driver=sim.join('d','Driver'),rider=sim.join('r','Rider'),bus=sim.state.buses[0];Object.assign(driver,{x:bus.x,z:bus.z});assert.ok(sim.action(driver.id,{type:'claim',target:bus.id},1000).ok);Object.assign(rider,doorPosition(bus));assert.ok(sim.action(rider.id,{type:'board',target:bus.id},1000).ok);
 assert.equal(sim.action(driver.id,{type:'district',target:'palakkad'},1200).ok,false);
 bus.finished=true;bus.direction=-1;assert.ok(sim.action(driver.id,{type:'district',target:'palakkad'},1400).ok);assert.equal(bus.route,'P');assert.equal(bus.direction,1);assert.equal(rider.busId,bus.id);assert.equal(rider.rideStart,bus.trip);assert.deepEqual({x:rider.x,z:rider.z},seatPosition(bus,rider.seat));assert.equal(districtAt(driver.x).id,'palakkad');assert.equal(sim.action(rider.id,{type:'district',target:'kannur'},1600).ok,false);
});
test('all districts have reachable stops, shared solid buildings and clamped walking boundaries',()=>{
 for(const d of DISTRICTS){assert.ok(ROUTES[d.route]);for(const id of ROUTES[d.route].stops){const stop=STOPS.find(s=>s.id===id)!;assert.equal(districtAt(stop.x).id,d.id);assert.equal(blocked(stop.x,stop.z),false);}if(d.id==='kozhikode')continue;const b=districtBuildings(d)[0];assert.ok(blocked(b.x,b.z));const moved=move({x:d.offset+1129,z:80},1,0,true,1);assert.equal(moved.x,d.offset+1130);assert.equal(districtBuildings(d),districtBuildings(d));}assert.notEqual(roadZ(DISTRICTS[2],250),0);
});
