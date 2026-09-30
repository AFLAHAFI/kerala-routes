import type {TrafficState} from './traffic';
import type {RouteId} from './game-data';
export type Input={seq:number;x:number;z:number;sprint:boolean;throttle?:number;steer?:number;brake?:boolean};
export type Settings={quality:'auto'|'low'|'high';muted:boolean};
export type Weather='clear'|'cloudy'|'rain'|'evening';
export type Progress={kp:number;missions:string[];journal:string[];places:string[];driverStops:string[]};
export type PlayerState={id:string;name:string;x:number;z:number;yaw:number;moving:boolean;sprint:boolean;color:number;seq:number;role:'walker'|'driver'|'passenger';busId:string|null;seat:number;destination:string;progress:Progress;rideStart:number;cycle:boolean;standing:boolean;settings:Settings};
export type BusState={id:string;name:string;x:number;z:number;yaw:number;speed:number;steer:number;driver:string|null;passengers:string[];doors:boolean;lights:boolean;route:RouteId;next:number;served:string[];trip:number;requested:boolean;lastUsed:number;horn:number;finished:boolean;handbrake:boolean;direction:1|-1};
export type Snapshot={time:number;players:PlayerState[];buses:BusState[];events:{id:string;text:string;at:number}[];weather:Weather;traffic:TrafficState[]};
export type Welcome={id:string;players:PlayerState[];buses:BusState[];capacity:number;time:number;weather:Weather;traffic:TrafficState[];saveMode?:string};
export type Action={type:'claim'|'board'|'exit'|'door'|'light'|'horn'|'request-stop'|'route'|'interact'|'recover'|'cycle'|'emote'|'handbrake'|'posture'|'weather'|'return-route';target?:string};
export const EMOTES=['Bus coming!','Hello!','Thanks!','Wait please!','Getting off here.','Good driving!'] as const;
export type Emote=typeof EMOTES[number];
export interface ClientEvents {
 join:(data:{name:string;token?:string},reply:(result:{ok:boolean;message?:string;welcome?:Welcome})=>void)=>void;
 input:(data:Input)=>void;
 action:(action:Action,reply:(r:{ok:boolean;message:string})=>void)=>void;
 settings:(settings:Settings,reply:(r:{ok:boolean})=>void)=>void;
 ping:(reply:()=>void)=>void;
 emote:(text:Emote)=>void;
}
export interface ServerEvents {snapshot:(state:Snapshot|import("./snapshots").Frame)=>void;notice:(text:string)=>void;saveStatus:(state:string)=>void;emote:(data:{id:string;text:Emote})=>void;}
