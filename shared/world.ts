import {BOAT_DOCKS} from './exploration';
import {districtAt,districtBounds,districtBuildings,onWorldLand} from './districts';
export type Vec2 = { x: number; z: number };
export type Obstacle = { x: number; z: number; w: number; d: number };
export const SPAWN = { x: 8, z: -13 };
export const LIMITS = { minX: -99, maxX: 1130, minZ: -78, maxZ: 90 };
export const BUILDINGS = [
  {
    x: 33,
    z: 32,
    w: 48,
    d: 15,
    h: 7,
    type: "terminal",
    name: "KOZHIKODE TERMINAL",
    color: "#efe4c8",
  },
  {
    x: -32,
    z: 25,
    w: 14,
    d: 13,
    h: 8,
    type: "shop",
    name: "MALABAR BAKERY",
    color: "#edc294",
  },
  {
    x: -15,
    z: 25,
    w: 14,
    d: 13,
    h: 6,
    type: "shop",
    name: "MITTAYI & CO.",
    color: "#bed2ba",
  },
  {
    x: 2,
    z: 25,
    w: 14,
    d: 13,
    h: 9,
    type: "shop",
    name: "CHAYA HOUSE",
    color: "#e0b6a0",
  },
  {
    x: 86,
    z: 29,
    w: 14,
    d: 15,
    h: 9,
    type: "house",
    name: "",
    color: "#e8dfc0",
  },
  {
    x: 108,
    z: 32,
    w: 15,
    d: 16,
    h: 7,
    type: "house",
    name: "",
    color: "#d4d4b5",
  },
  {
    x: 135,
    z: 27,
    w: 17,
    d: 14,
    h: 12,
    type: "house",
    name: "",
    color: "#d9c5a1",
  },
  {
    x: 77,
    z: -36,
    w: 16,
    d: 18,
    h: 8,
    type: "house",
    name: "",
    color: "#e4c1a0",
  },
  {
    x: 104,
    z: -40,
    w: 15,
    d: 17,
    h: 11,
    type: "house",
    name: "",
    color: "#d4ded2",
  },
  {
    x: 133,
    z: -36,
    w: 18,
    d: 16,
    h: 7,
    type: "house",
    name: "",
    color: "#e7d8af",
  },
  {
    x: -40,
    z: 66,
    w: 24,
    d: 14,
    h: 8,
    type: "heritage",
    name: "MANANCHIRA",
    color: "#f0e2be",
  },
  ...[280,550,820,1070].flatMap((x,i)=>[
    {x,z:32,w:24,d:16,h:9,type:'house' as const,name:['MEDICAL COLLEGE AREA','KUNNAMANGALAM','KATTANGAL','NIT CALICUT AREA'][i],color:'#e0d5b6'},
    {x:x+40,z:-35,w:15,d:14,h:7,type:'house' as const,name:'',color:'#d1c5a5'}
  ]),
] as const;
export const OBSTACLES: Obstacle[] = [
  ...BUILDINGS.map((b) => ({ x: b.x, z: b.z, w: b.w, d: b.d })),
  { x: -41, z: 45, w: 27, d: 12 },
];
export const PLACES = [
  {
    id: "terminal",
    name: "KSRTC Terminal area",
    ml: "കോഴിക്കോട്",
    x: 33,
    z: 12,
    detail:
      "Your journey begins here. A fictional terminal inspired by Kozhikode’s Mavoor Road area.",
  },
  {
    id: "market",
    name: "SM Street inspired quarter",
    ml: "മിഠായിത്തെരുവ്",
    x: -20,
    z: 12,
    detail:
      "Warm shopfronts, shaded verandas and a little Malabar character. Original fictional storefronts.",
  },
  {
    id: "square",
    name: "Mananchira inspired square",
    ml: "മാനാഞ്ചിറ",
    x: -41,
    z: 57,
    detail:
      "A quiet heritage square and a reflecting pond. An artistic interpretation, not a surveyed replica.",
  },
  {
    id: "beach",
    name: "Kozhikode Beach",
    ml: "കോഴിക്കോട് ബീച്ച്",
    x: -88,
    z: -14,
    detail:
      "Follow the palms to the Arabian Sea. Watch the waves from the promenade.",
  },
  {
    id: "suburb",
    name: "Eastern road",
    ml: "കുന്നമംഗലം",
    x: 138,
    z: 0,
    detail:
      "Future Route B continues toward Medical College, Kunnamangalam, Kattangal and NIT Calicut.",
  },
];
export function blocked(x: number, z: number, r = 0.38) {
  if(!onWorldLand(x,z,r))return true;
  const district=districtAt(x);
  if(BOAT_DOCKS.some(dock=>Math.abs(x-dock.water.x)<dock.water.w/2+r&&Math.abs(z-dock.water.z)<dock.water.d/2+r))return true;
  return (district.id==='kozhikode'?OBSTACLES:districtBuildings(district)).some(
    (b) => Math.abs(x - b.x) < b.w / 2 + r && Math.abs(z - b.z) < b.d / 2 + r,
  );
}
export function move(
  p: Vec2,
  x: number,
  z: number,
  sprint: boolean,
  dt: number,
): Vec2 {
  const length = Math.hypot(x, z);
  if (length > 1) {
    x /= length;
    z /= length;
  }
  const speed = sprint ? 7.2 : 4.4;
  const steps = Math.max(1, Math.ceil((dt * speed) / 0.25));
  const out = { ...p };const limits=districtBounds(p.x);
  for (let i = 0; i < steps; i++) {
    const nx = Math.max(
      limits.minX,
      Math.min(limits.maxX, out.x + (x * speed * dt) / steps),
    );
    if (!blocked(nx, out.z)) out.x = nx;
    const nz = Math.max(
      limits.minZ,
      Math.min(limits.maxZ, out.z + (z * speed * dt) / steps),
    );
    if (!blocked(out.x, nz)) out.z = nz;
  }
  return out;
}
