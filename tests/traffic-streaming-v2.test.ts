import test from 'node:test';import assert from 'node:assert/strict';
import {Simulation} from '../server/src/simulation';import {trafficForPlayers,createTraffic,advanceTraffic} from '../shared/traffic';import {districtAt,roadZ} from '../shared/districts';import {SnapshotEncoder,SnapshotDecoder} from '../shared/snapshots';import {rankProfiles} from '../shared/leaderboards';
test('traffic stays within a twelve-car room budget and removes abandoned district cars from deltas',()=>{
 const sim=new Simulation(),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();decoder.reset(sim.snapshot());decoder.decode(encoder.encode(sim.snapshot()));
 sim.state.traffic=trafficForPlayers(sim.state.traffic,[{x:6033},{x:9033},{x:12033}]);assert.equal(sim.state.traffic.length,12);assert.ok(sim.state.traffic.every(t=>t.x>5900));
 const frame=encoder.encode(sim.snapshot()),decoded=decoder.decode(frame);assert.equal(frame.trafficGone?.length,12);assert.equal(decoded.traffic.length,12);assert.ok(decoded.traffic.every(t=>t.x>5900));advanceTraffic(sim.state.traffic,[],.05,0);
 for(const t of sim.state.traffic){const d=districtAt(t.x);assert.ok(Math.abs(Math.abs(t.z-roadZ(d,t.x-d.offset))-3.4)<.001);}
});
test('saved leaderboard rankings expose only names and scores and handle legacy profiles',()=>{
 const sim=new Simulation(),a=sim.join('secret-a','A'),b=sim.join('secret-b','B');a.progress.kp=20;b.progress.kp=40;
 assert.deepEqual(rankProfiles([a,b],'KP'),[{name:'B',score:40},{name:'A',score:20}]);assert.ok(!JSON.stringify(rankProfiles([a,b],'Driver XP')).includes('secret-'));assert.equal(rankProfiles([a,b],'Districts explored')[0].score,1);
});
