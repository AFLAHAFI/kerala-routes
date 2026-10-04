import type {ArcRotateCamera} from '@babylonjs/core/Cameras/arcRotateCamera.js';
import type {Engine} from '@babylonjs/core/Engines/engine.js';
export function capturePhoto(engine:Engine,name='Kerala-Routes'){
 engine.onEndFrameObservable.addOnce(()=>engine.getRenderingCanvas()?.toBlob(blob=>{if(!blob)return;const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name+'.png';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}));
}
export class PhotoMode {
 private active=false;private bar=document.createElement('div');private previousFov=.8;
 constructor(private camera:ArcRotateCamera,private engine:Engine,private freeze:(active:boolean)=>void){
  this.bar.className='photo-tools';this.bar.hidden=true;this.bar.innerHTML='<span>PHOTO MODE</span><button data-photo="in">Zoom +</button><button data-photo="out">Zoom −</button><button data-photo="save">Save photo</button><button data-photo="exit">Return to game</button>';document.body.append(this.bar);
  this.bar.querySelectorAll<HTMLButtonElement>('button').forEach(button=>button.onclick=()=>{const action=button.dataset.photo;if(action==='exit')this.toggle(false);else if(action==='save')capturePhoto(engine);else camera.fov=Math.max(.25,Math.min(1.2,camera.fov+(action==='in'?-.1:.1)));});
 }
 toggle(active=!this.active){if(active===this.active)return;this.active=active;if(active)this.previousFov=this.camera.fov;else this.camera.fov=this.previousFov;this.bar.hidden=!active;document.body.classList.toggle('photo-mode',active);this.freeze(active);}
}
