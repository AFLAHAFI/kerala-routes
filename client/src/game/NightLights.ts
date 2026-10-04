import {Scene} from '@babylonjs/core/scene.js';
import {PointLight} from '@babylonjs/core/Lights/pointLight.js';
import {Vector3} from '@babylonjs/core/Maths/math.vector.js';
import {Color3} from '@babylonjs/core/Maths/math.color.js';
import {StandardMaterial} from '@babylonjs/core/Materials/standardMaterial.js';
/** Shadow-free light pool. Bulb appearance is independent of expensive light count. */
export class NightLights {
 private positions:Vector3[]=[];private bulbs=new Map<StandardMaterial,number>();private pool:PointLight[]=[];private elapsed=1;private amount=0;private budget=2;active=0;
 constructor(private scene:Scene){for(let i=0;i<4;i++){const l=new PointLight('street-light-pool-'+i,new Vector3(),scene);l.diffuse=Color3.FromHexString('#ffe1a8');l.range=23;l.intensity=0;l.setEnabled(false);this.pool.push(l);}}
 add(x:number,y:number,z:number,bulb?:StandardMaterial){const position=new Vector3(x,y,z);this.positions.push(position);if(bulb){bulb.unfreeze();this.bulbs.set(bulb,(this.bulbs.get(bulb)||0)+1);}return ()=>{this.positions=this.positions.filter(p=>p!==position);if(bulb){const count=(this.bulbs.get(bulb)||1)-1;if(count)this.bulbs.set(bulb,count);else this.bulbs.delete(bulb);}this.elapsed=1;};}
 quality(budget:number){this.budget=Math.max(0,Math.min(4,budget));this.elapsed=1;}
 update(dt:number,x:number,z:number,night:number){
  this.amount=night;for(const m of this.bulbs.keys())m.emissiveColor.set(night*.9,night*.65,night*.3);
  this.elapsed+=dt;if(this.elapsed>=.25){this.elapsed=0;const close=this.positions.filter(p=>Math.hypot(p.x-x,p.z-z)<65).sort((a,b)=>Math.hypot(a.x-x,a.z-z)-Math.hypot(b.x-x,b.z-z));
   this.pool.forEach((l,i)=>{const enabled=night>.01&&i<this.budget&&!!close[i];l.setEnabled(enabled);if(enabled)l.position.copyFrom(close[i]);});}
  this.active=0;for(const l of this.pool){l.intensity=l.isEnabled()?night*1.5:0;if(l.isEnabled())this.active++;}
 }
 dispose(){for(const l of this.pool)l.dispose();this.positions=[];this.bulbs.clear();}
}
