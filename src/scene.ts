import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Game, LANES, type Kind } from './game';

const palette = { violet: 0x8860e8, mint: 0x75ffcf, floor: 0x27263c, dark: 0x111421 };
const materials = new Map<string, THREE.MeshStandardMaterial>();
const geometries = new Map<string, THREE.BufferGeometry>();
function mat(color: number, metal = 0.25, rough = 0.4, glow = 0) {
  const key = `${color}/${metal}/${rough}/${glow}`;
  if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({ color, metalness: metal, roughness: rough, emissive: color, emissiveIntensity: glow }));
  return materials.get(key)!;
}
function box(parent: THREE.Object3D, dimensions: number[], pos: number[], material: THREE.Material, radius = 0) {
  const key = `${dimensions}/${radius}`;
  if (!geometries.has(key)) geometries.set(key, radius ? new RoundedBoxGeometry(dimensions[0], dimensions[1], dimensions[2], 3, radius) : new THREE.BoxGeometry(...dimensions as [number, number, number]));
  const mesh = new THREE.Mesh(geometries.get(key), material);
  mesh.position.set(...pos as [number, number, number]);
  parent.add(mesh);
  return mesh;
}
function roundPanel(parent: THREE.Object3D, w: number, h: number, d: number, r: number, pos: number[], material: THREE.Material) {
  const shape = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  shape.moveTo(x + r, y);
  shape.lineTo(x + w - r, y); shape.quadraticCurveTo(x + w, y, x + w, y + r);
  shape.lineTo(x + w, y + h - r); shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  shape.lineTo(x + r, y + h); shape.quadraticCurveTo(x, y + h, x, y + h - r);
  shape.lineTo(x, y + r); shape.quadraticCurveTo(x, y, x + r, y);
  const mesh = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false, curveSegments: 10 }), material);
  mesh.position.set(pos[0], pos[1], pos[2] - d / 2); parent.add(mesh);
}
function batch(group: THREE.Group) {
  group.updateMatrixWorld(true);
  const batches = new Map<THREE.Material, THREE.BufferGeometry[]>();
  group.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    const geometry = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone();
    geometry.applyMatrix4(object.matrixWorld);
    if (!batches.has(object.material)) batches.set(object.material, []);
    batches.get(object.material)!.push(geometry);
  });
  group.clear();
  for (const [material, parts] of batches) {
    group.add(new THREE.Mesh(mergeGeometries(parts), material));
    parts.forEach(part => part.dispose());
  }
  return group;
}
function tube(parent: THREE.Object3D, points: THREE.Vector3[], radius: number, material: THREE.Material) {
  const curve = new THREE.CatmullRomCurve3(points);
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, radius, 8, false), material);
  parent.add(mesh); return mesh;
}
function labelTexture(type: 'server' | 'box' | 'sign') {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = type === 'sign' ? 128 : 512;
  const c = canvas.getContext('2d')!;
  c.fillStyle = type === 'box' ? '#c7a88b' : '#161d2b'; c.fillRect(0, 0, 256, canvas.height);
  if (type === 'server') {
    for (let y = 12; y < 510; y += 61) {
      c.fillStyle = '#333448'; c.fillRect(12, y, 232, 48);
      c.fillStyle = '#0d1220'; c.fillRect(20, y + 7, 175, 33);
      for (let x = 27; x < 186; x += 8) { c.fillStyle = '#505369'; c.fillRect(x, y + 12, 3, 22); }
      c.fillStyle = y % 3 ? '#86f9cc' : '#a892ee'; c.fillRect(209, y + 12, 12, 5);
      c.fillStyle = '#b7c4d2'; c.fillRect(209, y + 27, 12, 3);
    }
  } else if (type === 'box') {
    c.fillStyle = '#9a7860'; c.fillRect(115, 0, 28, 512);
    c.fillStyle = '#e9ddc9'; c.fillRect(25, 270, 90, 155);
    c.fillStyle = '#303239'; c.font = 'bold 20px sans-serif'; c.fillText('GPU', 33, 304);
    c.font = '11px monospace'; c.fillText('HANDLE', 33, 330); c.fillText('WITH CARE', 33, 347);
    for (let i = 0; i < 24; i++) c.fillRect(33 + i * 3, 375, i % 3 ? 1 : 2, 27);
    c.font = 'bold 36px sans-serif'; c.fillText('↑ ↑', 157, 430);
  } else {
    c.fillStyle = '#aeb0dd'; c.font = '700 40px sans-serif'; c.textAlign = 'center'; c.fillText('RUNPOD', 128, 60);
    c.fillStyle = '#75ffcf'; c.font = '12px monospace'; c.fillText('COMPUTE DISTRICT / 01', 128, 93);
  }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createPoddy() {
  const poddy = new THREE.Group();
  box(poddy, [1.58, 1.73, 1.1], [0, 1.13, 0], mat(0x66509e, 0.58, 0.3), 0.28);
  roundPanel(poddy, 1.39, 1.31, 0.1, 0.2, [0, 1.31, 0.558], mat(0x32265d, 0.7, 0.24));
  roundPanel(poddy, 1.26, 1.16, 0.065, 0.17, [0, 1.33, 0.62], mat(0x111126, 0.3, 0.22));
  const face = mat(0xe4c8ff, 0.2, 0.3, 1.1);
  for (const x of [-0.28, 0.28]) roundPanel(poddy, 0.15, 0.34, 0.04, 0.075, [x, 1.46, 0.663], face);
  tube(poddy, Array.from({ length: 13 }, (_, i) => {
    const t = i / 12; return new THREE.Vector3(-0.24 + t * 0.48, 1.11 - Math.sin(t * Math.PI) * 0.115, 0.663);
  }), 0.033, face);
  for (let i = 0; i < 3; i++) box(poddy, [1.02, 0.047, 0.07], [0, 0.62 - i * 0.11, 0.55], mat(0x171326), 0.012);
  for (const side of [-1, 1]) {
    box(poddy, [0.26, 0.76, 0.69], [side * 0.87, 1.19, 0], mat(0x30234f, 0.65), 0.12);
    box(poddy, [0.055, 0.57, 0.48], [side * 1.01, 1.19, 0.04], mat(0x7b60bb, 0.5), 0.08);
    for (let i = 0; i < 4; i++) box(poddy, [0.012, 0.035, 0.43], [side * 0.783, 0.68 - i * 0.085, 0], mat(0x171326));
    box(poddy, [0.028, 0.41, 0.035], [side * 0.986, 1.2, 0.3], mat(0xb58cff, 0.1, 0.35, 1));
  }
  box(poddy, [0.87, 0.17, 0.68], [0, 0.23, 0], mat(0x28213e, 0.6), 0.075);
  box(poddy, [0.64, 0.03, 0.43], [0, 0.135, 0], mat(palette.mint, 0.1, 0.3, 1.5), 0.014);
  box(poddy, [1.16, 1.18, 0.03], [0, 1.12, -0.557], mat(0x30264d, 0.5), 0.1);
  for (let i = 0; i < 7; i++) box(poddy, [0.73, 0.04, 0.035], [0, 1.36 - i * 0.12, -0.586], mat(0x171326));
  return poddy;
}

export class GameScene {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(52, 1, 0.1, 180);
  poddy = createPoddy();
  private floor = new THREE.Group();
  private sides = new THREE.Group();
  private entityMeshes = new Map<number, THREE.Group>();
  private particles: { mesh: THREE.Mesh; velocity: THREE.Vector3; life: number }[] = [];
  private shadow: THREE.Mesh;
  private clock = 0;
  private menuMix = 1;
  private shake = 0;
  private serverMat = new THREE.MeshStandardMaterial({ map: labelTexture('server'), metalness: 0.5, roughness: 0.45, emissive: 0x6a7eac, emissiveMap: labelTexture('server'), emissiveIntensity: 0.22 });
  private cartonMat = new THREE.MeshStandardMaterial({ map: labelTexture('box'), roughness: 0.9 });
  private particleGeometry = new THREE.BoxGeometry(0.09, 0.09, 0.09);
  private tokenTemplate: THREE.Group;
  private obstacleTemplates = new Map<Kind, THREE.Group>();
  private shadowTexture: THREE.CanvasTexture;
  private reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.4;
    this.scene.background = new THREE.Color(0x171828);
    this.scene.fog = new THREE.Fog(0x171828, 33, 115);
    this.scene.add(new THREE.HemisphereLight(0xc9ceff, 0x343046, 3));
    const key = new THREE.DirectionalLight(0xf0dfff, 4.8); key.position.set(-5, 12, 6); this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x8e71ff, 3); rim.position.set(6, 4, -7); this.scene.add(rim);
    const mint = new THREE.PointLight(0x79ffd9, 28, 18); mint.position.set(-4, 4, 0); this.scene.add(mint);
    const sky = new THREE.Mesh(new THREE.PlaneGeometry(220, 80), new THREE.ShaderMaterial({
      depthWrite: false, uniforms: {}, vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: 'varying vec2 vUv;void main(){vec3 c=mix(vec3(.28,.24,.46),vec3(.065,.065,.13),smoothstep(0.,.7,vUv.y));float g=exp(-length((vUv-vec2(.55,.1))*vec2(2.,1.))*6.);gl_FragColor=vec4(c+vec3(.20,.17,.26)*g,1.);}'
    })); sky.position.set(0, 28, -114); this.scene.add(sky);
    const horizon = new THREE.Mesh(new THREE.TorusGeometry(13, 0.06, 8, 90), new THREE.MeshBasicMaterial({ color: 0x9e7de8, transparent: true, opacity: 0.38, fog: false })); horizon.position.set(0, 10, -105); this.scene.add(horizon);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(12, 6), new THREE.MeshBasicMaterial({ map: labelTexture('sign') })); sign.position.set(0, 11, -94); this.scene.add(sign);
    box(this.scene, [250, 0.3, 200], [0, -0.66, -65], mat(0x10131f));
    box(this.scene, [9.7, 0.5, 150], [0, -0.27, -60], mat(0x37324c, 0.6));
    for (let i = 0; i < 27; i++) {
      const z = 10 - i * 5;
      for (const lane of [-1, 0, 1]) box(this.floor, [2.59, 0.04, 4.92], [lane * LANES, 0.01, z], mat(i % 2 ? 0x302d42 : 0x343148, 0.5, 0.6));
      for (const x of [-4.5, 4.5]) box(this.floor, [0.08, 0.035, 3.3], [x, 0.04, z], mat(palette.mint, 0.3, 0.4, 0.8));
      for (const x of [-LANES / 2, LANES / 2]) box(this.floor, [0.035, 0.02, 2.6], [x, 0.05, z], mat(0x777086, 0.3));
    }
    this.scene.add(batch(this.floor));
    for (let i = 0; i < 18; i++) {
      const z = 7 - i * 7;
      for (const side of [-1, 1]) {
        const rack = this.makeRack(i % 3 === 0 ? 5.6 : 4.1);
        rack.position.set(side * (6.8 + (i % 3) * 0.12), 0.25, z);
        rack.rotation.y = side * -0.24; this.sides.add(rack);
        box(this.sides, [3.3, 0.3, 5.2], [side * 6.7, -0.05, z], mat(0x4a415d, 0.4));
        box(this.sides, [0.09, 1.1, 0.1], [side * 4.8, 0.55, z], mat(0x8876aa, 0.65));
        if (i % 3 === 0) {
          box(this.sides, [0.2, 7.7, 0.4], [side * 5.15, 3.8, z], mat(0x4a425f, 0.6));
          box(this.sides, [0.045, 6.8, 0.04], [side * 4.99, 3.8, z + 0.23], mat(0x9068de, 0.1, 0.4, 1));
          if (side === 1) {
            box(this.sides, [10.6, 0.22, 0.4], [0, 7.55, z], mat(0x4a425f, 0.6));
            box(this.sides, [4.6, 0.025, 0.22], [0, 7.41, z], mat(0xc2b7ff, 0, 0.4, 1.2));
          }
        }
      }
    }
    this.scene.add(batch(this.sides), batch(this.poddy));
    const skyline = new THREE.Group();
    for (let i = 0; i < 38; i++) {
      const side = i % 2 ? -1 : 1, height = 4 + ((i * 7) % 17);
      const x = side * (15 + ((i * 13) % 26)), z = -15 - Math.floor(i / 2) * 5;
      box(skyline, [3 + i % 3, height, 4], [x, height / 2 - 1, z], mat(0x27273b, 0.15, 0.8));
      box(skyline, [0.05, height * 0.7, 0.02], [x + 0.6, height / 2, z + 2.02], mat(0x796392, 0.1, 0.5, 0.4));
    }
    this.scene.add(batch(skyline));
    const sc = document.createElement('canvas'); sc.width = sc.height = 64;
    const ctx = sc.getContext('2d')!; const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(0,0,0,0.55)'); grad.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = grad; ctx.fillRect(0, 0, 64, 64);
    this.shadowTexture = new THREE.CanvasTexture(sc);
    this.shadow = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.6), new THREE.MeshBasicMaterial({ map: this.shadowTexture, transparent: true, depthWrite: false }));
    this.shadow.rotation.x = -Math.PI / 2; this.shadow.position.y = 0.065; this.scene.add(this.shadow);
    this.tokenTemplate = batch(this.makeToken());
    for (const kind of ['gpu', 'box', 'rack', 'gate'] as Kind[]) this.obstacleTemplates.set(kind, batch(this.makeObstacle(kind)));
    this.resize();
  }

  private makeRack(height = 3.1) {
    const group = new THREE.Group();
    box(group, [1.72, height, 1.45], [0, height / 2, 0], mat(0x363348, 0.6), 0.09);
    box(group, [1.48, height - 0.24, 0.025], [0, height / 2, 0.74], this.serverMat);
    for (const x of [-0.81, 0.81]) box(group, [0.035, height - 0.2, 0.04], [x, height / 2, 0.76], mat(0x9a79df, 0.2, 0.4, 0.6));
    box(group, [1.86, 0.12, 1.6], [0, 0.06, 0], mat(0x1d1c2d));
    return group;
  }

  private makeToken() {
    const group = new THREE.Group();
    box(group, [0.52, 0.52, 0.14], [0, 0, 0], mat(0x8affd9, 0.65, 0.2, 0.4), 0.08);
    box(group, [0.32, 0.32, 0.04], [0, 0, 0.087], mat(0x154e50, 0.6), 0.04);
    box(group, [0.16, 0.16, 0.05], [0, 0, 0.112], mat(0xc2ffe5, 0.3, 0.2, 1), 0.025);
    for (let i = 0; i < 3; i++) for (const side of [-1, 1]) {
      box(group, [0.05, 0.11, 0.08], [(i - 1) * 0.15, side * 0.29, 0], mat(0xb2ffe8, 0.6));
      box(group, [0.11, 0.05, 0.08], [side * 0.29, (i - 1) * 0.15, 0], mat(0xb2ffe8, 0.6));
    }
    return group;
  }

  private makeObstacle(kind: Kind) {
    const group = new THREE.Group();
    if (kind === 'rack') return this.makeRack();
    if (kind === 'box') {
      box(group, [1.63, 1, 1.33], [0, 0.5, 0], this.cartonMat, 0.035);
      box(group, [0.17, 0.015, 1.34], [0, 1.006, 0], mat(0x9a795e, 0, 0.95));
    } else if (kind === 'gpu') {
      box(group, [1.93, 0.58, 1.1], [0, 0.34, 0], mat(0x3a4354, 0.7), 0.06);
      box(group, [1.8, 0.05, 0.93], [0, 0.652, 0], mat(0x273f3c, 0.4));
      for (const x of [-0.56, 0, 0.56]) {
        const fan = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.04, 16), mat(0x141c27, 0.5)); fan.position.set(x, 0.69, 0); group.add(fan);
        const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.045, 10), mat(0x85849a, 0.7)); hub.position.set(x, 0.72, 0); group.add(hub);
        for (let i = 0; i < 6; i++) { const blade = box(group, [0.28, 0.014, 0.038], [x, 0.718, 0], mat(0x515566, 0.7)); blade.rotation.y = i * Math.PI / 3; }
      }
      box(group, [1.55, 0.06, 0.03], [0, 0.4, 0.56], mat(palette.mint, 0.2, 0.4, 0.8));
      for (let i = 0; i < 13; i++) box(group, [0.045, 0.12, 0.02], [-0.7 + i * 0.12, 0.19, 0.57], mat(0xbc985d, 0.7));
    } else if (kind === 'gate') {
      for (const x of [-1.03, 1.03]) box(group, [0.18, 2.9, 0.65], [x, 1.45, 0], mat(0x655771, 0.65), 0.04);
      box(group, [2.2, 1.68, 0.75], [0, 2.03, 0], mat(0x625778, 0.6), 0.07);
      box(group, [2.12, 0.16, 0.04], [0, 1.28, 0.39], mat(0xffb977, 0.2, 0.4, 0.7));
      for (let i = 0; i < 7; i++) { const stripe = box(group, [0.13, 0.17, 0.02], [-0.88 + i * 0.29, 1.28, 0.425], mat(0x372c3f)); stripe.rotation.z = -0.45; }
      for (let i = 0; i < 3; i++) box(group, [1.7, 0.12, 0.03], [0, 1.68 + i * 0.34, 0.395], mat(0x302a42));
    }
    return group;
  }

  burst(lane: number, crash = false) {
    this.shake = crash ? 0.25 : 0;
    for (let i = 0; i < (crash ? 24 : 9); i++) {
      const mesh = new THREE.Mesh(this.particleGeometry, mat(crash ? 0xb89cff : palette.mint, 0.3, 0.3, 1));
      mesh.position.set(lane * LANES, 1.1, 0); this.scene.add(mesh);
      this.particles.push({ mesh, velocity: new THREE.Vector3((Math.random() - 0.5) * 5, Math.random() * 4, (Math.random() - 0.5) * 5), life: 0.6 });
    }
  }

  reset() {
    for (const mesh of this.entityMeshes.values()) this.scene.remove(mesh);
    this.entityMeshes.clear();
    for (const p of this.particles) this.scene.remove(p.mesh);
    this.particles = [];
  }

  resize() {
    this.renderer.setSize(innerWidth, innerHeight);
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.fov = innerWidth < 650 ? 65 : 52;
    this.camera.updateProjectionMatrix();
  }

  render(game: Game, dt: number) {
    this.clock += dt;
    const menu = game.mode === 'menu';
    this.menuMix = THREE.MathUtils.damp(this.menuMix, menu ? 1 : 0, 5, dt);
    const m = this.menuMix;
    const mobile = innerWidth < 650;
    const distance = menu ? this.clock * 2 : game.distance;
    this.floor.position.z = distance % 5;
    this.sides.position.z = distance % 21;
    const idle = game.mode === 'running' || menu ? Math.sin(this.clock * (menu ? 2.1 : 12)) * 0.045 : 0;
    const heroX = mobile ? 1.15 : 2.15;
    const heroScale = mobile ? 1.6 : 2.25;
    const slideScale = game.slide > 0 ? 0.36 : 1;
    const scale = THREE.MathUtils.lerp(1, heroScale, m);
    this.poddy.scale.set(scale * (game.slide > 0 && !menu ? 1.15 : 1), scale * THREE.MathUtils.lerp(slideScale, 1, m), scale);
    this.poddy.position.set(THREE.MathUtils.lerp(game.x, heroX, m), THREE.MathUtils.lerp(game.y, mobile ? 0.7 : 0.6, m) + idle, THREE.MathUtils.lerp(0, mobile ? 1.3 : 0.5, m));
    const lean = game.mode === 'running' ? (game.lane * LANES - game.x) * -0.12 : 0;
    this.poddy.rotation.set(THREE.MathUtils.lerp(game.slide > 0 ? -0.1 : game.vy * 0.008, -0.045, m), THREE.MathUtils.lerp(0.08, -0.32 + Math.sin(this.clock * 0.6) * 0.07, m), THREE.MathUtils.lerp(lean, -0.09, m));
    if (game.mode === 'over') { this.poddy.rotation.z = -0.24; this.poddy.rotation.x = -0.15; }
    this.shadow.position.x = this.poddy.position.x;
    this.shadow.position.z = this.poddy.position.z;
    this.shadow.scale.setScalar(scale / (1 + game.y * 0.18));
    this.camera.position.set(THREE.MathUtils.lerp(game.x * 0.09, 0, m), THREE.MathUtils.lerp(mobile ? 6.8 : 5.6, mobile ? 5.2 : 5.3, m), THREE.MathUtils.lerp(mobile ? 12.3 : 10.4, mobile ? 11.4 : 11.3, m));
    this.camera.lookAt(THREE.MathUtils.lerp(game.x * 0.06, mobile ? 0.1 : -0.65, m), THREE.MathUtils.lerp(0.95, mobile ? (innerHeight < 720 ? 4.4 : 2.8) : 1.5, m), THREE.MathUtils.lerp(-9.5, -3.5, m));
    if (this.shake > 0 && !this.reducedMotion) { this.camera.position.x += (Math.random() - 0.5) * this.shake; this.shake = Math.max(0, this.shake - dt); }
    const active = new Set<number>();
    for (const entity of game.entities) {
      active.add(entity.id);
      let mesh = this.entityMeshes.get(entity.id);
      if (!mesh) { mesh = entity.kind === 'token' ? this.tokenTemplate.clone() : this.obstacleTemplates.get(entity.kind)!.clone(); this.entityMeshes.set(entity.id, mesh); this.scene.add(mesh); }
      mesh.visible = !menu;
      mesh.position.set(entity.lane * LANES, entity.y, entity.z);
      if (entity.kind === 'token') { mesh.rotation.y = this.clock * 1.8 + entity.id * 0.35; mesh.rotation.z = 0.2; mesh.position.y += Math.sin(this.clock * 3 + entity.id) * 0.09; }
    }
    for (const [id, mesh] of this.entityMeshes) if (!active.has(id)) { this.scene.remove(mesh); this.entityMeshes.delete(id); }
    for (const p of this.particles) {
      p.life -= dt; p.velocity.y -= dt * 5; p.mesh.position.addScaledVector(p.velocity, dt); p.mesh.scale.setScalar(Math.max(0, p.life / 0.6));
      if (p.life <= 0) this.scene.remove(p.mesh);
    }
    this.particles = this.particles.filter(p => p.life > 0);
    this.renderer.render(this.scene, this.camera);
  }

  stats() { return { calls: this.renderer.info.render.calls, triangles: this.renderer.info.render.triangles, geometries: this.renderer.info.memory.geometries, textures: this.renderer.info.memory.textures }; }
}
