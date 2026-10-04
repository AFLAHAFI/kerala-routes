import {rankProfiles,type LeaderboardMetric,type LeaderboardRow} from '../../shared/leaderboards';
import type {ModerationRecord} from '../../shared/social';
import {mkdir,readFile,writeFile,rename,appendFile,readdir} from 'node:fs/promises';
import path from 'node:path';
import type {Progress,Settings} from '../../shared/types.js';
export type Profile={id:string;name:string;progress:Progress;settings:Settings;updated_at:string};
export interface ProfileStore {leaderboard(metric:LeaderboardMetric):Promise<LeaderboardRow[]>;recentModeration():Promise<ModerationRecord[]>;record(record:ModerationRecord):Promise<void>;mode:string;load(id:string):Promise<Profile|null>;save(profile:Profile):Promise<void>;check():Promise<void>}
export class MemoryProfiles implements ProfileStore {mode='Practice server · temporary saves';async leaderboard(metric:LeaderboardMetric){return rankProfiles([...this.rows.values()],metric);}moderation:ModerationRecord[]=[];async recentModeration(){return structuredClone(this.moderation);}async record(record:ModerationRecord){this.moderation.push(structuredClone(record));if(this.moderation.length>200)this.moderation.shift();}rows=new Map<string,Profile>();async load(id:string){return structuredClone(this.rows.get(id)||null);}async save(p:Profile){this.rows.set(p.id,structuredClone(p));}async check(){}}
export class SupabaseProfiles implements ProfileStore {
 mode='Supabase · persistent saves';
 constructor(private url:string,private key:string){if(!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url))throw Error('SUPABASE_URL must be your HTTPS Supabase project URL.');if(!key)throw Error('Missing SUPABASE_SECRET_KEY.');}
 private async request(path:string,method='GET',body?:unknown){const headers:Record<string,string>={apikey:this.key,'Content-Type':'application/json'};if(!this.key.startsWith('sb_secret_'))headers.Authorization='Bearer '+this.key;headers.Prefer='resolution=merge-duplicates,return=minimal';const res=await fetch(this.url.replace(/\/$/,'')+'/rest/v1/'+path,{method,headers,body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(8000)});if(!res.ok)throw Error('Progress database unavailable (HTTP '+res.status+').');return method==='GET'||path.startsWith('rpc/')?res.json():null;}
 async leaderboard(metric:LeaderboardMetric){const result=await this.request('rpc/kr_leaderboard','POST',{p_metric:metric});return result as LeaderboardRow[];}
 async recentModeration(){const rows=await this.request('kr_moderation?select=record&record->>kind=neq.report&created_at=gte.'+new Date(Date.now()-86400000).toISOString()+'&order=created_at.desc&limit=2000');return rows.map((r:{record:ModerationRecord})=>r.record);}
 async record(record:ModerationRecord){await this.request('kr_moderation','POST',{id:record.id,record});}
 async check(){await this.request('kr_profiles?select=id&limit=0');}
 async load(id:string){const rows=await this.request('kr_profiles?id=eq.'+encodeURIComponent(id)+'&select=*');return rows[0] as Profile||null;}
 async save(profile:Profile){await this.request('kr_profiles?on_conflict=id','POST',profile);}
}
// One queued writer per identity prevents an older checkpoint replacing newer progress.
export class SaveQueue {
 private pending=new Map<string,Profile>();private writing=new Map<string,Promise<void>>();
 constructor(private store:ProfileStore,private status:(id:string,status:string)=>void){}
 enqueue(p:Profile){this.pending.set(p.id,structuredClone(p));this.status(p.id,'Saving…');void this.drain(p.id);}
 private async drain(id:string){if(this.writing.has(id))return this.writing.get(id);const work=(async()=>{while(this.pending.has(id)){const value=this.pending.get(id)!;this.pending.delete(id);try{await this.store.save(value);this.status(id,'Saved');}catch{if(!this.pending.has(id))this.pending.set(id,value);this.status(id,'Save pending · retrying');break;}}})();this.writing.set(id,work);try{await work;}finally{this.writing.delete(id);}}
 async retry(){await Promise.all([...this.pending.keys()].map(id=>this.drain(id)));}
 async flush(id?:string){if(id){await this.writing.get(id);await this.drain(id);}else{await Promise.all(this.writing.values());await this.retry();}}
 get dirty(){return this.pending.size;}
}

export class EdgeProfiles implements ProfileStore {
 mode='Supabase · persistent saves';
 constructor(private url:string,private token:string){if(!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url)||!token)throw Error('Invalid progress endpoint configuration.');}
 private async request(operation:string,payload:Record<string,unknown>={}){const response=await fetch(this.url.replace(/\/$/,'')+'/functions/v1/profile-store',{method:'POST',headers:{'Content-Type':'application/json','x-profile-token':this.token},body:JSON.stringify({operation,...payload}),signal:AbortSignal.timeout(12000)});if(!response.ok)throw Error('Progress service unavailable (HTTP '+response.status+').');return response.json();}
 async leaderboard(metric:LeaderboardMetric){return (await this.request('leaderboard',{metric})).rows as LeaderboardRow[];}
 async recentModeration(){return (await this.request('moderation-history')).records as ModerationRecord[];}
 async record(record:ModerationRecord){await this.request('moderation',{record});}
 async check(){await this.request('check');}
 async load(id:string){return (await this.request('load',{id})).profile as Profile|null;}
 async save(profile:Profile){await this.request('save',{profile});}
}

/** Local-only laptop saves. Production adapters and credentials are never used. */
export class FileProfiles implements ProfileStore {
 mode='Laptop · persistent local saves';
 async leaderboard(metric:LeaderboardMetric){await this.check();const names=(await readdir(this.directory)).filter(n=>/^[a-f0-9]{64}\.json$/.test(n));const profiles:Profile[]=[];for(const name of names){const profile=await this.load(name.slice(0,-5));if(profile)profiles.push(profile);}return rankProfiles(profiles,metric);}
 async recentModeration(){try{const lines=(await readFile(path.join(this.directory,'moderation.jsonl'),'utf8')).trim().split('\n').filter(Boolean);return lines.map(line=>JSON.parse(line) as ModerationRecord).filter(r=>r.kind!=='report'&&r.at>Date.now()-86400000);}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return [];throw error;}}

 async record(record:ModerationRecord){await this.check();await appendFile(path.join(this.directory,'moderation.jsonl'),JSON.stringify(record)+'\n',{encoding:'utf8',mode:0o600});}
 constructor(private directory:string){}
 private filename(id:string){if(!/^[a-f0-9]{64}$/.test(id))throw Error('Invalid profile ID');return path.join(this.directory,id+'.json');}
 async check(){await mkdir(this.directory,{recursive:true});}
 async load(id:string):Promise<Profile|null>{try{const profile=JSON.parse(await readFile(this.filename(id),'utf8')) as Profile;if(profile.id!==id||!profile.progress||!Number.isFinite(profile.progress.kp)||!Array.isArray(profile.progress.journal))throw Error('Invalid local save. Restore a backup before continuing.');return profile;}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return null;throw error;}}
 async save(profile:Profile){await this.check();const filename=this.filename(profile.id),temporary=filename+'.tmp';await writeFile(temporary,JSON.stringify(profile),{encoding:'utf8',mode:0o600});await rename(temporary,filename);}
}
