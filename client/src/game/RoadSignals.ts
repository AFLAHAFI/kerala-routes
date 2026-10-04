import {Scene} from '@babylonjs/core/scene.js';
import {TransformNode} from '@babylonjs/core/Meshes/transformNode.js';
import {MeshBuilder} from '@babylonjs/core/Meshes/meshBuilder.js';
import {StandardMaterial} from '@babylonjs/core/Materials/standardMaterial.js';
import {Color3} from '@babylonjs/core/Maths/math.color.js';
import {districtAt} from '../../../shared/districts';
import {SIGNALS,signalColor,type SignalColor} from '../../../shared/road-rules';
export class RoadSignals {
 private roots:TransformNode[]=[];private bulbs:{offset:number;color:SignalColor;material:StandardMaterial}[]=[];private current='';
 constructor(private scene:Scene){}
 update(x:number,now:number){
  const d=districtAt(x);if(this.current!==d.id){this.dispose();this.current=d.id;
   for(const s of SIGNALS.filter(s=>districtAt(s.x).id===d.id)){
    const root=new TransformNode('signal '+s.id,this.scene);this.roots.push(root);root.position.set(s.x,0,s.z);
    const material=(name:string,color:string)=>{const m=new StandardMaterial(name,this.scene);m.diffuseColor=Color3.FromHexString(color);m.specularColor=Color3.Black();return m;};
    const pole=material('signal post','#46564e'),marking=material('crossing paint','#eee4bf');
    const box=(name:string,x:number,y:number,z:number,w:number,h:number,depth:number,m:StandardMaterial)=>{const mesh=MeshBuilder.CreateBox(name,{width:w,height:h,depth},this.scene);mesh.parent=root;mesh.position.set(x,y,z);mesh.material=m;mesh.isPickable=false;};
    for(const side of [-1,1]){box('signal post',0,2.5,side*8,.2,5,.2,pole);box('signal housing',0,4.5,side*8,.5,1.6,.6,pole);for(const [i,color] of (['red','yellow','green'] as const).entries()){const bulb=material('signal '+color,'#111b15');this.bulbs.push({offset:s.offset,color,material:bulb});box('signal lens',side*.27,5-i*.48,side*8,.05,.35,.4,bulb);}}
    for(let z=-5.5;z<6;z+=1.8)box('zebra crossing',0,.11,z,3,.02,1,marking);
    for(const side of [-1,1])box('stop line',side*5,.11,side*3.3,.3,.02,5.5,marking);
   }
  }
  for(const b of this.bulbs){const on=signalColor(now,b.offset)===b.color;b.material.emissiveColor.copyFrom(on?Color3.FromHexString({red:'#ff3020',yellow:'#ffb72c',green:'#27e67a'}[b.color]):Color3.Black());}
 }
 dispose(){for(const root of this.roots)root.dispose(false,true);this.roots=[];this.bulbs=[];this.current='';}
}
