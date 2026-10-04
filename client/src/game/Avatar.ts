import {Scene} from '@babylonjs/core/scene.js';
import {TransformNode} from '@babylonjs/core/Meshes/transformNode.js';
import {MeshBuilder} from '@babylonjs/core/Meshes/meshBuilder.js';
import {StandardMaterial} from '@babylonjs/core/Materials/standardMaterial.js';
import {Color3} from '@babylonjs/core/Maths/math.color.js';
import {Vector3} from '@babylonjs/core/Maths/math.vector.js';
import {DynamicTexture} from '@babylonjs/core/Materials/Textures/dynamicTexture.js';
import {Mesh} from '@babylonjs/core/Meshes/mesh.js';
const PALETTE = [
  "#da9b52",
  "#507e91",
  "#a95d5d",
  "#7c89b2",
  "#729274",
  "#b27e9e",
];
export class Avatar {
  root: TransformNode;private shirt:StandardMaterial;private outfit="";
  private bagMaterial:StandardMaterial;private bicycleFrame:import('@babylonjs/core/Meshes/linesMesh.js').LinesMesh;private proxy:Mesh;private far=false;
  private boat?:TransformNode;private scene:Scene;
  private cycle:TransformNode;
  private arms: TransformNode[] = [];
  private legs: TransformNode[] = [];
  private clock = 0;
  private label: Mesh;
  private materials: StandardMaterial[] = [];
  private texture: DynamicTexture;
  constructor(scene: Scene, name: string, color: number) {
    this.scene=scene;this.root = new TransformNode("explorer " + name, scene);
    const mat = (n: string, hex: string) => {
      const m = new StandardMaterial(n, scene);
      m.diffuseColor = Color3.FromHexString(hex);
      m.specularColor = new Color3(0.07, 0.07, 0.07);
      this.materials.push(m);
      return m;
    };
    const shirt = this.shirt = mat("shirt", PALETTE[color % 6]),
      skin = mat("skin", "#b77e53"),
      pants = mat("trousers", "#354d52"),
      shoe = mat("shoes", "#e9ddbd"),
      hair = mat("hair", "#292d29"),
      bag = mat("backpack", "#d6c6a0");
    this.bagMaterial=bag;this.cycle=new TransformNode('bicycle',scene);this.cycle.parent=this.root;this.cycle.setEnabled(false);
    for(const z of [-.65,.65]){const wheel=MeshBuilder.CreateTorus('cycle wheel',{diameter:.75,thickness:.07,tessellation:18},scene);wheel.parent=this.cycle;wheel.position.set(0,.42,z);wheel.rotation.z=Math.PI/2;wheel.material=hair;}
    const frame=MeshBuilder.CreateLines('cycle frame',{points:[new Vector3(0,.45,-.65),new Vector3(0,.85,-.1),new Vector3(0,.45,.65),new Vector3(0,.55,0),new Vector3(0,.45,-.65),new Vector3(0,1,.4),new Vector3(0,.45,.65)]},scene);this.bicycleFrame=frame;frame.parent=this.cycle;frame.color=new Color3(.8,.5,.2);
    const handle=MeshBuilder.CreateCylinder('handlebar',{height:.65,diameter:.06,tessellation:6},scene);handle.parent=this.cycle;handle.position.set(0,1.05,.4);handle.rotation.z=Math.PI/2;handle.material=hair;
    const capsule = (
      n: string,
      h: number,
      d: number,
      y: number,
      m: StandardMaterial,
      parent: TransformNode = this.root,
      x = 0,
      z = 0,
    ) => {
      const mesh = MeshBuilder.CreateCapsule(
        n,
        { height: h, radius: d / 2, tessellation: 8, subdivisions: 1 },
        scene,
      );
      mesh.position.set(x, y, z);
      mesh.material = m;
      mesh.parent = parent;
      return mesh;
    };
    capsule("jacket", 0.77, 0.57, 1.04, shirt);
    capsule("neck", 0.15, 0.18, 1.48, skin);
    const head = MeshBuilder.CreateSphere(
      "head",
      { diameter: 0.42, segments: 12 },
      scene,
    );
    head.parent = this.root;
    head.position.y = 1.72;
    head.material = skin;
    const cap = MeshBuilder.CreateSphere(
      "hair",
      { diameter: 0.43, segments: 10, slice: 0.56 },
      scene,
    );
    cap.parent = this.root;
    cap.position.y = 1.76;
    cap.material = hair;
    for (const x of [-0.095, 0.095]) {
      const eye = MeshBuilder.CreateSphere(
        "eye",
        { diameter: 0.037, segments: 6 },
        scene,
      );
      eye.position.set(x, 1.73, 0.195);
      eye.parent = this.root;
      eye.material = hair;
    }
    capsule("pack", 0.52, 0.35, 1.12, bag, this.root, 0, -0.29);
    for (const side of [-1, 1]) {
      const leg = new TransformNode("leg", scene);
      leg.parent = this.root;
      leg.position.set(side * 0.155, 0.72, 0);
      capsule("leg", 0.65, 0.2, -0.27, pants, leg);
      const boot = MeshBuilder.CreateBox(
        "shoe",
        { width: 0.22, height: 0.13, depth: 0.36 },
        scene,
      );
      boot.parent = leg;
      boot.position.set(0, -0.61, 0.075);
      boot.material = shoe;
      this.legs.push(leg);
      const arm = new TransformNode("arm", scene);
      arm.parent = this.root;
      arm.position.set(side * 0.35, 1.36, 0);
      capsule("sleeve", 0.36, 0.19, -0.15, shirt, arm);
      capsule("forearm", 0.32, 0.15, -0.43, skin, arm);
      this.arms.push(arm);
    }
    this.texture = new DynamicTexture(
      "nameplate",
      { width: 512, height: 96 },
      scene,
      false,
    );
    const ctx = this.texture.getContext() as CanvasRenderingContext2D;
    ctx.clearRect(0, 0, 512, 96);
    ctx.fillStyle = "rgba(19,48,44,.82)";
    ctx.fillRect(0, 8, 512, 72);
    ctx.font = '400 40px "Noto Sans Malayalam", sans-serif';
    ctx.textAlign = "center";
    ctx.fillStyle = "#fff9e8";
    ctx.fillText(name, 256, 60);
    this.texture.hasAlpha = true;
    this.texture.update();
    const nm = mat("name", "#ffffff");
    nm.diffuseTexture = this.texture;
    nm.useAlphaFromDiffuseTexture = true;
    nm.emissiveColor = Color3.White();
    nm.disableLighting = true;
    this.label = MeshBuilder.CreatePlane(
      "name",
      { width: 1.65, height: 0.34 },
      scene,
    );
    this.label.parent = this.root;
    this.label.position.y = 2.32;
    this.label.billboardMode = Mesh.BILLBOARDMODE_ALL;
    this.label.material = nm;
    this.proxy=MeshBuilder.CreateCapsule('distant traveller',{height:1.8,radius:.25,tessellation:5,subdivisions:1},scene);this.proxy.parent=this.root;this.proxy.position.y=.9;this.proxy.material=shirt;this.proxy.setEnabled(false);
  }
  detail(distance:number,range:number){const far=distance>range*(this.far?.85:1.1);if(far===this.far)return;this.far=far;for(const mesh of this.root.getChildMeshes())if(mesh!==this.proxy)mesh.setEnabled(!far);this.proxy.setEnabled(far);}
  animate(dt: number, moving: boolean, sprint: boolean) {
    this.clock += dt * (sprint ? 12 : 8);
    const stride = moving ? Math.sin(this.clock) * 0.6 : 0;
    this.legs[0].rotation.x = stride;
    this.legs[1].rotation.x = -stride;
    this.arms[0].rotation.x = -stride * 0.75;
    this.arms[1].rotation.x = stride * 0.75;
  }
  pose(seated:boolean,cycling:boolean,boating=false){if(boating&&!this.boat){this.boat=new TransformNode('rowboat',this.scene);this.boat.parent=this.root;const material=new StandardMaterial('boat wood',this.scene);material.diffuseColor=Color3.FromHexString('#9c6747');this.materials.push(material);const hull=MeshBuilder.CreateSphere('boat hull',{diameter:1,segments:8,slice:.5},this.scene);hull.parent=this.boat;hull.scaling.set(1.7,.6,3.5);hull.rotation.z=Math.PI;hull.position.y=.35;hull.material=material;const seat=MeshBuilder.CreateBox('boat bench',{width:1.5,height:.15,depth:.4},this.scene);seat.parent=this.boat;seat.position.y=.4;seat.material=material;}this.boat?.setEnabled(boating);seated=seated||boating;this.cycle.setEnabled(cycling);if(seated||cycling){this.legs.forEach(l=>l.rotation.x=-1.2);this.arms.forEach(a=>a.rotation.x=-.65);}}
  setPosition(x: number, z: number, yaw: number, smooth = 1) {
    if(Math.hypot(x-this.root.position.x,z-this.root.position.z)>30){this.root.position.x=x;this.root.position.z=z;}
    this.root.position.x += (x - this.root.position.x) * smooth;
    this.root.position.z += (z - this.root.position.z) * smooth;
    let d = yaw - this.root.rotation.y;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    this.root.rotation.y += d * smooth;
  }
  setAccessories(bag?:string,bicycle?:string){if(bag)this.bagMaterial.diffuseColor=Color3.FromHexString(bag);if(bicycle)this.bicycleFrame.color=Color3.FromHexString(bicycle);}
  setOutfit(hex:string){if(hex&&hex!==this.outfit){this.outfit=hex;this.shirt.diffuseColor=Color3.FromHexString(hex);}}
  dispose() {
    this.root.dispose(false, true);
    this.texture.dispose();
    this.materials.forEach((m) => m.dispose());
  }
}
