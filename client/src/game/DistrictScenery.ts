import {BOAT_DOCKS,cycleStand} from '../../../shared/exploration';
import {Scene} from '@babylonjs/core/scene.js';
import {Mesh} from '@babylonjs/core/Meshes/mesh.js';
import {MeshBuilder} from '@babylonjs/core/Meshes/meshBuilder.js';
import {StandardMaterial} from '@babylonjs/core/Materials/standardMaterial.js';
import {Color3} from '@babylonjs/core/Maths/math.color.js';
import {DynamicTexture} from '@babylonjs/core/Materials/Textures/dynamicTexture.js';
import {ShadowGenerator} from '@babylonjs/core/Lights/Shadows/shadowGenerator.js';
import {DISTRICTS,CONNECTIONS,ROAD_SEGMENTS,districtAt,districtBuildings,roadZ,type District} from '../../../shared/districts';
import {STOPS} from '../../../shared/game-data';
import {SceneryStream} from './Chunks';
import {NightLights} from './NightLights';

/** Only the current district owns generated chunks. The collision data is shared with the server. */
export class DistrictScenery {
 stream=new SceneryStream();
 constructor(private scene:Scene,private shadows:ShadowGenerator,private lights:NightLights){
  for(const d of DISTRICTS.slice(1))for(let start=-100;start<1160;start+=140)this.stream.add(d.offset+start+70,roadZ(d,start+70),q=>this.build(d,start,q));
  for(const segment of ROAD_SEGMENTS){const dx=segment.b.x-segment.a.x,dz=segment.b.z-segment.a.z,n=Math.ceil(Math.hypot(dx,dz)/100);for(let i=0;i<n;i++){const x=segment.a.x+dx*(i+.5)/n,z=segment.a.z+dz*(i+.5)/n;this.stream.add(x,z,q=>this.roadChunk(x,z,dx/n,dz/n,segment.road,q,i===0));}}
 }
 update(dt:number,x:number,z:number,distance:number,quality:number){this.stream.update(dt,x,z,distance,quality);}
 private roadChunk(x:number,z:number,dx:number,dz:number,road:string,quality:number,sign:boolean){
  const meshes:Mesh[]=[],materials:StandardMaterial[]=[],length=Math.hypot(dx,dz),angle=-Math.atan2(dz,dx);
  const material=(hex:string)=>{const m=new StandardMaterial('connector',this.scene);m.diffuseColor=Color3.FromHexString(hex);m.specularColor.set(.02,.02,.02);m.maxSimultaneousLights=3;materials.push(m);return m;};
  const grass=material(road==='CW'?'#577a4e':'#839762'),asphalt=material('#596261'),paint=material('#eee4bd'),wood=material('#79644d');
  const box=(name:string,along:number,side:number,y:number,w:number,h:number,d:number,mat:StandardMaterial)=>{const m=MeshBuilder.CreateBox(name,{width:w,height:h,depth:d},this.scene);m.position.set(x+Math.cos(angle)*along+Math.sin(angle)*side,y,z-Math.sin(angle)*along+Math.cos(angle)*side);m.rotation.y=angle;m.material=mat;m.isPickable=false;m.freezeWorldMatrix();meshes.push(m);return m;};
  box('continuous road land',0,0,-.5,length+5,1,80,grass);box('connecting road',0,0,.025,length+4,.12,19,asphalt);
  for(let a=-length/2;a<length/2;a+=12)box('centre dash',a,0,.095,5,.015,.18,paint);
  for(const side of [-1,1]){box('edge line',0,side*8.7,.095,length+2,.015,.14,paint);if(road==='CW'){box('ghat guardrail',0,side*12,.8,length+3,.15,.2,paint);}for(let i=0;i<(quality?3:1);i++){const along=(i+1)*length/(quality?4:2)-length/2;box('roadside trunk',along,side*27,3,.4,6,.4,wood);box('canopy',along,side*27,6,5,2,5,grass);}}
  if(road==='MP'){box('irrigation water',0,25,-.02,length+2,.1,3,material('#548f95'));box('paddy terrace',0,-27,.02,length,.12,12,material('#b2b94e'));}
  if(sign){const c=CONNECTIONS.find(c=>c.id===road)!;const tex=new DynamicTexture('road directions',{width:1024,height:128},this.scene,false);tex.drawText(c.name+' · '+c.towns.slice(1,3).join(' / '),null,76,'bold 35px sans-serif','#fff4cd','#235c4c',true);const m=material('#ffffff');m.diffuseTexture=tex;m.emissiveColor.set(.2,.2,.2);m.backFaceCulling=false;box('direction pole',0,15,2.5,.2,5,.2,wood);const panel=MeshBuilder.CreatePlane('direction sign',{width:13,height:1.7},this.scene);panel.position.set(x+Math.sin(angle)*15,4.5,z+Math.cos(angle)*15);panel.rotation.y=angle;panel.material=m;meshes.push(panel);}
  const batches:Mesh[]=[];for(const mat of materials){const group=meshes.filter(m=>m.material===mat);if(!group.length)continue;const merged=Mesh.MergeMeshes(group,true,true,undefined,false,false);if(merged){merged.isPickable=false;merged.freezeWorldMatrix();batches.push(merged);}}
  return ()=>{batches.forEach(m=>m.dispose());materials.forEach(m=>m.dispose(false,true));};
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
  // Landmark silhouettes are merged into the same nearby chunk batches.
  const centre=d.offset+start+70,rz=roadZ(d,start+70);
  if(d.biome==='forest'){
   for(let row=0;row<(quality?5:3);row++)for(let col=0;col<5;col++)box('tea hedge',centre-24+col*12,.7,rz+30+row*5,10,1.2,2.2,'#719348');
   for(const side of [-1,1])for(let i=0;i<6;i++)box('hill road guardrail',d.offset+start+12+i*23,.65,roadZ(d,start+12+i*23)+side*9,.3,1.3,.3,'#d6d6bd');
  }
  if(d.biome==='town'){
   for(const side of [-1,1]){box('shop awning',centre,3.4,side*22,15,.18,4,'#ad6945');box('shop counter',centre,1,side*22,12,1.7,2,'#b79b69');for(let i=0;i<3;i++)box('market crates',centre-4+i*4,1.9,side*22,2,.4,1,'#d8b45e');}
   const ridge=MeshBuilder.CreateSphere('Malappuram green hill',{diameter:1,segments:6},this.scene);ridge.position.set(centre,-4,115);ridge.scaling.set(140,28,60);ridge.material=mat('#607f51');pieces.push(ridge);
  }
  if(d.id==='kannur'&&start===180){for(const side of [-1,1])box('laterite fort bastion',centre+side*12,3,rz-43,8,6,10,'#925e46');box('fort sea wall',centre,2,rz-47,30,4,3,'#a36b4d');for(let i=0;i<8;i++)box('fort crenellation',centre-14+i*4,4.5,rz-47,2,1,3,'#a36b4d');}
  if(d.id==='malappuram'&&start===740){box('hill park pavilion',centre,3,rz+44,12,.4,10,'#995d40');for(const side of [-1,1])for(const end of [-1,1])box('pavilion timber pillar',centre+side*5,1.5,rz+44+end*4,.4,3,.4,'#b69464');for(let i=0;i<5;i++)box('park terrace step',centre, i*.2,rz+28+i*2,16-i, .4,2,'#c4ba8e');}
  if(d.id==='palakkad'&&start===180){box('Bharathapuzha inspired riverbank',centre,-.02,rz-65,135,.15,38,'#6f9c9b');box('riverside footbridge',centre,.7,rz-65,5,.4,45,'#c6baa1');for(const side of [-1,1])box('bridge railing',centre+side*2.5,1.3,rz-65,.1,1,45,'#b8ae92');}
  if(d.id==='kannur'&&start===740){
   box('coastal heritage pavilion',centre,2,rz+40,16,4,12,'#ac6a48');box('pavilion tiled eaves',centre,4.2,rz+40,19,.5,15,'#774d3b');box('pavilion upper roof',centre,5.1,rz+40,12,1.3,9,'#9a5b40');
   for(const side of [-1,1])box('pavilion gateway',centre+side*12,2,rz+30,1,4,1,'#b68e60');
  }
  if(d.biome==='fields'){
   box('irrigation channel',centre,-.01,-37,138,.18,2,'#6c9690');box('field footbridge',centre,.3,-37,4,.3,5,'#bca47d');
   if(start===740){box('rural granary',centre,2.4,rz+39,14,4.8,10,'#c6ad7c');box('granary roof',centre,5,rz+39,16,.6,12,'#965f40');}
  }
  if(quality>0){for(const side of [-1,1]){box('electric pole',centre,5,rz+side*14,.16,10,.16,'#6b705e');box('electric crossarm',centre,9.2,rz+side*14,.2,.15,2,'#6b705e');}
   for(let i=0;i<3;i++){const bx=centre-8+i*7;const bird=box('distant bird',bx,10+i%2,rz+35,.7,.08,.16,'#374944');bird.rotation.z=i%2?.25:-.25;}
  }
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
