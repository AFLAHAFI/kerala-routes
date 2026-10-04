import {LEADERBOARD_METRICS,type LeaderboardMetric,type LeaderboardRow} from '../../../shared/leaderboards';
import {BOAT_DOCKS,cycleStand} from '../../../shared/exploration';
import {REPORT_REASONS,type ChatMessage,type ReportRequest} from '../../../shared/social';
import {BUS_MODELS} from '../../../shared/buses';
import {DISTRICTS,districtAt,districtBuildings,roadZ} from '../../../shared/districts';
import {SHOP_ITEMS,driverLevel} from '../../../shared/progression';
import {formatTime} from '../../../shared/time';
import { BUILDINGS, PLACES } from "../../../shared/world";
import {STOPS,ROUTES,MISSIONS,DISCOVERIES,distance,routeStops} from "../../../shared/game-data";
import {EMOTES} from "../../../shared/types";
import type {Action,BusState, PlayerState, Emote } from "../../../shared/types";
export class UI {
  onLeaderboard:(metric:LeaderboardMetric)=>Promise<{ok:boolean;rows?:LeaderboardRow[];message?:string}>=async()=>({ok:false});
  roomId='public-1';roomChoice='public-1';createPrivate=false;chatMessages:ChatMessage[]=[];blocked=new Set<string>();chatMuted=false;
  onChat:(text:string)=>void=()=>{};onBlock:(id:string,value:boolean)=>void=()=>{};onReport:(r:ReportRequest)=>void=()=>{};
  onAction:(a:Action)=>void=()=>{};
  onWeather:(weather:string)=>void=()=>{};
  buses:BusState[]=[];
  onPhoto:()=>void=()=>{};
  onCamera:()=>void=()=>{};
  muted=false;onMute:(v:boolean)=>void=()=>{};
  onJoin: (name: string, solo: boolean) => void = () => {};
  onSettings: (quality: string, light: string) => void = () => {};
  onExit: () => void = () => {};
  onEmote: (s: Emote) => void = () => {};
  onPanel: (open: boolean) => void = () => {};
  quality = "auto";
  light = "day";
  players: PlayerState[] = [];
  self: PlayerState | null = null;
  mode = "";capacity=15;
  private timer = 0;
  private priorFocus: HTMLElement | null = null;
  constructor() {
    document.querySelector("#app")!.innerHTML = `
 <section class="landing" id="landing"><div class="topline"><div class="brand"><span class="brand-mark">κ</span><div class="brand-name">KERALA ROUTES<span class="brand-sub">DISTRICT EXPLORER</span></div></div><span class="edition">V2 RC1 · PUBLIC PLAYTEST</span></div>
 <div class="landing-copy"><div class="eyebrow">A SHARED WORLD. A SLOWER JOURNEY.</div><h1>A little closer<br>to <em>Kerala.</em></h1><p class="landing-description">Salt in the air. Shade under the palms.<br>Step into a little piece of Kozhikode, and explore it together.</p>
 <form class="entry" id="join-form"><label for="player-name">What should fellow travellers call you?</label><input id="player-name" maxlength="18" placeholder="Your traveller name" value="Traveller" autocomplete="off" required><label for="room-choice">Room</label><select id="room-choice"><option value="public-1">Public room 1</option><option value="public-2">Public room 2</option><option value="public-3">Public room 3</option><option value="new">Create private room</option><option value="code">Join private room by code</option></select><input class="hidden" id="room-code" placeholder="Private code: P-…" maxlength="14" aria-label="Private room code"><button class="primary" id="join" type="submit">Join shared room <span aria-hidden="true">↗</span></button><button class="secondary" id="solo" type="button">Practice solo</button><small>Up to 15 real players · Shared room<br>Drive · Ride together · Explore · Discover</small><div id="join-error" class="error" role="alert"></div></form></div>
 <div class="landing-footer"><div class="coordinates">KOZHIKODE, KERALA &nbsp; / &nbsp; A STYLIZED COASTAL WORLD</div><div class="location-tag"><span class="eyebrow">YOUR FIRST DESTINATION</span><strong>The Malabar coast</strong><small>Original scenery inspired by Kerala</small></div></div><div id="loading" class="loading">Preparing your journey…</div></section>
 <section class="hud hidden" id="hud"><div class="hud-top"><div class="brand"><span class="brand-mark">κ</span><div class="brand-name">KERALA ROUTES<span class="brand-sub">DISTRICT EXPLORER · ALPHA</span></div></div><div class="hud-buttons"><span class="pill"><i class="dot"></i><span id="online">Connecting…</span></span><button data-panel="map" title="Map (M)">Map</button><button data-panel="people">Travellers</button><button data-panel="chat">Chat</button><button data-panel="missions">Missions</button><button data-panel="journal">Journal</button><button data-panel="progression">Progress</button><button data-panel="leaderboards">Rankings</button><button data-panel="shop">Shop</button><button data-panel="garage">Garage</button><button data-panel="districts">Districts</button><button id="photo-mode">Photo</button><button id="camera-toggle" title="Change camera">Camera</button><button data-panel="settings" title="Settings">Settings</button><button data-panel="help" aria-label="Controls and help">?</button></div></div>
 <div class="place-card"><span class="eyebrow" id="district-label">KOZHIKODE · TEST WORLD</span><h2 id="place-name">Mavoor Road</h2><small id="place-ml">കോഴിക്കോട്</small></div>
 <aside class="objective"><span class="eyebrow" id="role-title">YOUR JOURNEY</span><h3 id="journey-title">Choose your first journey.</h3><p id="journey-detail">Approach a bus at the terminal to drive or ride.</p><strong id="points">0 Kerala Points</strong><div class="action-grid" id="actions"></div></aside>
 <button class="map-card" data-panel="map" aria-label="Open district map"><canvas id="minimap" width="376" height="284"></canvas><div class="map-caption"><span>LOCAL AREA</span><span>● YOU</span></div></button>
 <div class="controls"><span><kbd>WASD</kbd> Move / drive</span><span><kbd>E</kbd> Interact · <kbd>F</kbd> Doors</span><span>Drag to look</span><span><kbd>C</kbd> Camera</span></div>
 <div class="status-bottom"><span id="performance">— FPS</span><br><span id="connection">Online playtest</span><br><span id="save-state"></span><br><span id="world-time">09:00 · clear</span></div>
 <div class="drive-touch" id="drive-touch"><div><button id="steer-left" aria-label="Steer left">◀</button><button id="steer-right" aria-label="Steer right">▶</button></div><div><button id="reverse">Reverse</button><button id="brake">Brake</button><button id="accelerate">Accelerate</button></div></div>
 <div class="touch"><div class="joystick" id="joystick" role="group" aria-label="Movement joystick"><span></span></div><button id="sprint" aria-label="Hold to run">Run</button></div>
 </section><div class="toast" id="toast" role="status"></div><div class="dialog-shade hidden" id="shade"><section class="panel" id="panel" role="dialog" aria-modal="true" aria-labelledby="panel-title"></section></div>`;
    document.querySelector<HTMLButtonElement>("#photo-mode")!.onclick=()=>this.onPhoto();
    document.querySelector<HTMLButtonElement>("#camera-toggle")!.onclick=()=>this.onCamera();
    document.querySelector<HTMLSelectElement>('#room-choice')!.onchange=e=>document.querySelector('#room-code')!.classList.toggle('hidden',(e.target as HTMLSelectElement).value!=='code');
    const input = document.querySelector<HTMLInputElement>("#player-name")!;
    try {
      input.value = localStorage.getItem("kr-name") || "Traveller";
      this.quality = localStorage.getItem("kr-quality") || this.quality;
    } catch {}
    document.querySelector("#join-form")!.addEventListener("submit", (e) => {
      e.preventDefault();
      const choice=document.querySelector<HTMLSelectElement>('#room-choice')!.value;this.createPrivate=choice==='new';this.roomChoice=choice==='code'?document.querySelector<HTMLInputElement>('#room-code')!.value.trim().toUpperCase():choice==='new'?'public-1':choice;
      this.join(input.value, false);
    });
    document
      .querySelector("#solo")!
      .addEventListener("click", () => this.join(input.value, true));
    document
      .querySelectorAll<HTMLElement>("[data-panel]")
      .forEach((b) => (b.onclick = () => this.open(b.dataset.panel!)));
    const shade = document.querySelector<HTMLElement>("#shade")!;
    shade.addEventListener("click", (e) => {
      if (e.target === shade) this.close();
    });
    document.addEventListener("keydown", (e) => {
      if (shade.classList.contains("hidden")) return;
      if (e.key === "Escape") {
        e.preventDefault();
        this.close();
      }
      if (e.key === "Tab") {
        const list = [
          ...document.querySelectorAll<HTMLElement>(
            "#panel button,#panel select,#panel input",
          ),
        ];
        if (!list.length) return;
        const first = list[0],
          last = list[list.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });
  }
  join(name: string, solo: boolean) {
    if (!name.trim()) {
      this.error("Please enter a traveller name.");
      return;
    }
    try {
      localStorage.setItem("kr-name", name);
    } catch {}
    this.busy(true);
    this.onJoin(name, solo);
  }
  busy(b: boolean) {
    document.querySelector<HTMLButtonElement>("#join")!.disabled = b;
    document.querySelector<HTMLButtonElement>("#solo")!.disabled = b;
    document.querySelector("#join")!.textContent = b
      ? "Joining…"
      : "Join shared room ↗";
    if (b) this.error("");
  }
  error(message: string) {
    document.querySelector("#join-error")!.textContent = message;
  }
  ready() {
    document.querySelector("#loading")!.classList.add("hidden");
  }
  play(solo: boolean) {
    this.mode = solo ? "Solo · local" : "Shared room";
    document.querySelector("#landing")!.classList.add("hidden");
    document.querySelector("#hud")!.classList.remove("hidden");
    this.busy(false);
  }
  menu() {
    this.close();
    document.querySelector("#landing")!.classList.remove("hidden");
    document.querySelector("#hud")!.classList.add("hidden");
    this.busy(false);
  }
  clock(minute:number,weather:string){const el=document.querySelector('#world-time');if(el)el.textContent=formatTime(minute)+' · '+weather;}
  saveStatus(text:string){document.querySelector("#save-state")!.textContent=text;}
  status(text: string) {
    document.querySelector("#connection")!.textContent = text;
  }
  update(players: PlayerState[], self: PlayerState, fps: number, buses:BusState[] = [],ping=0) {
    this.buses=buses;
    this.journey(self);
    this.players = players;
    this.self = self;
    document.querySelector("#online")!.textContent = this.mode.startsWith(
      "Solo",
    )
      ? "Solo exploration"
      : `${players.length} / ${this.capacity} online`;
    document.querySelector("#performance")!.textContent =
      `${Math.round(fps)} FPS · ${this.quality.toUpperCase()} · ${ping} ms`;
    const place = [...STOPS].sort(
      (a, b) =>
        Math.hypot(a.x - self.x, a.z - self.z) -
        Math.hypot(b.x - self.x, b.z - self.z),
    )[0];
    document.querySelector("#place-name")!.textContent = place.name;document.querySelector("#district-label")!.textContent=districtAt(self.x).name+" · "+this.roomId;
    document.querySelector("#place-ml")!.textContent = place.ml;
    this.map(document.querySelector("#minimap")!);
    const full = document.querySelector<HTMLCanvasElement>("#full-map");
    if (full) this.map(full, true);
  }
  map(canvas: HTMLCanvasElement, labels = false) {
    const ctx = canvas.getContext("2d")!,
      w = canvas.width,
      h = canvas.height;
    const district=districtAt(this.self?.x||0),offset=district.offset;
    const span=labels?1240:240, center=labels?offset+505:(this.self?.x||30);
    const tx = (x: number) => ((x-center+span/2) / span) * w,
      tz = (z: number) => ((100 - z) / 200) * h;
    ctx.fillStyle = "#91ac91";
    ctx.fillRect(0, 0, w, h);
    if(district.biome==='coast'){ctx.fillStyle = "#407f86";
    ctx.fillRect(0, 0, tx(offset-103), h);
    ctx.fillStyle = "#d5c498";
    ctx.fillRect(tx(offset-103), 0, tx(offset-82) - tx(offset-103), h);
    }ctx.strokeStyle = "#dce0c4";
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(tx(offset-99), tz(0));
    for(let x=-90;x<=1130;x+=10)ctx.lineTo(tx(offset+x),tz(roadZ(district,x)));
    ctx.moveTo(tx(offset+25), tz(-78));
    ctx.lineTo(tx(offset+25), tz(90));
    ctx.stroke();
    ctx.strokeStyle = "#6f8979";
    ctx.lineWidth = 8;
    ctx.stroke();
    ctx.strokeStyle = "#d3cdaa";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(tx(-76), 0);
    ctx.lineTo(tx(-76), h);
    ctx.stroke();
    ctx.fillStyle = "#e4d9b6";
    for (const b of (district.id==='kozhikode'?BUILDINGS:districtBuildings(district)))
      ctx.fillRect(
        tx(b.x - b.w / 2),
        tz(b.z + b.d / 2),
        (b.w / span) * w,
        (b.d / 200) * h,
      );
    ctx.fillStyle = "#538a80";
    ctx.fillRect(tx(-55), tz(51), (28 / span) * w, (12 / 200) * h);
    if (labels && district.id==='kozhikode') {
      ctx.font = "600 15px system-ui";
      ctx.fillStyle = "#214b3e";
      ctx.fillText("TERMINAL", tx(3), tz(47));
      ctx.fillText("MARKET", tx(-48), tz(32));
      ctx.fillText("MANANCHIRA", tx(-61), tz(80));
      ctx.save();
      ctx.translate(tx(-90), tz(-55));
      ctx.rotate(-Math.PI / 2);
      ctx.fillStyle = "#fff2c9";
      ctx.fillText("ARABIAN SEA", 0, 0);
      ctx.restore();
      ctx.fillStyle = "#335647";
      ctx.font = "12px system-ui";
      ctx.fillText("EASTERN ROAD →", tx(78), tz(-12));
    }
    for(const stop of STOPS.filter(s=>districtAt(s.x).id===district.id)){ctx.fillStyle="#eff1da";ctx.fillRect(tx(stop.x)-3,tz(stop.z)-3,6,6);if(labels){ctx.font="10px system-ui";ctx.fillText(stop.name,tx(stop.x)-15,tz(stop.z)+(STOPS.indexOf(stop)%2?30:-20));}}
    for(const bus of this.buses){ctx.fillStyle=ROUTES[bus.route].color;ctx.fillRect(tx(bus.x)-5,tz(bus.z)-4,10,8);}
    for (const p of this.players) {
      ctx.beginPath();
      ctx.arc(tx(p.x), tz(p.z), p.id === this.self?.id ? 6 : 4, 0, Math.PI * 2);
      ctx.fillStyle = p.id === this.self?.id ? "#ffe4a2" : "#eef3df";
      ctx.fill();
      ctx.strokeStyle = "#36584b";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.fillStyle = "#f8ecd0";
    ctx.font = `bold ${labels ? 16 : 19}px system-ui`;
    ctx.fillText("N ↑", w - 48, 25);
  }
  receiveChat(message:ChatMessage){this.chatMessages.push(message);this.chatMessages=this.chatMessages.slice(-80);this.renderChat();}
  private renderChat(){const list=document.querySelector('#chat-history');if(!list)return;list.replaceChildren();if(this.chatMuted)return;for(const message of this.chatMessages.filter(m=>!this.blocked.has(m.player))){const row=document.createElement('p');row.textContent=message.name+': '+message.text;list.append(row);}}
  toast(message: string) {
    clearTimeout(this.timer);
    const t = document.querySelector("#toast")!;
    t.textContent = message;
    t.classList.add("visible");
    this.timer = window.setTimeout(() => t.classList.remove("visible"), 4000);
  }
  open(type: string) {
    this.priorFocus = document.activeElement as HTMLElement;
    this.onPanel(true);
    const panel = document.querySelector("#panel")!;
    const titles: Record<string, string> = {
      leaderboards:"Traveller rankings",chat:"Room chat",districts:"Connecting districts",map: "Your district map",shop:"Market bakery & outfitter",garage:"Your bus garage",progression:"Your traveller progress",
      help: "Make yourself at home",
      people: "Fellow travellers",
      settings: "Your journey, your settings",
      missions:"Journeys and discoveries",journal:"Your Kerala journal",
    };
    panel.innerHTML = `<div class="panel-head"><div><span class="eyebrow">KERALA ROUTES / PLAYTEST</span><h2 id="panel-title">${titles[type] || titles.help}</h2></div><button id="close-panel" aria-label="Close panel">✕</button></div><div id="panel-body"></div>`;
    const body = panel.querySelector("#panel-body")!;
    if(type==='leaderboards'){
      const select=document.createElement('select');for(const metric of LEADERBOARD_METRICS){const option=document.createElement('option');option.textContent=metric;select.append(option);}const button=document.createElement('button'),list=document.createElement('div');button.textContent='Load saved rankings';button.onclick=async()=>{button.disabled=true;try{const result=await this.onLeaderboard(select.value as LeaderboardMetric);list.replaceChildren();if(!result.ok)list.textContent=result.message||'Unavailable';else for(const [i,row] of (result.rows||[]).entries()){const p=document.createElement('p');p.textContent=(i+1)+'. '+row.name+' · '+row.score;list.append(p);}}finally{button.disabled=false;}};body.append(select,button,list);
    } else if(type==='chat'){
      const note=document.createElement('p');note.textContent='Room '+this.roomId+' · Avoid sharing personal details. Filters are basic; block or report unwanted messages.';body.append(note);
      const mute=document.createElement('button');mute.textContent=this.chatMuted?'Show chat':'Hide chat';mute.onclick=()=>{this.chatMuted=!this.chatMuted;this.open('chat');};body.append(mute);
      const list=document.createElement('div');list.id='chat-history';list.setAttribute('aria-live','polite');body.append(list);this.renderChat();
      const form=document.createElement('form'),input=document.createElement('input'),send=document.createElement('button');input.maxLength=200;input.placeholder='Message this room';input.setAttribute('aria-label','Room message');send.textContent='Send';form.append(input,send);form.onsubmit=e=>{e.preventDefault();if(input.value.trim()){this.onChat(input.value);input.value='';}};body.append(form);
    } else if(type==='districts'){
      const note=document.createElement('p');note.textContent='Five compact fictional exploration districts. Walk to the terminal to transfer. Drivers must finish the current route and stop with doors open; everyone aboard travels together.';body.append(note);
      for(const district of DISTRICTS){const button=document.createElement('button');button.textContent=district.name+(districtAt(this.self?.x||0).id===district.id?' · Current':'');button.disabled=districtAt(this.self?.x||0).id===district.id;button.onclick=()=>{this.onAction({type:'district',target:district.id});this.close();};body.append(button);}
    } else if(type==='progression'){
      const v=this.self?.progress.v2;body.textContent=`${this.self?.progress.kp||0} KP · Driver XP ${v?.driverXP||0} · ${driverLevel(v?.driverXP||0)} · Passenger XP ${v?.passengerXP||0} · Rating ${v?.rating??100}/100 · Routes completed ${v?.routesCompleted||0}. XP is progression; KP is your virtual currency.`;
    } else if(type==='shop'||type==='garage'){
      const note=document.createElement('p');note.textContent=type==='shop'?'Visit the market bakery (near Malabar Bakery) on foot to purchase. Food records discoveries; hunger is not compulsory.':'Equip owned items while stopped at the terminal after real passengers exit. NPCs step off for customization.';body.append(note);
      if(type==='garage')for(const model of BUS_MODELS){const button=document.createElement('button');button.textContent=model.name+' · '+model.xp+' Driver XP';button.onclick=()=>this.onAction({type:'bus-model',target:model.id});body.append(button);}
      for(const item of SHOP_ITEMS.filter(i=>type==='shop'||this.self?.progress.v2?.owned.includes(i.id))){const row=document.createElement('article');row.className='journal-entry';const title=document.createElement('h3');title.textContent=item.name+' · '+item.cost+' KP';const button=document.createElement('button');button.textContent=type==='shop'?'Buy':'Equip';button.onclick=()=>{this.onAction({type:type==='shop'?'buy':'equip',target:item.id,requestId:Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join('')});};row.append(title,button);body.append(row);}
    } else if (type === "map") {
      body.innerHTML =
        '<canvas id="full-map" class="full-map" width="760" height="540"></canvas><div class="legend">● Gold: you &nbsp; ● White: other travellers</div><p>A compact, fictional test environment inspired by real places. This is not a 1:1 map or an official bus route.</p><h3>Choose your route</h3><p>Route A: Terminal → Mavoor Road → Mananchira → SM Street → Beach.</p><p>Route B: Terminal → Medical College → Kunnamangalam → Kattangal → NIT Calicut.</p><p class="footer-note">Both routes are playable. Stop inside the turquoise rings and open the doors to serve each stop. The map is compressed for this playtest.</p>';
      this.map(body.querySelector("canvas")!, true);
    } else if (type === "settings") {
      body.innerHTML = `<label>Graphics<select id="quality"><option value="auto">Auto · adaptive performance</option><option value="medium">Medium · balanced</option><option value="high">High · soft shadows</option><option value="low">Low · mobile / faster</option></select></label><label>Sound<select id="sound"><option value="on">Engine and horn sounds on</option><option value="off">Muted</option></select></label><label>Shared weather (driver control)<select id="weather"><option value="clear">Clear coast</option><option value="cloudy">Cloudy</option><option value="rain">Monsoon rain</option><option value="light-rain">Light rain</option><option value="heavy-rain">Heavy rain</option><option value="fog">Fog</option><option value="mist">Mist</option></select></label><p>Low reduces resolution and disables shadows and bloom. Performance depends on your device. Weather and the moving day/night clock are shared by all players. Only a driver can change it; it also cycles naturally.</p><p class="footer-note">Your name and graphics preference stay in this browser. Online progress returns when you use this name in this browser. Use different names for two players. Solo practice is temporary.</p><button id="leave-room">Leave and return to title</button>`;
      const q = body.querySelector<HTMLSelectElement>("#quality")!,
        l = body.querySelector<HTMLSelectElement>("#sound")!;
      q.value = this.quality;
      l.value = this.muted?"off":"on";
      const update = () => {
        this.quality = q.value;
        this.muted=l.value==="off";this.onMute(this.muted);
        try {
          localStorage.setItem("kr-quality", this.quality);
        } catch {}
        this.onSettings(this.quality, this.light);
      };
      body.querySelector<HTMLSelectElement>("#weather")!.onchange=(e)=>this.onWeather((e.target as HTMLSelectElement).value);
      q.onchange = update;
      l.onchange = update;
      body.querySelector<HTMLElement>("#leave-room")!.onclick = () =>
        this.onExit();
    } else if (type === "people") {
      body.innerHTML =
        '<p id="people-note"></p><div class="roster"></div><h3>Say a little hello</h3><div class="emotes"></div><p class="footer-note">Preset greetings and room text chat are available. No voice chat.</p>';
      body.querySelector("#people-note")!.textContent = this.mode.startsWith(
        "Solo",
      )
        ? "You are exploring locally. Join the shared room to meet other players."
        : "Open this same game URL on a second device or browser to meet here. This list is a snapshot of the room.";
      for (const p of this.players) {
        const div = document.createElement("div");
        div.textContent = p.name + (p.id === this.self?.id ? " · You" : "") + " · " + p.role;
        if(p.id!==this.self?.id){const block=document.createElement('button');block.textContent=this.blocked.has(p.id)?'Unblock':'Block messages';block.onclick=()=>{const value=!this.blocked.has(p.id);if(value)this.blocked.add(p.id);else this.blocked.delete(p.id);this.onBlock(p.id,value);this.open('people');};const reason=document.createElement('select');reason.setAttribute('aria-label','Report reason for '+p.name);for(const text of REPORT_REASONS){const option=document.createElement('option');option.textContent=text;reason.append(option);}const report=document.createElement('button');report.textContent='Report';report.onclick=()=>this.onReport({target:p.id,reason:reason.value});div.append(block,reason,report);}
        body.querySelector(".roster")!.append(div);
      }
      for (const text of EMOTES) {
        const b = document.createElement("button");
        b.textContent = text;
        b.onclick = () => {
          this.onEmote(text);
          this.close();
        };
        body.querySelector(".emotes")!.append(b);
      }
    } else if(type==='missions') {
      body.innerHTML='<p>Complete journeys and discoveries to earn Kerala Points. Rewards are awarded once.</p>';
      for(const m of MISSIONS){const el=document.createElement('article');el.className='journal-entry';const done=this.self?.progress.missions.includes(m.id);const h=document.createElement('h3');h.textContent=(done?'✓ ':'○ ')+m.title+' · '+m.reward+' KP';const d=document.createElement('p');d.textContent=m.description;el.append(h,d);body.append(el);}
    } else if(type==='journal') {
      body.innerHTML='<p>Your discoveries, foods, plants and places. Find the golden markers in the world.</p>';
      const items=DISCOVERIES.filter(d=>this.self?.progress.journal.includes(d.id));
      for(const d of items){const el=document.createElement('article');el.className='journal-entry';const h=document.createElement('h3');h.textContent=d.category+' / '+d.name;const text=document.createElement('p');text.textContent=d.description;el.append(h,text);body.append(el);}
      for(const food of SHOP_ITEMS.filter(i=>i.kind==='food'&&this.self?.progress.journal.includes('food-shop:'+i.id))){const row=document.createElement('p');row.textContent='Food / '+food.name;body.append(row);}
      const stops=document.createElement('article');stops.className='journal-entry';const h=document.createElement('h3');h.textContent='Places / Visited stops';const names=document.createElement('p');names.textContent=STOPS.filter(s=>this.self?.progress.places.includes(s.id)).map(s=>s.name).join(' · ')||'No stops discovered yet.';stops.append(h,names);body.append(stops);const transport=document.createElement('article');transport.className='journal-entry';const th=document.createElement('h3');th.textContent='Transport / Journeys';const td=document.createElement('p');td.textContent=MISSIONS.filter(m=>['first-journey','passenger','driver'].includes(m.id)&&this.self?.progress.missions.includes(m.id)).map(m=>m.title).join(' · ')||'Complete a bus journey to record it here.';transport.append(th,td);body.append(transport);
      if(!items.length)body.insertAdjacentHTML('beforeend','<p>No discoveries yet. Walk towards a golden marker and press E.</p>');
    } else body.innerHTML='<p>Three buses. Two Kozhikode routes and four connecting district routes. Real players choose to drive or ride together.</p><h3>Driving</h3><p>Approach a parked bus and choose Drive. W/S: accelerate / reverse. A/D: steer. Space: brake. B: handbrake. F: doors. H: horn. L: lights. C: camera. Stop inside each marked ring, then open the doors. Close them and release the handbrake before driving. At the last stop, choose Start return journey and turn around.</p><h3>Passengers</h3><p>Approach the open left door at a bus stop and choose Board. Select your destination and request a stop. Exit when the driver stops and opens the doors.</p><h3>Explore</h3><p>WASD or arrows: walk. Shift: run. E: nearby discovery. M: map. J: journal. Find the cycle stand in Kattangal. Photo discoveries save a screenshot to your device.</p><h3>Phone & tablet</h3><p>The thumb stick walks or drives: use the driving arrows and Accelerate, Reverse and Brake buttons. Hold Brake to stop. Drag the scenery to look. Use the action buttons for doors, boarding and discoveries. Landscape is best.</p><p>For a real passenger test, join from a second browser session. Solo practice has no simulated human passengers. AI traffic shares the road; leave space for other vehicles.</p>';
    document.querySelector("#shade")!.classList.remove("hidden");
    panel.querySelector<HTMLElement>("#close-panel")!.onclick = () =>
      this.close();
    panel.querySelector<HTMLElement>("#close-panel")!.focus();
  }

  journey(p:PlayerState) {
    document.querySelector('#hud')!.classList.toggle('driving',p.role==='driver');
    const bus=this.buses.find(b=>b.id===p.busId);
    const title=document.querySelector('#journey-title')!,detail=document.querySelector('#journey-detail')!,actions=document.querySelector('#actions')!;
    document.querySelector('#role-title')!.textContent=p.role.toUpperCase()+(p.cycle?' · CYCLING':'');
    document.querySelector('#points')!.textContent=p.progress.kp+' Kerala Points · '+p.progress.missions.length+'/'+MISSIONS.length+' missions';
    document.querySelector('#sprint')!.textContent=p.role==='driver'?'Brake':'Run';
    let buttons:{label:string,action:Action}[]=[];
    if(bus){
      const next=STOPS.find(s=>s.id===routeStops(bus)[bus.next])!;
      title.textContent=p.role==='driver'?Math.round(Math.abs(bus.speed)*3.6)+' km/h · Route '+bus.route:'Riding Route '+bus.route;
      detail.textContent=(bus.finished?'Route complete. Start return journey.':`Next: ${next.name} · ${Math.round(distance(bus,next))} m`)+` · ${bus.passengers.length}/10 passengers · Doors ${bus.doors?'open':'closed'}`+(bus.handbrake?' · HANDBRAKE ON':'')+(bus.requested?' · STOP REQUESTED: '+this.players.filter(r=>r.busId===bus.id&&r.destination).map(r=>STOPS.find(s=>s.id===r.destination)?.name).filter(Boolean).join(', '):'');
      if(p.role==='driver')buttons=[{label:bus.doors?'Close doors · F':'Open doors · F',action:{type:'door'}},{label:bus.handbrake?'Release handbrake · B':'Handbrake · B',action:{type:'handbrake'}},{label:'Horn · H',action:{type:'horn'}},{label:'Lights · L',action:{type:'light'}},{label:'Auto headlights',action:{type:'auto-lights'}},{label:'◀ Indicator',action:{type:'indicator',target:bus.indicator==='left'?'off':'left'}},{label:'Indicator ▶',action:{type:'indicator',target:bus.indicator==='right'?'off':'right'}},{label:'Route '+(bus.route==='A'?'B':'A'),action:{type:'route',target:bus.route==='A'?'B':'A'}},{label:'Recover bus',action:{type:'recover'}}];
      else buttons=ROUTES[bus.route].stops.map(id=>({label:'Request '+STOPS.find(s=>s.id===id)!.name,action:{type:'request-stop',target:id}}));
      if(districtAt(p.x).id!=='kozhikode')buttons=buttons.filter(b=>b.action.type!=='route');
      if(p.role==='driver'&&bus.finished)buttons.push({label:'Start return journey',action:{type:'return-route'}});
      if(p.role==='passenger')buttons.push({label:p.standing?'Sit down':'Stand in aisle',action:{type:'posture'}});
      buttons.push({label:'Exit bus',action:{type:'exit'}});
    }else{
      title.textContent='Make the journey yours.';detail.textContent='Drive or board at the terminal. Find golden discoveries around the coast and Kattangal.';
      const nearby=this.buses.filter(b=>distance(b,p)<10).sort((a,b)=>distance(a,p)-distance(b,p))[0];
      if(nearby){if(!nearby.driver)buttons.push({label:'Drive bus '+nearby.id.slice(-1),action:{type:'claim',target:nearby.id}});buttons.push({label:'Board bus '+nearby.id.slice(-1),action:{type:'board',target:nearby.id}});}
      const item=DISCOVERIES.find(d=>distance(d,p)<5&&!p.progress.journal.includes(d.id));
      if(item){detail.textContent=item.name+' · '+item.action;buttons.push({label:(item.action==='photo'?'Take photo':item.action==='collect'?'Collect':'Discover')+' · E',action:{type:'interact',target:item.id}});}
      if(p.cycle||distance(p,cycleStand(p.x))<7)buttons.push({label:p.cycle?'Park cycle':'Ride cycle',action:{type:'cycle'}});
      const dock=BOAT_DOCKS.find(d=>p.boat===d.id||distance(p,d)<7);if(dock)buttons.push({label:p.boat?'Leave boat at dock':'Board lake boat',action:{type:'boat',target:dock.id}});
      buttons.push({label:'Return to terminal',action:{type:'recover'}});
    }
    const signature=JSON.stringify(buttons);if(actions.getAttribute('data-state')!==signature){actions.setAttribute('data-state',signature);actions.replaceChildren();for(const def of buttons){const btn=document.createElement('button');btn.textContent=def.label;btn.onclick=()=>this.onAction(def.action);actions.append(btn);}}
  }
  primaryAction(){const p=this.self;if(!p)return;const item=DISCOVERIES.find(d=>distance(d,p)<5&&!p.progress.journal.includes(d.id));if(item&&p.role==='walker')this.onAction({type:'interact',target:item.id});else if(p.role!=='walker')this.onAction({type:'exit'});else{const b=[...this.buses].sort((a,b)=>distance(a,p)-distance(b,p))[0];if(b)this.onAction({type:b.driver?'board':'claim',target:b.id});}}

  close() {
    document.querySelector("#shade")!.classList.add("hidden");
    this.onPanel(false);
    this.priorFocus?.focus();
  }
  get panelOpen() {
    return !document.querySelector("#shade")!.classList.contains("hidden");
  }
}
