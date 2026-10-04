import test from 'node:test';import assert from 'node:assert/strict';
import {NullEngine} from '@babylonjs/core/Engines/nullEngine.js';
import {Scene} from '@babylonjs/core/scene.js';
import {World} from '../client/src/game/World';
import {BusModel} from '../client/src/game/Bus';
import {Activities} from '../client/src/game/Activities';
import {Simulation} from '../server/src/simulation';
import {PRESETS} from '../client/src/game/Performance';
// NullEngine resource/lifecycle test only. Canvas drawing is deliberately not rendered.
class CanvasStub {
 constructor(public width:number,public height:number){}
 getContext(){return {canvas:this,fillRect(){},clearRect(){},fillText(){},measureText(){return {width:10};}};}
}
test('procedural chunks, traffic and bus LOD manage actual Babylon mesh lifetimes',()=>{
 const previous=(globalThis as any).OffscreenCanvas;(globalThis as any).OffscreenCanvas=CanvasStub;
 const engine=new NullEngine(),scene=new Scene(engine);
 try{
  const world=new World(scene),sim=new Simulation(),p=sim.join('test','Traveller');const base=scene.meshes.length;
  const load=(quality:number)=>{for(let i=0;i<10;i++)world.stream.update(.1,550,0,230,quality);};
  load(0);assert.ok(scene.meshes.length>base);const lowVertices=scene.meshes.reduce((n,m)=>n+m.getTotalVertices(),0);
  load(2);const highVertices=scene.meshes.reduce((n,m)=>n+m.getTotalVertices(),0);assert.ok(highVertices>lowVertices);
  world.stream.dispose();assert.equal(scene.meshes.length,base);const materials=scene.materials.length;
  for(let i=0;i<3;i++){load(2);world.stream.dispose();assert.equal(scene.meshes.length,base);assert.equal(scene.materials.length,materials);}
  const districtMeshes=scene.meshes.length,districtMaterials=scene.materials.length;
  for(let round=0;round<2;round++){for(const x of [6033,9333,12333,3033])for(let n=0;n<12;n++)world.districts.update(.1,x,0,230,round?2:0);world.districts.update(.1,33,0,230,0);assert.equal(scene.meshes.length,districtMeshes);assert.equal(scene.materials.length,districtMaterials);}
  const activity=new Activities(scene);activity.update(.1,p,[]);const beforeTraffic=scene.meshes.length,beforeTrafficMaterials=scene.materials.length;
  activity.quality(PRESETS.low);const t={...sim.state.traffic[0],x:p.x,z:p.z};activity.update(.1,p,[t]);assert.ok(scene.meshes.length>beforeTraffic);
  activity.update(.1,p,[{...t,x:p.x+1000}]);assert.equal(scene.meshes.length,beforeTraffic);assert.equal(scene.materials.length,beforeTrafficMaterials);
  const bus=new BusModel(scene,sim.state.buses[0],'#aa4422');bus.detail(500,70,false);assert.equal(bus.root.getChildMeshes().filter(m=>m.isEnabled()).length,1);
  bus.detail(0,70,true);assert.ok(bus.root.getChildMeshes().filter(m=>m.isEnabled()).length>5);bus.dispose();
  console.log('NullEngine resource sample',JSON.stringify({baseMeshes:base,lowVertices,highVertices,streamCycles:3,leakedMeshes:scene.meshes.length-beforeTraffic}));
 }finally{scene.dispose();engine.dispose();(globalThis as any).OffscreenCanvas=previous;}
});
