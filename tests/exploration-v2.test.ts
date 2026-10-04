import test from 'node:test';import assert from 'node:assert/strict';
import {Simulation,step} from '../server/src/simulation';import {BOAT_DOCKS} from '../shared/exploration';import {blocked} from '../shared/world';
test('lake boats require the dock, stay inside water and award distance missions only once',()=>{
 const sim=new Simulation(),p=sim.join('p','Paddler'),dock=BOAT_DOCKS[0];assert.equal(sim.action(p.id,{type:'boat',target:dock.id},1000).ok,false);Object.assign(p,{x:dock.x,z:dock.z});assert.ok(sim.action(p.id,{type:'boat',target:dock.id},1200).ok);assert.ok(blocked(p.x,p.z));
 for(let i=0;i<400;i++)step(p,{seq:i,x:1,z:0,sprint:false},.05);assert.ok(p.x<=dock.water.x+27);assert.equal(sim.action(p.id,{type:'boat'},1400).ok,false);
 for(let i=0;i<400;i++)step(p,{seq:500+i,x:-1,z:0,sprint:false},.05);sim.state.updated=Date.now();sim.state.seen[p.id]=Date.now();sim.advance();assert.ok(p.progress.missions.includes('lake-explorer'));const kp=p.progress.kp;sim.advance();assert.equal(p.progress.kp,kp);assert.ok(sim.action(p.id,{type:'boat'},Date.now()+200).ok);assert.equal(p.boat,null);assert.equal(p.x,dock.x);
});
test('dawn/night photographs validate authoritative world time',()=>{
 const sim=new Simulation(),p=sim.join('p','Photographer');Object.assign(p,{x:6830,z:38});
 // Use exact discovery position, not a client-supplied reward or time.
 return import('../shared/game-data').then(({DISCOVERIES})=>{const item=DISCOVERIES.find(d=>d.id==='dawn-bird')!;Object.assign(p,{x:item.x,z:item.z});sim.minute=600;assert.equal(sim.action('p',{type:'interact',target:'dawn-bird'},1000).ok,false);sim.minute=360;assert.ok(sim.action('p',{type:'interact',target:'dawn-bird'},1200).ok);assert.ok(p.progress.missions.includes('dawn-wildlife'));});
});
