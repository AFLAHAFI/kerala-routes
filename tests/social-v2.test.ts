import test from 'node:test';import assert from 'node:assert/strict';import {RoomSocial} from '../server/src/social';import {Rooms} from '../server/src/rooms';import type {ModerationRecord} from '../shared/social';
test('chat bounds length, filters profanity, throttles spam and temporarily mutes persistent flooding',()=>{
 const social=new RoomSocial('room',async()=>{});assert.throws(()=>social.send('a','A','x'.repeat(201)));assert.equal(social.send('a','A','that shit',1000).text,'that •••');for(let i=0;i<3;i++)social.send('a','A','Message '+i,1100+i);for(let i=0;i<5;i++)assert.throws(()=>social.send('a','A','Flood '+i,1200+i));assert.throws(()=>social.send('a','A','Hello',15000),/muted/);assert.equal(social.send('a','A','Hello again',70000).text,'Hello again');
});
test('reports preserve server evidence without automatic bans, and moderation fails closed if audit storage fails',async()=>{
 const records:ModerationRecord[]=[],social=new RoomSocial('room',async r=>{records.push(r);});const message=social.send('target','T','Test evidence',1000);
 for(const reporter of ['a','b','c'])await social.report(reporter,{target:'target',reason:'Spam',messageId:message.id},['target'],2000);assert.equal(records.length,3);assert.equal(social.banned('target',2001),false);assert.equal(records[0].evidence[0].text,'Test evidence');
 await assert.rejects(()=>social.report('a',{target:'target',reason:'Spam',messageId:'fake'},['target'],2100));await social.moderate('target','ban',1,'Reviewed evidence',3000);assert.equal(social.banned('target',4000),true);const restored=new RoomSocial('room',async()=>{});restored.restore(records,4000);assert.equal(restored.banned('target',4000),true);assert.equal(social.banned('target',64000),false);
 const broken=new RoomSocial('room',async()=>{throw Error('Storage down');});await assert.rejects(()=>broken.moderate('t','ban',10,'Review'));assert.equal(broken.banned('t'),false);
});
test('public/private room lists and capacity do not expose private invite codes',()=>{
 const rooms=new Rooms(15),privateRoom=rooms.get('public-1',true);assert.match(privateRoom.id,/^P-[A-F0-9]{12}$/);assert.equal(rooms.get(privateRoom.id),privateRoom);assert.ok(!rooms.list().some(r=>r.id===privateRoom.id));assert.throws(()=>rooms.get('P-000000000000'));rooms.get('public-2');assert.equal(rooms.list().length,2);assert.equal(rooms.get('public-1').sim.state.players.length,0);
});
