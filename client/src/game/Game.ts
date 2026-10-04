import {Ambience} from './Ambience';
import {EngineSound} from './EngineSound';
import {PhotoMode,capturePhoto} from './PhotoMode';
import {busModel} from '../../../shared/buses';
import {districtAt,districtBuildings} from '../../../shared/districts';
import {SHOP_ITEMS} from '../../../shared/progression';
import {ClientClock,WorldClock,formatTime,lightState} from '../../../shared/time';
import {MotionBuffer} from '../multiplayer/MotionBuffer';
import {Engine} from '@babylonjs/core/Engines/engine.js';
import {Scene} from '@babylonjs/core/scene.js';
import {ArcRotateCamera} from '@babylonjs/core/Cameras/arcRotateCamera.js';
import {Vector3} from '@babylonjs/core/Maths/math.vector.js';
import {DefaultRenderingPipeline} from '@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline.js';
import {Color3} from '@babylonjs/core/Maths/math.color.js';
import {SceneInstrumentation} from '@babylonjs/core/Instrumentation/sceneInstrumentation.js';
import { World } from "./World";
import {BusModel} from "./Bus";
import {Activities} from "./Activities";
import {Simulation,drive,step,seatPosition} from "../../../server/src/simulation";
import {BUS_SPAWNS,DISCOVERIES} from "../../../shared/game-data";
import type {BusState,Action,Input,Weather} from "../../../shared/types";
import { Avatar } from "./Avatar";
import { InputController } from "./Input";
import { Connection } from "../multiplayer/Connection";
import { UI } from "../ui/UI";
import { move, SPAWN, BUILDINGS } from "../../../shared/world";
import type { PlayerState, Snapshot, Welcome } from "../../../shared/types";
import {AdaptiveResolution,PerformancePanel,PRESETS,initialQuality,type Quality} from './Performance';
export class Game {
  private graphics:'low'|'medium'|'high'='medium';
  private adaptive=new AdaptiveResolution();private debug=new PerformancePanel();private viewDistance=420;private lodDistance=120;
  private worldClock=new ClientClock();private soloClock=new WorldClock();private minute=540;
  private weather:Weather="clear";private shownWeather="";
  private traffic:import("../../../shared/traffic").TrafficState[]=[];
  private qualityTimer=0;private adaptiveScale=1.25;private muted=false;private latestInput:Input={seq:0,x:0,z:0,sprint:false};
  private buses=new Map<string,BusModel>();private npcs:import("../../../server/src/npc").NpcPassenger[]=[];private npcModels=new Map<string,Avatar>();
  private busStates:BusState[]=[];
  private practice:Simulation|null=null;
  private activities:Activities;
  private hornTimes=new Map<string,number>();
  private ambience:Ambience|null=null;private audio:AudioContext|null=null;private engineSound:EngineSound|null=null;private photo:PhotoMode;
  private engine: Engine;
  private scene: Scene;
  private camera: ArcRotateCamera;
  private world: World;
  private pipeline: DefaultRenderingPipeline;
  private input: InputController;
  private net = new Connection();
  private ui = new UI();
  private avatars = new Map<string, Avatar>();
  private self: PlayerState | null = null;
  private state: PlayerState[] = [];
  private mode: "title" | "solo" | "online" = "title";
  private seq = 0;
  private sendClock = 0;
  private uiClock = 0;
  private time = 0;
  private frozen = false;
  private desiredRadius = 8;
  private lastSnapshots: Snapshot[] = [];
  private busMotion=new MotionBuffer();
  constructor(canvas: HTMLCanvasElement) {
    this.engine = new Engine(
      canvas,
      true,
      {
        preserveDrawingBuffer: false,
        stencil: true,
        powerPreference: "high-performance",
      },
      false,
    );
    this.scene = new Scene(this.engine);

    this.scene.skipPointerMovePicking=true;
    this.scene.skipPointerDownPicking=true;
    this.scene.skipPointerUpPicking=true;
    this.camera = new ArcRotateCamera(
      "follow-camera",
      -0.6,
      1.22,
      105,
      new Vector3(-40, 3, 12),
      this.scene,
    );
    this.photo=new PhotoMode(this.camera,this.engine,active=>{this.frozen=active;this.input?.clear();});this.ui.onPhoto=()=>this.photo.toggle();
    this.camera.minZ = 0.12;
    this.camera.maxZ = 1200;
    this.camera.lowerBetaLimit = 0.3;
    this.camera.upperBetaLimit = 1.55;
    this.camera.fov = 0.8;
    this.world = new World(this.scene);
    this.activities=new Activities(this.scene);
    this.scene.imageProcessingConfiguration.toneMappingEnabled = true;
    this.scene.imageProcessingConfiguration.exposure = 1.0;
    this.scene.imageProcessingConfiguration.contrast = 1.06;
    this.pipeline = new DefaultRenderingPipeline(
      "coastal-finish",
      true,
      this.scene,
      [this.camera],
    );
    this.pipeline.fxaaEnabled = true;
    this.pipeline.samples = 1;
    this.pipeline.bloomEnabled = true;
    this.pipeline.bloomThreshold = 0.85;
    this.pipeline.bloomWeight = 0.13;
    this.pipeline.bloomKernel = 48;
    this.input = new InputController(canvas);
    this.input.bindTouch(
      document.querySelector("#joystick")!,
      document.querySelector("#sprint")!,
    );
    this.input.bindDriving();
    this.input.onLook = (dx, dy) => {
      if (this.frozen) return;
      this.camera.alpha -= dx * 0.005;
      this.camera.beta = Math.max(
        0.35,
        Math.min(1.42, this.camera.beta - dy * 0.004),
      );
    };
    canvas.addEventListener(
      "wheel",
      (e) => {
        if (this.mode === "title") return;
        e.preventDefault();
        this.desiredRadius = Math.max(
          3,
          Math.min(18, this.desiredRadius + e.deltaY * 0.01),
        );
      },
      { passive: false },
    );
    this.input.onAction = (key) => {
      if(!this.frozen){if(key==="e")this.ui.primaryAction();if(key==="f")void this.action({type:"door"});if(key==="h")void this.action({type:"horn"});if(key==="l")void this.action({type:"light"});if(key==="b")void this.action({type:"handbrake"});if(key==="j")this.ui.open("journal");}
      if (key === "m")
        this.ui.panelOpen ? this.ui.close() : this.ui.open("map");
      if (key === "escape")
        this.ui.panelOpen ? this.ui.close() : this.ui.open("settings");
      if (key === "c" && !this.frozen)
        this.desiredRadius = this.self?.role!=="walker" ? (this.desiredRadius>1?0.18:18) : (this.desiredRadius < 7 ? 10 : 4.5);
    };
    this.ui.onPanel = (open) => {
      this.frozen = open;
      this.input.clear();
    };
    this.ui.onSettings = (q, l) => {
      this.applyQuality(q);
      this.net.settings({quality:this.ui.quality as any,muted:this.muted});
    };
    this.ui.onCamera=()=>{this.desiredRadius=this.self?.role!=="walker"?(this.desiredRadius>1?.18:18):(this.desiredRadius<7?10:4.5);};
    this.ui.onAction=a=>void this.action(a);
    this.ui.onWeather=w=>void this.action({type:"weather",target:w});
    this.ui.onMute=m=>{this.muted=m;this.net.settings({quality:this.ui.quality as any,muted:m});};
    this.ui.onJoin = (name, solo) => void this.join(name, solo);
    this.ui.onExit = () => this.leave();
    this.ui.onEmote = (text) => {
      if (this.mode === "solo") this.ui.toast(`You: ${text}`);
      else this.net.emote(text);
    };
    this.net.onClock=s=>this.worldClock.sync(s,performance.now(),this.net.latency/2);
    this.net.onSnapshot = (s) => this.snapshot(s);
    this.ui.onLeaderboard=metric=>this.net.leaderboard(metric);
    this.net.onChat=message=>this.ui.receiveChat(message);this.ui.onChat=text=>void this.net.chat(text).then(r=>{if(!r.ok)this.ui.toast(r.message||'Message not sent.');});this.ui.onBlock=(id,value)=>this.net.block(id,value);this.ui.onReport=request=>void this.net.report(request).then(r=>this.ui.toast(r.message));
    this.net.onWelcome = (w) => this.welcome(w);
    this.net.onStatus = (s) => {
      this.ui.status(s);
      if (s.toLowerCase().includes("reconnect")) this.input.clear();
    };
    this.net.onNotice=text=>this.ui.toast(text);
    this.net.onSave=text=>this.ui.saveStatus(text);
    this.net.onEmote = (e) => {
      const p = this.state.find((p) => p.id === e.id);
      if (p) this.ui.toast(`${p.name}: ${e.text}`);
    };
    this.applyQuality(this.ui.quality);
    window.addEventListener("resize", () => this.engine.resize());
    canvas.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      this.ui.toast(
        "Graphics paused. The browser will try to restore the scene.",
      );
    });
    this.engine.runRenderLoop(() => this.frame());
    this.scene.executeWhenReady(() => this.ui.ready());
    // Narrow, read-only diagnostics for repeatable local tests.
    Object.defineProperty(window, "keralaDiagnostics", {
      get: () => ({
        mode: this.mode,
        id: this.self?.id,
        position: this.self ? { x: this.self.x, z: this.self.z } : null,
        players: this.state.map((p) => ({
          id: p.id,
          name: p.name,
          x: p.x,
          z: p.z,
        })),
        fps: this.engine.getFps(),
        meshes: this.scene.meshes.length,
        connected: this.net.connected,
        latency:this.net.latency,role:this.self?.role,buses:this.busStates,weather:this.weather,drawCalls:(this.engine as any)._drawCalls?.current,renderScale:this.engine.getHardwareScalingLevel(),progress:this.self?.progress,
      }),
    });
  }
  private applyQuality(q: string) {
    this.graphics=initialQuality(q as Quality,{touch:navigator.maxTouchPoints>0,cores:navigator.hardwareConcurrency,memoryGB:(navigator as Navigator&{deviceMemory?:number}).deviceMemory});const preset=PRESETS[this.graphics];this.viewDistance=preset.distance;this.lodDistance=preset.lod;this.adaptive.reset();
    const high = preset.shadows;
    const limit=this.graphics==='low'?1000:1500;
    this.adaptiveScale=Math.max(preset.scale,innerWidth/limit,innerHeight/(limit*.6));
    this.engine.setHardwareScalingLevel(this.adaptiveScale);
    this.camera.maxZ=this.viewDistance;
    this.world.quality(high,preset.lights);this.activities.quality(preset);
    this.pipeline.bloomEnabled = high;
    this.pipeline.fxaaEnabled = high;
  }
  private async join(name: string, solo: boolean) {
    try {
      if (solo) {
        this.mode = "solo";this.ui.saveStatus("Practice · progress is temporary");
        this.practice=new Simulation(undefined,15,true);this.soloClock=new WorldClock();
        this.self=this.practice.join('local',name);
        this.busStates=this.practice.state.buses;this.traffic=this.practice.state.traffic;this.weather=this.practice.state.weather;
        this.syncBuses();
        this.state = [this.self];
        this.addAvatar(this.self);
      } else {
        this.mode = "online";
        await this.net.join(name,this.ui.roomChoice,this.ui.createPrivate);
      }
      this.ui.play(solo);
      this.input.active = true;
      this.camera.alpha = -Math.PI / 2 - 0.35;
      this.camera.beta = 1.3;
      this.camera.radius = 9;
      this.desiredRadius = 9;
      this.camera.target.copyFromFloats(this.self!.x, 1.2, this.self!.z);
      this.ui.status(
        solo
          ? "Solo · device-local session"
          : "Connected · server-authoritative movement",
      );
      this.ui.toast(
        solo
          ? "Welcome to the coast. Walk with WASD or the thumb stick."
          : "You joined the shared room. Open another window to meet a friend.",
      );
    } catch (e) {
      this.mode = "title";
      this.ui.busy(false);
      this.ui.error((e as Error).message);
    }
  }
  private welcome(w: Welcome) {
    for (const a of this.avatars.values()){a.root.getChildMeshes().forEach(m=>this.world.shadows.removeShadowCaster(m));a.dispose();}
    this.avatars.clear();
    this.ui.capacity=w.capacity;this.npcs=w.npcs||[];
    this.self = { ...w.players.find((p) => p.id === w.id)! };
    this.state = w.players;
    this.busStates=w.buses;this.traffic=w.traffic;this.weather=w.weather;this.syncBuses();
    this.ui.roomId=w.roomId||'public-1';this.ui.blocked=this.net.blocked;this.ui.chatMessages=w.chat||[];
    this.ui.quality=this.self.settings.quality;this.muted=this.self.settings.muted;this.ui.muted=this.muted;this.applyQuality(this.ui.quality);this.ui.saveStatus(w.saveMode||"Local session");
    this.seq = 0;
    this.lastSnapshots = [];this.busMotion.reset();
    w.players.forEach((p) => this.addAvatar(p));
  }
  private addAvatar(p: PlayerState) {
    if (this.avatars.has(p.id)) return;
    const a = new Avatar(this.scene, p.name, p.color);
    a.setPosition(p.x, p.z, p.yaw);
    this.avatars.set(p.id, a);
    a.root
      .getChildMeshes()
      .forEach((m) => this.world.shadows.addShadowCaster(m));
  }
  private snapshot(s: Snapshot) {
    if (this.mode !== "online" || !this.self) return;
    this.state = s.players;this.npcs=s.npcs||[];
    this.busMotion.push(performance.now(),s.buses);
    this.lastSnapshots.push({ ...s, time: performance.now() });
    if (this.lastSnapshots.length > 6) this.lastSnapshots.shift();
    const authoritative = s.players.find((p) => p.id === this.net.id);
    if(authoritative){
      const priorRole=this.self.role;const old={x:this.self.x,z:this.self.z,yaw:this.self.yaw};
      const error=Math.hypot(authoritative.x-old.x,authoritative.z-old.z);
      Object.assign(this.self,authoritative);
      if(authoritative.role==='walker'&&priorRole==='walker'&&error<3){this.self.x=old.x+(authoritative.x-old.x)*.25;this.self.z=old.z+(authoritative.z-old.z)*.25;this.self.yaw=old.yaw;}
      if(priorRole!==authoritative.role)this.desiredRadius=authoritative.role==='walker'?9:18;
    }
    for(const incoming of s.buses){const predicted=this.busStates.find(b=>b.id===incoming.id);if(predicted&&incoming.driver===this.self.id&&this.self.role==='driver'){const position={x:predicted.x,z:predicted.z,yaw:predicted.yaw};drive(incoming,this.latestInput,Math.min(.12,this.net.latency/2000));const error=Math.hypot(incoming.x-position.x,incoming.z-position.z);if(error<4){incoming.x=position.x+(incoming.x-position.x)*.25;incoming.z=position.z+(incoming.z-position.z)*.25;incoming.yaw=position.yaw+Math.atan2(Math.sin(incoming.yaw-position.yaw),Math.cos(incoming.yaw-position.yaw))*.3;}}}
    this.busStates=s.buses;this.traffic=s.traffic;this.weather=s.weather;this.syncBuses();
    const ids = new Set(s.players.map((p) => p.id));
    for (const [id, a] of this.avatars)
      if (!ids.has(id)) {
        a.root
          .getChildMeshes()
          .forEach((m) => this.world.shadows.removeShadowCaster(m));
        a.dispose();
        this.avatars.delete(id);
      }
    s.players.forEach((p) => this.addAvatar(p));
  }
  private frame() {
    const rawDt=this.engine.getDeltaTime()/1000;
    const dt = Math.min(rawDt, 0.05);
    this.world.districts.update(dt,this.camera.target.x,this.camera.target.z,this.viewDistance,this.graphics==='high'?2:this.graphics==='low'?0:1);
    this.world.chunks.update(dt,this.camera.target.x,this.camera.target.z,this.viewDistance);
    this.world.stream.update(dt,this.camera.target.x,this.camera.target.z,this.viewDistance,this.graphics==='high'?2:this.graphics==='low'?0:1);
    this.debug.update(rawDt,()=>({mode:this.mode,ping:this.net.latency,socket:this.net.diagnostics.state,socketId:this.net.socketId,disconnectReason:this.net.diagnostics.reason,reconnects:this.net.diagnostics.reconnects,sentPacketsPerSec:this.net.diagnostics.sentPerSecond,sentBytesPerSec:this.net.diagnostics.sentBytesPerSecond,timeOfDay:formatTime(this.minute),weather:this.weather,graphics:this.ui.quality,effectiveGraphics:this.graphics,dynamicStreetLights:this.world.nightLights.active,packetsPerSec:this.net.diagnostics.packetsPerSecond.toFixed(1),bytesPerSec:Math.round(this.net.diagnostics.bytesPerSecond),server:this.net.diagnostics.server,players:this.state.length,activeBuses:this.busStates.filter(b=>b.driver).length,aiVehicles:this.traffic.length,npcPassengers:this.npcs.length,meshes:this.scene.getActiveMeshes().length,triangles:this.scene.getActiveIndices()/3,drawCalls:(this.engine as any)._drawCalls?.current,chunks:this.world.chunks.active+'/'+this.world.chunks.total,district:districtAt(this.camera.target.x).name,districtChunks:this.world.districts.stream.active,streamedChunks:this.world.stream.active,streamedLoads:this.world.stream.loads,streamedUnloads:this.world.stream.unloads,heapMB:(performance as any).memory?Math.round((performance as any).memory.usedJSHeapSize/1048576):'unavailable',resolutionScale:this.adaptiveScale}));
    this.time += dt;
    this.minute=this.mode==='online'?this.worldClock.sample(performance.now()):this.soloClock.sample().minute;
    this.world.update(this.time,this.minute,this.camera.target.x,this.camera.target.z);
    this.ui.clock(this.minute,this.weather);
    if (this.mode === "title") {
      this.camera.alpha = -0.6 + Math.sin(this.time * 0.035) * 0.07;
    } else if (this.self) {
      const input =
        !this.frozen && (this.mode === "solo" || this.net.connected)
          ? this.input.read(this.camera.alpha)
          : { x: 0, z: 0, sprint: false };
      const controls=this.input.driving();
      const command:Input={...input,seq:++this.seq,throttle:this.frozen?0:Math.max(-1,Math.min(1,controls.throttle)),steer:this.frozen?0:Math.max(-1,Math.min(1,controls.steer)),brake:this.frozen||controls.brake};
      this.latestInput=command;
      if(this.practice){this.practice.minute=this.minute;this.practice.input(this.self.id,command);this.practice.advance();this.self=this.practice.state.players[0];this.npcs=this.practice.npcs;this.state=this.practice.state.players;this.busStates=this.practice.state.buses;this.traffic=this.practice.state.traffic;this.weather=this.practice.state.weather;}
      else {this.net.send(command);if(this.self.role==='walker')step(this.self,command,dt);else if(this.self.role==='driver'){const bus=this.busStates.find(b=>b.id===this.self!.busId);if(bus&&this.net.connected)drive(bus,command,dt,this.busStates);}}
      this.syncBuses();for(const bus of this.busStates){const model=this.buses.get(bus.id)!;const remote=this.mode==='online'&&bus.driver!==this.self.id;const pose=remote?this.busMotion.sample(bus.id,performance.now()-120):undefined;model.update(pose?{...bus,...pose}:bus,dt,remote?1:1-Math.exp(-dt*15),this.graphics==='low'?(this.self.busId===bus.id?1:0):Math.hypot(bus.x-this.self.x,bus.z-this.self.z)<65?2:0);model.detail(Math.hypot(bus.x-this.self.x,bus.z-this.self.z),this.lodDistance,this.self.busId===bus.id);if(bus.horn>(this.hornTimes.get(bus.id)||0)){this.hornTimes.set(bus.id,bus.horn);if(Math.hypot(bus.x-this.self.x,bus.z-this.self.z)<100)this.horn(bus.hornPreset);}}
      if(this.self.busId){const bus=this.busStates.find(b=>b.id===this.self!.busId);if(bus){const model=this.buses.get(bus.id)!;const rendered={...bus,x:model.root.position.x,z:model.root.position.z,yaw:model.root.rotation.y};Object.assign(this.self,seatPosition(rendered,this.self.standing?10+this.self.seat%2:this.self.seat,this.self.role==='driver'));this.self.yaw=rendered.yaw;}}
      const avatar=this.avatars.get(this.self.id);avatar?.setPosition(this.self.x,this.self.z,this.self.yaw,this.self.busId?1:1-Math.exp(-dt*22));if(avatar)avatar.root.position.y=this.self.role==='walker'?0:.8;avatar?.animate(dt,this.self.moving&&this.self.role==='walker',input.sprint);if(avatar){avatar.root.setEnabled(this.desiredRadius>1);avatar.pose(this.self.role!=="walker"&&!this.self.standing,this.self.cycle,!!this.self.boat);}
      const renderTime = performance.now() - 100;
      let a = this.lastSnapshots[0],
        b = this.lastSnapshots[this.lastSnapshots.length - 1];
      for (let i = 1; i < this.lastSnapshots.length; i++)
        if (this.lastSnapshots[i].time >= renderTime) {
          a = this.lastSnapshots[i - 1];
          b = this.lastSnapshots[i];
          break;
        }
      for (const p of this.state) {
        if (p.id === this.self.id) continue;
        const mesh = this.avatars.get(p.id);
        let x = p.x,
          z = p.z,
          yaw = p.yaw;
        if (a && b) {
          const p0 = a.players.find((v) => v.id === p.id),
            p1 = b.players.find((v) => v.id === p.id);
          if (p0 && p1) {
            const f = Math.hypot(p1.x-p0.x,p1.z-p0.z)>15?1:Math.max(
              0,
              Math.min(1, (renderTime - a.time) / Math.max(1, b.time - a.time)),
            );
            x = p0.x + (p1.x - p0.x) * f;
            z = p0.z + (p1.z - p0.z) * f;
            yaw =
              p0.yaw +
              Math.atan2(Math.sin(p1.yaw - p0.yaw), Math.cos(p1.yaw - p0.yaw)) *
                f;
          }
        }
        if(p.busId){const bus=this.busStates.find(b=>b.id===p.busId),model=this.buses.get(p.busId);if(bus&&model){const seat=seatPosition({...bus,x:model.root.position.x,z:model.root.position.z,yaw:model.root.rotation.y},p.standing?10+p.seat%2:p.seat,p.role==="driver");x=seat.x;z=seat.z;yaw=model.root.rotation.y;}}
        mesh?.root.setEnabled(Math.hypot(x-this.self.x,z-this.self.z)<this.viewDistance);
        mesh?.setPosition(x, z, yaw, p.busId?1:1 - Math.exp(-dt * 18));
        if(mesh)mesh.root.position.y=p.role==="walker"?0:.8;
        mesh?.animate(dt, p.moving, p.sprint);
        mesh?.pose(p.role!=="walker"&&!p.standing,p.cycle,!!p.boat);mesh?.detail(Math.hypot(p.x-this.self.x,p.z-this.self.z),this.lodDistance);
      }
      const target = new Vector3(this.self.x, this.self.role==="walker"?1.25:2.6, this.self.z);
      if(this.desiredRadius<1){this.camera.alpha=-this.self.yaw-Math.PI/2;this.camera.beta=1.5;}
      Vector3.LerpToRef(
        this.camera.target,
        target,
        this.self.busId?1:1 - Math.exp(-dt * 12),
        this.camera.target,
      );
      // Camera boom collision: stop before walls and roofs instead of clipping through them.
      let safeRadius = this.desiredRadius;
      const direction = new Vector3(
        Math.cos(this.camera.alpha) * Math.sin(this.camera.beta),
        Math.cos(this.camera.beta),
        Math.sin(this.camera.alpha) * Math.sin(this.camera.beta),
      );
      const cameraBuildings=districtAt(this.camera.target.x).id==='kozhikode'?BUILDINGS:districtBuildings(districtAt(this.camera.target.x));
      for (let d = 0.5; d <= this.desiredRadius; d += 0.25) {
        const eye = target.add(direction.scale(d));
        if (
          cameraBuildings.some(
            (b) =>
              Math.abs(eye.x - b.x) < b.w / 2 + 0.7 &&
              Math.abs(eye.z - b.z) < b.d / 2 + 0.7 &&
              eye.y < b.h + 3,
          )
        ) {
          safeRadius = Math.max(0.7, d - 0.5);
          break;
        }
      }
      this.camera.radius = safeRadius;
      this.uiClock += dt;
      if (this.uiClock > 0.2) {
        this.uiClock = 0;
        this.ui.update(
          this.mode === "solo" ? [this.self] : this.state,
          this.self,
          this.engine.getFps(),
          this.busStates,
          this.net.latency,
        );
      }
    }
    for(const p of this.state){const outfit=SHOP_ITEMS.find(i=>i.id===p.progress.v2?.equipped.outfit);if(outfit)this.avatars.get(p.id)?.setOutfit(outfit.value);this.avatars.get(p.id)?.setAccessories(SHOP_ITEMS.find(i=>i.id===p.progress.v2?.equipped.bag)?.value,SHOP_ITEMS.find(i=>i.id===p.progress.v2?.equipped.bicycle)?.value);}
    for(const npc of this.npcs){const near=!!this.self&&Math.hypot(npc.x-this.self.x,npc.z-this.self.z)<120;let model=this.npcModels.get(npc.id);if(!near){if(model){model.dispose();this.npcModels.delete(npc.id);}continue;}if(!model){model=new Avatar(this.scene,'Local traveller · NPC',2);this.npcModels.set(npc.id,model);}let pos={x:npc.x,z:npc.z},yaw=npc.yaw;const bus=this.busStates.find(b=>b.id===npc.busId),rendered=npc.busId?this.buses.get(npc.busId):undefined;if(bus&&rendered){pos=seatPosition({...bus,x:rendered.root.position.x,z:rendered.root.position.z,yaw:rendered.root.rotation.y},npc.seat);yaw=rendered.root.rotation.y;}model.setPosition(pos.x,pos.z,yaw,npc.busId?1:1-Math.exp(-dt*15));model.root.position.y=npc.busId?.8:0;model.pose(!!npc.busId,false);model.animate(dt,npc.state==='walking',false);model.detail(Math.hypot(npc.x-this.self!.x,npc.z-this.self!.z),this.lodDistance);}
    this.qualityTimer+=dt;
    if(this.ui.quality==='auto'){const next=this.adaptive.sample(rawDt,this.adaptiveScale);if(next!==this.adaptiveScale){this.adaptiveScale=next;this.engine.setHardwareScalingLevel(next);}}
    if(this.shownWeather!==this.weather){this.shownWeather=this.weather;this.activities.weather(this.weather);this.world.lighting(this.weather);}
    this.activities.update(dt,this.self,this.traffic,this.mode==='online'?this.worldClock.serverNow(performance.now()):Date.now());
    const riding=this.busStates.find(b=>b.id===this.self?.busId);this.engineSound?.update(dt,riding?.speed||0,!!riding&&!this.muted&&this.mode!=='title');
    this.ambience?.update(dt,this.self?.x||0,this.self?.z||0,this.minute,this.weather,!this.muted&&this.mode!=='title');
    this.scene.render();
  }
  private syncBuses(){for(const b of this.busStates){const old=this.buses.get(b.id);if(old&&(old.modelId!==busModel(b.model).id||old.cosmeticsKey!==JSON.stringify(b.cosmetics||{}))){old.root.getChildMeshes().forEach(m=>this.world.shadows.removeShadowCaster(m));old.dispose();this.buses.delete(b.id);}if(!this.buses.has(b.id)){const model=new BusModel(this.scene,b,BUS_SPAWNS.find(s=>s.id===b.id)?.color||'#b84e37');model.update(b,.016,1);this.buses.set(b.id,model);model.root.getChildMeshes().forEach(m=>this.world.shadows.addShadowCaster(m));}}}
  private async action(a:Action){
    if(!this.self)return;
    if(!this.audio){try{this.audio=new AudioContext();this.engineSound=new EngineSound(this.audio);this.ambience=new Ambience(this.audio);}catch{}}void this.audio?.resume();
    try{const result=this.practice?this.practice.action(this.self.id,a):await this.net.action(a);this.ui.toast(result.message);if(result.ok&&!this.muted&&a.type==='door')this.ambience?.tone(220,.22,.015,.5);if(result.ok&&a.type==='interact'&&DISCOVERIES.find(d=>d.id===a.target)?.action==='photo'){capturePhoto(this.engine,'Kerala-Routes-'+a.target);}if(this.practice){this.practice.advance();this.desiredRadius=this.self.role==='walker'?9:18;}}
    catch(e){this.ui.toast((e as Error).message);}
  }
  private horn(preset?:string){if(!this.audio||this.audio.state!=='running'||this.muted)return;const gain=this.audio.createGain();gain.gain.setValueAtTime(.06,this.audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,this.audio.currentTime+.5);gain.connect(this.audio.destination);for(const frequency of preset==='low'?[120,160]:[180,240]){const o=this.audio.createOscillator();o.frequency.value=frequency;o.type='sawtooth';o.connect(gain);o.start();o.stop(this.audio.currentTime+.5);}}
  private leave() {
    this.photo.toggle(false);this.ambience?.dispose();this.ambience=null;this.engineSound?.dispose();this.engineSound=null;if(this.audio)void this.audio.close();this.audio=null;
    this.net.close();
    this.practice=null;this.npcs=[];for(const npc of this.npcModels.values())npc.dispose();this.npcModels.clear();
    for(const bus of this.buses.values()){bus.root.getChildMeshes().forEach(m=>this.world.shadows.removeShadowCaster(m));bus.dispose();}this.buses.clear();this.busStates=[];
    this.input.clear();
    this.input.active = false;
    for (const a of this.avatars.values()) {
      a.root
        .getChildMeshes()
        .forEach((m) => this.world.shadows.removeShadowCaster(m));
      a.dispose();
    }
    this.avatars.clear();
    this.self = null;
    this.state = [];this.busMotion.reset();this.lastSnapshots=[];this.worldClock.reset();
    this.mode = "title";
    this.ui.menu();
    this.camera.target.copyFromFloats(-40, 3, 12);
    this.camera.radius = 105;
    this.camera.beta = 1.22;
  }
}
