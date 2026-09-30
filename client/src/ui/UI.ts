import { BUILDINGS, PLACES } from "../../../shared/world";
import {STOPS,ROUTES,MISSIONS,DISCOVERIES,distance,routeStops} from "../../../shared/game-data";
import {EMOTES} from "../../../shared/types";
import type {Action,BusState, PlayerState, Emote } from "../../../shared/types";
export class UI {
  onAction:(a:Action)=>void=()=>{};
  onWeather:(weather:string)=>void=()=>{};
  buses:BusState[]=[];
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
  mode = "";
  private timer = 0;
  private priorFocus: HTMLElement | null = null;
  constructor() {
    document.querySelector("#app")!.innerHTML = `
 <section class="landing" id="landing"><div class="topline"><div class="brand"><span class="brand-mark">κ</span><div class="brand-name">KERALA ROUTES<span class="brand-sub">FIRST JOURNEY</span></div></div><span class="edition">V1 · MULTIPLAYER PLAYTEST</span></div>
 <div class="landing-copy"><div class="eyebrow">A SHARED WORLD. A SLOWER JOURNEY.</div><h1>A little closer<br>to <em>Kerala.</em></h1><p class="landing-description">Salt in the air. Shade under the palms.<br>Step into a little piece of Kozhikode, and explore it together.</p>
 <form class="entry" id="join-form"><label for="player-name">What should fellow travellers call you?</label><input id="player-name" maxlength="18" placeholder="Your traveller name" value="Traveller" autocomplete="off" required><button class="primary" id="join" type="submit">Join shared room <span aria-hidden="true">↗</span></button><button class="secondary" id="solo" type="button">Practice solo</button><small>Up to 12 real players · Shared room<br>Drive · Ride together · Explore · Discover</small><div id="join-error" class="error" role="alert"></div></form></div>
 <div class="landing-footer"><div class="coordinates">KOZHIKODE, KERALA &nbsp; / &nbsp; A STYLIZED COASTAL WORLD</div><div class="location-tag"><span class="eyebrow">YOUR FIRST DESTINATION</span><strong>The Malabar coast</strong><small>Original scenery inspired by Kerala</small></div></div><div id="loading" class="loading">Preparing your journey…</div></section>
 <section class="hud hidden" id="hud"><div class="hud-top"><div class="brand"><span class="brand-mark">κ</span><div class="brand-name">KERALA ROUTES<span class="brand-sub">FIRST JOURNEY · PLAYTEST</span></div></div><div class="hud-buttons"><span class="pill"><i class="dot"></i><span id="online">Connecting…</span></span><button data-panel="map" title="Map (M)">Map</button><button data-panel="people">Travellers</button><button data-panel="missions">Missions</button><button data-panel="journal">Journal</button><button id="camera-toggle" title="Change camera">Camera</button><button data-panel="settings" title="Settings">Settings</button><button data-panel="help" aria-label="Controls and help">?</button></div></div>
 <div class="place-card"><span class="eyebrow">KOZHIKODE DISTRICT · TEST WORLD</span><h2 id="place-name">Mavoor Road</h2><small id="place-ml">കോഴിക്കോട്</small></div>
 <aside class="objective"><span class="eyebrow" id="role-title">YOUR JOURNEY</span><h3 id="journey-title">Choose your first journey.</h3><p id="journey-detail">Approach a bus at the terminal to drive or ride.</p><strong id="points">0 Kerala Points</strong><div class="action-grid" id="actions"></div></aside>
 <button class="map-card" data-panel="map" aria-label="Open district map"><canvas id="minimap" width="376" height="284"></canvas><div class="map-caption"><span>LOCAL AREA</span><span>● YOU</span></div></button>
 <div class="controls"><span><kbd>WASD</kbd> Move / drive</span><span><kbd>E</kbd> Interact · <kbd>F</kbd> Doors</span><span>Drag to look</span><span><kbd>C</kbd> Camera</span></div>
 <div class="status-bottom"><span id="performance">— FPS</span><br><span id="connection">Online playtest</span><br><span id="save-state"></span></div>
 <div class="drive-touch" id="drive-touch"><div><button id="steer-left" aria-label="Steer left">◀</button><button id="steer-right" aria-label="Steer right">▶</button></div><div><button id="reverse">Reverse</button><button id="brake">Brake</button><button id="accelerate">Accelerate</button></div></div>
 <div class="touch"><div class="joystick" id="joystick" role="group" aria-label="Movement joystick"><span></span></div><button id="sprint" aria-label="Hold to run">Run</button></div>
 </section><div class="toast" id="toast" role="status"></div><div class="dialog-shade hidden" id="shade"><section class="panel" id="panel" role="dialog" aria-modal="true" aria-labelledby="panel-title"></section></div>`;
    document.querySelector<HTMLButtonElement>("#camera-toggle")!.onclick=()=>this.onCamera();
    const input = document.querySelector<HTMLInputElement>("#player-name")!;
    try {
      input.value = localStorage.getItem("kr-name") || "Traveller";
      this.quality = localStorage.getItem("kr-quality") || this.quality;
    } catch {}
    document.querySelector("#join-form")!.addEventListener("submit", (e) => {
      e.preventDefault();
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
      : `${players.length} / 12 online`;
    document.querySelector("#performance")!.textContent =
      `${Math.round(fps)} FPS · ${this.quality.toUpperCase()} · ${ping} ms`;
    const place = [...STOPS].sort(
      (a, b) =>
        Math.hypot(a.x - self.x, a.z - self.z) -
        Math.hypot(b.x - self.x, b.z - self.z),
    )[0];
    document.querySelector("#place-name")!.textContent = place.name;
    document.querySelector("#place-ml")!.textContent = place.ml;
    this.map(document.querySelector("#minimap")!);
    const full = document.querySelector<HTMLCanvasElement>("#full-map");
    if (full) this.map(full, true);
  }
  map(canvas: HTMLCanvasElement, labels = false) {
    const ctx = canvas.getContext("2d")!,
      w = canvas.width,
      h = canvas.height;
    const span=labels?1240:240, center=labels?505:(this.self?.x||30);
    const tx = (x: number) => ((x-center+span/2) / span) * w,
      tz = (z: number) => ((100 - z) / 200) * h;
    ctx.fillStyle = "#91ac91";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#407f86";
    ctx.fillRect(0, 0, tx(-103), h);
    ctx.fillStyle = "#d5c498";
    ctx.fillRect(tx(-103), 0, tx(-82) - tx(-103), h);
    ctx.strokeStyle = "#dce0c4";
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(tx(-99), tz(0));
    ctx.lineTo(tx(1130), tz(0));
    ctx.moveTo(tx(25), tz(-78));
    ctx.lineTo(tx(25), tz(90));
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
    for (const b of BUILDINGS)
      ctx.fillRect(
        tx(b.x - b.w / 2),
        tz(b.z + b.d / 2),
        (b.w / span) * w,
        (b.d / 200) * h,
      );
    ctx.fillStyle = "#538a80";
    ctx.fillRect(tx(-55), tz(51), (28 / span) * w, (12 / 200) * h);
    if (labels) {
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
    for(const stop of STOPS){ctx.fillStyle="#eff1da";ctx.fillRect(tx(stop.x)-3,tz(stop.z)-3,6,6);if(labels){ctx.font="10px system-ui";ctx.fillText(stop.name,tx(stop.x)-15,tz(stop.z)+(STOPS.indexOf(stop)%2?30:-20));}}
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
      map: "A little piece of Kozhikode",
      help: "Make yourself at home",
      people: "Fellow travellers",
      settings: "Your journey, your settings",
      missions:"Eight reasons to explore",journal:"Your Kerala journal",
    };
    panel.innerHTML = `<div class="panel-head"><div><span class="eyebrow">KERALA ROUTES / PLAYTEST</span><h2 id="panel-title">${titles[type] || titles.help}</h2></div><button id="close-panel" aria-label="Close panel">✕</button></div><div id="panel-body"></div>`;
    const body = panel.querySelector("#panel-body")!;
    if (type === "map") {
      body.innerHTML =
        '<canvas id="full-map" class="full-map" width="760" height="540"></canvas><div class="legend">● Gold: you &nbsp; ● White: other travellers</div><p>A compact, fictional test environment inspired by real places. This is not a 1:1 map or an official bus route.</p><h3>Choose your route</h3><p>Route A: Terminal → Mavoor Road → Mananchira → SM Street → Beach.</p><p>Route B: Terminal → Medical College → Kunnamangalam → Kattangal → NIT Calicut.</p><p class="footer-note">Both routes are playable. Stop inside the turquoise rings and open the doors to serve each stop. The map is compressed for this playtest.</p>';
      this.map(body.querySelector("canvas")!, true);
    } else if (type === "settings") {
      body.innerHTML = `<label>Graphics<select id="quality"><option value="auto">Auto · adaptive performance</option><option value="high">High · soft shadows</option><option value="low">Low · mobile / faster</option></select></label><label>Sound<select id="sound"><option value="on">Horn sounds on</option><option value="off">Muted</option></select></label><label>Shared weather (driver control)<select id="weather"><option value="clear">Clear coast</option><option value="cloudy">Cloudy</option><option value="rain">Monsoon rain</option><option value="evening">Golden evening</option></select></label><p>Low reduces resolution and disables shadows and bloom. Performance depends on your device. Weather is shared by all players. Only a driver can change it; it also cycles naturally.</p><p class="footer-note">Your name and graphics preference stay in this browser. Online progress returns when you use this name in this browser. Use different names for two players. Solo practice is temporary.</p><button id="leave-room">Leave and return to title</button>`;
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
        '<p id="people-note"></p><div class="roster"></div><h3>Say a little hello</h3><div class="emotes"></div><p class="footer-note">Only preset greetings. There is no open text or voice chat.</p>';
      body.querySelector("#people-note")!.textContent = this.mode.startsWith(
        "Solo",
      )
        ? "You are exploring locally. Join the shared room to meet other players."
        : "Open this same game URL on a second device or browser to meet here. This list is a snapshot of the room.";
      for (const p of this.players) {
        const div = document.createElement("div");
        div.textContent = p.name + (p.id === this.self?.id ? " · You" : "") + " · " + p.role;
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
      const stops=document.createElement('article');stops.className='journal-entry';const h=document.createElement('h3');h.textContent='Places / Visited stops';const names=document.createElement('p');names.textContent=STOPS.filter(s=>this.self?.progress.places.includes(s.id)).map(s=>s.name).join(' · ')||'No stops discovered yet.';stops.append(h,names);body.append(stops);const transport=document.createElement('article');transport.className='journal-entry';const th=document.createElement('h3');th.textContent='Transport / Journeys';const td=document.createElement('p');td.textContent=MISSIONS.filter(m=>['first-journey','passenger','driver'].includes(m.id)&&this.self?.progress.missions.includes(m.id)).map(m=>m.title).join(' · ')||'Complete a bus journey to record it here.';transport.append(th,td);body.append(transport);
      if(!items.length)body.insertAdjacentHTML('beforeend','<p>No discoveries yet. Walk towards a golden marker and press E.</p>');
    } else body.innerHTML='<p>Two buses. Two routes. Real players choose to drive or ride together.</p><h3>Driving</h3><p>Approach a parked bus and choose Drive. W/S: accelerate / reverse. A/D: steer. Space: brake. B: handbrake. F: doors. H: horn. L: lights. C: camera. Stop inside each marked ring, then open the doors. Close them and release the handbrake before driving. At the last stop, choose Start return journey and turn around.</p><h3>Passengers</h3><p>Approach the open left door at a bus stop and choose Board. Select your destination and request a stop. Exit when the driver stops and opens the doors.</p><h3>Explore</h3><p>WASD or arrows: walk. Shift: run. E: nearby discovery. M: map. J: journal. Find the cycle stand in Kattangal. Photo discoveries save a screenshot to your device.</p><h3>Phone & tablet</h3><p>The thumb stick walks or drives: use the driving arrows and Accelerate, Reverse and Brake buttons. Hold Brake to stop. Drag the scenery to look. Use the action buttons for doors, boarding and discoveries. Landscape is best.</p><p>For a real passenger test, join from a second browser session. Solo practice has no simulated human passengers. AI traffic shares the road; leave space for other vehicles.</p>';
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
    document.querySelector('#points')!.textContent=p.progress.kp+' Kerala Points · '+p.progress.missions.length+'/8 missions';
    document.querySelector('#sprint')!.textContent=p.role==='driver'?'Brake':'Run';
    let buttons:{label:string,action:Action}[]=[];
    if(bus){
      const next=STOPS.find(s=>s.id===routeStops(bus)[bus.next])!;
      title.textContent=p.role==='driver'?Math.round(Math.abs(bus.speed)*3.6)+' km/h · Route '+bus.route:'Riding Route '+bus.route;
      detail.textContent=(bus.finished?'Route complete. Start return journey.':`Next: ${next.name} · ${Math.round(distance(bus,next))} m`)+` · ${bus.passengers.length}/10 passengers · Doors ${bus.doors?'open':'closed'}`+(bus.handbrake?' · HANDBRAKE ON':'')+(bus.requested?' · STOP REQUESTED: '+this.players.filter(r=>r.busId===bus.id&&r.destination).map(r=>STOPS.find(s=>s.id===r.destination)?.name).filter(Boolean).join(', '):'');
      if(p.role==='driver')buttons=[{label:bus.doors?'Close doors · F':'Open doors · F',action:{type:'door'}},{label:bus.handbrake?'Release handbrake · B':'Handbrake · B',action:{type:'handbrake'}},{label:'Horn · H',action:{type:'horn'}},{label:'Lights · L',action:{type:'light'}},{label:'Route '+(bus.route==='A'?'B':'A'),action:{type:'route',target:bus.route==='A'?'B':'A'}},{label:'Recover bus',action:{type:'recover'}}];
      else buttons=ROUTES[bus.route].stops.map(id=>({label:'Request '+STOPS.find(s=>s.id===id)!.name,action:{type:'request-stop',target:id}}));
      if(p.role==='driver'&&bus.finished)buttons.push({label:'Start return journey',action:{type:'return-route'}});
      if(p.role==='passenger')buttons.push({label:p.standing?'Sit down':'Stand in aisle',action:{type:'posture'}});
      buttons.push({label:'Exit bus',action:{type:'exit'}});
    }else{
      title.textContent='Make the journey yours.';detail.textContent='Drive or board at the terminal. Find golden discoveries around the coast and Kattangal.';
      const nearby=this.buses.filter(b=>distance(b,p)<10).sort((a,b)=>distance(a,p)-distance(b,p))[0];
      if(nearby){if(!nearby.driver)buttons.push({label:'Drive bus '+nearby.id.slice(-1),action:{type:'claim',target:nearby.id}});buttons.push({label:'Board bus '+nearby.id.slice(-1),action:{type:'board',target:nearby.id}});}
      const item=DISCOVERIES.find(d=>distance(d,p)<5&&!p.progress.journal.includes(d.id));
      if(item){detail.textContent=item.name+' · '+item.action;buttons.push({label:(item.action==='photo'?'Take photo':item.action==='collect'?'Collect':'Discover')+' · E',action:{type:'interact',target:item.id}});}
      if(p.cycle||distance(p,{x:810,z:13})<7)buttons.push({label:p.cycle?'Park cycle':'Ride cycle',action:{type:'cycle'}});
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
