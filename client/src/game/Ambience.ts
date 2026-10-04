import type {Weather} from '../../../shared/types';
import {districtAt} from '../../../shared/districts';
/** Two quiet loops and occasional short tones, independent of world object count. */
export class Ambience {
 private source:AudioBufferSourceNode;private filter:BiquadFilterNode;private gain:GainNode;private elapsed=0;private clock=0;
 constructor(private context:AudioContext){
  const buffer=context.createBuffer(1,context.sampleRate*2,context.sampleRate),data=buffer.getChannelData(0);
  let brown=0;for(let i=0;i<data.length;i++){brown=(brown+Math.random()*.04-.02)/1.02;data[i]=brown*3;}
  this.source=context.createBufferSource();this.source.buffer=buffer;this.source.loop=true;
  this.filter=context.createBiquadFilter();this.filter.type='lowpass';this.gain=context.createGain();this.gain.gain.value=0;
  this.source.connect(this.filter);this.filter.connect(this.gain);this.gain.connect(context.destination);this.source.start();
 }
 update(dt:number,x:number,z:number,minute:number,weather:Weather,active:boolean){
  this.clock+=dt;this.elapsed+=dt;if(this.elapsed<.25)return;this.elapsed=0;const d=districtAt(x),night=minute>1140||minute<330,rain=weather.includes('rain'),coast=d.biome==='coast';
  const at=this.context.currentTime,nearSea=coast?Math.max(0,1-Math.abs(z+70)/100):0;
  this.filter.frequency.setTargetAtTime(rain?1800:coast?450:800,at,.5);
  this.gain.gain.setTargetAtTime(active?(rain?.11:.015+nearSea*(.035+.015*Math.sin(this.clock*.45))):0,at,.5);
  if(active&&this.clock>5){this.clock=0;if(d.biome!=='town'||night)this.tone(night?4200:1800,.1,night?.002:.006,night?1:.6);}
 }
 tone(frequency:number,duration:number,volume:number,ratio=1){if(this.context.state!=='running')return;const at=this.context.currentTime,o=this.context.createOscillator(),g=this.context.createGain();o.frequency.setValueAtTime(frequency,at);o.frequency.exponentialRampToValueAtTime(frequency*ratio,at+duration);g.gain.setValueAtTime(volume,at);g.gain.exponentialRampToValueAtTime(.0001,at+duration);o.connect(g);g.connect(this.context.destination);o.onended=()=>{o.disconnect();g.disconnect();};o.start();o.stop(at+duration);}
 dispose(){this.source.stop();this.source.disconnect();this.filter.disconnect();this.gain.disconnect();}
}
