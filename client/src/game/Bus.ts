import {busModel,busLayout} from '../../../shared/buses';
import {STOPS,routeStops} from '../../../shared/game-data';
import {Scene} from '@babylonjs/core/scene.js';
import {TransformNode} from '@babylonjs/core/Meshes/transformNode.js';
import {MeshBuilder} from '@babylonjs/core/Meshes/meshBuilder.js';
import {StandardMaterial} from '@babylonjs/core/Materials/standardMaterial.js';
import {Color3} from '@babylonjs/core/Maths/math.color.js';
import {DynamicTexture} from '@babylonjs/core/Materials/Textures/dynamicTexture.js';
import {SpotLight} from '@babylonjs/core/Lights/spotLight.js';
import {Vector3} from '@babylonjs/core/Maths/math.vector.js';
import {Mesh} from '@babylonjs/core/Meshes/mesh.js';
import type {BusState} from '../../../shared/types';
export class BusModel {
 private detailed:import("@babylonjs/core").AbstractMesh[]=[];private proxy:Mesh;private detailLevel=0;private interior:import('@babylonjs/core').AbstractMesh[]=[];private paintMaterial:StandardMaterial;private seatMaterial:StandardMaterial;private appliedPaint="";private appliedSeat="";private rearLamp:StandardMaterial;private headLamp:StandardMaterial;private cabin:StandardMaterial;private signals:StandardMaterial[]=[];private blink=0;
 readonly modelId:string;readonly cosmeticsKey:string;private suspension=0;
 root:TransformNode;private door:TransformNode;private wheels:Mesh[]=[];private lamps:SpotLight[]=[];private display:DynamicTexture;private route='';private roll=0;
 constructor(scene:Scene,b:BusState,color:string){
  const variant=busModel(b.model),layout=busLayout(b.model);this.modelId=variant.id;this.cosmeticsKey=JSON.stringify(b.cosmetics||{});color=b.paint||(b.model?variant.color:color);
  this.root=new TransformNode(b.id,scene);const mat=(name:string,hex:string,alpha=1)=>{const m=new StandardMaterial(name,scene);m.diffuseColor=Color3.FromHexString(hex);m.specularColor=new Color3(.16,.16,.16);m.alpha=alpha;return m;};
  const body=mat('bus paint '+b.id,color),cream=mat('ivory '+b.id,variant.trim),black=mat('tyres '+b.id,'#202d2d'),glass=mat('glass '+b.id,'#83b3b5',.32),metal=mat('trim '+b.id,'#abbab4'),seat=mat('seats '+b.id,b.seatStyle||'#496c65');glass.backFaceCulling=false;this.paintMaterial=body;this.seatMaterial=seat;
  const box=(name:string,x:number,y:number,z:number,w:number,h:number,d:number,m:StandardMaterial,parent=this.root)=>{const mesh=MeshBuilder.CreateBox(name,{width:w,height:h,depth:d},scene);mesh.position.set(x,y,z);mesh.parent=parent;mesh.material=m;mesh.receiveShadows=true;return mesh;};
  box('chassis',0,.55,0,2.8,.38,9.7,black);box('floor',0,.95,0,2.85,.22,9.75,cream);box('roof',0,3.65,0,2.95,.22,9.9,cream);box('right body',1.4,1.5,0,.16,1.05,9.7,body);box('left body',-1.4,1.5,-1,.16,1.05,7.7,body);
  for(const side of [-1,1]){for(let z=-4.2;z<4.6;z+=1.25){if(side<0&&z>2)continue;box('window pillar',side*1.42,2.83,z,.12,1.45,.11,cream);box('side window',side*1.42,2.78,z+.59,.06,1.15,1.08,glass);}box('waist stripe',side*1.49,1.83,side<0?-1:0,.035,.2,side<0?7.6:9.6,cream);}
  box('front',0,1.55,4.8,2.9,1.3,.16,body);box('windscreen',0,2.65,4.82,2.66,1.2,.07,glass);box('windshield centre',0,2.7,4.88,.06,1.3,.06,cream);box('rear',0,2,-4.82,2.9,2.95,.14,body);box('rear glass',0,2.8,-4.91,2.3,1.1,.07,glass);
  box('bumper',0,.92,4.97,3,.25,.22,metal);box('grille',0,1.45,4.91,1.35,.38,.05,black);for(let i=0;i<4;i++)box('grille slat',0,1.3+i*.09,4.96,1.3,.025,.02,metal);
  this.rearLamp=mat('rear lamps '+b.id,'#b33f30');for(const x of [-1.1,1.1]){box('tail lamp',x,1.6,-4.93,.32,.5,.06,this.rearLamp);box('rear reflector',x,.95,-4.94,.2,.08,.04,cream);}box('rear bumper',0,.78,-4.97,3,.2,.18,metal);
  const glow=this.headLamp=mat('headlamp '+b.id,'#fff1b9');glow.emissiveColor=Color3.FromHexString('#b3a36e');for(const x of [-1.08,1.08]){box('headlight',x,1.35,4.93,.45,.3,.06,glow);box('mirror stalk',x*1.52,2.95,4.7,.35,.07,.08,metal);box('mirror',x*1.66,2.75,4.72,.1,.42,.22,black);const lamp=new SpotLight('beam',new Vector3(x,1.4,5),new Vector3(0,-.05,1),Math.PI/3,2,scene);lamp.parent=this.root;lamp.intensity=0;lamp.range=40;lamp.renderPriority=10;this.lamps.push(lamp);}
  this.cabin=mat('cabin lighting '+b.id,'#fff0cc');box('ceiling light',0,3.49,0,.25,.05,5,this.cabin);
  for(const side of [-1,1]){const signal=mat('indicator '+b.id+' '+side,'#e5a532');this.signals.push(signal);for(const z of [-4.94,4.95])box('indicator',side*1.32,2,z,.18,.28,.06,signal);}
  for(const x of [-1.45,1.45])for(const z of [-3.15,3.1]){const wheel=MeshBuilder.CreateCylinder('wheel',{height:.32,diameter:1.23,tessellation:16},scene);wheel.parent=this.root;wheel.position.set(x,.63,z);wheel.rotation.z=Math.PI/2;wheel.material=black;const hub=MeshBuilder.CreateCylinder('hub',{height:.34,diameter:.6,tessellation:12},scene);hub.parent=wheel;hub.material=metal;this.wheels.push(wheel);}
  for(let i=0;i<layout.capacity;i++){const x=i%2?.77:-.77,z=2.4-Math.floor(i/2)*1.15;box('seat cushion',x,1.37,z,.6,.16,.64,seat);box('seat back',x,1.79,z-.28,.65,.8,.15,seat);}
  box('driver cushion',.75,1.43,3.75,.65,.18,.65,seat);box('dashboard',.45,1.96,4.35,1.8,.35,.5,black);
  const steering=MeshBuilder.CreateTorus('steering wheel',{diameter:.53,thickness:.055,tessellation:16},scene);steering.parent=this.root;steering.position.set(.8,2.02,3.98);steering.rotation.x=-.5;steering.material=black;
  this.door=new TransformNode('left folding door',scene);this.door.parent=this.root;this.door.position.set(-1.46,1,3.15);box('door panel',0,1.23,0,.12,2.42,1.6,glass,this.door);box('door frame',0,1.25,-.8,.16,2.5,.08,cream,this.door);box('step',-1.6,.7,3.15,.6,.17,1.7,metal);
  this.display=new DynamicTexture('destination '+b.id,{width:512,height:96},scene,false);const label=mat('route board '+b.id,'#ffffff');label.diffuseTexture=this.display;label.emissiveColor=new Color3(.35,.35,.25);box('destination box',0,3.36,4.88,2.6,.42,.1,black);const plane=MeshBuilder.CreatePlane('destination text',{width:2.48,height:.4},scene);plane.parent=this.root;plane.position.set(0,3.36,4.95);plane.rotation.y=Math.PI;plane.material=label;
  if(variant.roof==='ac')box('air conditioning',0,3.96,-1.4,1.8,.5,3.4,cream);
  if(variant.roof==='vent')for(const z of [-2,1])box('roof vent',0,3.84,z,1.4,.18,1,metal);
  if(variant.roof==='rack'){for(const x of [-1.25,1.25])box('luggage rack',x,3.97,-1,.08,.4,6,metal);for(let z=-3.8;z<2;z+=1)box('rack crossbar',0,3.87,z,2.5,.07,.07,metal);}
  const coach=['tourer','intercity'].includes(variant.id);
  if(coach){box('coach brow',0,3.58,4.99,2.9,.28,.35,body);box('coach lower fascia',0,1.03,4.99,2.8,.28,.22,body);for(const x of [-1.08,1.08])box('vertical coach lamp',x,1.48,5,.18,.58,.06,glow);}
  if(variant.id==='city'){for(const side of [-1,1])box('city destination band',side*1.5,3.45,0,.05,.3,9.2,black);box('city front panel',0,1.7,4.97,2.8,.5,.12,cream);}
  if(variant.id==='private'||variant.id==='hill'){for(const side of [-1,1])for(let z=-3.5;z<1.8;z+=1.25){const stripe=box('private livery slash',side*1.51,1.55,z,.035,.7,.3,cream);stripe.rotation.x=.5;}box('sun visor',0,3.25,5.05,2.85,.2,.4,body);}
  const dashGlow=mat('dashboard instruments '+b.id,'#245e54');dashGlow.emissiveColor.set(.12,.38,.25);box('instrument cluster',.8,2.15,4.1,.5,.08,.18,dashGlow);
  const cosmetics=b.cosmetics||{};
  if(cosmetics.livery){const ribbon=mat('custom livery '+b.id,cosmetics.livery);for(const side of [-1,1]){const m=box('golden ribbon',side*1.515,1.45,-.6,.04,.15,7.4,ribbon);m.rotation.x=.07;}}
  if(cosmetics.curtain){const fabric=mat('curtains '+b.id,cosmetics.curtain);for(const side of [-1,1])for(let z=-4;z<2;z+=1.25)box('curtain',side*1.35,2.95,z,.08,.85,.28,fabric);}
  if(cosmetics.wheel){const covers=mat('wheel covers '+b.id,cosmetics.wheel);for(const wheel of this.wheels)for(const hub of wheel.getChildMeshes())hub.material=covers;}
  if(cosmetics.mirror){const covers=mat('mirror covers '+b.id,cosmetics.mirror);for(const side of [-1,1])box('mirror cover',side*1.8,2.75,4.72,.14,.44,.24,covers);}
  if(cosmetics.dashboard){const flower=mat('dashboard flower '+b.id,'#e8ac5c');box('flower pot',-.55,2.19,4.28,.17,.22,.17,cream);for(const x of [-.08,0,.08])box('flower',-.55+x,2.36,4.28,.09,.09,.09,flower);}
  if(cosmetics.interior)this.cabin.diffuseColor=Color3.FromHexString(cosmetics.interior);
  const groups=new Map<number,Mesh[]>();
  for(const child of this.root.getChildMeshes(true)){const m=child as Mesh;if(this.wheels.includes(m))continue;if(!m.material)continue;const group=groups.get(m.material.uniqueId)||[];group.push(m);groups.set(m.material.uniqueId,group);}
  for(const list of groups.values()){const m=Mesh.MergeMeshes(list,true,true,undefined,false,false);if(m){m.parent=this.root;m.isPickable=false;m.receiveShadows=true;}}

 this.detailed=this.root.getChildMeshes();this.interior=this.detailed.filter(m=>m.material===seat);this.proxy=MeshBuilder.CreateBox('far bus',{width:2.9,height:3.2,depth:9.8},scene);this.proxy.parent=this.root;this.proxy.position.y=1.9;this.proxy.material=body;this.proxy.setEnabled(false);this.root.scaling.set(1,layout.heightScale,layout.lengthScale);
 }
 detail(distance:number,range:number,aboard:boolean){
  const next=aboard?0:distance>range*(this.detailLevel===2?.9:1.1)?2:distance>range*(this.detailLevel===1?.35:.45)?1:0;
  if(next!==this.detailLevel){this.detailLevel=next;for(const m of this.detailed)m.setEnabled(next<2);if(next===1)for(const m of this.interior)m.setEnabled(false);this.proxy.setEnabled(next===2);}
 }

