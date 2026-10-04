import test from 'node:test';import assert from 'node:assert/strict';
import {Simulation,seatPosition,doorPosition,busesOverlap} from '../server/src/simulation';
import {busLayout} from '../shared/buses';import {DrivingRules} from '../server/src/driving-rules';
test('minibus capacity, doors and anchors follow the shared vehicle dimensions',()=>{
 const sim=new Simulation(undefined,15),driver=sim.join('d','Driver'),b=sim.state.buses[0];b.model='mini';
 Object.assign(driver,{x:b.x,z:b.z});assert.ok(sim.action('d',{type:'claim',target:b.id},1000).ok);
 for(let i=0;i<7;i++){const p=sim.join('r'+i,'Rider '+i);Object.assign(p,doorPosition(b));assert.equal(sim.action(p.id,{type:'board',target:b.id},1200).ok,i<6);}
 assert.equal(b.passengers.length,busLayout('mini').capacity);
 const seat=seatPosition({...b,x:0,z:0,yaw:0},0);assert.equal(seat.z,2.4*.78);
 const door=doorPosition({...b,x:0,z:0,yaw:0});assert.equal(door.z,2.8*.78);
 assert.equal(busesOverlap({...b,x:0,z:0,yaw:0},{...b,id:'other',x:0,z:8,yaw:0}),false);
 assert.equal(busesOverlap({...b,model:'ordinary',x:0,z:0,yaw:0},{...b,model:'ordinary',id:'other',x:0,z:8,yaw:0}),true);
});
test('braking alone is not a collision penalty; confirmed heavy impacts produce a warning',()=>{
 const sim=new Simulation(),p=sim.join('d','Driver'),b=sim.state.buses[0],rules=new DrivingRules();
 b.driver=p.id;Object.assign(b,{x:300,z:-3.4,yaw:Math.PI/2,speed:8});rules.inspect(b,p,1000);
 b.speed=0;assert.deepEqual(rules.inspect(b,p,1033),[]);
 assert.match(rules.inspect(b,p,1066,8)[0],/Heavy impact/);
 assert.equal(p.progress.kp,0);
});
