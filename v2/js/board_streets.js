// The streets of the night in 3D: a night town of lit blocks around the printed street graph, the three refuges
// (WWLO renders standing behind their gates), the Returner, and her piece. Junctions are chosen by clicking them.
// v2: the streets she knows glow warm and the ones she doesn't are dark; the Returner walks her lit streets and shows
// where it will step next; a street-level view follows her piece.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { STREETS, IMAGES } from './data.js';
import { edgeKey } from './rules.js';
import { C, PLAYER_COLOURS, tween, ease, lerp, rng, groundTexture, windowsTexture, glowTexture, pawn, labelEl, stoneFace } from './fx.js';

const S = 0.1;
const CX = 106, CZ = 112;
const W = ([x, y], h = 0) => new THREE.Vector3((x - CX) * S, h, (y - CZ) * S);

function segDist(p, a, b) {
  const abx = b[0] - a[0], aby = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * abx + (p[1] - a[1]) * aby) / (abx * abx + aby * aby)));
  return Math.hypot(p[0] - a[0] - abx * t, p[1] - a[1] - aby * t);
}

export class StreetsBoard {
  constructor(renderer, host) {
    this.renderer = renderer;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#070A14');
    this.scene.fog = new THREE.FogExp2('#070A14', 0.03);
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200);
    this.camera.position.set(0, 21.5, 17.5);
    this.labels = new CSS2DRenderer();
    this.labels.domElement.className = 'labels';
    host.appendChild(this.labels.domElement);
    this.controls = new OrbitControls(this.camera, this.labels.domElement);
    Object.assign(this.controls, { enableDamping: true, dampingFactor: 0.08, minDistance: 7, maxDistance: 34, maxPolarAngle: 1.25, minPolarAngle: 0.3 });
    this.controls.target.set(0, 0, 0.4);
    this.nodes = {};
    this.hits = [];
    this.ray = new THREE.Raycaster();
    this.pickable = [];
    this.onPick = null;
    this.build();
    this.bindPicking();
  }

  build() {
    const sc = this.scene;
    this.hemi = new THREE.HemisphereLight('#8fa6d6', '#06080f', 0.45); sc.add(this.hemi);
    this.moon = new THREE.DirectionalLight('#bcd0ff', 1.1);
    this.moon.position.set(8, 20, -12); this.moon.castShadow = true;
    this.moon.shadow.mapSize.set(2048, 2048);
    Object.assign(this.moon.shadow.camera, { left: -18, right: 18, top: 18, bottom: -18, near: 1, far: 60 });
    sc.add(this.moon);

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), new THREE.MeshStandardMaterial({ map: groundTexture(11, '#0C111E', 0.2), roughness: 0.95 }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; sc.add(ground);

    const J = STREETS.junctions;
    const refugeBase = (k) => { const [x, y, w, h] = STREETS.refuges[k].rect_mm; return [x + w / 2, y + h * 0.78]; };
    const segs = STREETS.streets.map(([a, b]) => [J[a], J[b]]);
    for (const [k, r] of Object.entries(STREETS.refuges)) segs.push([J[r.gate], refugeBase(k)]);

    // streets: asphalt with a dashed middle; lit (known) or dark (unknown), set per night
    this.mats = {
      litRoad: new THREE.MeshStandardMaterial({ color: '#4a4030', emissive: '#ffb860', emissiveIntensity: 0.22, roughness: 0.7 }),
      darkRoad: new THREE.MeshStandardMaterial({ color: '#141822', roughness: 0.9 }),
      litDash: new THREE.MeshBasicMaterial({ color: '#ffd59a' }),
      darkDash: new THREE.MeshBasicMaterial({ color: '#39404f' }),
      plainRoad: new THREE.MeshStandardMaterial({ color: '#2B3244', roughness: 0.75, metalness: 0.05 }),
    };
    this.edges = {};
    const dashMat = new THREE.MeshBasicMaterial({ color: C.beige });
    const keys = STREETS.streets.map(([a, b]) => edgeKey(a, b));
    segs.forEach(([a, b], i) => {
      const key = keys[i] || null;
      const pa = W(a, 0.02), pb = W(b, 0.02), len = pa.distanceTo(pb), mid = pa.clone().add(pb).multiplyScalar(0.5);
      const ang = Math.atan2(-(pb.z - pa.z), pb.x - pa.x);
      const m = new THREE.Mesh(new THREE.BoxGeometry(len, 0.04, 0.62), key ? this.mats.darkRoad : this.mats.plainRoad);
      m.position.copy(mid); m.rotation.y = ang; m.receiveShadow = true; sc.add(m);
      const dashes = [];
      const n = Math.floor(len / 0.36);
      for (let k = 1; k < n; k++) {
        const d = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.012, 0.045), key ? this.mats.darkDash : dashMat);
        d.position.copy(pa.clone().lerp(pb, k / n)).setY(0.05); d.rotation.y = ang; sc.add(d);
        dashes.push(d);
      }
      if (key) this.edges[key] = { road: m, dashes };
    });

    // the night town: blocks of lit windows, kept off the streets and the refuges
    const r = rng(23);
    const winMats = [1, 2, 3, 4].map((s) => new THREE.MeshStandardMaterial({ color: '#1a1f2c', emissiveMap: windowsTexture(s), emissive: '#ffffff', emissiveIntensity: 0.9, roughness: 0.8 }));
    const roof = new THREE.MeshStandardMaterial({ color: '#141824', roughness: 0.9 });
    const refRects = Object.values(STREETS.refuges).map((q) => q.rect_mm);
    for (let i = 0; i < 520; i++) {
      const p = [-70 + r() * 352, -60 + r() * 330];
      const nearStreet = segs.some(([a, b]) => segDist(p, a, b) < 13);
      const nearRefuge = refRects.some(([x, y, w, h]) => p[0] > x - 10 && p[0] < x + w + 10 && p[1] > y - 12 && p[1] < y + h + 14);
      const nearNode = Object.values(J).some((q) => Math.hypot(p[0] - q[0], p[1] - q[1]) < 15);
      if (nearStreet || nearRefuge || nearNode) continue;
      const w = 0.6 + r() * 0.9, d = 0.6 + r() * 0.9, h = 0.5 + r() * r() * 3.2;
      const mats = [winMats[i % 4], winMats[(i + 1) % 4], roof, roof, winMats[(i + 2) % 4], winMats[(i + 3) % 4]];
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats);
      b.position.copy(W(p, h / 2)); b.rotation.y = (r() - 0.5) * 0.5; b.castShadow = true; b.receiveShadow = true;
      sc.add(b);
    }

    // lamps at a few junctions
    const glow = glowTexture('255,205,140');
    for (const k of ['J2', 'J5', 'J6', 'J4', 'J7']) {
      const p = W(J[k]);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 1.5, 8), new THREE.MeshStandardMaterial({ color: '#2a2f3a', metalness: 0.6, roughness: 0.4 }));
      pole.position.set(p.x + 0.55, 0.75, p.z - 0.35); sc.add(pole);
      const g = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      g.scale.set(1.3, 1.3, 1); g.position.set(p.x + 0.55, 1.55, p.z - 0.35); sc.add(g);
      if (['J2', 'J5', 'J6'].includes(k)) {
        const l = new THREE.PointLight('#ffc98a', 9, 7, 1.7); l.position.set(p.x + 0.55, 1.5, p.z - 0.35); sc.add(l);
      }
    }

    // junctions, START and the gates
    const nodeMat = new THREE.MeshStandardMaterial({ color: '#EFE9CF', roughness: 0.5 });
    const startMat = new THREE.MeshStandardMaterial({ color: C.hawkbit, metalness: 0.35, roughness: 0.35, emissive: '#5a3a00', emissiveIntensity: 0.5 });
    const gateMat = new THREE.MeshStandardMaterial({ color: '#C97880', metalness: 0.85, roughness: 0.3, emissive: '#2a0a0e', emissiveIntensity: 0.5 });
    this.haloLit = glowTexture('254,212,109');
    this.haloDark = glowTexture('170,200,255');
    const hitGeo = new THREE.CylinderGeometry(0.75, 0.75, 0.6, 20);
    const hitMat = new THREE.MeshBasicMaterial({ visible: false });
    for (const [k, p] of Object.entries(J)) {
      const g = new THREE.Group(); g.position.copy(W(p, 0.04));
      const isGate = k.startsWith('G'), isStart = k === 'S';
      const rad = isStart ? 0.78 : isGate ? 0.55 : 0.42;
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, 0.14, 40), isStart ? startMat : isGate ? new THREE.MeshStandardMaterial({ color: '#131521', roughness: 0.4 }) : nodeMat);
      disc.position.y = 0.07; disc.castShadow = true; g.add(disc);
      if (isStart) {
        const face = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.3), new THREE.MeshBasicMaterial({ map: stoneFace('START', { ink: C.kuroi, size: 62 }), transparent: true, toneMapped: false }));
        face.rotation.x = -Math.PI / 2; face.position.y = 0.15; g.add(face);
      }
      if (isGate) {
        for (const sx of [-0.55, 0.55]) {
          const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 1.2, 12), gateMat);
          post.position.set(sx, 0.6, 0); post.castShadow = true; g.add(post);
        }
        const arch = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.06, 12, 32, Math.PI), gateMat);
        arch.position.y = 1.2; g.add(arch);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.05, 12, 48), gateMat);
        ring.rotation.x = -Math.PI / 2; ring.position.y = 0.15; g.add(ring);
      }
      const hit = new THREE.Mesh(hitGeo, hitMat); hit.position.y = 0.3; hit.userData.node = k; g.add(hit);
      this.hits.push(hit);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('254,212,109'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
      halo.scale.set(2.2, 2.2, 1); halo.position.y = 0.25; g.add(halo);
      g.userData.halo = halo;
      sc.add(g);
      this.nodes[k] = g;
    }

    // the cost tag over a junction she can step to, and the glow where the Returner will step next
    this.tags = {};
    for (const k of Object.keys(J)) {
      const t = new CSS2DObject(labelEl('', 'cost'));
      t.position.set(0, 1.2, 0); t.visible = false;
      this.nodes[k].add(t);
      this.tags[k] = t;
    }
    this.nextMark = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.07, 12, 48), new THREE.MeshBasicMaterial({ color: '#ff6b74', transparent: true, opacity: 0.9 }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.2;
    const redGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('255,107,116'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.8 }));
    redGlow.scale.set(2.4, 2.4, 1); redGlow.position.y = 0.3;
    const nextTag = new CSS2DObject(labelEl('its next step', 'next'));
    nextTag.position.set(0, 0.9, 0.9);
    this.nextMark.add(ring, redGlow, nextTag);
    this.nextMark.visible = false;
    sc.add(this.nextMark);

    // the refuges: renders standing behind their gates, lit warm
    const loader = new THREE.TextureLoader();
    this.refuges = {};
    for (const [k, q] of Object.entries(STREETS.refuges)) {
      const [x, y, w, h] = q.rect_mm;
      const tex = loader.load(IMAGES.refuges[k]); tex.colorSpace = THREE.SRGBColorSpace;
      const card = new THREE.Group();
      card.position.copy(W([x + w / 2, y + h * 0.6]));
      const pic = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 2.8), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, color: '#ffffff' }));
      pic.position.y = 1.75; card.add(pic);
      const frame = new THREE.Mesh(new THREE.BoxGeometry(4.36, 2.96, 0.06), new THREE.MeshStandardMaterial({ color: C.hawkbit, metalness: 0.7, roughness: 0.3 }));
      frame.position.set(0, 1.75, -0.04); card.add(frame);
      const base = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.3, 0.9), new THREE.MeshStandardMaterial({ color: '#1b2030', roughness: 0.8 }));
      base.position.y = 0.15; base.castShadow = true; card.add(base);
      const light = new THREE.PointLight('#ffcf8a', 14, 6, 1.6); light.position.set(0, 1.4, 1.4); card.add(light);
      const lab = new CSS2DObject(labelEl(`<b>${k}</b> · ${q.name}`, 'refuge'));
      lab.position.set(0, 3.55, 0); card.add(lab);
      card.userData.light = light;
      sc.add(card);
      this.refuges[k] = card;
    }

    // the Returner: a tall, still figure in a long coat with a small lantern; it stands where she hid before
    this.returner = this.makeReturner();
    this.returner.scale.setScalar(1.3);
    this.returner.visible = false;
    sc.add(this.returner);
  }

  makeReturner() {
    const g = new THREE.Group();
    const coatMat = new THREE.MeshStandardMaterial({ color: '#17151d', roughness: 0.92 });
    const prof = [[0, 0], [0.46, 0], [0.4, 0.5], [0.3, 1.05], [0.22, 1.32], [0.12, 1.4], [0, 1.4]].map(([x, y]) => new THREE.Vector2(x, y));
    const coat = new THREE.Mesh(new THREE.LatheGeometry(prof, 28), coatMat); coat.castShadow = true; g.add(coat);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 24, 16), coatMat); head.position.y = 1.56; head.castShadow = true; g.add(head);
    const lantern = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.17, 0.12), new THREE.MeshStandardMaterial({ color: '#ffd59a', emissive: '#ffb860', emissiveIntensity: 2.2 }));
    lantern.position.set(0.36, 0.78, 0.12); g.add(lantern);
    const l = new THREE.PointLight('#ffb860', 6, 4, 1.8); l.position.copy(lantern.position); g.add(l);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('255,184,96'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.8 }));
    glow.scale.set(0.9, 0.9, 1); glow.position.copy(lantern.position); g.add(glow);
    const lab = new CSS2DObject(labelEl('the Returner', 'returner'));
    lab.position.set(0, 2.05, 0); g.add(lab);
    g.userData.label = lab;
    return g;
  }

  bindPicking() {
    const el = this.labels.domElement;
    let down = null;
    el.addEventListener('pointerdown', (e) => { down = [e.clientX, e.clientY]; });
    el.addEventListener('pointerup', (e) => {
      if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6 || !this.onPick) return;
      const rect = el.getBoundingClientRect();
      const v = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      this.ray.setFromCamera(v, this.camera);
      const hit = this.ray.intersectObjects(this.hits.filter((h) => this.pickable.includes(h.userData.node)), false)[0];
      if (hit) this.onPick(hit.object.userData.node);
    });
    el.addEventListener('pointermove', (e) => {
      if (!this.pickable.length) { el.style.cursor = ''; return; }
      const rect = el.getBoundingClientRect();
      const v = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      this.ray.setFromCamera(v, this.camera);
      el.style.cursor = this.ray.intersectObjects(this.hits.filter((h) => this.pickable.includes(h.userData.node)), false).length ? 'pointer' : '';
    });
  }

  /** Lights the junctions she can step to (with what each costs), and resolves with the one clicked. */
  choose(options) {
    const nodes = options.map((o) => (typeof o === 'string' ? o : o.node));
    this.pickable = nodes;
    this.pulseNodes = nodes;
    for (const o of options) {
      if (typeof o === 'string') continue;
      const t = this.tags[o.node];
      t.element.className = 'tag cost ' + (o.lit ? 'lit' : 'dark');
      t.element.innerHTML = o.lit ? 'lit · 1 step' : 'dark · 3 steps';
      t.visible = true;
      this.nodes[o.node].userData.halo.material.map = o.lit ? this.haloLit : this.haloDark;
    }
    return new Promise((resolve) => {
      this.onPick = (n) => { this.clearChoice(); resolve(n); };
      this.cancelChoice = () => { this.clearChoice(); resolve(null); };
    });
  }

  clearChoice() {
    this.pickable = []; this.pulseNodes = []; this.onPick = null;
    for (const g of Object.values(this.nodes)) g.userData.halo.material.opacity = 0;
    for (const t of Object.values(this.tags)) t.visible = false;
  }

  /** The streets she knows glow; the rest are dark. */
  setLit(lit) {
    for (const [k, e] of Object.entries(this.edges)) {
      const on = lit.has(k);
      e.road.material = on ? this.mats.litRoad : this.mats.darkRoad;
      for (const d of e.dashes) d.material = on ? this.mats.litDash : this.mats.darkDash;
    }
  }

  showNext(node) {
    this.nextMark.visible = !!node;
    if (node) this.nextMark.position.copy(W(STREETS.junctions[node], 0.02));
  }

  async walkReturner(node) {
    const r = this.returner, a = r.position.clone(), b = W(STREETS.junctions[node], 0.1);
    if (a.distanceTo(b) < 0.01) return;
    r.lookAt(b.x, r.position.y, b.z);
    await tween(700, (u) => { const e = ease(u); r.position.lerpVectors(a, b, e); r.position.y = 0.1 + Math.abs(Math.sin(u * Math.PI * 2)) * 0.06; });
    r.position.copy(b);
    this.returnerAt = node;
  }

  /** 'over' looks down on the whole night; 'street' follows her piece at street level. */
  setView(mode) {
    this.view = mode;
    this.controls.enabled = mode === 'over';
    if (mode === 'over') { this.camera.position.copy(this.controls.target).addScaledVector(this.homeDir, this.overDist || this.homeDist); }
  }

  setup(colour, watchedGates) {
    if (this.token) this.scene.remove(this.token);
    this.token = pawn(colour);
    this.token.scale.setScalar(1.6);
    this.token.position.copy(W(STREETS.junctions.S, 0.18));
    this.scene.add(this.token);
    this.at = 'S';
    this.returner.visible = false;
    this.returnerAt = null;
    this.showNext(null);
    this.watchedGates = watchedGates;
    this.setDarkness(0);
    this.controls.target.set(0, 0, 0.4);
    this.follow = null;
    for (const card of Object.values(this.refuges)) card.userData.light.color.set('#ffcf8a');
  }

  async rise(gate) {
    const r = this.returner;
    const p = W(STREETS.junctions[gate], 0.1);
    r.position.copy(p);
    r.rotation.set(0, 0, 0);
    this.returnerAt = gate;
    r.visible = true;
    r.scale.set(1.3, 0.02, 1.3);
    this.follow = p;
    await tween(1600, (u) => { r.scale.y = Math.max(0.02, 1.3 * ease(u)); });
  }

  async hopTo(node) {
    const t = this.token, a = t.position.clone(), b = W(STREETS.junctions[node], 0.18);
    this.follow = b;
    await tween(380, (u) => {
      const e = ease(u);
      t.position.set(lerp(a.x, b.x, e), lerp(a.y, b.y, e) + Math.sin(Math.PI * u) * 0.5, lerp(a.z, b.z, e));
    });
    this.at = node;
  }

  async enterRefuge(k) {
    const card = this.refuges[k], t = this.token;
    const a = t.position.clone(), b = card.position.clone().add(new THREE.Vector3(0, 0.35, 0.6));
    this.follow = card.position.clone();
    await tween(900, (u) => { const e = ease(u); t.position.lerpVectors(a, b, e); t.position.y += Math.sin(Math.PI * u) * 0.4; });
    card.userData.light.intensity = 30;
    await tween(600, (u) => { card.userData.light.intensity = 30 - 16 * u; });
  }

  async meet() {
    this.follow = this.returner.position.clone();
    await tween(900, (u) => { this.renderer.toneMappingExposure = lerp(this.exposure, 0.35, u); });
  }

  setDarkness(k) {
    this.exposure = lerp(1.1, 0.62, k);
    this.renderer.toneMappingExposure = this.exposure;
    this.scene.fog.density = lerp(0.028, 0.05, k);
    this.hemi.intensity = lerp(0.45, 0.22, k);
  }

  resize(w, h) {
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    this.labels.setSize(w, h);
    // back off on narrow screens so the whole board and its labels stay in view
    if (!this.homeDir) { this.homeDir = this.camera.position.clone().sub(this.controls.target); this.homeDist = this.homeDir.length(); this.homeDir.normalize(); }
    const tanH = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * this.camera.aspect;
    const d = Math.max(this.homeDist, 13.5 / tanH);
    this.overDist = d;
    this.camera.position.copy(this.controls.target).addScaledVector(this.homeDir, d);
  }

  render(now) {
    if (this.pulseNodes && this.pulseNodes.length) {
      const o = 0.45 + 0.4 * Math.sin(now / 220);
      for (const k of this.pulseNodes) this.nodes[k].userData.halo.material.opacity = o;
    }
    if (this.view === 'street' && this.token) {
      const p = this.token.position;
      this.camera.position.lerp(new THREE.Vector3(p.x * 0.85, 5.2, p.z + 6.4), 0.06);
      this.lookAt = (this.lookAt || new THREE.Vector3()).lerp(new THREE.Vector3(p.x * 0.7, 0.4, p.z - 5.5), 0.06);
      this.camera.lookAt(this.lookAt);
    } else {
      if (this.follow) this.controls.target.lerp(new THREE.Vector3(this.follow.x * 0.25, 0, this.follow.z * 0.25 + 0.4), 0.05);
      this.controls.update();
    }
    this.renderer.render(this.scene, this.camera);
    this.labels.render(this.scene, this.camera);
  }

  show(on) { this.labels.domElement.style.display = on ? '' : 'none'; }
}