 update(b:BusState,dt:number,smooth=1,beams:boolean|number=true){if(b.paint&&b.paint!==this.appliedPaint){this.appliedPaint=b.paint;this.paintMaterial.diffuseColor=Color3.FromHexString(b.paint);}if(b.seatStyle&&b.seatStyle!==this.appliedSeat){this.appliedSeat=b.seatStyle;this.seatMaterial.diffuseColor=Color3.FromHexString(b.seatStyle);}this.suspension+=dt;this.root.position.y=Math.sin(this.suspension*9)*Math.min(.035,Math.abs(b.speed)*.002);if(Math.hypot(b.x-this.root.position.x,b.z-this.root.position.z)>30){this.root.position.x=b.x;this.root.position.z=b.z;}this.root.position.x+=(b.x-this.root.position.x)*smooth;this.root.position.z+=(b.z-this.root.position.z)*smooth;this.root.rotation.y+=Math.atan2(Math.sin(b.yaw-this.root.rotation.y),Math.cos(b.yaw-this.root.rotation.y))*smooth;this.door.rotation.y+=( (b.doors?-1.35:0)-this.door.rotation.y)*Math.min(1,dt*10);this.rearLamp.emissiveColor.set(b.braking||b.handbrake||b.doors?.8:b.lights?.35:.04,.02,.01);this.headLamp.emissiveColor.set(b.lights?1:.08,b.lights?.9:.07,b.lights?.6:.05);this.cabin.emissiveColor=b.lights?this.cabin.diffuseColor.scale(.6):Color3.Black();this.blink+=dt;this.signals.forEach((m,i)=>{const on=b.indicator===(i?'right':'left')&&this.blink%1<.5;m.emissiveColor.set(on?1:0,on?.4:0,0);});this.roll+=b.speed*dt/.615;for(const w of this.wheels)w.rotation.x=this.roll;this.lamps.forEach((l,i)=>{const enabled=b.lights&&i<(typeof beams==='number'?beams:beams?2:0)&&this.detailLevel<2;l.setEnabled(enabled);l.intensity=enabled?2:0;});if(this.route!==b.route+b.direction){this.route=b.route+b.direction;const c=this.display.getContext() as CanvasRenderingContext2D;c.fillStyle=b.cosmetics?.board==='amber'?'#2c2418':'#193b30';c.fillRect(0,0,512,96);c.fillStyle='#ffe2a0';c.font='bold 33px sans-serif';c.textAlign='center';c.fillText(b.route+' · '+(STOPS.find(s=>s.id===routeStops(b).at(-1))?.name||'Terminal'),256,61);this.display.update();}}
 dispose(){this.root.dispose(false,true);this.display.dispose();this.lamps.forEach(l=>l.dispose());}
}
