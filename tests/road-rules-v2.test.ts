import test from 'node:test';import assert from 'node:assert/strict';
import {DrivingRules} from '../server/src/driving-rules';import {Simulation,drive} from '../server/src/simulation';
import {signalColor,signalAhead} from '../shared/road-rules';import {BUS_MODELS} from '../shared/buses';
test('signals follow the shared clock; red-light warnings and penalties preserve KP',()=>{
 assert.equal(signalColor(39999),'green');assert.equal(signalColor(41000),'yellow');assert.equal(signalColor(50000),'red');assert.equal(signalColor(60000),'green');assert.ok(signalAhead(170,-3,1,50000));
 const sim=new Simulation(),p=sim.join('d','Driver'),b=sim.state.buses[0],rules=new DrivingRules();b.driver=p.id;p.progress.kp=200;p.progress.v2!.driverXP=40;
 Object.assign(b,{x:179,z:-3,speed:5,yaw:Math.PI/2});rules.inspect(b,p,50000);b.x=181;assert.match(rules.inspect(b,p,50033)[0],/Warning/);assert.equal(p.progress.kp,200);assert.equal(p.progress.v2!.driverXP,40);
 b.x=179;rules.inspect(b,p,110000);b.x=181;assert.match(rules.inspect(b,p,110033)[0],/−5/);assert.equal(p.progress.kp,200);assert.equal(p.progress.v2!.driverXP,35);
 // Teleports and recovery must not be interpreted as driving through signals.
 b.x=150;rules.inspect(b,p,170000);b.x=220;assert.equal(rules.inspect(b,p,170033).length,0);
});
test('bus variants share physics, enforce XP unlocks and protect passengers',()=>{
 const sim=new Simulation(),p=sim.join('d','Driver'),r=sim.join('r','Rider'),b=sim.state.buses[0];Object.assign(p,{x:b.x,z:b.z});assert.ok(sim.action(p.id,{type:'claim',target:b.id},1000).ok);
 assert.equal(sim.action(p.id,{type:'bus-model',target:'tourer'},1200).ok,false);p.progress.v2!.driverXP=2000;
 for(const [i,model] of BUS_MODELS.entries()){assert.ok(sim.action(p.id,{type:'bus-model',target:model.id},1400+i*200).ok);assert.equal(b.model,model.id);}
 b.passengers=[r.id];assert.equal(sim.action(p.id,{type:'bus-model',target:'city'},4000).ok,false);b.passengers=[];b.doors=false;b.handbrake=false;b.x=400;b.z=-3.4;b.yaw=Math.PI/2;b.speed=0;
 for(let i=0;i<100;i++)drive(b,{seq:i,x:0,z:0,sprint:false,throttle:1},.033,[]);assert.ok(b.speed>0&&b.speed<=18);
});
