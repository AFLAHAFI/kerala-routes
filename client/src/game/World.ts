import {DistrictScenery} from './DistrictScenery';
import '@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent.js';
import {districtAt} from '../../../shared/districts';
import {lightState} from '../../../shared/time';
import {NightLights} from './NightLights';
import {Scene} from '@babylonjs/core/scene.js';
import {TransformNode} from '@babylonjs/core/Meshes/transformNode.js';
import {Mesh} from '@babylonjs/core/Meshes/mesh.js';
import {MeshBuilder} from '@babylonjs/core/Meshes/meshBuilder.js';
import {StandardMaterial} from '@babylonjs/core/Materials/standardMaterial.js';
import {Color3} from '@babylonjs/core/Maths/math.color.js';
import {Vector3} from '@babylonjs/core/Maths/math.vector.js';
import {DynamicTexture} from '@babylonjs/core/Materials/Textures/dynamicTexture.js';
import {Texture} from '@babylonjs/core/Materials/Textures/texture.js';
import {ShaderMaterial} from '@babylonjs/core/Materials/shaderMaterial.js';
import {Effect} from '@babylonjs/core/Materials/effect.js';
import {DirectionalLight} from '@babylonjs/core/Lights/directionalLight.js';
import {HemisphericLight} from '@babylonjs/core/Lights/hemisphericLight.js';
import {ShadowGenerator} from '@babylonjs/core/Lights/Shadows/shadowGenerator.js';
import {VertexData} from '@babylonjs/core/Meshes/mesh.vertexData.js';
import {VertexBuffer} from '@babylonjs/core/Buffers/buffer.js';
import {STOPS} from "../../../shared/game-data";
import { BUILDINGS } from "../../../shared/world";
const C = (s: string) => Color3.FromHexString(s);
import {ChunkVisibility,SceneryStream} from './Chunks';
import type {Weather} from '../../../shared/types';
export class World {
  readonly districts:DistrictScenery;private baseRoot:TransformNode;
  chunks=new ChunkVisibility();stream=new SceneryStream();
  private weather:Weather="clear";private warmth=.22;private cloud=0;
  readonly shadows: ShadowGenerator;readonly nightLights:NightLights;private fill:HemisphericLight;
  readonly sun: DirectionalLight;
  private mats = new Map<string, StandardMaterial>();
  private staticMeshes: Mesh[] = [];
  private water: ShaderMaterial;
  private sky: ShaderMaterial;
  constructor(readonly scene: Scene) {
    this.baseRoot=new TransformNode("Kozhikode scenery",scene);
    this.nightLights=new NightLights(scene);
    scene.clearColor.set(0.7, 0.8, 0.79, 1);
    scene.fogMode = Scene.FOGMODE_EXP2;
    scene.fogDensity = 0.0024;
    scene.fogColor = C("#c4d9cd");
    const fill = this.fill = new HemisphericLight("sky-light", new Vector3(0, 1, 0), scene);
    fill.intensity = 0.75;
    fill.diffuse = C("#dce9ed");
    fill.groundColor = C("#676b46");
    this.sun = new DirectionalLight(
      "afternoon-sun",
      new Vector3(0.48, -0.85, 0.38),
      scene,
    );
    this.sun.position = new Vector3(-65, 115, -60);
    this.sun.intensity = 1.25;
    this.sun.diffuse = C("#ffe2ad");
    this.sun.shadowMinZ = 1;
    this.sun.shadowMaxZ = 310;
    this.shadows = new ShadowGenerator(512, this.sun);
    this.shadows.usePercentageCloserFiltering = true;
    this.shadows.filteringQuality = ShadowGenerator.QUALITY_LOW;
    this.shadows.bias = 0.0007;
    this.shadows.normalBias = 0.04;
    this.shadows.setDarkness(0.2);
    Effect.ShadersStore.coastalSkyVertexShader = `precision highp float;attribute vec3 position;uniform mat4 worldViewProjection;varying vec3 p;void main(){p=position;gl_Position=worldViewProjection*vec4(position,1.);}`;
    Effect.ShadersStore.coastalSkyFragmentShader = `precision highp float;varying vec3 p;uniform float warmth;uniform float cloud;uniform float daylight;uniform vec3 sunDirection;void main(){vec3 d=normalize(p);float h=max(d.y,0.);vec3 low=mix(vec3(.82,.87,.76),vec3(.98,.61,.35),warmth);vec3 high=mix(vec3(.29,.61,.72),vec3(.32,.44,.59),warmth);vec3 c=mix(low,high,pow(h,.6));float s=max(dot(d,sunDirection),0.);c+=vec3(1.,.78,.45)*pow(s,160.)*.45*daylight;c=mix(c,vec3(.56,.64,.65)+h*.08,cloud*.7);vec3 night=mix(vec3(.13,.18,.27),vec3(.018,.035,.09),h);c=mix(night,c,daylight);gl_FragColor=vec4(c,1.);}`;
    this.sky = new ShaderMaterial(
      "sky-material",
      scene,
      { vertex: "coastalSky", fragment: "coastalSky" },
      { attributes: ["position"], uniforms: ["worldViewProjection", "warmth", "cloud", "daylight", "sunDirection"] },
    );
    this.sky.backFaceCulling = false;
    this.sky.disableDepthWrite = true;
    this.sky.setFloat("warmth", 0.22);this.sky.setFloat("cloud",0);this.sky.setFloat("daylight",1);this.sky.setVector3("sunDirection",new Vector3(-.7,.29,-.45).normalize());
    const sky = MeshBuilder.CreateSphere(
      "sky",
      { diameter: 300, segments: 12 },
      scene,
    );
    sky.material = this.sky;
    sky.infiniteDistance = true;
    sky.isPickable = false;
    const ground = this.box(
      "land",
      510,
      -0.55,
      0,
      1240,
      1,
      220,
      "#729568",
      false,
    );
    ground.material = this.grass();
    this.box("sand", -92, -0.07, 0, 29, 0.2, 230, "#e6d8ae", false);
    this.box("wet sand", -105, -0.17, 0, 5, 0.13, 230, "#bfc6a8", false);
    this.box("coastal walk", -76, 0.06, 0, 7, 0.15, 190, "#d6caae", false);
    this.box("road", 510, 0.02, 0, 1240, 0.12, 13, "#697170", false).material =
      this.asphalt();
    this.box(
      "crossroad",
      25,
      0.025,
      0,
      13,
      0.13,
      167,
      "#697170",
      false,
    ).material = this.asphalt();
    for (const z of [-8, 8]) {
      this.box("pavement", 510, 0.09, z, 1240, 0.26, 2.4, "#d5d1bd", false);
      this.box(
        "curb",
        30,
        0.22,
        z > 0 ? 6.8 : -6.8,
        270,
        0.24,
        0.27,
        "#eeead8",
        false,
      );
    }
    for (let x = -90; x < 1120; x += 10)
      if (x < 15 || x > 35)
        this.box("lane marking", x, 0.096, 0, 4, 0.012, 0.12, "#e7d9b2", false);
    for (let z = -75; z < 82; z += 10)
      if (Math.abs(z) > 9)
        this.box(
          "lane marking",
          25,
          0.102,
          z,
          0.13,
          0.013,
          4,
          "#e7d9b2",
          false,
        );
    for (let x = 14; x <= 36; x += 2)
      this.box("crossing", x, 0.104, -9, 0.85, 0.01, 3.6, "#f4edce", false);
    for (let z = 12; z < 21; z += 2)
      this.box("crossing", 13, 0.104, z, 3.6, 0.01, 0.85, "#f4edce", false);
    this.box("terminal apron", 33, 0.025, 17, 53, 0.13, 13, "#b0b2a0", false);
    for (let x = 12; x < 59; x += 9) {
      this.box("bay line", x, 0.102, 16, 0.11, 0.01, 10, "#f7ebc9", false);
    }
    this.box("square paving", -41, 0.06, 54, 38, 0.22, 35, "#c0b99c", false);
    this.box("pond coping", -41, 0.25, 45, 28, 0.45, 13, "#c3c6b2", false);
    this.box("pond", -41, 0.49, 45, 26, 0.06, 11, "#438f88", false);
    for (const b of BUILDINGS) this.building(b);
    this.box('market lane',-62,.02,-31,10,.12,62,'#697170',false).material=this.asphalt();
    this.box('beach link',-77,.03,-61,40,.12,10,'#697170',false).material=this.asphalt();
    // Route-side vegetation is generated on demand instead of all at startup.
    for(let start=140;start<1120;start+=140)this.stream.add(start+70,0,quality=>{
      const count=[2,4,6][quality];
      for(let i=0;i<count;i++){
        const x=start+12+i*116/count,z=i%2?-19:19;
        if(!BUILDINGS.some(b=>Math.abs(x-b.x)<b.w/2+5&&Math.abs(z-b.z)<b.d/2+5))this.palm(x,z,8+this.rand(x)*3,x);
        if(quality>0){const tz=i%2?-58:58;if(!BUILDINGS.some(b=>Math.abs(x-b.x)<b.w/2+6&&Math.abs(tz-b.z)<b.d/2+6))this.tree(x,tz,5+this.rand(x+1)*2,x);}
      }
      // Low-cost roadside reflectors and drainage edges, merged with the vegetation batch.
      for(let x=start+10;x<start+140;x+=35)for(const z of [-7.2,7.2]){
        this.box('road reflector',x,.55,z,.12,1,.12,'#eee2bd',false);
        this.box('reflector stripe',x,.8,z,.14,.12,.14,'#b95539',false);
      }
      const meshes=this.mergeStatic();
      return ()=>{for(const mesh of meshes){this.shadows.removeShadowCaster(mesh);mesh.dispose();}};
    });
    for(let x=140;x<1120;x+=90)this.sign(x,-8,'NIT CALICUT →','കട്ടാങ്ങൽ',6);
    this.ocean();
    this.water = this.scene.getMaterialByName("ocean-shader") as ShaderMaterial;
    // Palm silhouettes are original geometry and reused through merged static batches.
    for (let z = -75; z < 91; z += 16) {
      this.palm(-80, z, 8 + (z % 3), z);
      if (z % 3 === 0) this.palm(-67, z + 6, 9, z + 1);
    }
    for (let i = 0; i < 35; i++) {
      const x = -62 + this.rand(i * 11) * 216,
        z = (i % 2 ? 1 : -1) * (43 + this.rand(i * 13) * 38);
      if (
        !BUILDINGS.some(
          (b) =>
            Math.abs(x - b.x) < b.w / 2 + 5 && Math.abs(z - b.z) < b.d / 2 + 5,
        ) &&
        !(x < -20 && z > 30)
      )
        this.palm(x, z, 8 + this.rand(i + 9) * 5, i);
    }
    for (let i = 0; i < 20; i++)
      this.tree(
        65 + this.rand(i + 37) * 98,
        65 + this.rand(i + 69) * 20,
        4 + this.rand(i + 90) * 3,
        i,
      );
    for (let i = 0; i < 14; i++) {
      const x = -50 + this.rand(i + 100) * 220,
        z = 118 + this.rand(i + 140) * 30;
      const m = MeshBuilder.CreateSphere(
        "distant hills",
        { diameter: 1, segments: 10 },
        scene,
      );
      m.scaling.set(
        40 + this.rand(i) * 60,
        15 + this.rand(i + 9) * 24,
        25 + this.rand(i + 3) * 35,
      );
      m.position.set(x, 0, z);
      m.material = this.mat(i % 2 ? "#809b85" : "#8da895");
      this.staticMeshes.push(m);
    }
    for (let z = -61; z < 84; z += 25) {
      this.bench(-72, z, Math.PI / 2);
      this.lamp(-72, z + 10);
    }
    for (let x = -55; x < 155; x += 34) {
      this.lamp(x, -9.5);
      this.powerPole(x, 10);
    }
    this.bench(-56, 57, 0);
    this.bench(-27, 57, 0);
    this.shelter(57, -15);
    this.sign(-64, 9, "BEACH  ←", "കോഴിക്കോട് ബീച്ച്", 6);
    this.sign(115, 8, "KATTANGAL  →", "കട്ടാങ്ങൽ", 5);
    // Fictional pier and fishing boats provide a distinctive coast without copied assets.
    this.box("old pier", -123, 0.55, -47, 41, 0.7, 3.2, "#a49e86");
    for (let x = -104; x > -144; x -= 7) {
      this.cylinder("pier support", x, -0.5, -48.3, 0.52, 3, "#918c76");
      this.cylinder("pier support", x, -0.5, -45.7, 0.52, 3, "#918c76");
    }
    for (let i = 0; i < 3; i++) {
      const boat = MeshBuilder.CreateSphere(
        "fishing boat",
        { diameter: 1, segments: 10 },
        scene,
      );
      boat.position.set(-99 + i * 1.8, 0.4, 26 + i * 5);
      boat.scaling.set(1.8, 0.7, 5);
      boat.rotation.y = 0.25 + i * 0.2;
      boat.material = this.mat(["#537e99", "#b76543", "#ceab59"][i]);
      this.staticMeshes.push(boat);
    }
    for(const stop of STOPS.filter(s=>districtAt(s.x).id==='kozhikode')){if(stop.id!=='terminal'){this.shelter(stop.x+5,stop.z+12);this.label(stop.name,stop.x+5,3.2,stop.z+9,6,.6,'#fff0c6','#355f52');}}
    for(let x=210;x<1100;x+=90)this.powerPole(x,-11);
    this.box('small bridge',630,.12,0,22,.28,14,'#89918a',false);
    for(const z of [-7.4,7.4]){this.box('bridge railing',630,1,z,22,.16,.18,'#c6c9b1');for(let x=620;x<=640;x+=4)this.box('bridge post',x,.6,z,.18,1.1,.18,'#c6c9b1');}
    this.sign(810,13,'CYCLE STAND','സൈക്കിൾ',5);
    this.mergeStatic();
    for(const mesh of scene.meshes)if(mesh.name.startsWith('scenery ')||mesh.material?.name.startsWith('sign '))this.chunks.add(mesh);
    // Repeated coast bollards share geometry/material through Babylon instances.
    const post=MeshBuilder.CreateCylinder('coast bollard',{diameter:.22,height:.85,tessellation:6},scene);post.material=this.mat('#476d62');post.position.set(-74,.43,-70);this.chunks.add(post);for(let z=-60;z<90;z+=10){const instance=post.createInstance('coast bollard instance');instance.position.set(-74,.43,z);this.chunks.add(instance);}
    for(const mesh of scene.meshes)if(mesh.name!=='sky'&&!mesh.parent)mesh.parent=this.baseRoot;
    this.districts=new DistrictScenery(scene,this.shadows,this.nightLights);
  }
  rand(n: number) {
    return (
      ((Math.sin(n * 127.1 + 91.7) * 43758.5453) % 1) +
      ((Math.sin(n * 127.1 + 91.7) * 43758.5453) % 1 < 0 ? 1 : 0)
    );
  }
  mat(hex: string) {
    let m = this.mats.get(hex);
    if (!m) {
      m = new StandardMaterial(hex, this.scene);m.maxSimultaneousLights=6;
      m.diffuseColor = C(hex);
      m.specularColor = new Color3(0.055, 0.055, 0.04);
      this.mats.set(hex, m);
    }
    return m;
  }
  box(
    name: string,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    color: string,
    shadow = true,
  ) {
    const m = MeshBuilder.CreateBox(
      name,
      { width: w, height: h, depth: d },
      this.scene,
    );
    m.position.set(x, y, z);
    m.material = this.mat(color);
    m.receiveShadows = true;
    m.metadata = { shadow };
    m.isPickable = false;
    this.staticMeshes.push(m);
    return m;
  }
  cylinder(
    name: string,
    x: number,
    y: number,
    z: number,
    d: number,
    h: number,
    color: string,
  ) {
    const m = MeshBuilder.CreateCylinder(
      name,
      { diameter: d, height: h, tessellation: 8 },
      this.scene,
    );
    m.position.set(x, y, z);
    m.material = this.mat(color);
    m.metadata = { shadow: true };
    this.staticMeshes.push(m);
    return m;
  }
  private asphalt() {
    const m = this.mat("#727774");
    if (m.diffuseTexture) return m;
    const t = new DynamicTexture(
      "asphalt",
      { width: 256, height: 256 },
      this.scene,
      false,
    );
    const ctx = t.getContext();
    ctx.fillStyle = "#8d9390";
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 9000; i++) {
      ctx.fillStyle = i % 2 ? "#808782" : "#989c95";
      ctx.fillRect(this.rand(i) * 256, this.rand(i + 899) * 256, 1, 1);
    }
    t.update();
    t.uScale = 48;
    t.vScale = 4;
    m.diffuseTexture = t;
    return m;
  }
  private grass() {
    const m = this.mat("#88a579");
    const t = new DynamicTexture(
      "grass",
      { width: 256, height: 256 },
      this.scene,
      false,
    );
    const ctx = t.getContext();
    ctx.fillStyle = "#a2b38a";
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 3000; i++) {
      ctx.fillStyle = i % 2 ? "#92aa7c" : "#b7bf98";
      ctx.fillRect(this.rand(i + 400) * 256, this.rand(i + 700) * 256, 2, 3);
    }
    t.update();
    t.uScale = t.vScale = 35;
    m.diffuseTexture = t;
    return m;
  }
  private building(b: (typeof BUILDINGS)[number]) {
    this.box(
      "foundation",
      b.x,
      0.25,
      b.z,
      b.w + 0.6,
      0.5,
      b.d + 0.6,
      "#c4baa0",
    );
    this.box("plaster", b.x, b.h / 2 + 0.4, b.z, b.w, b.h, b.d, b.color);
    const front = b.z - b.d / 2 - 0.07;
    this.box("lower trim", b.x, 0.8, front, b.w, 0.55, 0.15, "#afae97");
    if (b.type === "terminal") {
      this.box(
        "terminal fascia",
        b.x,
        b.h + 1,
        front - 2.2,
        b.w + 3,
        1.2,
        6,
        "#dfdfc5",
      );
      this.box(
        "terminal stripe",
        b.x,
        b.h + 1.2,
        front - 5.24,
        b.w + 3,
        0.24,
        0.05,
        "#326e65",
      );
      this.label(
        b.name,
        b.x,
        b.h + 0.9,
        front - 5.29,
        27,
        1.4,
        "#245d55",
        "#e8e5cf",
      );
      for (let x = b.x - b.w / 2 + 2; x < b.x + b.w / 2; x += 7) {
        this.box("pillar", x, 3.5, front - 4, 0.45, 7, 0.45, "#e5dec6");
        this.box(
          "terminal windows",
          x,
          4.4,
          front - 0.03,
          4,
          2.3,
          0.08,
          "#38646a",
        );
        this.box(
          "ticket door",
          x,
          1.7,
          front - 0.08,
          2.2,
          2.8,
          0.08,
          "#476c68",
        );
      }
      this.label(
        "FIRST JOURNEY  ·  KOZHIKODE",
        b.x,
        4.8,
        front - 0.13,
        22,
        1.1,
        "#e7e4c9",
        "#315c55",
      );
    } else {
      // Hip-like terracotta roof, eaves, and repeated fine tile lines.
      const roof = MeshBuilder.CreateCylinder(
        "terracotta roof",
        {
          diameter: 1,
          height: 2.9,
          tessellation: 4,
          diameterTop: 0,
          diameterBottom: 1,
        },
        this.scene,
      );
      roof.scaling.set((b.w + 2) * 1.414, 1, (b.d + 2) * 1.414);
      roof.rotation.y = Math.PI / 4;
      roof.position.set(b.x, b.h + 1.7, b.z);
      roof.material = this.mat("#ae5e3c");
      this.staticMeshes.push(roof);
      this.box(
        "eave",
        b.x,
        b.h + 0.28,
        b.z,
        b.w + 1.7,
        0.28,
        b.d + 1.7,
        "#773f2d",
      );
      for (let x = b.x - b.w / 2 + 2; x < b.x + b.w / 2 - 1; x += 4) {
        for (let y = 3; y < b.h - 1; y += 3) {
          this.box("window frame", x, y, front - 0.04, 1.9, 2, 0.12, "#ede8ce");
          this.box(
            "window glass",
            x,
            y,
            front - 0.12,
            1.6,
            1.75,
            0.11,
            "#466c6b",
          );
          this.box(
            "window mullion",
            x,
            y,
            front - 0.2,
            0.08,
            1.8,
            0.08,
            "#b1bba4",
          );
          this.box(
            "sunshade",
            x,
            y + 1.12,
            front - 0.5,
            2.35,
            0.16,
            1.1,
            "#b89c76",
          );
        }
      }
      this.box("door", b.x, 1.75, front - 0.16, 1.65, 2.8, 0.1, "#53726a");
      if (b.name) {
        this.label(
          b.name,
          b.x,
          3.5,
          front - 1.64,
          b.w - 0.8,
          0.9,
          "#f5e5c7",
          b.type === "heritage" ? "#446956" : "#405d53",
        );
        this.box(
          "awning",
          b.x,
          3.9,
          front - 0.9,
          b.w + 0.4,
          0.18,
          2,
          "#d5ac71",
        );
        for (let x = b.x - b.w / 2 + 0.5; x < b.x + b.w / 2; x += b.w - 1)
          this.cylinder("veranda", x, 1.9, front - 1.6, 0.17, 3.7, "#766b4a");
      }
    }
  }
  label(
    text: string,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    ink: string,
    bg: string,
  ) {
    const tex = new DynamicTexture(
      "sign " + text,
      { width: 1024, height: 128 },
      this.scene,
      false,
    );
    const ctx = tex.getContext() as CanvasRenderingContext2D;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 1024, 128);
    ctx.fillStyle = ink;
    ctx.font = '400 50px "Noto Sans Malayalam", sans-serif';
    ctx.textAlign = "center";
    ctx.fillText(text, 512, 82);
    tex.update();
    const mat = new StandardMaterial("sign " + text, this.scene);
    mat.diffuseTexture = tex;
    mat.emissiveColor = new Color3(0.15, 0.15, 0.15);
    mat.specularColor = Color3.Black();
    const p = MeshBuilder.CreatePlane(
      text,
      { width: w, height: h },
      this.scene,
    );
    p.position.set(x, y, z);
    p.material = mat;
    p.isPickable = false;
    return p;
  }
  private palm(x: number, z: number, h: number, seed: number) {
    const lean = (this.rand(seed + 32) - 0.5) * 2;
    const points = [];
    for (let i = 0; i <= 6; i++)
      points.push(
        new Vector3(
          x + lean * (i / 6) ** 2,
          (i * h) / 6,
          z + 0.2 * Math.sin(i),
        ),
      );
    const trunk = MeshBuilder.CreateTube(
      "coconut trunk",
      {
        path: points,
        radiusFunction: (i) => 0.22 - i * 0.013,
        tessellation: 7,
      },
      this.scene,
    );
    trunk.material = this.mat("#958264");
    this.staticMeshes.push(trunk);
    const tip = points[6];
    for (let k = 0; k < 8; k++) {
      const a = (k * Math.PI) / 4 + seed;
      const positions: number[] = [],
        indices: number[] = [];
      for (let j = 0; j <= 7; j++) {
        const t = j / 7;
        const reach = t * 4.4;
        const y = h + Math.sin(t * Math.PI) * 1.1 - t * 1.25;
        const width = Math.sin(t * Math.PI) * 0.55;
        for (const sign of [-1, 1])
          positions.push(
            tip.x +
              Math.cos(a) * reach +
              Math.cos(a + Math.PI / 2) * width * sign,
            y,
            tip.z +
              Math.sin(a) * reach +
              Math.sin(a + Math.PI / 2) * width * sign,
          );
        if (j < 7) {
          const q = j * 2;
          indices.push(q, q + 1, q + 2, q + 1, q + 3, q + 2);
        }
      }
      const mesh = new Mesh("palm frond", this.scene);
      const data = new VertexData();
      data.positions = positions;
      data.indices = indices;
      const normals: number[] = [];
      VertexData.ComputeNormals(positions, indices, normals);
      data.normals = normals;
      data.applyToMesh(mesh);
      const mat = this.mat(k % 2 ? "#50754b" : "#658649");
      mat.backFaceCulling = false;
      mesh.material = mat;
      this.staticMeshes.push(mesh);
    }
    for (let k = 0; k < 3; k++) {
      const c = MeshBuilder.CreateSphere(
        "coconut",
        { diameter: 0.45, segments: 6 },
        this.scene,
      );
      c.position.set(
        tip.x + Math.cos(k * 2) * 0.3,
        h - 0.2,
        tip.z + Math.sin(k * 2) * 0.3,
      );
      c.material = this.mat("#777441");
      this.staticMeshes.push(c);
    }
  }
  private tree(x: number, z: number, h: number, seed: number) {
    this.cylinder("tree trunk", x, h / 2, z, 0.4, h, "#827558");
    for (let i = 0; i < 3; i++) {
      const crown = MeshBuilder.CreateSphere(
        "canopy",
        { diameter: 5, segments: 6 },
        this.scene,
      );
      crown.position.set(
        x + Math.sin(i * 2) * 1.5,
        h + i * 0.6,
        z + Math.cos(i * 2),
      );
      crown.scaling.y = 0.75;
      crown.material = this.mat(seed % 2 ? "#63805a" : "#4f7656");
      this.staticMeshes.push(crown);
    }
  }
  private bench(x: number, z: number, a: number) {
    const seat = this.box("bench seat", x, 0.6, z, 3, 0.18, 0.8, "#9a7150");
    seat.rotation.y = a;
    const back = this.box(
      "bench back",
      x + Math.sin(a) * 0.3,
      1.1,
      z + Math.cos(a) * 0.3,
      3,
      0.65,
      0.14,
      "#9a7150",
    );
    back.rotation.y = a;
    for (const sign of [-1, 1])
      this.box(
        "bench legs",
        x + Math.cos(a) * sign,
        0.3,
        z - Math.sin(a) * sign,
        0.15,
        0.6,
        0.65,
        "#516761",
      );
  }
  private lamp(x: number, z: number) {
    this.cylinder("street lamp", x, 3.8, z, 0.13, 7.6, "#566e62");
    this.box("lamp cap", x, 7.6, z, 0.8, 0.16, 0.55, "#516961");
    const bulb = this.box(
      "lamp glow",
      x,
      7.48,
      z,
      0.65,
      0.04,
      0.4,
      "#f9e3ae",
      false,
    );
    (bulb.material as StandardMaterial).emissiveColor = C("#9e8552");this.nightLights.add(x,7.3,z,bulb.material as StandardMaterial);
  }
  private powerPole(x: number, z: number) {
    this.cylinder("utility pole", x, 5, z, 0.23, 10, "#a1a394");
    this.box("crossbar", x, 9.4, z, 2, 0.13, 0.13, "#777e6a");
    if (x < 122) {
      const wire = MeshBuilder.CreateTube(
        "power line",
        {
          path: [
            new Vector3(x, 9.4, z),
            new Vector3(x + 17, 8.55, z),
            new Vector3(x + 34, 9.4, z),
          ],
          radius: 0.025,
          tessellation: 3,
        },
        this.scene,
      );
      wire.material = this.mat("#555e56");
      this.staticMeshes.push(wire);
    }
  }
  private sign(x: number, z: number, title: string, ml: string, w: number) {
    this.cylinder("signpost", x, 1.8, z, 0.15, 3.6, "#aab5a5");
    this.box("direction sign", x, 3.3, z, w, 1.5, 0.12, "#315e57");
    this.label(title, x, 3.57, z - 0.08, w - 0.25, 0.63, "#f1e8cb", "#315e57");
    this.label(ml, x, 2.95, z - 0.09, w - 0.25, 0.58, "#e7e2c9", "#315e57");
  }
  private shelter(x: number, z: number) {
    this.box("shelter platform", x, 0.12, z, 9, 0.24, 3.5, "#c6c3ac");
    this.box("shelter roof", x, 3, z, 9.5, 0.22, 4, "#667e6b");
    for (const dx of [-4, 4])
      this.cylinder(
        "shelter support",
        x + dx,
        1.5,
        z + 0.9,
        0.13,
        3,
        "#446558",
      );
    this.box("shelter back", x, 1.75, z + 1.4, 8.5, 2.1, 0.12, "#b1c4b4");
    this.bench(x, z + 0.4, 0);
    this.label(
      "KOZHIKODE  /  FIRST JOURNEY",
      x,
      2.7,
      z - 2.03,
      8.5,
      0.5,
      "#f3e8ce",
      "#326257",
    );
  }
  private ocean() {
    Effect.ShadersStore.coastalWaterVertexShader = `precision highp float;attribute vec3 position;uniform mat4 worldViewProjection;uniform mat4 world;uniform float time;varying vec3 p;void main(){vec3 v=position;v.y+=sin(v.x*.15+time*.55)*.09+cos(v.z*.11+time*.7)*.06;p=(world*vec4(v,1.)).xyz;gl_Position=worldViewProjection*vec4(v,1.);}`;
    Effect.ShadersStore.coastalWaterFragmentShader = `precision highp float;varying vec3 p;uniform float time;uniform float daylight;void main(){float near=exp(-abs(p.x+106.)*.017);vec3 c=mix(vec3(.14,.38,.47),vec3(.33,.66,.64),near);float wave=sin(p.x*.85+sin(p.z*.14)*.4+time*.9);float ripple=sin(p.z*1.5+p.x*.6+time*.7);float foam=smoothstep(.93,1.,wave)*near;float shimmer=pow(max(0.,ripple*wave),16.)*.13;c+=vec3(.28,.3,.22)*foam+vec3(shimmer);c*=mix(.22,1.,daylight);gl_FragColor=vec4(c,1.);}`;
    const water = new ShaderMaterial(
      "ocean-shader",
      this.scene,
      { vertex: "coastalWater", fragment: "coastalWater" },
      {
        attributes: ["position"],
        uniforms: ["worldViewProjection", "world", "time", "daylight"],
      },
    );
    water.setFloat("daylight",1);water.backFaceCulling = false;
    const mesh = MeshBuilder.CreateGround(
      "Arabian Sea",
      { width: 1100, height: 1400, subdivisions: 20 },
      this.scene,
    );
    mesh.position.set(-656, -0.18, 0);
    mesh.material = water;
    mesh.isPickable = false;
  }
  private mergeStatic() {
    const batches = new Map<string, Mesh[]>();
    for (const m of this.staticMeshes) {
      m.computeWorldMatrix(true);
      const material=m.material as StandardMaterial;
      if(material instanceof StandardMaterial&&!material.diffuseTexture&&material.emissiveColor.r+material.emissiveColor.g+material.emissiveColor.b===0){const c=material.diffuseColor;const colors:number[]=[];for(let i=0;i<m.getTotalVertices();i++)colors.push(c.r,c.g,c.b,1);m.setVerticesData(VertexBuffer.ColorKind,colors);const batchName=material.backFaceCulling?'#ffffff':'#fffffe';const unified=this.mat(batchName);unified.diffuseColor=Color3.White();unified.backFaceCulling=material.backFaceCulling;m.material=unified;}

      const key =
        Math.floor(m.getBoundingInfo().boundingBox.centerWorld.x/140) + ":" + Math.floor(m.getBoundingInfo().boundingBox.centerWorld.z/140) + ":" + m.material!.uniqueId +
        "-" +
        (m.metadata?.shadow === false ? "no" : "yes");
      const group = batches.get(key) || [];
      group.push(m);
      batches.set(key, group);
    }
    const output:Mesh[]=[];
    for (const [key, meshes] of batches) {
      const merged = Mesh.MergeMeshes(
        meshes,
        true,
        true,
        undefined,
        false,
        false,
      );
      if (merged) {
        output.push(merged);merged.name = "scenery " + key;
        merged.receiveShadows = true;
        merged.isPickable = false;
        merged.freezeWorldMatrix();
        if (!key.endsWith("no")) this.shadows.addShadowCaster(merged);
      }
    }
    this.staticMeshes = [];
    for(const m of this.mats.values())if(m.name!=='#f9e3ae'&&m.name!=='#727774')m.freeze();
    return output;
  }
  private lastTime=0;
  update(t: number,minute=540,x=0,z=0) {
    this.baseRoot.setEnabled(districtAt(x).id==='kozhikode');
    const dt=Math.min(.1,Math.max(0,t-this.lastTime));this.lastTime=t;const f=1-Math.exp(-dt*1.5),state=lightState(minute);
    const rain=['rain','light-rain','heavy-rain'].includes(this.weather),cloud=rain?1:this.weather==='cloudy'?.65:0;
    this.cloud+=(cloud-this.cloud)*f;
    this.sky.setFloat('warmth',state.warmth);this.sky.setFloat('cloud',this.cloud);this.sky.setFloat('daylight',state.daylight);
    const angle=(state.hour-6)*Math.PI/12;const sun=new Vector3(Math.cos(angle),Math.max(.04,state.elevation),.3).normalize();
    this.sky.setVector3('sunDirection',sun);this.sun.direction.copyFrom(sun.scale(-1));this.sun.position.set(x+sun.x*115,115,z+sun.z*115);
    this.sun.intensity=state.daylight*(1.25-this.cloud*.6);this.fill.intensity=.35+state.daylight*.4;
    Color3.LerpToRef(C('#dbe7ff'),C('#ffe0aa'),state.warmth,this.sun.diffuse);
    Color3.LerpToRef(C('#142c44'),C(rain?'#9eafb3':'#c4d9cd'),state.daylight,this.scene.fogColor);
    this.water.setFloat('time',t);this.water.setFloat('daylight',state.daylight);
    this.nightLights.update(dt,x,z,state.night);
    const road=this.mats.get('#727774');if(road){const wet=rain?.22:0;road.specularColor.set(.055+wet,.055+wet,.04+wet);road.specularPower=rain?48:16;}
  }
  quality(high: boolean,lights=2) {this.scene.shadowsEnabled = high;this.nightLights.quality(lights);}
  lighting(weather:Weather) {this.weather=weather;}
}
