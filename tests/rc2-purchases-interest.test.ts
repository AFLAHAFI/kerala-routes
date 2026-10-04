import test from 'node:test';import assert from 'node:assert/strict';
import {Simulation} from '../server/src/simulation';import {SnapshotEncoder,SnapshotDecoder,nearbySnapshot} from '../shared/snapshots';
test('physical purchase holds prop for four seconds without replay charges or timer extension',()=>{
 const sim=new Simulation(),p=sim.join('p','Buyer'),now=Date.now();p.progress.kp=100;
 assert.equal(sim.action(p.id,{type:'buy',target:'tea',requestId:'purchase1'},now).ok,false);assert.equal(!!p.heldItem,false);
 Object.assign(p,{x:-32,z:15});assert.ok(sim.action(p.id,{type:'buy',target:'tea',requestId:'purchase1'},now+200).ok);assert.equal(p.progress.kp,95);assert.equal(p.heldItem?.until,now+4200);
 assert.ok(sim.action(p.id,{type:'buy',target:'tea',requestId:'purchase1'},now+400).ok);assert.equal(p.progress.kp,95);assert.equal(p.heldItem?.until,now+4200);
 sim.advance(now+4199);assert.equal(p.heldItem?.kind,'tea');sim.advance(now+4200);assert.equal(p.heldItem,null);
 const reloaded=new Simulation().join('p','Buyer',p.progress);assert.equal(reloaded.heldItem,undefined);assert.deepEqual(reloaded.progress,p.progress);
});
test('interest deltas remove distant actors and restore complete state including held item',()=>{
 const sim=new Simulation(undefined,15,true),self=sim.join('s','Self'),other=sim.join('o','Other'),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();other.heldItem={kind:'water',until:Date.now()+4000};decoder.reset(nearbySnapshot(sim.snapshot(),self.id));decoder.decode(encoder.encode(nearbySnapshot(sim.snapshot(),self.id)));
 other.x=6000;sim.npcs[0].x=6000;const far=decoder.decode(encoder.encode(nearbySnapshot(sim.snapshot(),self.id)));assert.equal(far.players.length,1);assert.equal(far.npcs!.length,4);
 other.x=self.x;sim.npcs[0].x=self.x;const near=decoder.decode(encoder.encode(nearbySnapshot(sim.snapshot(),self.id)));assert.equal(near.players.length,2);assert.equal(near.players.find(p=>p.id==='o')?.heldItem?.kind,'water');assert.equal(near.npcs!.length,5);
 other.heldItem=null;assert.equal(decoder.decode(encoder.encode(nearbySnapshot(sim.snapshot(),self.id))).players.find(p=>p.id==='o')!.heldItem,null);
});
