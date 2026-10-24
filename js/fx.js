// Small helpers shared by the boards: tweens, a seeded random, canvas textures, the board palette.
import * as THREE from 'three';

export const C = {
  prussian: '#1C2F4D', kuroi: '#131521', beige: '#F7F4D5', paleGold: '#F4D894', hawkbit: '#FED46D',
  rose: '#D48D91', seaMist: '#B3DCD6', blueDust: '#93AEBF', lilac: '#B6A4D8', teal: '#3E9E9B', silver: '#D7DEE8',
};
export const PLAYER_COLOURS = ['#4FB8B3', '#C4A8F0'];

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms * (window.SPEED || 1)));
export const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const lerp = (a, b, t) => a + (b - a) * t;

/** Runs fn(t) for t in 0..1 over ms milliseconds; resolves when done. */
export function tween(ms, fn) {
  ms *= window.SPEED || 1;
  return new Promise((resolve) => {
    const t0 = performance.now();
    function step(now) {
      const t = Math.min(1, (now - t0) / ms);
      fn(t);
      if (t < 1) requestAnimationFrame(step); else resolve();
    }
    requestAnimationFrame(step);
  });
}

export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The uniform Catmull-Rom of build_layers.py, so the path passes through the printed stones. */
export function catmull(pts, n = 24) {
  const out = [];
  const p = [pts[0], ...pts, pts[pts.length - 1]];
  for (let i = 1; i < p.length - 2; i++) {
    const [p0, p1, p2, p3] = [p[i - 1], p[i], p[i + 1], p[i + 2]];
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map((j) => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2
        + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)));
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

export function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** A dark paper ground with a faint grain and a few specks of starlight. */
export function groundTexture(seed, base = '#141B2E', specks = 0.6) {
  const r = rng(seed);
  return canvasTexture(1024, 1024, (g, w, h) => {
    const grd = g.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, w * 0.7);
    grd.addColorStop(0, '#1D2944'); grd.addColorStop(1, base);
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    const img = g.getImageData(0, 0, w, h);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = (r() - 0.5) * 14;
      img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n;
    }
    g.putImageData(img, 0, 0);
    for (let i = 0; i < 900 * specks; i++) {
      g.fillStyle = `rgba(247,244,213,${0.05 + r() * 0.18})`;
      g.fillRect(r() * w, r() * h, 1 + r() * 1.5, 1 + r() * 1.5);
    }
  });
}

/** A stone's face: its number, and a moon for a night stone. */
export function stoneFace(text, { ink = C.prussian, moon = false, small = null, size = 150 } = {}) {
  return canvasTexture(256, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    if (moon) {
      g.fillStyle = 'rgba(254,212,109,0.95)';
      g.beginPath(); g.arc(w * 0.5, h * 0.5, w * 0.36, 0, Math.PI * 2); g.fill();
      g.globalCompositeOperation = 'destination-out';
      g.beginPath(); g.arc(w * 0.62, h * 0.42, w * 0.31, 0, Math.PI * 2); g.fill();
      g.globalCompositeOperation = 'source-over';
    }
    g.fillStyle = ink;
    g.font = `700 ${size}px "Inter", "Helvetica Neue", Arial, sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, w / 2 + (moon ? -18 : 0), h / 2 + 8);
    if (small) {
      g.font = '600 46px "Inter", "Helvetica Neue", Arial, sans-serif';
      g.fillText(small, w / 2, h * 0.8);
    }
  });
}

export function starTexture() {
  return canvasTexture(128, 128, (g, w, h) => {
    const grd = g.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2);
    grd.addColorStop(0, 'rgba(255,240,190,0.95)'); grd.addColorStop(0.35, 'rgba(254,212,109,0.35)'); grd.addColorStop(1, 'rgba(254,212,109,0)');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    g.fillStyle = '#FFF4CF';
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? 11 : 28;
      g.lineTo(w / 2 + Math.cos(a) * rr, h / 2 + Math.sin(a) * rr);
    }
    g.closePath(); g.fill();
  });
}

export function glowTexture(colour = '254,212,109') {
  return canvasTexture(128, 128, (g, w, h) => {
    const grd = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    grd.addColorStop(0, `rgba(${colour},0.9)`); grd.addColorStop(0.4, `rgba(${colour},0.25)`); grd.addColorStop(1, `rgba(${colour},0)`);
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
  });
}

/** Lit windows for the night town's blocks. */
export function windowsTexture(seed) {
  const r = rng(seed);
  return canvasTexture(128, 256, (g, w, h) => {
    g.fillStyle = '#10131d'; g.fillRect(0, 0, w, h);
    for (let y = 8; y < h - 8; y += 22) {
      for (let x = 8; x < w - 8; x += 20) {
        const lit = r() < 0.32;
        g.fillStyle = lit ? `rgba(255,${190 + r() * 40},${110 + r() * 50},${0.75 + r() * 0.25})` : 'rgba(40,46,64,0.9)';
        g.fillRect(x, y, 11, 14);
      }
    }
  });
}

/** A chess-pawn token for a player, in their colour. */
export function pawn(colour) {
  const prof = [[0, 0], [0.3, 0], [0.31, 0.06], [0.24, 0.1], [0.15, 0.2], [0.1, 0.48], [0.17, 0.52], [0.1, 0.56], [0, 0.56]]
    .map(([x, y]) => new THREE.Vector2(x, y));
  const body = new THREE.Mesh(new THREE.LatheGeometry(prof, 32),
    new THREE.MeshPhysicalMaterial({ color: colour, roughness: 0.32, metalness: 0.05, clearcoat: 0.8, emissive: colour, emissiveIntensity: 0.18 }));
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 32, 16), body.material);
  head.position.y = 0.66;
  const g = new THREE.Group();
  g.add(body, head);
  g.traverse((m) => { m.castShadow = true; });
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(hexToRgb(colour)), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.55 }));
  halo.scale.set(1.3, 1.3, 1); halo.position.y = 0.35;
  g.add(halo);
  return g;
}

export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}

/** A label that floats over the board (CSS2DRenderer). */
export function labelEl(html, cls) {
  const d = document.createElement('div');
  d.className = 'tag ' + (cls || '');
  d.innerHTML = html;
  return d;
}
