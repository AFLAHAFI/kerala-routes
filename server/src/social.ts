import {randomUUID} from 'node:crypto';import {REPORT_REASONS,type ChatMessage,type ReportRequest,type ModerationRecord} from '../../shared/social';
export class RoomSocial {
 messages:ChatMessage[]=[];private rates=new Map<string,number[]>();private strikes=new Map<string,number>();private muted=new Map<string,number>();private bans=new Map<string,number>();private reports=new Map<string,number[]>();
 constructor(readonly room:string,private save:(record:ModerationRecord)=>Promise<void>){}
 restore(records:ModerationRecord[],now=Date.now()){for(const r of records.filter(r=>r.room===this.room).sort((a,b)=>a.at-b.at)){const until=r.at+(r.duration||0)*60000;if(until<=now)continue;if(r.kind==='mute')this.muted.set(r.target,until);if(r.kind==='ban')this.bans.set(r.target,until);}}
 banned(id:string,now=Date.now()){return (this.bans.get(id)||0)>now;}
 send(id:string,name:string,value:unknown,now=Date.now()):ChatMessage{
  if((this.muted.get(id)||0)>now)throw Error('You are temporarily muted. Try again later.');
  if(typeof value!=='string'||value.length>200)throw Error('Messages must be 1–200 characters.');
  let text=value.normalize('NFKC').replace(/[\u0000-\u001f\u007f\u200b-\u200f\u202a-\u202e]/g,' ').trim();if(!text)throw Error('Enter a message.');
  const recent=(this.rates.get(id)||[]).filter(t=>now-t<10000);this.rates.set(id,recent);if(recent.length>=4){const strikes=(this.strikes.get(id)||0)+1;this.strikes.set(id,strikes);if(strikes>=5){this.muted.set(id,now+60000);this.strikes.delete(id);}throw Error('Slow down: at most four messages every ten seconds.');}
  if(this.messages.some(m=>m.player===id&&m.text===text&&now-m.at<30000))throw Error('Please do not repeat the same message.');
  recent.push(now);text=text.replace(/\b(fuck\w*|shit\w*|bitch\w*|asshole\w*|bastard\w*)\b/gi,'•••');
  const message={id:randomUUID(),player:id,name,text,at:now};this.messages.push(message);if(this.messages.length>80)this.messages.shift();return message;
 }
 async report(reporter:string,request:ReportRequest,known:string[],now=Date.now()){
  if(!request||!REPORT_REASONS.includes(request.reason as any)||request.target===reporter||!known.includes(request.target))throw Error('Choose another traveller and a report reason.');
  if(request.messageId&&!this.messages.some(m=>m.id===request.messageId&&m.player===request.target))throw Error('That message is not available as evidence.');
  const recent=(this.reports.get(reporter)||[]).filter(t=>now-t<60000);if(recent.length>=3)throw Error('Please wait before sending another report.');recent.push(now);this.reports.set(reporter,recent);
  const evidence=this.messages.filter(m=>m.player===request.target).slice(-10);
  await this.save({id:randomUUID(),room:this.room,reporter,target:request.target,reason:request.reason,at:now,kind:'report',evidence});
  // Reports are evidence for a human review, never a vote for an automatic ban.
 }
 async moderate(target:string,kind:'mute'|'kick'|'ban',minutes:number,reason:string,now=Date.now()){
  if(!['mute','kick','ban'].includes(kind)||!Number.isFinite(minutes)||minutes<1||minutes>1440)throw Error('Choose a temporary action of 1–1440 minutes.');
  await this.save({id:randomUUID(),room:this.room,reporter:'moderator',target,reason:reason.slice(0,200),at:now,kind,duration:minutes,evidence:this.messages.filter(m=>m.player===target).slice(-10)});
  if(kind==='mute')this.muted.set(target,now+minutes*60000);if(kind==='ban')this.bans.set(target,now+minutes*60000);
 }
}
