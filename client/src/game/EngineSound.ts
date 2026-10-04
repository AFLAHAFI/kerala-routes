/** One quiet synthesized engine for the bus being ridden. No audio downloads or per-vehicle loops. */
export class EngineSound {
 private oscillator:OscillatorNode;private filter:BiquadFilterNode;private gain:GainNode;private elapsed=0;
 constructor(private context:AudioContext){this.oscillator=context.createOscillator();this.oscillator.type='sawtooth';this.filter=context.createBiquadFilter();this.filter.type='lowpass';this.filter.frequency.value=180;this.gain=context.createGain();this.gain.gain.value=0;this.oscillator.connect(this.filter);this.filter.connect(this.gain);this.gain.connect(context.destination);this.oscillator.start();}
 update(dt:number,speed:number,active:boolean){this.elapsed+=dt;if(this.elapsed<.1)return;this.elapsed=0;const at=this.context.currentTime;this.oscillator.frequency.setTargetAtTime(32+Math.abs(speed)*3,at,.1);this.gain.gain.setTargetAtTime(active?.012:0,at,.12);}
 dispose(){this.oscillator.stop();this.oscillator.disconnect();this.filter.disconnect();this.gain.disconnect();}
}
