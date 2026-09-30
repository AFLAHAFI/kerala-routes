import type {Snapshot,PlayerState,BusState} from './types';import type {TrafficState} from './traffic';
type Patch<T>={id:string}&Partial<T>;
export type Frame={delta:true;time:number;players:Patch<PlayerState>[];buses:Patch<BusState>[];traffic:Patch<TrafficState>[];gone:string[];weather:Snapshot['weather'];events:Snapshot['events']};
function rounded<T extends {id:string}>(value:T):T{const result={...value} as any;for(const key of ['x','z','yaw','speed','steer'])if(typeof result[key]==='number')result[key]=Math.round(result[key]*1000)/1000;return result;}
export class SnapshotEncoder {
 private previous=new Map<string,Record<string,string>>();private ids=new Set<string>();
 encode(s:Snapshot):Frame{const patch=<T extends {id:string}>(kind:string,values:T[])=>values.flatMap(value=>{const current=rounded(value);const cache=this.previous.get(kind+value.id)||{};const out:Record<string,unknown>={id:value.id};let changed=false;for(const [key,v] of Object.entries(current)){const json=JSON.stringify(v);if(cache[key]!==json){out[key]=v;cache[key]=json;changed=true;}}this.previous.set(kind+value.id,cache);return changed?[out as Patch<T>]:[];});const currentIds=new Set(s.players.map(p=>p.id));const gone=[...this.ids].filter(id=>!currentIds.has(id));for(const id of gone)this.previous.delete('p'+id);this.ids=currentIds;return {delta:true,time:s.time,players:patch('p',s.players),buses:patch('b',s.buses),traffic:patch('t',s.traffic),gone,weather:s.weather,events:s.events};}
}
export class SnapshotDecoder {
 private state:Snapshot={time:0,players:[],buses:[],traffic:[],weather:'clear',events:[]};
 reset(s:Snapshot){this.state=structuredClone(s);}
 decode(frame:Frame):Snapshot{const merge=<T extends {id:string}>(values:T[],patches:Patch<T>[])=>{const map=new Map(values.map(v=>[v.id,v]));for(const p of patches)map.set(p.id,{...map.get(p.id),...p} as T);return [...map.values()];};this.state={time:frame.time,players:merge(this.state.players.filter(p=>!frame.gone.includes(p.id)),frame.players),buses:merge(this.state.buses,frame.buses),traffic:merge(this.state.traffic,frame.traffic),weather:frame.weather,events:frame.events};return structuredClone(this.state);}
}
