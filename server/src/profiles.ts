import type {Progress,Settings} from '../../shared/types.js';
export type Profile={id:string;name:string;progress:Progress;settings:Settings;updated_at:string};
export interface ProfileStore {mode:string;load(id:string):Promise<Profile|null>;save(profile:Profile):Promise<void>;check():Promise<void>}
export class MemoryProfiles implements ProfileStore {mode='Practice server · temporary saves';rows=new Map<string,Profile>();async load(id:string){return structuredClone(this.rows.get(id)||null);}async save(p:Profile){this.rows.set(p.id,structuredClone(p));}async check(){}}
export class SupabaseProfiles implements ProfileStore {
 mode='Supabase · persistent saves';
 constructor(private url:string,private key:string){if(!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url))throw Error('SUPABASE_URL must be your HTTPS Supabase project URL.');if(!key)throw Error('Missing SUPABASE_SECRET_KEY.');}
 private async request(path:string,method='GET',body?:unknown){const headers:Record<string,string>={apikey:this.key,'Content-Type':'application/json'};if(!this.key.startsWith('sb_secret_'))headers.Authorization='Bearer '+this.key;headers.Prefer='resolution=merge-duplicates,return=minimal';const res=await fetch(this.url.replace(/\/$/,'')+'/rest/v1/'+path,{method,headers,body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(8000)});if(!res.ok)throw Error('Progress database unavailable (HTTP '+res.status+').');return method==='GET'?res.json():null;}
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
 async check(){await this.request('check');}
 async load(id:string){return (await this.request('load',{id})).profile as Profile|null;}
 async save(profile:Profile){await this.request('save',{profile});}
}
