// High-fidelity procedural billboard sprites for Kerala household objects.
// Rendered at 2x resolution (96x144, 88x120, etc.) with volumetric shadows,
// soft lighting highlights, ambient occlusion, and authentic materials.

export interface Spr {
  w: number;
  h: number;
  data: Uint32Array;
}

type Ctx = CanvasRenderingContext2D;

function spr(w: number, h: number, draw: (c: Ctx) => void): Spr {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const c = cv.getContext('2d')!;
  c.imageSmoothingEnabled = true;
  draw(c);
  const d = c.getImageData(0, 0, w, h);
  return { w, h, data: new Uint32Array(d.data.buffer) };
}

function rr(c: Ctx, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath();
  c.roundRect(x, y, w, h, r);
  c.fill();
}

function glow(c: Ctx, x: number, y: number, r: number, col: string, a = 0.55) {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, col);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  c.save();
  c.globalAlpha = a;
  c.globalCompositeOperation = 'lighter';
  c.fillStyle = g;
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

function flame(c: Ctx, x: number, y: number, s: number) {
  glow(c, x, y, s * 4.5, 'rgba(255,180,60,0.85)', 0.85);
  // Outer orange glow
  const g1 = c.createRadialGradient(x, y + s * 0.8, 0, x, y + s * 0.5, s * 2.8);
  g1.addColorStop(0, 'rgba(255,248,220,1)');
  g1.addColorStop(0.35, 'rgba(255,200,60,0.9)');
  g1.addColorStop(0.75, 'rgba(245,110,20,0.4)');
  g1.addColorStop(1, 'rgba(230,60,10,0)');
  c.fillStyle = g1;
  c.beginPath();
  c.ellipse(x, y + s * 0.3, s * 0.9, s * 2.4, 0, 0, Math.PI * 2);
  c.fill();

  // Inner white-hot wick core
  const g2 = c.createRadialGradient(x, y + s * 0.8, 0, x, y + s * 0.8, s * 1.0);
  g2.addColorStop(0, '#ffffff');
  g2.addColorStop(0.8, '#fff4cc');
  g2.addColorStop(1, 'rgba(255,240,180,0)');
  c.fillStyle = g2;
  c.beginPath();
  c.ellipse(x, y + s * 0.7, s * 0.45, s * 1.1, 0, 0, Math.PI * 2);
  c.fill();
}

function groundShadow(c: Ctx, cx: number, cy: number, rx: number, ry: number) {
  const g = c.createRadialGradient(cx, cy, 0, cx, cy, rx);
  g.addColorStop(0, 'rgba(10, 6, 4, 0.65)');
  g.addColorStop(0.6, 'rgba(15, 8, 5, 0.35)');
  g.addColorStop(1, 'rgba(0, 0, 0, 0)');
  c.fillStyle = g;
  c.beginPath();
  c.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  c.fill();
}

// ------------------------------------------------------------------- CHORE STATIONS

