// The map of the sleep in 3D: the chapters' renders laid on a dark table, the path of stones through them, night
// stones (silver ring, a moon, a star over them), ways up (gold rings) and ways back (red rings), and the players' pieces.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { MAP, IMAGES } from './data.js';
import { SPECIALS, END, kindOf } from './rules.js';
import { C, PLAYER_COLOURS, tween, ease, lerp, catmull, groundTexture, stoneFace, starTexture, glowTexture, pawn, labelEl } from './fx.js';

const S = 0.1;                                  // world units per mm
const CX = 148, CZ = 148.5;                     // the board's middle, mm
export const toWorld = ([x, y], h = 0) => new THREE.Vector3((x - CX) * S, h, (y - CZ) * S);

function roundedRect(w, h, r) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2 + r, -h / 2);
  s.lineTo(w / 2 - r, -h / 2); s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  s.lineTo(w / 2, h / 2 - r); s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  s.lineTo(-w / 2 + r, h / 2); s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  s.lineTo(-w / 2, -h / 2 + r); s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  return s;
}

function planeUVs(geo) {
  geo.computeBoundingBox();
  const b = geo.boundingBox, p = geo.attributes.position, uv = [];
  for (let i = 0; i < p.count; i++) uv.push((p.getX(i) - b.min.x) / (b.max.x - b.min.x), (p.getY(i) - b.min.y) / (b.max.y - b.min.y));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return geo;
}

function stoneGeometry(r, h) {
  const prof = [[0, 0], [r - 0.03, 0], [r, 0.03], [r, h - 0.04], [r - 0.04, h], [0, h]].map(([x, y]) => new THREE.Vector2(x, y));
  return new THREE.LatheGeometry(prof, 48);
}

export class MapBoard {
  constructor(renderer, host) {
    this.renderer = renderer;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#0B1020');
    this.scene.fog = new THREE.FogExp2('#0B1020', 0.012);
    this.camera = new THREE.PerspectiveCamera(36, 1, 0.1, 200);
    this.camera.position.set(0, 37, 26.5);
    this.labels = new CSS2DRenderer();
    this.labels.domElement.className = 'labels';
    host.appendChild(this.labels.domElement);
    this.controls = new OrbitControls(this.camera, this.labels.domElement);
    Object.assign(this.controls, { enableDamping: true, dampingFactor: 0.08, minDistance: 9, maxDistance: 52, maxPolarAngle: 1.2, minPolarAngle: 0.25, enablePan: true, screenSpacePanning: false });
    this.controls.target.set(0, 0, 0.6);
    this.home = { pos: this.camera.position.clone(), target: this.controls.target.clone() };
    this.follow = null;
    this.tokens = [];
    this.stoneMeshes = [];
    this.build();
  }

  build() {
    const sc = this.scene;
    sc.add(new THREE.HemisphereLight('#9fb4d8', '#0b0f1a', 0.55));
    const moon = new THREE.DirectionalLight('#cfdcff', 1.6);
    moon.position.set(-12, 24, -8); moon.castShadow = true;
    moon.shadow.mapSize.set(2048, 2048);
    Object.assign(moon.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, near: 1, far: 70 });
    sc.add(moon);
    const warm = new THREE.PointLight('#ffcf8a', 40, 30, 1.6);
    warm.position.set(-11, 6, 12); sc.add(warm);

