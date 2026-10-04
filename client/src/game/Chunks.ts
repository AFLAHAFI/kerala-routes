import type {AbstractMesh} from '@babylonjs/core/Meshes/abstractMesh.js';
export function chunkKey(x:number,z:number){return `${Math.floor(x/140)}:${Math.floor(z/140)}`;}
export class ChunkVisibility {
 private chunks=new Map<string,{x:number,z:number,meshes:AbstractMesh[],enabled:boolean}>();private elapsed=1;active=0;
 add(mesh:AbstractMesh){mesh.computeWorldMatrix(true);const c=mesh.getBoundingInfo().boundingBox.centerWorld;if(mesh.getBoundingInfo().boundingBox.extendSizeWorld.length()>160)return;const key=chunkKey(c.x,c.z);let chunk=this.chunks.get(key);if(!chunk){chunk={x:(Math.floor(c.x/140)+.5)*140,z:(Math.floor(c.z/140)+.5)*140,meshes:[],enabled:true};this.chunks.set(key,chunk);}chunk.meshes.push(mesh);}
 update(dt:number,x:number,z:number,distance:number){this.elapsed+=dt;if(this.elapsed<.5)return;this.elapsed=0;this.active=0;for(const chunk of this.chunks.values()){const enabled=Math.hypot(x-chunk.x,z-chunk.z)<distance+(chunk.enabled?160:110);if(enabled)this.active++;if(enabled!==chunk.enabled){chunk.enabled=enabled;for(const m of chunk.meshes)m.setEnabled(enabled);}}}
 get total(){return this.chunks.size;}
}

/** Procedural decorative chunks; collision, roads and stops remain always available. */
export class SceneryStream {
 private entries:{x:number;z:number;build:(quality:number)=>()=>void;release?:()=>void;quality?:number}[]=[];
 private elapsed=1;loads=0;unloads=0;
 add(x:number,z:number,build:(quality:number)=>()=>void){this.entries.push({x,z,build});}
 update(dt:number,x:number,z:number,distance:number,quality:number){
  this.elapsed+=dt;if(this.elapsed<.1)return;this.elapsed=0;
  for(const e of this.entries)if(e.release&&Math.hypot(x-e.x,z-e.z)>distance+200){e.release();e.release=undefined;this.unloads++;}
  // Closest first, one small factory per update; hysteresis avoids boundary thrashing.
  const pending=this.entries.filter(e=>(!e.release||e.quality!==quality)&&Math.hypot(x-e.x,z-e.z)<distance+100).sort((a,b)=>Math.hypot(x-a.x,z-a.z)-Math.hypot(x-b.x,z-b.z));
  const e=pending[0];if(e){const release=e.build(quality);if(e.release){e.release();this.unloads++;}e.release=release;e.quality=quality;this.loads++;}
 }
 get active(){return this.entries.filter(e=>e.release).length;}
 dispose(){for(const e of this.entries){e.release?.();e.release=undefined;}}
}