// Ornate multi-tier Brass Nilavilakku (Traditional Kerala Standing Lamp)
const lamp = (lit = true) =>
  spr(96, 144, (c) => {
    // Contact drop shadow on polished floor
    groundShadow(c, 48, 138, 38, 6);

    // Multi-stepped circular brass base (Aadaram)
    const brassGrad = (x0: number, x1: number) => {
      const g = c.createLinearGradient(x0, 0, x1, 0);
      g.addColorStop(0, '#5a3d10');
      g.addColorStop(0.2, '#9a7124');
      g.addColorStop(0.45, '#ffd978');
      g.addColorStop(0.7, '#c99634');
      g.addColorStop(1, '#4a300a');
      return g;
    };

    c.fillStyle = brassGrad(20, 76);
    rr(c, 24, 126, 48, 12, 5);
    c.fillStyle = brassGrad(28, 68);
    rr(c, 30, 118, 36, 10, 4);

    // Fluted central stem (Thandu)
    c.fillStyle = brassGrad(42, 54);
    c.fillRect(43, 62, 10, 58);
    // Lathed brass rings (Mani)
    for (const y of [74, 92, 108]) {
      c.fillStyle = brassGrad(38, 58);
      rr(c, 40, y, 16, 7, 3);
    }

    // Lower oil plate (Thattu)
    c.fillStyle = brassGrad(16, 80);
    c.beginPath();
    c.ellipse(48, 64, 32, 10, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#2d1b06';
    c.beginPath();
    c.ellipse(48, 62, 28, 7, 0, 0, Math.PI * 2);
    c.fill();

    // Upper oil bowl (Thiri-thattu)
    c.fillStyle = brassGrad(12, 84);
    c.beginPath();
    c.moveTo(12, 48);
    c.lineTo(84, 48);
    c.lineTo(66, 60);
    c.lineTo(30, 60);
    c.closePath();
    c.fill();

    // Sacred oil reservoir inside
    c.fillStyle = '#6a4a12';
    c.beginPath();
    c.ellipse(48, 48, 35, 8, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#c89528';
    c.beginPath();
    c.ellipse(48, 48, 30, 5, 0, 0, Math.PI * 2);
    c.fill();

    // Top pinnacle crown (Makutam / Annapakshi)
    c.fillStyle = brassGrad(43, 53);
    c.fillRect(45, 26, 6, 20);
    c.beginPath();
    c.moveTo(48, 14);
    c.lineTo(54, 28);
    c.lineTo(42, 28);
    c.closePath();
    c.fill();

    // Five glowing sacred wicks (Pancha-thiri) with realistic flickering flames
    if (lit) {
      flame(c, 16, 40, 5.5);
      flame(c, 32, 38, 6.0);
      flame(c, 48, 36, 6.5);
      flame(c, 64, 38, 6.0);
      flame(c, 80, 40, 5.5);
    }
  });

// Brass & Chrome outdoor pipe with brass bib-tap (Taps)
const tap = (leaking = true) =>
  spr(88, 120, (c) => {
    groundShadow(c, 44, 115, 26, 5);

    // Wall mounting flange
    c.fillStyle = '#4a5568';
    rr(c, 16, 8, 56, 18, 4);
    c.fillStyle = '#94a3b8';
    rr(c, 20, 10, 48, 7, 3);

    // Vertical riser pipe with brushed metal gradient
    const pipeGrad = c.createLinearGradient(34, 0, 54, 0);
    pipeGrad.addColorStop(0, '#475569');
    pipeGrad.addColorStop(0.35, '#cbd5e1');
    pipeGrad.addColorStop(0.65, '#f1f5f9');
    pipeGrad.addColorStop(1, '#334155');
    c.fillStyle = pipeGrad;
    rr(c, 36, 22, 16, 38, 4);

    // Cast brass tap body
    const brassGrad = c.createLinearGradient(20, 0, 68, 0);
    brassGrad.addColorStop(0, '#785214');
    brassGrad.addColorStop(0.3, '#d4a237');
    brassGrad.addColorStop(0.6, '#ffe188');
    brassGrad.addColorStop(1, '#5a3d0f');
    c.fillStyle = brassGrad;
    rr(c, 28, 54, 32, 18, 5);

    // Spout nozzle curved downward
    c.fillStyle = brassGrad;
    c.beginPath();
    c.moveTo(34, 68);
    c.lineTo(24, 88);
    c.lineTo(36, 88);
    c.lineTo(44, 68);
    c.closePath();
    c.fill();

    // Red valve wheel handle on top
    c.fillStyle = '#dc2626';
    c.beginPath();
    c.ellipse(64, 48, 14, 5, 0, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = '#991b1b';
    c.lineWidth = 3;
    c.stroke();
    c.fillStyle = '#b91c1c';
    c.beginPath();
    c.arc(64, 48, 4, 0, Math.PI * 2);
    c.fill();

    // Realistic water drips and splash rings
    if (!leaking) return;
    c.fillStyle = 'rgba(180, 225, 255, 0.88)';
    c.beginPath();
    c.ellipse(30, 94, 3.5, 7, 0, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.ellipse(30, 108, 2.5, 4, 0, 0, Math.PI * 2);
    c.fill();

    // Water puddle ripple on ground
    c.strokeStyle = 'rgba(140, 210, 255, 0.6)';
    c.lineWidth = 1.8;
    c.beginPath();
    c.ellipse(30, 114, 16, 4, 0, 0, Math.PI * 2);
    c.stroke();
  });

// Traditional Kerala draw well (Kinar) with laterite stone parapet and wooden pulley (Kappi)
const well = () =>
  spr(140, 150, (c) => {
    groundShadow(c, 70, 142, 60, 9);

    // Circular granite / laterite stone well curb (Kinaar-aalthara)
    c.fillStyle = '#423c38';
    c.beginPath();
    c.ellipse(70, 126, 62, 22, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#7a7066';
    c.beginPath();
    c.ellipse(70, 120, 62, 22, 0, 0, Math.PI * 2);
    c.fill();

    // Well shaft interior (deep aquatic reflection)
    const shaftGrad = c.createRadialGradient(70, 120, 4, 70, 120, 48);
    shaftGrad.addColorStop(0, '#0c242b');
    shaftGrad.addColorStop(0.7, '#07161b');
    shaftGrad.addColorStop(1, '#02090b');
    c.fillStyle = shaftGrad;
    c.beginPath();
    c.ellipse(70, 120, 48, 15, 0, 0, Math.PI * 2);
    c.fill();

    // Water surface glimmer down in the well
    c.fillStyle = 'rgba(100, 200, 220, 0.45)';
    c.beginPath();
    c.ellipse(66, 120, 22, 6, 0, 0, Math.PI * 2);
    c.fill();

    // Individual dressed stone blocks on curb with moss
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const sx = 70 + Math.cos(a) * 54;
      const sy = 120 + Math.sin(a) * 18;
      c.fillStyle = (i % 3 === 0) ? '#5c6e48' : '#8c8074';
      c.beginPath();
      c.ellipse(sx, sy, 7, 4, 0, 0, Math.PI * 2);
      c.fill();
    }

    // Heavy teak wood pulley gallows frame (Kappi thoonu)
    const woodGrad = c.createLinearGradient(20, 0, 120, 0);
    woodGrad.addColorStop(0, '#422814');
    woodGrad.addColorStop(0.5, '#784620');
    woodGrad.addColorStop(1, '#341f10');
    c.strokeStyle = woodGrad;
    c.lineWidth = 10;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(26, 134);
    c.lineTo(26, 28);
    c.lineTo(114, 28);
    c.lineTo(114, 134);
    c.stroke();

    // Pulley wheel (Kappi) in center
    c.fillStyle = '#22160d';
    c.beginPath();
    c.arc(70, 38, 15, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#6b4823';
    c.beginPath();
    c.arc(70, 38, 12, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#d4af37'; // Brass axle
    c.beginPath();
    c.arc(70, 38, 4, 0, Math.PI * 2);
    c.fill();

    // Coir rope hanging down (Kayaru)
    c.strokeStyle = '#c2a265';
    c.lineWidth = 3.5;
    c.beginPath();
    c.moveTo(70, 48);
    c.lineTo(70, 85);
    c.stroke();

    // Wood / brass water bucket suspended over well
    c.fillStyle = '#8f5223';
    rr(c, 56, 85, 28, 22, 4);
    c.fillStyle = '#d4a342';
    rr(c, 56, 85, 28, 4, 2);
    rr(c, 56, 102, 28, 4, 2);
    c.strokeStyle = '#2d1b06';
    c.lineWidth = 2.5;
    c.beginPath();
    c.arc(70, 85, 12, Math.PI, 0);
    c.stroke();
  });

// Traditional Kerala firewood chulha (Aduppu) with simmering tea kettle
const stove = () =>
  spr(100, 92, (c) => {
    groundShadow(c, 50, 86, 42, 6);

    // Clay stove mound with charcoal weathering
    const clayGrad = c.createLinearGradient(10, 0, 90, 0);
    clayGrad.addColorStop(0, '#6e3820');
    clayGrad.addColorStop(0.4, '#a85834');
    clayGrad.addColorStop(0.8, '#c26a42');
    clayGrad.addColorStop(1, '#542614');
    c.fillStyle = clayGrad;
    rr(c, 8, 42, 84, 44, 10);

    // Fire mouth cavity
    c.fillStyle = '#1c0d08';
    c.beginPath();
    c.ellipse(32, 68, 18, 14, 0, 0, Math.PI * 2);
    c.fill();

    // Glowing firewood embers inside
    c.fillStyle = '#ff4a1c';
    c.beginPath();
    c.ellipse(32, 74, 12, 6, 0, 0, Math.PI * 2);
    c.fill();
    flame(c, 32, 64, 6.0);

    // Stainless steel / aluminium Chai kettle
    const kettleGrad = c.createLinearGradient(48, 0, 88, 0);
    kettleGrad.addColorStop(0, '#64748b');
    kettleGrad.addColorStop(0.3, '#cbd5e1');
    kettleGrad.addColorStop(0.6, '#f8fafc');
    kettleGrad.addColorStop(1, '#475569');
    c.fillStyle = kettleGrad;
    rr(c, 50, 16, 36, 32, 8);

    // Kettle lid and handle
    c.fillStyle = '#e2e8f0';
    c.beginPath();
    c.ellipse(68, 16, 14, 5, 0, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = '#334155';
    c.lineWidth = 4;
    c.beginPath();
    c.arc(68, 16, 16, Math.PI, 0);
    c.stroke();

    // Spout with rising steam
    c.fillStyle = kettleGrad;
    c.beginPath();
    c.moveTo(86, 26);
    c.lineTo(96, 14);
    c.lineTo(94, 20);
    c.lineTo(86, 36);
    c.closePath();
    c.fill();

    // Wispy aromatic steam puffs
    c.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    c.lineWidth = 2.5;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(96, 12);
    c.quadraticCurveTo(90, 4, 98, -4);
    c.moveTo(98, 14);
    c.quadraticCurveTo(104, 6, 100, -2);
    c.stroke();
  });

// Antique Kerala electric main switchboard (KSEB Porcelain Cutout Fuse)
const fuse = () =>
  spr(72, 92, (c) => {
    // Teak wooden backboard with bevel
    c.fillStyle = '#543016';
    rr(c, 6, 8, 60, 76, 6);
    c.fillStyle = '#8a5028';
    rr(c, 10, 12, 52, 68, 4);

    // White ceramic / porcelain fuse carriers (Kit-Kat fuses)
    const ceramicGrad = c.createLinearGradient(16, 0, 56, 0);
    ceramicGrad.addColorStop(0, '#cbd5e1');
    ceramicGrad.addColorStop(0.3, '#ffffff');
    ceramicGrad.addColorStop(0.7, '#f1f5f9');
    ceramicGrad.addColorStop(1, '#94a3b8');

    c.fillStyle = ceramicGrad;
    rr(c, 16, 20, 18, 38, 4);
    rr(c, 38, 20, 18, 38, 4);

    // Brass screw terminals & fuse grip handles
    c.fillStyle = '#d4af37';
    c.beginPath();
    c.arc(25, 26, 3.5, 0, Math.PI * 2);
    c.arc(25, 52, 3.5, 0, Math.PI * 2);
    c.arc(47, 26, 3.5, 0, Math.PI * 2);
    c.arc(47, 52, 3.5, 0, Math.PI * 2);
    c.fill();

    // Red trip indicator lamp
    c.fillStyle = '#ef4444';
    c.beginPath();
    c.arc(36, 70, 5, 0, Math.PI * 2);
    c.fill();
    glow(c, 36, 70, 14, 'rgba(239, 68, 68, 0.8)', 0.75);
  });

// Lakshmi the native Kasaragod Dwarf cow (Nadan Pasu)
const cow = () =>
  spr(130, 96, (c) => {
    groundShadow(c, 68, 90, 52, 7);

    // Legs with hooves
    c.fillStyle = '#ded7cc';
    for (const lx of [28, 42, 80, 94]) {
      c.fillRect(lx, 56, 8, 32);
      c.fillStyle = '#3a342c'; // Dark hooves
      c.fillRect(lx, 84, 8, 5);
      c.fillStyle = '#ded7cc';
    }

    // Volumetric body with warm brown patches
    const bodyGrad = c.createLinearGradient(20, 0, 110, 0);
    bodyGrad.addColorStop(0, '#f2ede4');
    bodyGrad.addColorStop(0.5, '#fffbf5');
    bodyGrad.addColorStop(1, '#e8e2d5');
    c.fillStyle = bodyGrad;
    rr(c, 24, 26, 86, 42, 18);

    // Rich reddish-brown spots (typical of Vechur / Kasaragod breed)
    c.fillStyle = '#8a5232';
    c.beginPath();
    c.ellipse(50, 38, 20, 14, 0.2, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.ellipse(85, 46, 16, 12, -0.3, 0, Math.PI * 2);
    c.fill();

    // Hump (Thimil)
    c.fillStyle = '#eee8dc';
    c.beginPath();
    c.ellipse(36, 24, 12, 10, 0, 0, Math.PI * 2);
    c.fill();

    // Head, soft muzzle and friendly eyes
    c.fillStyle = '#f7f2ea';
    rr(c, 6, 18, 32, 34, 12);
    c.fillStyle = '#f5c6c0'; // Soft pink nose
    rr(c, 8, 36, 24, 14, 6);
    c.fillStyle = '#221a14'; // Large gentle eye
    c.beginPath();
    c.ellipse(18, 26, 4, 5, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.arc(17, 24, 1.5, 0, Math.PI * 2);
    c.fill();

    // Curved crescent horns (Kombu) with brass tips
    c.strokeStyle = '#7c7365';
    c.lineWidth = 4.5;
    c.beginPath();
    c.moveTo(14, 18);
    c.quadraticCurveTo(8, 6, 18, 4);
    c.stroke();
    c.fillStyle = '#d4af37';
    c.beginPath();
    c.arc(18, 4, 3.5, 0, Math.PI * 2);
    c.fill();

    // Tail swishing
    c.strokeStyle = '#ded7cc';
    c.lineWidth = 3.5;
    c.beginPath();
    c.moveTo(110, 36);
    c.quadraticCurveTo(124, 54, 118, 74);
    c.stroke();
    c.fillStyle = '#3a342c';
    c.beginPath();
    c.ellipse(118, 76, 5, 8, 0.4, 0, Math.PI * 2);
    c.fill();
  });

// Fallen coconut leaves and dry courtyard foliage (Choolu / Pattal)
const leafpile = () =>
  spr(100, 60, (c) => {
    groundShadow(c, 50, 54, 46, 6);

    for (let i = 0; i < 14; i++) {
      const angle = -Math.PI * 0.95 + (i / 13) * Math.PI * 0.9;
      c.save();
      c.translate(50, 50);
      c.rotate(angle);
      const leafGrad = c.createLinearGradient(0, 0, 42, 0);
      leafGrad.addColorStop(0, '#54421b');
      leafGrad.addColorStop(0.5, i % 2 ? '#b89438' : '#829132');
      leafGrad.addColorStop(1, '#443516');
      c.fillStyle = leafGrad;
      c.beginPath();
      c.ellipse(22, 0, 24, 7, 0, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = 'rgba(40, 30, 10, 0.6)';
      c.lineWidth = 1.4;
      c.beginPath();
      c.moveTo(2, 0);
      c.lineTo(44, 0);
      c.stroke();
      c.restore();
    }
  });

// Flowering Hibiscus & Jasmine terracotta pots
const plants = () =>
  spr(72, 88, (c) => {
    groundShadow(c, 36, 82, 30, 5);

    // Terracotta pot (Chatti)
    const potGrad = c.createLinearGradient(14, 0, 58, 0);
    potGrad.addColorStop(0, '#7c3a1e');
    potGrad.addColorStop(0.4, '#c25e30');
    potGrad.addColorStop(1, '#542614');
    c.fillStyle = potGrad;
    rr(c, 18, 54, 36, 28, 4);
    c.fillStyle = '#d9703e';
    rr(c, 14, 50, 44, 8, 3);

    // Lush deep green leaves
    for (let i = 0; i < 11; i++) {
      const a = -Math.PI * 0.85 + (i / 10) * Math.PI * 0.7;
      c.strokeStyle = (i % 2 === 0) ? '#2e6b26' : '#4d9c38';
      c.lineWidth = 4;
      c.beginPath();
      c.moveTo(36, 52);
      c.quadraticCurveTo(36 + Math.cos(a) * 14, 52 + Math.sin(a) * 20, 36 + Math.cos(a) * 26, 52 + Math.sin(a) * 34);
      c.stroke();
    }

    // Radiant red Chembarathi (Hibiscus) flower in bloom
    const petals = 5;
    for (let p = 0; p < petals; p++) {
      const a = (p / petals) * Math.PI * 2;
      c.fillStyle = '#e11d48';
      c.beginPath();
      c.ellipse(36 + Math.cos(a) * 7, 24 + Math.sin(a) * 7, 6.5, 6.5, 0, 0, Math.PI * 2);
      c.fill();
    }
    // Golden stamen column
    c.fillStyle = '#facc15';
    c.beginPath();
    c.arc(36, 24, 3.5, 0, Math.PI * 2);
    c.fill();
  });

// ------------------------------------------------------------------- ITEMS & TOOLS

// Traditional coconut midrib broom (Eerkili choolu)
const broom = () =>
  spr(56, 96, (c) => {
    groundShadow(c, 28, 92, 20, 4);

    // Bound wooden handle
    c.strokeStyle = '#6e4420';
    c.lineWidth = 6;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(32, 6);
    c.lineTo(26, 50);
    c.stroke();

    // Natural coconut leaf rib bristles (Eerkil)
    const bristleGrad = c.createLinearGradient(8, 0, 48, 0);
    bristleGrad.addColorStop(0, '#8c702a');
    bristleGrad.addColorStop(0.5, '#d4b04a');
    bristleGrad.addColorStop(1, '#6b541d');
    c.fillStyle = bristleGrad;
    c.beginPath();
    c.moveTo(10, 50);
    c.lineTo(42, 50);
    c.lineTo(50, 90);
    c.lineTo(4, 90);
    c.closePath();
    c.fill();

    // Red coir cord binding
    c.fillStyle = '#b91c1c';
    rr(c, 10, 48, 32, 8, 3);
  });

// Galvanised heavy steel / plastic water bucket (Bakkettu)
const bucket = () =>
  spr(68, 68, (c) => {
    groundShadow(c, 34, 64, 28, 5);

    // Arched metal handle
    c.strokeStyle = '#475569';
    c.lineWidth = 4;
    c.beginPath();
    c.arc(34, 26, 20, Math.PI, 0);
    c.stroke();

    // Bold Kerala crimson-red bucket body
    const redGrad = c.createLinearGradient(10, 0, 58, 0);
    redGrad.addColorStop(0, '#991b1b');
    redGrad.addColorStop(0.3, '#dc2626');
    redGrad.addColorStop(0.65, '#ef4444');
    redGrad.addColorStop(1, '#7f1d1d');
    c.fillStyle = redGrad;
    c.beginPath();
    c.moveTo(10, 26);
    c.lineTo(58, 26);
    c.lineTo(52, 62);
    c.lineTo(16, 62);
    c.closePath();
    c.fill();

    // White gloss highlight
    c.fillStyle = 'rgba(255, 255, 255, 0.4)';
    rr(c, 18, 34, 7, 20, 3);
  });

// Matchbox (Theepetti - Shippy brand tribute)
const matchbox = () =>
  spr(64, 46, (c) => {
    groundShadow(c, 32, 42, 24, 4);

    c.fillStyle = '#1e40af';
    rr(c, 6, 10, 52, 28, 4);
    c.fillStyle = '#f59e0b';
    rr(c, 6, 10, 52, 12, 3);
    c.fillStyle = '#dc2626';
    rr(c, 12, 24, 40, 10, 3);

    c.fillStyle = '#ffffff';
    c.font = 'bold 10px sans-serif';
    c.fillText('SHIPPY', 14, 20);

    // Matchstick with phosphorous tip
    c.strokeStyle = '#e2d4b7';
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(36, 38);
    c.lineTo(56, 38);
    c.stroke();
    c.fillStyle = '#7c2d12';
    c.beginPath();
    c.ellipse(57, 38, 4, 3, 0, 0, Math.PI * 2);
    c.fill();
  });

// Heavy cast steel plumbing spanner (Wrench)
const wrench = () =>
  spr(72, 42, (c) => {
    groundShadow(c, 36, 38, 30, 4);

    const metal = c.createLinearGradient(12, 0, 60, 0);
    metal.addColorStop(0, '#64748b');
    metal.addColorStop(0.4, '#e2e8f0');
    metal.addColorStop(1, '#475569');
    c.fillStyle = metal;
    rr(c, 12, 16, 48, 10, 4);

    // C-jaw head
    c.beginPath();
    c.arc(16, 21, 12, 0.6, Math.PI * 1.7);
    c.fill();
    c.beginPath();
    c.arc(56, 21, 10, -1.2, 1.6);
    c.fill();
  });

// Fresh lush green grass bundle for Lakshmi the cow (Pullu kettu)
const grass = () =>
  spr(68, 54, (c) => {
    groundShadow(c, 34, 50, 30, 5);

    for (let i = 0; i < 24; i++) {
      const x = 10 + i * 2.2;
      c.strokeStyle = (i % 3 === 0) ? '#4d9c38' : (i % 3 === 1) ? '#65b842' : '#327824';
      c.lineWidth = 3.2;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(x, 46);
      c.quadraticCurveTo(x + 4, 26, x + 12 - i * 0.4, 8 + (i % 5) * 4);
      c.stroke();
    }
    // Coir tie
    c.fillStyle = '#854d0e';
    rr(c, 14, 40, 40, 8, 4);
  });

// ------------------------------------------------------------------- DECOR

// Sacred Tulsi Thara (Altar shrine in central courtyard)
const tulsi = () =>
  spr(64, 88, (c) => {
    groundShadow(c, 32, 84, 28, 6);

    // Carved laterite and granite masonry base (Thara)
    const stone = c.createLinearGradient(10, 0, 54, 0);
    stone.addColorStop(0, '#9e9484');
    stone.addColorStop(0.5, '#d6ccba');
    stone.addColorStop(1, '#82786a');
    c.fillStyle = stone;
    rr(c, 10, 58, 44, 26, 4);
    c.fillStyle = '#ede5d4';
    rr(c, 6, 52, 52, 9, 3);
    c.fillStyle = '#b8ad9a';
    rr(c, 22, 40, 20, 14, 3);

    // Holy Krishna Tulsi plant with purple-green leaves and floral spikes (Manjari)
    for (let i = 0; i < 14; i++) {
      const a = -Math.PI * 0.85 + (i / 13) * Math.PI * 0.7;
      c.strokeStyle = (i % 2 === 0) ? '#2d5a27' : '#582c4d';
      c.lineWidth = 3.5;
      c.beginPath();
      c.moveTo(32, 42);
      c.quadraticCurveTo(32 + Math.cos(a) * 12, 42 + Math.sin(a) * 16, 32 + Math.cos(a) * 20, 22 + Math.sin(a) * 16);
      c.stroke();
    }
  });

// Grand banana tree with heavy drooping leaves
const bananaPlant = () =>
  spr(96, 120, (c) => {
    groundShadow(c, 48, 114, 36, 6);

    // Thick trunk
    c.fillStyle = '#65a33c';
    c.fillRect(44, 76, 10, 38);

    // Broad tropical leaves radiating outward
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI * 0.9 + (i / 8) * Math.PI * 0.8;
      c.save();
      c.translate(48, 80);
      c.rotate(a + Math.PI / 2);
      const leafGrad = c.createLinearGradient(0, 0, 50, 0);
      leafGrad.addColorStop(0, '#2b6e22');
      leafGrad.addColorStop(0.6, '#62b53e');
      leafGrad.addColorStop(1, '#9ee65a');
      c.fillStyle = leafGrad;
      c.beginPath();
      c.moveTo(0, 0);
      c.quadraticCurveTo(30, -16, 52, 0);
      c.quadraticCurveTo(30, 12, 0, 0);
      c.fill();
      c.restore();
    }
  });

// Terracotta water urn (Kulam / Bharani)
const clayPot = () =>
  spr(48, 54, (c) => {
    groundShadow(c, 24, 50, 18, 4);

    const potGrad = c.createRadialGradient(20, 26, 4, 24, 30, 20);
    potGrad.addColorStop(0, '#f97316');
    potGrad.addColorStop(0.5, '#c2410c');
    potGrad.addColorStop(1, '#7c2d12');
    c.fillStyle = potGrad;
    c.beginPath();
    c.ellipse(24, 32, 18, 18, 0, 0, Math.PI * 2);
    c.fill();

    // Pot mouth rim
    c.fillStyle = '#ea580c';
    c.beginPath();
    c.ellipse(24, 14, 13, 5, 0, 0, Math.PI * 2);
    c.fill();
  });

// Kerala veranda wooden armchair (Charu kasera)
const chair = () =>
  spr(56, 80, (c) => {
    groundShadow(c, 28, 76, 24, 5);

    c.fillStyle = '#5c3314';
    c.fillRect(10, 42, 6, 34);
    c.fillRect(40, 42, 6, 34);
    c.fillRect(10, 24, 6, 22);
    c.fillRect(40, 24, 6, 22);

    const seat = c.createLinearGradient(6, 0, 50, 0);
    seat.addColorStop(0, '#78431b');
    seat.addColorStop(0.5, '#b46e32');
    seat.addColorStop(1, '#5c3314');
    c.fillStyle = seat;
    rr(c, 6, 38, 44, 8, 3);
    rr(c, 10, 8, 36, 28, 5);
  });

// Floating golden goal objective beacon (Kerala temple lamp flame marker)
const marker = () =>
  spr(64, 80, (c) => {
    glow(c, 32, 42, 30, 'rgba(255, 215, 80, 0.95)', 0.9);

    c.fillStyle = 'rgba(255, 245, 180, 0.98)';
    c.beginPath();
    c.moveTo(32, 70);
    c.lineTo(16, 44);
    c.lineTo(26, 44);
    c.lineTo(26, 20);
    c.lineTo(38, 20);
    c.lineTo(38, 44);
    c.lineTo(48, 44);
    c.closePath();
    c.fill();

    c.strokeStyle = '#b45309';
    c.lineWidth = 2.5;
    c.stroke();
  });

// Sparkling completion star
const sparkle = () =>
  spr(32, 32, (c) => {
    glow(c, 16, 16, 15, 'rgba(255, 245, 200, 1)', 1);
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.moveTo(16, 0);
    c.lineTo(20, 12);
    c.lineTo(32, 16);
    c.lineTo(20, 20);
    c.lineTo(16, 32);
    c.lineTo(12, 20);
    c.lineTo(0, 16);
    c.lineTo(12, 12);
    c.closePath();
    c.fill();
  });

// Visiting relative in a white kasavu mundu with a black umbrella (kuda)
const guest = () =>
  spr(70, 128, (c) => {
    groundShadow(c, 35, 122, 26, 5);

    // black umbrella held over the shoulder
    c.fillStyle = '#1c1917';
    c.beginPath();
    c.ellipse(48, 16, 20, 9, 0, Math.PI, 0);
    c.fill();
    c.fillStyle = '#292524';
    c.beginPath();
    c.ellipse(48, 16, 20, 4, 0, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = '#57534e';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(48, 16);
    c.lineTo(48, 44);
    c.stroke();

    // head + warm brown skin tone
    c.fillStyle = '#8d5a3b';
    c.beginPath();
    c.arc(28, 24, 11, 0, Math.PI * 2);
    c.fill();
    // hair + gentle moustache
    c.fillStyle = '#241a14';
    c.beginPath();
    c.arc(28, 20, 11, Math.PI * 1.05, Math.PI * 1.95);
    c.fill();
    c.fillRect(23, 29, 10, 2);

    // shirt (pale sandal)
    const shirt = c.createLinearGradient(14, 0, 44, 0);
    shirt.addColorStop(0, '#b7ad9c');
    shirt.addColorStop(0.45, '#efe7d8');
    shirt.addColorStop(1, '#9c9384');
    c.fillStyle = shirt;
    rr(c, 15, 36, 28, 34, 8);
    // arms
    c.fillStyle = shirt;
    rr(c, 10, 38, 8, 26, 4);
    rr(c, 40, 38, 8, 26, 4);
    c.fillStyle = '#8d5a3b';
    rr(c, 10, 60, 8, 8, 3);
    rr(c, 40, 60, 8, 8, 3);

    // white mundu with kasavu gold border
    const mundu = c.createLinearGradient(12, 0, 46, 0);
    mundu.addColorStop(0, '#d8d2c4');
    mundu.addColorStop(0.4, '#fffdf6');
    mundu.addColorStop(1, '#c9c3b4');
    c.fillStyle = mundu;
    c.beginPath();
    c.moveTo(14, 68);
    c.lineTo(44, 68);
    c.lineTo(48, 118);
    c.lineTo(10, 118);
    c.closePath();
    c.fill();
    // drape folds
    c.strokeStyle = 'rgba(120,112,98,0.45)';
    c.lineWidth = 1.4;
    for (const fx of [20, 28, 36]) {
      c.beginPath();
      c.moveTo(fx, 70);
      c.lineTo(fx - 1, 116);
      c.stroke();
    }
    // gold kasavu border at the hem + side
    c.fillStyle = '#d4a237';
    c.fillRect(10, 112, 38, 4);
    c.fillRect(42, 68, 4, 48);
    c.fillStyle = '#f2d378';
    c.fillRect(10, 112, 38, 1.6);

    // sandals
    c.fillStyle = '#3f2a18';
    rr(c, 14, 116, 12, 5, 2);
    rr(c, 32, 116, 12, 5, 2);

    // packet of sweets (palada) in hand
    c.fillStyle = '#c2410c';
    rr(c, 42, 56, 14, 12, 2);
    c.fillStyle = '#fde68a';
    rr(c, 42, 60, 14, 2.5, 1);
  });

// Small clay diya lamp used for the evening deepam / festive ambience
const diya = () =>
  spr(44, 40, (c) => {
    glow(c, 22, 22, 20, 'rgba(255,190,90,0.95)', 0.9);
    // clay bowl
    const bowl = c.createLinearGradient(8, 0, 36, 0);
    bowl.addColorStop(0, '#7c2d12');
    bowl.addColorStop(0.4, '#c2551f');
    bowl.addColorStop(1, '#5a1f0c');
    c.fillStyle = bowl;
    c.beginPath();
    c.ellipse(22, 32, 14, 6, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#3f1a0a';
    c.beginPath();
    c.ellipse(22, 30, 11, 4, 0, 0, Math.PI * 2);
    c.fill();
    flame(c, 22, 18, 6);
  });

const cloth = () => spr(88, 62, (c) => {
  groundShadow(c, 44, 56, 38, 5);
  const g = c.createLinearGradient(10, 12, 76, 52);
  g.addColorStop(0, '#fff7dc'); g.addColorStop(0.6, '#d9c89e'); g.addColorStop(1, '#928065');
  c.fillStyle = g;
  c.beginPath(); c.moveTo(14, 12); c.lineTo(74, 18); c.lineTo(80, 53); c.lineTo(6, 47); c.closePath(); c.fill();
  c.strokeStyle = '#ba8931'; c.lineWidth = 4;
  c.beginPath(); c.moveTo(17, 16); c.lineTo(70, 22); c.moveTo(12, 42); c.lineTo(76, 49); c.stroke();
  c.strokeStyle = 'rgba(89,66,42,.26)'; c.lineWidth = 2;
  for (let x = 22; x < 70; x += 12) { c.beginPath(); c.moveTo(x, 18); c.quadraticCurveTo(x - 8, 30, x, 44); c.stroke(); }
});

const brush = () => spr(84, 62, (c) => {
  groundShadow(c, 42, 57, 35, 4);
  c.strokeStyle = '#b99a65'; c.lineWidth = 2;
  for (let x = 14; x <= 70; x += 3) { c.beginPath(); c.moveTo(x, 29); c.lineTo(x - 2, 52); c.stroke(); }
  const g = c.createLinearGradient(12, 13, 72, 32);
  g.addColorStop(0, '#bc8750'); g.addColorStop(0.4, '#e5b980'); g.addColorStop(1, '#573115');
  c.fillStyle = g; rr(c, 10, 17, 64, 17, 7);
  c.strokeStyle = '#674328'; c.lineWidth = 6; c.beginPath(); c.ellipse(43, 15, 18, 9, 0, Math.PI, 0); c.stroke();
});

const shears = () => spr(76, 84, (c) => {
  groundShadow(c, 38, 78, 30, 4);
  c.strokeStyle = '#aeb8bf'; c.lineWidth = 6; c.lineCap = 'round';
  c.beginPath(); c.moveTo(22, 11); c.lineTo(49, 53); c.moveTo(55, 9); c.lineTo(27, 53); c.stroke();
  c.strokeStyle = '#ececea'; c.lineWidth = 2;
  c.beginPath(); c.moveTo(21, 11); c.lineTo(39, 39); c.moveTo(55, 9); c.lineTo(39, 39); c.stroke();
  c.fillStyle = '#65553e'; c.beginPath(); c.arc(38, 39, 4, 0, Math.PI * 2); c.fill();
  c.strokeStyle = '#41705b'; c.lineWidth = 7;
  c.beginPath(); c.ellipse(22, 62, 10, 14, .4, 0, Math.PI * 2); c.stroke();
  c.beginPath(); c.ellipse(54, 62, 10, 14, -.4, 0, Math.PI * 2); c.stroke();
});

const rope = () => spr(92, 66, (c) => {
  groundShadow(c, 46, 58, 40, 5);
  for (let r = 32; r >= 7; r -= 6) {
    c.strokeStyle = '#715432'; c.lineWidth = 6;
    c.beginPath(); c.ellipse(44, 32, r, r * .67, -.15, 0, Math.PI * 2); c.stroke();
    c.strokeStyle = '#c7a66a'; c.lineWidth = 3;
    c.beginPath(); c.ellipse(44, 30, r, r * .67, -.15, 0, Math.PI * 2); c.stroke();
  }
  c.strokeStyle = '#b89861'; c.lineWidth = 5;
  c.beginPath(); c.moveTo(70, 34); c.quadraticCurveTo(89, 45, 72, 57); c.stroke();
});

const ladle = () => spr(48, 122, (c) => {
  const wood = c.createLinearGradient(16, 0, 31, 0);
  wood.addColorStop(0, '#65401f'); wood.addColorStop(.45, '#c49861'); wood.addColorStop(1, '#7a4a25');
  c.fillStyle = wood;
  rr(c, 20, 8, 8, 92, 4);
  const bowl = c.createRadialGradient(21, 99, 1, 24, 101, 18);
  bowl.addColorStop(0, '#46301b'); bowl.addColorStop(.68, '#947046'); bowl.addColorStop(1, '#ca9c62');
  c.fillStyle = bowl; c.beginPath(); c.ellipse(24, 101, 16, 19, 0, 0, Math.PI * 2); c.fill();
});

const teaTray = () => spr(110, 76, (c) => {
  groundShadow(c, 55, 69, 48, 5);
  const tray = c.createLinearGradient(0, 48, 0, 70);
  tray.addColorStop(0, '#dddac8'); tray.addColorStop(.45, '#6f7771'); tray.addColorStop(1, '#d9d6c2');
  c.fillStyle = tray; c.beginPath(); c.ellipse(55, 56, 47, 13, 0, 0, Math.PI * 2); c.fill();
  for (const x of [28, 58, 81]) {
    c.fillStyle = '#d3c7ae'; rr(c, x - 9, 31, 19, 26, 4);
    c.fillStyle = '#714b29'; c.beginPath(); c.ellipse(x, 33, 8, 3, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#fff3ce'; c.fillRect(x - 6, 37, 2, 16);
    c.strokeStyle = 'rgba(255,255,240,.6)'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(x, 26); c.bezierCurveTo(x - 7, 18, x + 5, 17, x, 8); c.stroke();
  }
});

const flowerTray = () => spr(110, 68, (c) => {
  groundShadow(c, 55, 62, 48, 4);
  c.fillStyle = '#987139'; c.beginPath(); c.ellipse(55, 46, 48, 17, 0, 0, Math.PI * 2); c.fill();
  c.strokeStyle = '#d4aa64'; c.lineWidth = 3; c.stroke();
  for (let i = 0; i < 20; i++) {
    const x = 22 + (i * 19) % 64, y = 25 + (i * 13) % 24;
    c.fillStyle = ['#e6ae28', '#f3e9cf', '#c75742'][i % 3];
    for (let j = 0; j < 5; j++) { const a = j * Math.PI * 2 / 5; c.beginPath(); c.arc(x + Math.cos(a) * 4, y + Math.sin(a) * 4, 3, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = '#936928'; c.beginPath(); c.arc(x, y, 2, 0, Math.PI * 2); c.fill();
  }
});

function all() {
  return {
    lamp: lamp(),
    lampUnlit: lamp(false),
    tap: tap(),
    tapFixed: tap(false),
    well: well(),
    stove: stove(),
    fuse: fuse(),
    cow: cow(),
    leafpile: leafpile(),
    plants: plants(),
    broom: broom(),
    bucket: bucket(),
    matchbox: matchbox(),
    wrench: wrench(),
    grass: grass(),
    tulsi: tulsi(),
    banana: bananaPlant(),
    clayPot: clayPot(),
    chair: chair(),
    marker: marker(),
    sparkle: sparkle(),
    guest: guest(),
    diya: diya(),
    cloth: cloth(),
    brush: brush(),
    shears: shears(),
    rope: rope(),
    ladle: ladle(),
    teaTray: teaTray(),
    flowerTray: flowerTray(),
  };
}

export type SprSet = ReturnType<typeof all>;
export const SPR: SprSet = all();

const imageCache = new Map<string, HTMLCanvasElement>();
export function spriteCanvas(name: string) {
  const cached = imageCache.get(name);
  if (cached) return cached;
  const sprite = SPR[name as keyof SprSet];
  if (!sprite) return null;
  const canvas = document.createElement('canvas');
  canvas.width = sprite.w; canvas.height = sprite.h;
  const ctx = canvas.getContext('2d')!;
  const image = ctx.createImageData(sprite.w, sprite.h);
  image.data.set(new Uint8ClampedArray(sprite.data.buffer));
  ctx.putImageData(image, 0, 0);
  imageCache.set(name, canvas);
  return canvas;
}

const urlCache = new Map<string, string>();
export function spriteUrl(name: string) {
  if (!urlCache.has(name)) urlCache.set(name, spriteCanvas(name)?.toDataURL() ?? '');
  return urlCache.get(name)!;
}
