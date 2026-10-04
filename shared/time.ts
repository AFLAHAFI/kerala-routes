/** A compact periodic clock sample, independent of 15 Hz movement snapshots. */
export type WorldClockState={serverAt:number;minute:number;cycleSeconds:number};
export function wrapMinute(value:number){return ((value%1440)+1440)%1440;}
export function cycleDuration(value:unknown,fallback=2700){const n=Number(value);return Number.isFinite(n)&&n>=60&&n<=86400?n:fallback;}
export function clockMinute(anchor:WorldClockState,now:number){return wrapMinute(anchor.minute+(now-anchor.serverAt)*1.44/anchor.cycleSeconds);}
export class WorldClock {
 private anchor:WorldClockState;
 constructor(now=Date.now(),cycleSeconds=2700,startHour=9){this.anchor={serverAt:now,minute:wrapMinute(startHour*60),cycleSeconds:cycleDuration(cycleSeconds)};}
 sample(now=Date.now()):WorldClockState{return {serverAt:now,minute:clockMinute(this.anchor,now),cycleSeconds:this.anchor.cycleSeconds};}
}
export function lightState(minute:number){
 const hour=wrapMinute(minute)/60,elevation=Math.sin((hour-6)*Math.PI/12);
 const smooth=(a:number,b:number,v:number)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};
 const daylight=smooth(-.16,.25,elevation),night=1-smooth(-.10,.12,elevation),warmth=(1-Math.min(1,Math.abs(elevation)/.45))*daylight;
 return {hour,elevation,daylight,night,warmth};
}
export function formatTime(minute:number){const m=Math.floor(wrapMinute(minute));return `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;}
export class ClientClock {
 private anchor:WorldClockState|null=null;private receivedAt=0;private lastAt=0;private minute=540;
 sync(state:WorldClockState,localNow:number,oneWayMs=0){
  if(!Number.isFinite(state.minute)||!Number.isFinite(state.cycleSeconds)||state.cycleSeconds<60)return;
  this.anchor={...state,minute:wrapMinute(state.minute+Math.min(2000,Math.max(0,oneWayMs))*1.44/state.cycleSeconds)};
  this.receivedAt=localNow;if(!this.lastAt){this.minute=this.anchor.minute;this.lastAt=localNow;}
 }
 sample(localNow:number){if(!this.anchor)return this.minute;const dt=Math.max(0,Math.min(1,(localNow-this.lastAt)/1000));this.lastAt=localNow;
  this.minute=wrapMinute(this.minute+dt*1440/this.anchor.cycleSeconds);
  const target=wrapMinute(this.anchor.minute+(localNow-this.receivedAt)*1.44/this.anchor.cycleSeconds),error=((target-this.minute+2160)%1440)-720;
  this.minute=wrapMinute(this.minute+error*(1-Math.exp(-dt*2)));return this.minute;
 }
 serverNow(localNow:number){return this.anchor?this.anchor.serverAt+localNow-this.receivedAt:Date.now();}
 reset(){this.anchor=null;this.lastAt=0;this.minute=540;}
}
