export type Quality='auto'|'low'|'medium'|'high';
export function initialQuality(quality:Quality,device:{touch?:boolean;cores?:number;memoryGB?:number}):Exclude<Quality,'auto'>{
 if(quality!=='auto')return quality;
 return device.touch||(device.cores!==undefined&&device.cores<=4)||(device.memoryGB!==undefined&&device.memoryGB<=4)?'low':'medium';
}
export const PRESETS={low:{distance:230,scale:1.6,shadows:false,lod:70,traffic:100,rain:45,markers:95,lights:0},medium:{distance:420,scale:1.2,shadows:false,lod:120,traffic:170,rain:100,markers:130,lights:2},high:{distance:800,scale:1,shadows:true,lod:220,traffic:260,rain:160,markers:170,lights:4}};
export class AdaptiveResolution {
 private elapsed=0;private frames=0;
 sample(dt:number,scale:number){if(dt<=0||dt>1)return scale;this.elapsed+=dt;this.frames++;if(this.elapsed<8)return scale;const fps=this.frames/this.elapsed;this.elapsed=0;this.frames=0;return fps<28?Math.min(2.5,scale+.15):fps>55?Math.max(1.15,scale-.1):scale;}
 reset(){this.elapsed=this.frames=0;}
}
export class PerformancePanel {
 private panel=document.createElement('pre');private samples:Record<string,unknown>[]=[];private elapsed=0;private frames:number[]=[];private shown=false;
 constructor(){this.panel.id='performance-debug';this.panel.style.cssText='position:fixed;left:8px;top:80px;z-index:90;background:#08241fed;color:#b9f9d6;padding:12px;font:12px monospace;pointer-events:none;max-height:65vh;overflow:hidden;display:none';document.body.append(this.panel);const button=document.createElement('button');button.textContent='Debug';button.style.cssText='position:fixed;right:8px;bottom:8px;z-index:100;font-size:11px';button.onclick=()=>{this.shown=!this.shown;this.panel.style.display=this.shown?'block':'none';};document.body.append(button);const save=document.createElement('button');save.textContent='Export metrics';save.style.cssText='position:fixed;right:68px;bottom:8px;z-index:100;font-size:11px';save.onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify({version:'2.0-alpha.2',samples:this.samples},null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='kerala-performance.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};document.body.append(save);}
 update(dt:number,data:()=>Record<string,unknown>){if(document.hidden)return;this.elapsed+=dt;this.frames.push(dt*1000);if(this.elapsed<1)return;const sorted=this.frames.sort((a,b)=>a-b);const row={at:new Date().toISOString(),fps:Number((this.frames.length/this.elapsed).toFixed(1)),frameP95ms:Number(sorted[Math.floor(sorted.length*.95)].toFixed(1)),worstFrameMs:Number(sorted.at(-1)!.toFixed(1)),...data()};this.samples.push(row);if(this.samples.length>600)this.samples.shift();if(this.shown)this.panel.textContent=Object.entries(row).map(([k,v])=>`${k}: ${typeof v==='object'?JSON.stringify(v):v}`).join('\n');this.frames=[];this.elapsed=0;}
}
