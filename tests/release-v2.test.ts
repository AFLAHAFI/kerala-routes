import test from 'node:test';import assert from 'node:assert/strict';
import {Simulation} from '../server/src/simulation';import {SHOP_ITEMS,buy} from '../shared/progression';import {DrivingRules} from '../server/src/driving-rules';
test('all garage categories require ownership and persist with reclaimed bus',()=>{
 const sim=new Simulation(),p=sim.join('d','Driver'),b=sim.state.buses[0];p.progress.kp=5000;Object.assign(p,{x:b.x,z:b.z});sim.action(p.id,{type:'claim',target:b.id},1000);
 let now=1200;for(const item of SHOP_ITEMS.filter(i=>i.kind!=='food')){
  assert.equal(sim.action(p.id,{type:'equip',target:item.id},now).ok,false);now+=200;
  assert.ok(buy(p.progress,item.id,'purchase-'+item.id).ok);
  assert.ok(sim.action(p.id,{type:'equip',target:item.id},now).ok,item.id);now+=200;
 }
 assert.equal(b.cosmetics?.curtain,'#873e50');assert.equal(b.cosmetics?.board,'amber');
 const saved=structuredClone(p.progress);const restored=new Simulation(),returning=restored.join('d','Driver',saved),bus=restored.state.buses[0];Object.assign(returning,{x:bus.x,z:bus.z});assert.ok(restored.action('d',{type:'claim',target:bus.id},now).ok);assert.deepEqual(bus.cosmetics,b.cosmetics);assert.equal(returning.progress.v2?.equipped.bag,'bag-rust');
});
test('route quality bonus requires measured travel and pays once; penalties do not take KP',()=>{
 const sim=new Simulation(),p=sim.join('d','Driver'),b=sim.state.buses[0],rules=new DrivingRules();b.driver=p.id;b.doors=false;b.next=0;b.speed=5;b.yaw=Math.PI/2;b.z=-3.4;b.x=400;
 assert.equal(rules.finish(b,p),'');for(let i=0;i<30;i++){b.x+=4;rules.inspect(b,p,10000+i*500);}
 b.passengers=['rider'];assert.match(rules.finish(b,p),/30 KP/);assert.equal(p.progress.kp,30);assert.equal(rules.finish(b,p),'');assert.equal(p.progress.kp,30);
});
test('sunset discovery uses authoritative evening time and cannot reward twice',()=>{
 const sim=new Simulation(),p=sim.join('p','Photographer');Object.assign(p,{x:-91,z:-44});sim.minute=540;assert.equal(sim.action(p.id,{type:'interact',target:'sunset-point'},1000).ok,false);sim.minute=1080;assert.ok(sim.action(p.id,{type:'interact',target:'sunset-point'},1200).ok);const kp=p.progress.kp;assert.equal(sim.action(p.id,{type:'interact',target:'sunset-point'},1400).ok,false);assert.equal(p.progress.kp,kp);
});
