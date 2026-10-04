import {BOAT_DOCKS,cycleStand} from '../../../shared/exploration';
import {Scene} from '@babylonjs/core/scene.js';
import {Mesh} from '@babylonjs/core/Meshes/mesh.js';
import {MeshBuilder} from '@babylonjs/core/Meshes/meshBuilder.js';
import {StandardMaterial} from '@babylonjs/core/Materials/standardMaterial.js';
import {Color3} from '@babylonjs/core/Maths/math.color.js';
import {DynamicTexture} from '@babylonjs/core/Materials/Textures/dynamicTexture.js';
import {ShadowGenerator} from '@babylonjs/core/Lights/Shadows/shadowGenerator.js';
import {districtAt,districtBuildings,roadZ,type District} from '../../../shared/districts';
import {STOPS} from '../../../shared/game-data';
import {SceneryStream} from './Chunks';
import {NightLights} from './NightLights';

/** Only the current district owns generated chunks. The collision data is shared with the server. */
export class DistrictScenery {
 stream=new SceneryStream();private current='kozhikode';
 constructor(private scene:Scene,private shadows:ShadowGenerator,private lights:NightLights){}
 update(dt:number,x:number,z:number,distance:number,quality:number){
  const d=districtAt(x);
  if(d.id!==this.current){this.stream.dispose();this.stream=new SceneryStream();this.current=d.id;
   if(d.id!=='kozhikode')for(let start=-100;start<1160;start+=140)this.stream.add(d.offset+start+70,roadZ(d,start+70),q=>this.build(d,start,q));
  }
  this.stream.update(dt,x,z,distance,quality);
 }
 private build(d:District,start:number,quality:number){
  const pieces:Mesh[]=[],materials=new Map<string,StandardMaterial>(),cleanup:(()=>void)[]=[];
  const mat=(color:string)=>{let m=materials.get(color);if(!m){m=new StandardMaterial('district '+color,this.scene);m.diffuseColor=Color3.FromHexString(color);m.specularColor.set(.04,.04,.04);m.maxSimultaneousLights=6;materials.set(color,m);}return m;};
  const box=(name:string,x:number,y:number,z:number,w:number,h:number,depth:number,color:string)=>{const m=MeshBuilder.CreateBox(name,{width:w,height:h,depth},this.scene);m.position.set(x,y,z);m.material=mat(color);pieces.push(m);return m;};
  const tree=(x:number,z:number,i:number)=>{
   const height=d.biome==='forest'?7+i%4:6+i%3;
   box('tree trunk',x,height/2,z,.35,height,.35,'#786c48');
   if(d.biome==='coast')for(let a=0;a<5;a++){const leaf=box('palm frond',x+Math.sin(a*1.257)*1.5,height,z+Math.cos(a*1.257)*1.5,.65,.16,4.5,'#476f43');leaf.rotation.y=a*1.257;leaf.rotation.x=.15;}
   else{const crown=MeshBuilder.CreateSphere('tree crown',{diameter:d.biome==='forest'?5:3.5,segments:quality===0?4:6},this.scene);crown.position.set(x,height,z);crown.scaling.y=1.2;crown.material=mat(i%2?'#3c6446':'#55774b');pieces.push(crown);}
  };
  box('district land',d.offset+start+70,-.55,0,140,1,230,d.ground);
  for(let x=start;x<start+140;x+=10){const z=roadZ(d,x+5),dz=roadZ(d,x+10)-roadZ(d,x);const road=box('district road',d.offset+x+5,.025,z,Math.hypot(10,dz)+.2,.12,13,'#626c68');road.rotation.y=-Math.atan2(dz,10);const stripe=box('road marking',d.offset+x+5,.092,z,4,.013,.14,'#f0e5b9');stripe.rotation.y=road.rotation.y;
   if(d.biome==='town')for(const side of [-1,1])box('town pavement',d.offset+x+5,.12,z+side*8,10,.25,2.5,'#c9c6ab');
  }
  for(const b of districtBuildings(d).filter(b=>b.x>=d.offset+start&&b.x<d.offset+start+140)){
   box('district house',b.x,b.h/2,b.z,b.w,b.h,b.d,b.color);box('tiled roof',b.x,b.h+.25,b.z,b.w+1,.5,b.d+1,'#a76949');
   for(const dx of [-3,3])box('window',b.x+dx,b.h*.6,b.z+(b.z>0?-5.02:5.02),2,1.6,.08,'#354f52');
   if(quality>0)box('veranda',b.x,b.h*.42,b.z+(b.z>0?-6:6),b.w+1,.18,3,'#d0b58c');
  }
  const count=[4,8,12][quality];for(let i=0;i<count;i++){const x=start+9+i*122/count,z=roadZ(d,x)+(i%2?1:-1)*(46+i%3*10);tree(d.offset+x,z,i);}
  if(d.biome==='fields')for(const side of [-1,1]){box('paddy',d.offset+start+70,-.01,side*70,132,.12,56,'#b2b957');for(let x=start+10;x<start+140;x+=18)box('field bund',d.offset+x,.12,side*70,.45,.25,56,'#849251');}
  if(d.biome==='forest'||d.biome==='fields'){const hill=MeshBuilder.CreateSphere('forest ridge',{diameter:1,segments:6},this.scene);hill.position.set(d.offset+start+70,-3,112);hill.scaling.set(150,35+(start%3)*5,55);hill.material=mat('#557a63');pieces.push(hill);}
  if(d.biome==='coast'){box('coastal sand',d.offset+start+70,-.06,-75,140,.2,22,'#e1cda1');box('coastal water',d.offset+start+70,-.18,-149,140,.15,135,'#3e8188');}
  const lampX=d.offset+start+70,lampZ=roadZ(d,start+70)-10;
  box('lamp post',lampX,3.6,lampZ,.18,7.2,.18,'#596b60');const bulb=box('lamp bulb',lampX,7.2,lampZ,1,.18,.4,'#fff0c1');cleanup.push(this.lights.add(lampX,6.8,lampZ,bulb.material as StandardMaterial));
  for(const s of STOPS.filter(s=>s.x>=d.offset+start&&s.x<d.offset+start+140&&districtAt(s.x).id===d.id)){
   box('bus shelter',s.x,3,s.z+12,9,.3,4,'#537365');for(const dx of [-4,4])box('shelter post',s.x+dx,1.5,s.z+13,.2,3,.2,'#607365');box('bench',s.x,.65,s.z+13,6,.2,1,'#bf9d6f');
   const ring=MeshBuilder.CreateTorus('stop zone '+s.id,{diameter:s.radius*1.7,thickness:.12,tessellation:24},this.scene);ring.position.set(s.x,.16,s.z);ring.material=mat('#529689');pieces.push(ring);
   const texture=new DynamicTexture('stop sign '+s.id,{width:512,height:64},this.scene,false);texture.drawText(s.name,null,43,'bold 26px sans-serif','#fff0c6','#355f52',true);
   const signMat=new StandardMaterial('stop sign '+s.id,this.scene);signMat.diffuseTexture=texture;signMat.emissiveColor.set(.15,.15,.15);signMat.backFaceCulling=false;materials.set(s.id,signMat);
   const sign=MeshBuilder.CreatePlane('district stop sign',{width:8,height:1},this.scene);sign.position.set(s.x,3.3,s.z+9.9);sign.material=signMat;pieces.push(sign);
  }
  const stand=cycleStand(d.offset);if(stand.x>=d.offset+start&&stand.x<d.offset+start+140){box('cycle stand',stand.x,.4,stand.z,3,.8,1,'#4f7b6d');box('cycle sign',stand.x,2,stand.z,.3,3,.3,'#d8bb69');}
  for(const dock of BOAT_DOCKS.filter(b=>b.x>=d.offset+start&&b.x<d.offset+start+140)){box('lake',dock.water.x,.035,dock.water.z,dock.water.w,.18,dock.water.d,'#468990');box('boat dock',dock.x+3,.22,dock.z+3,8,.4,9,'#b7a279');}
  if(start<0){box('market counter',d.offset-32,1,15,5,2,2,'#c2a26d');box('market canopy',d.offset-32,3,15,7,.2,4,'#9c634a');}
  const batches=new Map<StandardMaterial,Mesh[]>();for(const mesh of pieces){const material=mesh.material as StandardMaterial;const list=batches.get(material)||[];list.push(mesh);batches.set(material,list);}
  const merged:Mesh[]=[];for(const list of batches.values()){const mesh=Mesh.MergeMeshes(list,true,true,undefined,false,false);if(mesh){mesh.isPickable=false;mesh.receiveShadows=true;mesh.freezeWorldMatrix();this.shadows.addShadowCaster(mesh);merged.push(mesh);}}
  return ()=>{for(const release of cleanup)release();for(const mesh of merged){this.shadows.removeShadowCaster(mesh);mesh.dispose();}for(const m of materials.values())m.dispose(false,true);};
 }
 dispose(){this.stream.dispose();}
}
