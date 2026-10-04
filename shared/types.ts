import type {TrafficState} from './traffic';
import type {RouteId} from './game-data';
export type Input={seq:number;x:number;z:number;sprint:boolean;throttle?:number;steer?:number;brake?:boolean};
export type Settings={quality:'auto'|'low'|'medium'|'high';muted:boolean};
export type Weather='clear'|'cloudy'|'rain'|'evening'|'light-rain'|'heavy-rain'|'fog'|'mist';
export type Progress={kp:number;missions:string[];journal:string[];places:string[];driverStops:string[];v2?:import("./progression").V2Progress};
export type PlayerState={heldItem?:{kind:string;until:number}|null;boat?:string|null;boatDistance?:number;cycleDistance?:number;id:string;name:string;x:number;z:number;yaw:number;moving:boolean;sprint:boolean;color:number;seq:number;role:'walker'|'driver'|'passenger';busId:string|null;seat:number;destination:string;progress:Progress;rideStart:number;cycle:boolean;standing:boolean;settings:Settings};
export type BusState={cosmetics?:Record<string,string>;model?:string;id:string;name:string;x:number;z:number;yaw:number;speed:number;steer:number;driver:string|null;passengers:string[];doors:boolean;lights:boolean;autoLights?:boolean;braking?:boolean;indicator?:'off'|'left'|'right';paint?:string;seatStyle?:string;hornPreset?:string;route:RouteId;next:number;served:string[];trip:number;requested:boolean;lastUsed:number;horn:number;finished:boolean;handbrake:boolean;direction:1|-1};
export type Snapshot={npcs?:import("../server/src/npc").NpcPassenger[];time:number;players:PlayerState[];buses:BusState[];events:{id:string;text:string;at:number}[];weather:Weather;traffic:TrafficState[]};
export type Welcome={roomId?:string;privateRoom?:boolean;chat?:import("./social").ChatMessage[];npcs?:import("../server/src/npc").NpcPassenger[];id:string;players:PlayerState[];buses:BusState[];capacity:number;time:number;weather:Weather;traffic:TrafficState[];saveMode?:string;clock?:import("./time").WorldClockState};
export type Action={type:'claim'|'board'|'exit'|'door'|'light'|'horn'|'request-stop'|'route'|'interact'|'recover'|'cycle'|'emote'|'handbrake'|'posture'|'weather'|'return-route'|'auto-lights'|'indicator'|'buy'|'equip'|'district'|'bus-model'|'boat';requestId?:string;target?:string};
export const EMOTES=['Bus coming!','Hello!','Thanks!','Wait please!','Getting off here.','Good driving!'] as const;
export type Emote=typeof EMOTES[number];
export interface ClientEvents {
 leave:()=>void;
 leaderboard:(metric:import("./leaderboards").LeaderboardMetric,reply:(result:{ok:boolean;rows?:import("./leaderboards").LeaderboardRow[];message?:string})=>void)=>void;
 chat:(text:string,reply:(result:{ok:boolean;message?:string})=>void)=>void;
 block:(id:string,blocked:boolean)=>void;
 report:(request:import("./social").ReportRequest,reply:(result:{ok:boolean;message:string})=>void)=>void;
 rooms:(reply:(rooms:{id:string;players:number;capacity:number}[])=>void)=>void;
 join:(data:{name:string;token?:string;room?:string;createPrivate?:boolean;blocked?:string[]},reply:(result:{ok:boolean;message?:string;welcome?:Welcome})=>void)=>void;
 input:(data:Input)=>void;
 action:(action:Action,reply:(r:{ok:boolean;message:string})=>void)=>void;
 settings:(settings:Settings,reply:(r:{ok:boolean})=>void)=>void;
 ping:(reply:()=>void)=>void;
 emote:(text:Emote)=>void;
}
export interface ServerEvents {chat:(message:import("./social").ChatMessage)=>void;clock:(clock:import("./time").WorldClockState)=>void;snapshot:(state:Snapshot|import("./snapshots").Frame)=>void;notice:(text:string)=>void;saveStatus:(state:string)=>void;emote:(data:{id:string;text:Emote})=>void;}
