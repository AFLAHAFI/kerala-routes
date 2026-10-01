// Deploy with PROFILE_TOKEN_SHA256 replaced by SHA-256 of the Render-only token.
const expected = 'PROFILE_TOKEN_SHA256';
Deno.serve(async (req:Request)=>{
 const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
 const token=req.headers.get('x-profile-token')||'';
 if(req.method!=='POST'||!/^[a-f0-9]{64}$/.test(token))return reply({error:'Unauthorized'},401);
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)))).map(n=>n.toString(16).padStart(2,'0')).join('');
 let diff=hash.length^expected.length;for(let i=0;i<hash.length;i++)diff|=hash.charCodeAt(i)^expected.charCodeAt(i);
 if(diff!==0)return reply({error:'Unauthorized'},401);
 try{
 const raw=await req.text();if(raw.length>32768)return reply({error:'Too large'},413);
 const body=JSON.parse(raw);let path='kr_profiles?select=id&limit=0',method='GET',data:unknown;
 if(body.operation==='load'){if(!/^[a-f0-9]{64}$/.test(body.id))return reply({error:'Invalid ID'},400);path='kr_profiles?id=eq.'+body.id+'&select=*';}
 else if(body.operation==='save'){const p=body.profile;if(!p||!/^[a-f0-9]{64}$/.test(p.id)||typeof p.name!=='string'||p.name.length>30||!p.progress||!p.settings)return reply({error:'Invalid profile'},400);path='kr_profiles?on_conflict=id';method='POST';data={id:p.id,name:p.name,progress:p.progress,settings:p.settings,updated_at:new Date().toISOString()};}
 else if(body.operation!=='check')return reply({error:'Invalid operation'},400);
 const keys=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}');const key=keys.default||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!key)throw Error('Missing internal database key');
 const headers:Record<string,string>={apikey:key,'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=minimal'};if(!key.startsWith('sb_secret_'))headers.Authorization='Bearer '+key;
 const result=await fetch(Deno.env.get('SUPABASE_URL')+'/rest/v1/'+path,{method,headers,body:data?JSON.stringify(data):undefined});
 if(!result.ok)return reply({error:'Storage unavailable'},503);
 if(body.operation==='load')return reply({profile:(await result.json())[0]||null});return reply({ok:true});
 }catch{return reply({error:'Storage unavailable'},503);}
});
