import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../server/src/simulation';
import {updateNpcs} from '../server/src/npc';

test('depot customization releases NPC seats without deleting travellers or allowing occupied real seats',()=>{
 const sim=new Simulation(undefined,15,true),driver=sim.join('driver','Driver'),bus=sim.state.buses[0];
 Object.assign(driver,{x:bus.x,z:bus.z});
 assert.ok(sim.action(driver.id,{type:'claim',target:bus.id},1000).ok);
 updateNpcs(sim.npcs,sim.state.buses,1100);assert.equal(bus.passengers.length,5);
 driver.progress.v2!.owned.push('paint-blue');
 assert.ok(sim.action(driver.id,{type:'equip',target:'paint-blue'},1300).ok);
 assert.equal(bus.paint,'#347da1');assert.equal(bus.passengers.length,0);assert.equal(sim.npcs.length,5);
 updateNpcs(sim.npcs,sim.state.buses,1500);assert.equal(bus.passengers.length,0);
 assert.ok(sim.npcs.every(n=>n.busId===null&&Number.isFinite(n.x)));
 const rider=sim.join('rider','Rider');bus.passengers.push(rider.id);
 assert.equal(sim.action(driver.id,{type:'equip',target:'paint-blue'},1600).ok,false);
 assert.deepEqual(bus.passengers,[rider.id]);
});

test('Auto graphics starts conservatively on touch or limited hardware and respects overrides',async()=>{
 const {initialQuality}=await import('../client/src/game/Performance');
 assert.equal(initialQuality('auto',{touch:true,cores:8,memoryGB:8}),'low');
 assert.equal(initialQuality('auto',{cores:2}),'low');
 assert.equal(initialQuality('auto',{cores:8,memoryGB:8}),'medium');
 assert.equal(initialQuality('high',{touch:true,cores:2}),'high');
});
