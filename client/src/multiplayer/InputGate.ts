import type {Input} from '../../../shared/types';
/** Changed controls at up to 20 Hz; repeated controls refresh the 450 ms server watchdog. */
export class InputGate {
 private lastAt=-Infinity;private signature='';
 accept(input:Input,now:number){
  const signature=[input.x,input.z,+input.sprint,input.throttle??0,input.steer??0,+!!input.brake].join(',');
  if(now-this.lastAt<50||(signature===this.signature&&now-this.lastAt<150))return false;
  this.lastAt=now;this.signature=signature;return true;
 }
 reset(){this.lastAt=-Infinity;this.signature='';}
}
