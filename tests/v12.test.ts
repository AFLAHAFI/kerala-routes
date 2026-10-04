import test from 'node:test';import assert from 'node:assert/strict';
import {InputGate} from '../client/src/multiplayer/InputGate';
import {MotionBuffer} from '../client/src/multiplayer/MotionBuffer';
import {SceneryStream} from '../client/src/game/Chunks';
import {PRESETS} from '../client/src/game/Performance';
import {seatPosition} from '../server/src/simulation';
import {newRoom} from '../server/src/simulation';

test('unchanged controls cut packets while refreshing watchdog; stop/steer changes survive rate limit',()=>{
 const gate=new InputGate(),input={seq:0,x:1,z:0,sprint:false};let packets=0,last=-1,maxGap=0;
 for(let time=0;time<3000;time+=50)if(gate.accept({...input,seq:time},time)){packets++;if(last>=0)maxGap=Math.max(maxGap,time-last);last=time;}
 assert.equal(packets,20);assert.equal(maxGap,150);
 assert.equal(gate.accept({...input,x:0},3000),true);assert.equal(gate.accept({...input,x:0,steer:1},3010),false);
 assert.equal(gate.accept({...input,x:0,steer:1},3050),true);gate.reset();assert.ok(gate.accept(input,3051));
});
test('bus interpolation is immutable, wraps yaw, holds stale state and anchors passengers',()=>{
 const buffer=new MotionBuffer();const b={...newRoom().buses[0],x:0,z:0,yaw:Math.PI-.1};buffer.push(100,[b]);b.x=10;b.yaw=-Math.PI+.1;buffer.push(200,[b]);b.x=999;
 const pose=buffer.sample(b.id,150)!;assert.equal(pose.x,5);assert.ok(Math.abs(pose.yaw-Math.PI)<.001);assert.equal(buffer.sample(b.id,300)!.x,10);assert.equal(buffer.sample(b.id,0)!.x,0);
 const rider=seatPosition({...b,...pose},0);assert.ok(Math.abs(Math.hypot(rider.x-pose.x,rider.z-pose.z)-Math.hypot(.75,2.4))<1e-6);
 buffer.reset();assert.equal(buffer.sample(b.id,500),undefined);
});
test('teleport recovery does not interpolate a bus through buildings',()=>{const b=new MotionBuffer();b.push(0,[{id:'bus',x:0,z:0,yaw:0}]);b.push(100,[{id:'bus',x:100,z:0,yaw:0}]);assert.equal(b.sample('bus',50)!.x,100);});
test('streaming budgets work, retains edge chunks and releases all owned resources',()=>{
 const stream=new SceneryStream();let live=0,built=0;
 for(const x of [0,140,1000])stream.add(x,0,()=>{built++;live++;return ()=>live--;});
 stream.update(1,0,0,230,0);assert.equal(built,1);stream.update(.05,0,0,230,0);assert.equal(built,1);stream.update(.05,0,0,230,0);assert.equal(live,2);
 stream.update(.1,-350,0,230,0);assert.equal(live,1); // x=0 retained beyond load boundary, x=140 released
 stream.update(.1,0,0,230,2);assert.equal(live,1);assert.equal(built,3); // quality rebuild replaces old ownership
 for(let i=0;i<4;i++)stream.update(.1,1000,0,230,2);assert.equal(live,1);assert.equal(stream.active,1);
 stream.dispose();assert.equal(live,0);assert.equal(stream.active,0);
});
test('graphics presets consistently bound mobile work',()=>{for(const key of ['distance','lod','traffic','rain','markers'] as const){assert.ok(PRESETS.low[key]<PRESETS.medium[key]);assert.ok(PRESETS.medium[key]<PRESETS.high[key]);}assert.ok(PRESETS.low.scale>PRESETS.medium.scale);assert.equal(PRESETS.low.shadows,false);assert.equal(PRESETS.high.shadows,true);});
