export class InputController {
  keys = new Set<string>();
  stick = { x: 0, y: 0 };
  active = false;
  private touchDrive={throttle:0,steer:0,brake:false};
  private sprintTouch = false;
  onAction: (key: string) => void = () => {};
  onLook: (dx: number, dy: number) => void = () => {};
  constructor(canvas: HTMLCanvasElement) {
    window.addEventListener("keydown", (e) => {
      if (
        !this.active ||
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLSelectElement
      )
        return;
      if (
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)
      )
        e.preventDefault();
      if (!e.repeat) this.onAction(e.key.toLowerCase());
      this.keys.add(e.key.toLowerCase());
    });
    window.addEventListener("keyup", (e) =>
      this.keys.delete(e.key.toLowerCase()),
    );
    window.addEventListener("blur", () => this.clear());
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) this.clear();
    });
    let drag: number | null = null,
      lastX = 0,
      lastY = 0;
    canvas.addEventListener("pointerdown", (e) => {
      if (!this.active) return;
      drag = e.pointerId;
      lastX = e.clientX;
      lastY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener("pointermove", (e) => {
      if (drag !== e.pointerId) return;
      this.onLook(e.clientX - lastX, e.clientY - lastY);
      lastX = e.clientX;
      lastY = e.clientY;
    });
    const end = () => (drag = null);
    canvas.addEventListener("pointerup", end);
    canvas.addEventListener("pointercancel", end);
  }
  bindTouch(stick: HTMLElement, sprint: HTMLElement) {
    let pointer: number | null = null;
    const knob = stick.querySelector<HTMLElement>("span")!;
    const update = (e: PointerEvent) => {
      const r = stick.getBoundingClientRect(),
        x = e.clientX - r.left - r.width / 2,
        y = e.clientY - r.top - r.height / 2,
        scale = Math.min(1, 42 / Math.max(1, Math.hypot(x, y)));
      this.stick = { x: (x * scale) / 42, y: (y * scale) / 42 };
      knob.style.transform = `translate(${x * scale}px,${y * scale}px)`;
    };
    stick.addEventListener("pointerdown", (e) => {
      pointer = e.pointerId;
      stick.setPointerCapture(pointer);
      update(e);
    });
    stick.addEventListener("pointermove", (e) => {
      if (e.pointerId === pointer) update(e);
    });
    const release = () => {
      pointer = null;
      this.stick = { x: 0, y: 0 };
      knob.style.transform = "";
    };
    stick.addEventListener("pointerup", release);
    stick.addEventListener("pointercancel", release);
    sprint.addEventListener("pointerdown", (e) => {
      this.sprintTouch = true;
      sprint.setPointerCapture(e.pointerId);
    });
    for (const type of ["pointerup", "pointercancel"])
      sprint.addEventListener(type, () => (this.sprintTouch = false));
  }
  read(alpha: number) {
    const forward =
      Number(this.keys.has("w") || this.keys.has("arrowup")) -
      Number(this.keys.has("s") || this.keys.has("arrowdown")) -
      this.stick.y;
    const right =
      Number(this.keys.has("d") || this.keys.has("arrowright")) -
      Number(this.keys.has("a") || this.keys.has("arrowleft")) +
      this.stick.x;
    let x = -Math.cos(alpha) * forward - Math.sin(alpha) * right,
      z = -Math.sin(alpha) * forward + Math.cos(alpha) * right;
    const l = Math.hypot(x, z);
    if (l > 1) {
      x /= l;
      z /= l;
    }
    return { x, z, sprint: this.keys.has("shift") || this.sprintTouch };
  }
  bindDriving(){for(const id of ['accelerate','reverse','brake','steer-left','steer-right']){const el=document.getElementById(id)!;const release=()=>{if(id==='brake')this.touchDrive.brake=false;else if(id.startsWith('steer'))this.touchDrive.steer=0;else this.touchDrive.throttle=0;};el.addEventListener('pointerdown',e=>{el.setPointerCapture(e.pointerId);if(id==='brake')this.touchDrive.brake=true;else if(id.startsWith('steer'))this.touchDrive.steer=id==='steer-left'?-1:1;else this.touchDrive.throttle=id==='accelerate'?1:-1;});for(const event of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(event,release);}}
  driving() {
    return {throttle: Number(this.keys.has("w")||this.keys.has("arrowup"))-Number(this.keys.has("s")||this.keys.has("arrowdown"))-this.stick.y+this.touchDrive.throttle, steer: Number(this.keys.has("d")||this.keys.has("arrowright"))-Number(this.keys.has("a")||this.keys.has("arrowleft"))+this.stick.x+this.touchDrive.steer, brake:this.keys.has(" ")||this.sprintTouch||this.touchDrive.brake};
  }
  clear() {
    this.touchDrive={throttle:0,steer:0,brake:false};
    this.keys.clear();
    this.stick = { x: 0, y: 0 };
    this.sprintTouch = false;
  }
}