    // the table
    const table = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ map: groundTexture(7), roughness: 0.95 }));
    table.rotation.x = -Math.PI / 2; table.receiveShadow = true; sc.add(table);
    const board = new THREE.Mesh(planeUVs(new THREE.ShapeGeometry(roundedRect(31, 31, 0.8), 6)),
      new THREE.MeshStandardMaterial({ map: groundTexture(3, '#16203A', 1), roughness: 0.9 }));
    board.rotation.x = -Math.PI / 2; board.position.set(0, 0.01, 0); board.receiveShadow = true; sc.add(board);

    // the chapters' pictures
    const loader = new THREE.TextureLoader();
    for (const [k, [x, y, w, h]] of Object.entries(MAP.scenes)) {
      const tex = loader.load(IMAGES.chapters[k]);
      tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
      const geo = planeUVs(new THREE.ShapeGeometry(roundedRect(w * S, h * S, 0.4), 6));
      const pic = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, color: '#d9d9d9', toneMapped: false }));
      pic.rotation.x = -Math.PI / 2;
      pic.position.copy(toWorld([x + w / 2, y + h / 2], 0.03));
      sc.add(pic);
      const outer = roundedRect(w * S + 0.14, h * S + 0.14, 0.46);
      outer.holes.push(roundedRect(w * S, h * S, 0.4));
      const fr = new THREE.Mesh(new THREE.ShapeGeometry(outer, 6), new THREE.MeshStandardMaterial({ color: C.beige, roughness: 0.4, metalness: 0.2, transparent: true, opacity: 0.7 }));
      fr.rotation.x = -Math.PI / 2; fr.position.copy(toWorld([x + w / 2, y + h / 2], 0.035)); sc.add(fr);
      const lab = new CSS2DObject(labelEl(MAP.chapter_name[k], 'chapter'));
      lab.position.copy(toWorld(k === 'IV' ? [x + w - 30, y + 6] : [x + 26, y + 6], 0.1));
      sc.add(lab);
    }

    // the path
    const pts = catmull(MAP.waypoints, 24).map((p) => toWorld(p, 0.05));
    const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 600, 0.13, 8, false),
      new THREE.MeshStandardMaterial({ color: C.beige, emissive: C.beige, emissiveIntensity: 0.25, transparent: true, opacity: 0.28, roughness: 0.6 }));
    tube.scale.y = 0.25; sc.add(tube);
    const len = curve.getLength(), n = Math.floor(len / 0.34);
    const dash = new THREE.InstancedMesh(new THREE.BoxGeometry(0.17, 0.03, 0.05), new THREE.MeshBasicMaterial({ color: C.beige }), n);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < n; i++) {
      const u = i / n, p = curve.getPointAt(u), t = curve.getTangentAt(u);
      q.setFromAxisAngle(up, Math.atan2(-t.z, t.x));
      m4.compose(p.setY(0.08), q, new THREE.Vector3(1, 1, 1));
      dash.setMatrixAt(i, m4);
    }
    sc.add(dash);

    // the stones
    const plain = new THREE.MeshStandardMaterial({ color: '#EFE9CF', roughness: 0.5, metalness: 0.02 });
    const nightMat = new THREE.MeshPhysicalMaterial({ color: '#1B2A4A', roughness: 0.25, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.15 });
    const goldMat = new THREE.MeshStandardMaterial({ color: '#E9B65C', metalness: 1, roughness: 0.22, emissive: '#3a2600', emissiveIntensity: 0.4 });
    const roseMat = new THREE.MeshStandardMaterial({ color: '#C97880', metalness: 0.85, roughness: 0.3, emissive: '#2a0a0e', emissiveIntensity: 0.4 });
    const silverMat = new THREE.MeshStandardMaterial({ color: C.silver, metalness: 1, roughness: 0.18 });
    const sunMat = new THREE.MeshStandardMaterial({ color: C.hawkbit, metalness: 0.35, roughness: 0.35, emissive: '#5a3a00', emissiveIntensity: 0.5 });
    const ringGeo = new THREE.TorusGeometry(0.6, 0.065, 16, 64);
    const star = starTexture();
    this.stars = [];
    this.specialLabels = [];
    MAP.stones.forEach((p, i) => {
      const kind = i === 0 ? 'start' : i === END ? 'end' : kindOf(i);
      const big = kind === 'start' || kind === 'end';
      const r = big ? (kind === 'end' ? 0.86 : 0.78) : 0.52;
      const g = new THREE.Group();
      g.position.copy(toWorld(p, 0.04));
      const disc = new THREE.Mesh(stoneGeometry(r, 0.18), big ? sunMat : kind === 'night' ? nightMat : plain);
      disc.castShadow = true; disc.receiveShadow = true; g.add(disc);
      const face = new THREE.Mesh(new THREE.PlaneGeometry(r * 1.62, r * 1.62), new THREE.MeshBasicMaterial({
        map: big ? stoneFace(kind === 'start' ? 'START' : 'END', { ink: C.kuroi, size: kind === 'start' ? 62 : 84, small: kind === 'end' ? 'awake' : null })
          : stoneFace(String(i), { ink: kind === 'night' ? C.beige : C.prussian, moon: kind === 'night', size: i > 9 ? 118 : 140 }),
        transparent: true, toneMapped: false }));
      face.rotation.x = -Math.PI / 2; face.position.y = 0.185; g.add(face);
      if (kind === 'night' || kind === 'up' || kind === 'back') {
        const ring = new THREE.Mesh(ringGeo, kind === 'night' ? silverMat : kind === 'up' ? goldMat : roseMat);
        ring.rotation.x = -Math.PI / 2; ring.position.y = 0.12; ring.castShadow = true; g.add(ring);
      }
      if (kind === 'night') {
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: star, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
        s.scale.set(0.95, 0.95, 1); s.position.y = 1.05; g.add(s);
        this.stars.push({ s, phase: i });
      }
      if (kind === 'night' || kind === 'up' || kind === 'back') {
        const sp = SPECIALS[i];
        const html = kind === 'night' ? `<b>★ Night</b> · ${sp[1]}`
          : kind === 'up' ? `${sp[1]} · <b>up to stone ${sp[2]}</b>` : `${sp[1]} · <b>back to stone ${sp[2]}</b>`;
        const lab = new CSS2DObject(labelEl(html, kind));
        lab.userData.text = html.replace(/<[^>]+>/g, '');
        lab.userData.stone = i;
        g.add(lab);
        this.specialLabels.push(lab);
      }
      this.scene.add(g);
      this.stoneMeshes.push(g);
    });
    this.placeLabels();
    this.pulseSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
    this.pulseSprite.scale.set(2, 2, 1);
    sc.add(this.pulseSprite);
  }

  /** Each ring's label goes on the side of its stone with the most room: away from the other stones and labels. */
  placeLabels() {
    const stones = MAP.stones.map((p) => toWorld(p));
    const cam = this.camera.position, mid = this.controls.target;
    const placed = [];
    const clear = 0.68;                                       // a stone's radius and a margin
    for (const lab of this.specialLabels) {
      const c = stones[lab.userData.stone];
      const k = cam.distanceTo(c) / cam.distanceTo(mid);      // labels keep their pixel size: farther ones cover more board
      const hw = (0.088 * lab.userData.text.length + 0.4) * k, hh = 0.36 * k;
      const cands = [];
      for (const sx of [-1, 0, 1]) for (const sz of [-1, 0, 1]) {
        if (!sx && !sz) continue;
        for (const extra of [0, 0.45]) {
          const dx = sx ? sx * (hw + clear + extra) : 0, dz = sz ? sz * (hh + clear + extra) : 0;
          cands.push([sz && sx ? dx * 0.55 : dx, dz]);
        }
      }
      let best = null;
      for (const [dx, dz] of cands) {
        const x = c.x + dx, z = c.z + dz;
        let score = -Math.hypot(dx / (hw + 1), dz) * 0.5;
        stones.forEach((q, j) => {
          const ox = Math.max(0, Math.abs(q.x - x) - hw), oz = Math.max(0, Math.abs(q.z - z) - hh);
          const d = Math.hypot(ox, oz);
          if (d < clear) score -= (clear - d) * (j === lab.userData.stone ? 30 : 10);
        });
        for (const q of placed) {
          const ox = Math.max(0, Math.abs(q.x - x) - (hw + q.hw) - 0.15), oz = Math.max(0, Math.abs(q.z - z) - (hh + q.hh) - 0.1);
          if (ox === 0 && oz === 0) score -= 20;
        }
        if (!best || score > best.score) best = { score, x, z, hw, hh };
      }
      placed.push(best);
      lab.position.set(best.x - c.x, 0.25, best.z - c.z);
      // a leader from the label's near edge to the stone
      const ex = Math.max(-best.hw, Math.min(best.hw, c.x - best.x)), ez = Math.max(-best.hh, Math.min(best.hh, c.z - best.z));
      const from = new THREE.Vector3(best.x + ex, 0.2, best.z + ez), dir = c.clone().setY(0.2).sub(from);
      const to = from.clone().add(dir.multiplyScalar(Math.max(0, 1 - 0.6 / Math.max(0.01, dir.length()))));
      const kind = kindOf(lab.userData.stone);
      const col = kind === 'night' ? C.silver : kind === 'up' ? C.paleGold : C.rose;
      this.scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([from, to]),
        new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.7 })));
    }
  }

  stonePos(stone, slot = 0, count = 1) {
    const p = toWorld(MAP.stones[stone], 0.22);
    if (count > 1) p.x += (slot - (count - 1) / 2) * 0.42;
    return p;
  }

  setPlayers(players) {
    for (const t of this.tokens) this.scene.remove(t);
    this.tokens = players.map((p, i) => { const t = pawn(PLAYER_COLOURS[i]); t.scale.setScalar(1.55); this.scene.add(t); return t; });
    this.place(players);
  }

  place(players) {
    players.forEach((p, i) => {
      const same = players.filter((q) => q.stone === p.stone);
      this.tokens[i].position.copy(this.stonePos(p.stone, same.indexOf(p), same.length));
    });
  }

  async hop(i, path) {
    const t = this.tokens[i];
    for (const s of path) {
      const a = t.position.clone(), b = this.stonePos(s);
      this.follow = b;
      await tween(300, (u) => {
        const e = ease(u);
        t.position.set(lerp(a.x, b.x, e), lerp(a.y, b.y, e) + Math.sin(Math.PI * u) * 0.6, lerp(a.z, b.z, e));
      });
    }
  }

  async jump(i, to, kind) {
    const t = this.tokens[i];
    const a = t.position.clone(), b = this.stonePos(to);
    this.pulse(to, kind === 'up' ? '254,212,109' : '212,141,145');
    this.follow = b;
    const hgt = kind === 'up' ? 3.2 : 1.4;
    await tween(1300, (u) => {
      const e = ease(u);
      t.position.set(lerp(a.x, b.x, e), lerp(a.y, b.y, e) + Math.sin(Math.PI * u) * hgt, lerp(a.z, b.z, e));
      t.rotation.y = e * Math.PI * 2;
    });
    t.rotation.y = 0;
  }

  pulse(stone, rgb = '254,212,109') {
    this.pulseSprite.material.map = glowTexture(rgb);
    this.pulseSprite.position.copy(toWorld(MAP.stones[stone], 0.3));
    this.pulseT = performance.now();
  }

  focus(stone) { this.follow = stone == null ? null : toWorld(MAP.stones[stone], 0); }

  resize(w, h) {
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    this.labels.setSize(w, h);
    // back off on narrow screens so the whole board and its labels stay in view
    if (!this.homeDir) { this.homeDir = this.camera.position.clone().sub(this.controls.target); this.homeDist = this.homeDir.length(); this.homeDir.normalize(); }
    const tanH = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * this.camera.aspect;
    const d = Math.max(this.homeDist, 19.5 / tanH);
    this.camera.position.copy(this.controls.target).addScaledVector(this.homeDir, d);
  }

  render(now) {
    for (const { s, phase } of this.stars) s.position.y = 1.05 + Math.sin(now / 600 + phase) * 0.08;
    if (this.pulseT) {
      const u = (now - this.pulseT) / 1800;
      if (u > 1) { this.pulseT = 0; this.pulseSprite.material.opacity = 0; } else {
        const k = (u * 3) % 1;
        this.pulseSprite.material.opacity = 0.9 * (1 - k);
        this.pulseSprite.scale.setScalar(1.2 + k * 2.4);
      }
    }
    if (this.follow) {
      const want = new THREE.Vector3().lerpVectors(this.home.target, this.follow, 0.32);
      this.controls.target.lerp(want, 0.05);
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this.labels.render(this.scene, this.camera);
  }

  show(on) { this.labels.domElement.style.display = on ? '' : 'none'; }
}
