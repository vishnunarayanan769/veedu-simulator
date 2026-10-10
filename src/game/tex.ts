// High-resolution procedural textures with realistic materials:
// Red oxide polished floor with specular gloss & micro-scratches,
// Warm lime plaster walls with fine damp and weathering,
// Teak wood with realistic annular rings and grain,
// Porous laterite stone blocks with mortar lines,
// Terracotta Mangalore clay tiles,
// Detailed skies with Kerala sun glare and coconut fronds.

export interface Tex {
  w: number;
  h: number;
  data: Uint32Array;
}

export function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const px = (r: number, g: number, b: number) =>
  (0xff000000 | (clamp255(b) << 16) | (clamp255(g) << 8) | clamp255(r)) >>> 0;

function clamp255(v: number) {
  return v < 0 ? 0 : v > 255 ? 255 : v | 0;
}

function mix(a: number[], b: number[], t: number) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function grid(n: number, seed: number) {
  const r = mulberry32(seed);
  const g = new Float32Array(n * n);
  for (let i = 0; i < n * n; i++) g[i] = r();
  return (x: number, y: number) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const s = (a: number, b: number) => g[(((b % n) + n) % n) * n + (((a % n) + n) % n)];
    const u = xf * xf * (3 - 2 * xf);
    const v = yf * yf * (3 - 2 * yf);
    return (
      s(xi, yi) * (1 - u) * (1 - v) +
      s(xi + 1, yi) * u * (1 - v) +
      s(xi, yi + 1) * (1 - u) * v +
      s(xi + 1, yi + 1) * u * v
    );
  };
}

function makeTex(size: number, fn: (x: number, y: number) => number[]): Tex {
  const data = new Uint32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const c = fn(x, y);
      data[y * size + x] = px(c[0], c[1], c[2]);
    }
  }
  return { w: size, h: size, data };
}

// 128x128 provides 4x detail density for crisp visual fidelity up close
const S = 128;

// Palette definitions for authentic Kerala heritage materials
const cream = [238, 226, 204];
const oxideDark = [128, 38, 28];
const oxideRich = [174, 52, 38];
const oxideHighlight = [212, 88, 68];
const gold = [218, 172, 70];
const goldTrim = [180, 138, 52];
const teakA = [92, 54, 26];
const teakB = [142, 88, 44];
const teakHighlight = [176, 118, 64];
const laterA = [168, 72, 50];
const laterB = [118, 48, 34];
const laterGrit = [204, 112, 78];
const terraA = [184, 76, 48];
const terraB = [136, 48, 32];

// ---------------------------------------------------------------- WALL TEXTURES

// Traditional Kerala Lime Plaster (Chunnambu kootu) with polished terracotta skirting and gold inlay band
function plasterTex(): Tex {
  const n1 = grid(12, 11), n2 = grid(40, 21), fine = grid(64, 99);
  return makeTex(S, (x, y) => {
    // Subtle lime wall unevenness & micro-trowel texture
    const grain = n1(x / 14, y / 14) * 0.7 + fine(x / 4, y / 4) * 0.3;
    let c = mix(cream, [218, 204, 176], grain * 0.6);
    // Subtle horizontal trowel lines
    const trowel = Math.sin(y * 0.4 + n2(x / 16, y / 16) * 4) * 0.5 + 0.5;
    c = mix(c, [246, 238, 222], trowel * 0.25);

    // Weathering/damp near floor
    const damp = Math.max(0, (y - 80) / 48);
    if (damp > 0) {
      const stain = n2(x / 10, y / 8);
      c = mix(c, [192, 174, 142], damp * stain * 0.45);
    }

    // High polished red oxide wainscot skirting at base (y >= 96)
    if (y >= 96) {
      const ly = y - 96;
      let ox = mix(oxideDark, oxideRich, n2(x / 12, y / 12) * 0.8 + 0.2);
      // Polished sheen band
      if (ly > 6 && ly < 18) {
        ox = mix(ox, oxideHighlight, 0.35);
      }
      c = ox;
    } else if (y >= 92 && y < 96) {
      // Golden brass border strip (Charu-padi trim)
      const sheen = (x % 16 < 4) ? 0.3 : 0;
      c = mix(gold, [255, 230, 140], sheen);
    } else if (y >= 90 && y < 92) {
      c = goldTrim;
    }

    return c;
  });
}

// Hand-planed teak wood wall / Ara-pathayam panels
function teakTex(): Tex {
  const n = grid(24, 7), fine = grid(64, 43);
  return makeTex(S, (x, y) => {
    const plankW = 32;
    const plankIdx = Math.floor(x / plankW);
    const lx = x - plankIdx * plankW;
    const plankSeed = plankIdx * 19.3;

    // Rich organic woodgrain with parabolic annular growth rings
    const ringWarp = n(x / 16, y / 32) * 3;
    const grain = Math.sin((lx * 0.8) + Math.cos(y * 0.12 + plankSeed) * 5 + ringWarp) * 0.5 + 0.5;
    const fineGrain = fine(x / 2, y / 12) * 0.4;
    
    let c = mix(teakA, teakB, grain * 0.7 + fineGrain);
    
    // Polished oil sheen down center of board
    const sheen = Math.sin((lx / plankW) * Math.PI);
    c = mix(c, teakHighlight, Math.pow(sheen, 3) * 0.35);

    // Deep routed v-groove between panels
    if (lx === 0 || lx === plankW - 1) {
      c = mix(c, [36, 18, 8], 0.88);
    } else if (lx === 1) {
      c = mix(c, teakHighlight, 0.4);
    }

    // Occasional wood knot
    const knotDist = Math.hypot(lx - 16, (y % 64) - 32);
    if (knotDist < 8) {
      const k = 1 - knotDist / 8;
      c = mix(c, [42, 22, 10], k * 0.7);
    }

    return c;
  });
}

// Porous Kerala laterite stone blocks (Vettu kallu)
function lateriteTex(): Tex {
  const n = grid(32, 88), pore = grid(64, 33);
  return makeTex(S, (x, y) => {
    const bw = 32, bh = 16;
    const row = Math.floor(y / bh);
    const shift = (row % 2 === 1) ? 16 : 0;
    const col = Math.floor((x + shift) / bw);
    const lx = (x + shift) % bw;
    const ly = y % bh;

    const blockRnd = mulberry32(col * 47 + row * 83)();
    let c = mix(laterA, laterB, blockRnd * 0.5 + n(x / 10, y / 10) * 0.5);

    // Porous pitting (vesicular cavities characteristic of iron-rich laterite)
    const p = pore(x / 3, y / 3);
    if (p > 0.72) {
      c = mix(c, [54, 22, 14], 0.7); // deep dark pit
    } else if (p < 0.25) {
      c = mix(c, laterGrit, 0.4); // ferruginous ochre nodules
    }

    // Mortar joint (lime-sand mortar)
    const isMortar = lx === 0 || lx === bw - 1 || ly === 0 || ly === bh - 1;
    if (isMortar) {
      c = mix([142, 134, 118], [98, 88, 76], n(x / 4, y / 4));
    } else if (lx === 1 || ly === 1) {
      // Sunlit bevel edge
      c = mix(c, [226, 148, 112], 0.3);
    }

    return c;
  });
}

// Traditional barred Kerala wooden window (Jalakam) with brass latches
function windowTex(): Tex {
  const n = grid(24, 19);
  return makeTex(S, (x, y) => {
    // Wall surround
    let c = mix(cream, [218, 204, 178], n(x / 12, y / 12) * 0.7);
    if (y > 100) c = mix(oxideRich, oxideDark, 0.5);

    // Window opening frame
    const inFrame = x >= 16 && x <= 111 && y >= 14 && y <= 94;
    if (inFrame) {
      const lx = x - 16, ly = y - 14;
      const isTeakBorder = lx < 8 || lx > 87 || ly < 8 || ly > 72;
      if (isTeakBorder) {
        c = mix(teakA, teakB, n(x / 6, y / 6));
        if (lx === 0 || ly === 0) c = [42, 24, 12];
        if (lx === 7 || ly === 7) c = teakHighlight;
      } else {
        // Deep interior opening with outdoor sky/greenery visible through grilles
        const cx = lx - 8, cy = ly - 8;
        // Grille bars (lathed teak balusters)
        const barSpacing = 16;
        const barX = cx % barSpacing;
        if (barX >= 5 && barX <= 10) {
          // Rounded wooden grille bar with cylindrical shading
          const norm = (barX - 7.5) / 2.5;
          const shade = Math.cos(norm * 1.3);
          c = mix([60, 36, 18], teakHighlight, Math.max(0, shade));
          if (cy % 24 < 3) c = gold; // brass rings on bars
        } else if (cy === 32 || cy === 33) {
          // Horizontal cross brace
          c = mix(teakA, teakB, 0.6);
        } else {
          // Lush outdoor tropical garden view behind bars
          const depthGrad = cy / 64;
          c = mix([38, 78, 48], [140, 190, 220], 1 - depthGrad * 0.7);
          if (n(cx / 8, cy / 8) > 0.65) c = [58, 118, 54]; // palm foliage
        }
      }
    }
    return c;
  });
}

// Mangalore terracotta clay roof tiles (Odu)
function terraTex(): Tex {
  const n = grid(32, 57);
  return makeTex(S, (x, y) => {
    const tileH = 20, tileW = 32;
    const row = Math.floor(y / tileH);
    const shift = (row % 2 === 1) ? 16 : 0;
    const lx = (x + shift) % tileW;
    const ly = y % tileH;

    let c = mix(terraA, terraB, n(x / 8, y / 8));
    // Curvature ridge shadow
    const arch = Math.sin((lx / tileW) * Math.PI);
    c = mix(c, [228, 128, 92], Math.pow(arch, 1.8) * 0.55);

    // Overlap drop shadow from row above
    if (ly < 4) {
      c = mix(c, [64, 24, 16], (4 - ly) / 4 * 0.85);
    }
    // Gutter joint
    if (lx === 0 || lx === tileW - 1) {
      c = mix(c, [72, 28, 18], 0.75);
    }
    // Subtle kiln fired patina / bloom
    if (n(x / 5, y / 5) > 0.78) {
      c = mix(c, [178, 162, 142], 0.28);
    }
    return c;
  });
}

// Hand-turned Teak Veranda Pillar (Thoothu / Koodu column)
function columnTex(): Tex {
  const n = grid(24, 29);
  return makeTex(S, (x, y) => {
    // Cylindrical lighting calculation
    const norm = (x - S / 2) / (S / 2);
    const lit = Math.max(0, Math.cos(norm * 1.4));
    const spec = Math.pow(Math.max(0, Math.cos((norm - 0.2) * 1.8)), 8) * 0.35;

    let c = mix(teakA, teakB, n(x / 12, y / 24));
    c = mix([40, 22, 12], c, lit);
    c = mix(c, [255, 230, 170], spec);

    // Ornate capital carvings and brass base ring
    if (y < 16 || y > 112) {
      // Intricate lotus capital or granite pedestal base
      if (y > 120) {
        c = mix([90, 84, 80], [130, 124, 118], n(x / 4, y / 4)); // Granite base
      } else {
        const rung = (y % 4 < 2) ? 0.3 : -0.2;
        c = mix(c, gold, 0.4 + rung);
      }
    }
    return c;
  });
}

// Coconut Palm Trunk (Thengu) with fiber rings and lichen
function palmTex(): Tex {
  const n = grid(32, 61), fiber = grid(64, 17);
  return makeTex(S, (x, y) => {
    const norm = (x - S / 2) / (S / 2);
    const lit = Math.max(0, Math.cos(norm * 1.35));

    let c = mix([138, 102, 68], [94, 68, 44], n(x / 10, y / 10));
    // Annular leaf-scar rings every ~14 pixels
    const ringY = y % 14;
    if (ringY <= 2) {
      c = mix(c, [56, 38, 24], 0.75); // Ring fissure
    } else if (ringY >= 11) {
      c = mix(c, [182, 148, 106], 0.4); // Highlight lip
    }
    // Coir fiber texture
    const f = fiber(x, y / 3);
    c = mix(c, [68, 48, 30], f * 0.25);

    // Moss / grey lichen spots typical in monsoon Kerala
    if (n(x / 8, y / 8) > 0.74) {
      c = mix(c, [118, 134, 88], 0.5);
    }
    c = mix([48, 32, 20], c, lit);
    return c;
  });
}

// Banana plant clump (Vazha) broad leaves and stems
function bananaTex(): Tex {
  const n = grid(24, 45), fine = grid(64, 83);
  return makeTex(S, (x, y) => {
    // Rich tropical emerald green
    let c = mix([64, 128, 42], [38, 86, 30], n(x / 12, y / 12));
    // Midrib vein
    const lx = (x % 32) - 16;
    if (Math.abs(lx) < 2) {
      c = [164, 212, 92]; // Bright pale-green midrib
    } else {
      // Lateral vein striations
      const vein = Math.sin((y * 1.4) + Math.abs(lx) * 1.8) * 0.5 + 0.5;
      c = mix(c, [96, 174, 56], vein * 0.35);
    }
    // Sunlight translucency (subsurface scattering simulation)
    if (fine(x / 4, y / 4) > 0.6) {
      c = mix(c, [146, 210, 68], 0.3);
    }
    return c;
  });
}

// Carved Teak double door (Padippura / Akathe Vathil)
function doorTex(): Tex {
  const n = grid(24, 91);
  return makeTex(S, (x, y) => {
    let c = mix([88, 50, 24], [134, 82, 40], n(x / 14, y / 14));
    // Raised carved panels
    const inPanel = (x >= 14 && x <= 54 && y >= 16 && y <= 60) ||
                    (x >= 74 && x <= 114 && y >= 16 && y <= 60) ||
                    (x >= 14 && x <= 54 && y >= 72 && y <= 116) ||
                    (x >= 74 && x <= 114 && y >= 72 && y <= 116);
    if (inPanel) {
      const px = (x < 64 ? x - 14 : x - 74);
      const py = (y < 68 ? y - 16 : y - 72);
      const isBorder = px < 4 || px > 36 || py < 4 || py > 40;
      if (isBorder) {
        c = (px === 0 || py === 0) ? [38, 20, 10] : teakHighlight;
      } else {
        c = mix([118, 70, 36], teakHighlight, n(x / 6, y / 6) * 0.6);
        // Carved rosette motif in center
        const r = Math.hypot(px - 20, py - 22);
        if (r < 10) {
          const petal = Math.sin(r * 1.5 + Math.atan2(py - 22, px - 20) * 8);
          c = mix(c, gold, Math.max(0, petal) * 0.5);
        }
      }
    }
    // Center brass latch & mani-poottu (Kerala brass door lock)
    if (x >= 60 && x <= 68 && y >= 58 && y <= 74) {
      c = mix(gold, [255, 238, 160], 0.4);
    }
    return c;
  });
}

// ---------------------------------------------------------------- FLOOR & CEILING

// Famous Kerala Mirror-finished Red Oxide Floor (Chemmannu nilam)
function oxideFloorTex(): Tex {
  const n = grid(24, 103), swirl = grid(48, 71), micro = grid(64, 13);
  return makeTex(S, (x, y) => {
    // Ultra deep, silky mineral red tones
    const base = n(x / 20, y / 20);
    let c = mix(oxideDark, oxideRich, base * 0.7 + 0.2);

    // Marble-like egg-white & coconut shell carbon buffing swirls
    const s = swirl(x / 10, y / 10);
    c = mix(c, oxideHighlight, Math.pow(s, 2) * 0.4);

    // Micro wax luster & faint footsteps sheen
    const spec = micro(x / 3, y / 3);
    c = mix(c, [238, 128, 98], Math.pow(spec, 4) * 0.35);

    // Fine brass inlay border grid (every 64 pixels)
    if (x % 64 === 0 || y % 64 === 0) {
      c = [58, 18, 14]; // joint shadow
    } else if (x % 64 === 1 || y % 64 === 1) {
      c = gold; // 1-pixel brass strip
    }

    return c;
  });
}

// Nadumuttam Courtyard granite stones (Karinkallu with rain sheen)
function courtTex(): Tex {
  const n = grid(32, 211), grit = grid(64, 47);
  return makeTex(S, (x, y) => {
    const sz = 32;
    const bx = Math.floor(x / sz), by = Math.floor(y / sz);
    const r = mulberry32(bx * 37 + by * 91)();
    const lx = x % sz, ly = y % sz;

    let c = mix([174, 166, 154], [132, 124, 114], r * 0.6 + n(x / 8, y / 8) * 0.4);
    // Mineral flecks (quartz and mica)
    const m = grit(x / 2, y / 2);
    if (m > 0.8) c = [235, 235, 230];
    else if (m < 0.15) c = [64, 60, 58];

    // Stone joints with lush green velvety moss from open sky rain
    if (lx === 0 || ly === 0) {
      c = [48, 44, 40];
    } else if (lx <= 2 || ly <= 2) {
      c = mix(c, [62, 118, 48], 0.6); // Monsoon moss
    }
    return c;
  });
}

// Outdoor tropical lush grass yard (Pulloothu)
function grassTex(): Tex {
  const n = grid(24, 307), blades = grid(64, 89);
  return makeTex(S, (x, y) => {
    let c = mix([72, 134, 44], [44, 88, 32], n(x / 14, y / 14));
    // Fine blade texture
    const b = blades(x * 1.5, y * 0.5);
    c = mix(c, [118, 182, 60], b * 0.4);
    // Moist soil patch
    if (n(x / 8, y / 8) < 0.2) {
      c = mix(c, [112, 74, 44], 0.5);
    }
    return c;
  });
}

// Poomukham Veranda terracotta & oxide composite
function verandaTex(): Tex {
  const n = grid(24, 401);
  return makeTex(S, (x, y) => {
    const tile = 32;
    const lx = x % tile, ly = y % tile;
    let c = mix([214, 198, 172], [182, 166, 140], n(x / 10, y / 10));
    // Outer border
    if (lx < 3 || lx > 28 || ly < 3 || ly > 28) {
      c = mix(oxideRich, oxideDark, n(x / 6, y / 6));
    } else if (lx === 3 || lx === 28 || ly === 3 || ly === 28) {
      c = gold;
    }
    return c;
  });
}

// Timber ceiling with heavy teak beams and rafters (Thulam & Kazhukol)
function ceilTex(): Tex {
  const n = grid(24, 503);
  return makeTex(S, (x, y) => {
    let c = mix([62, 38, 20], [42, 24, 14], n(x / 12, y / 12));
    // Main heavy support beams (every 32 pixels)
    const isBeam = (x % 32 < 6);
    if (isBeam) {
      const bx = x % 32;
      c = (bx === 0) ? [24, 14, 8] : mix([92, 58, 30], [130, 84, 44], n(x / 4, y / 12));
    }
    // Cross ceiling slats
    if (y % 16 === 0) {
      c = mix(c, [18, 10, 6], 0.8);
    }
    return c;
  });
}

// ---------------------------------------------------------------- 360° SKY PANORAMA
// Realistic Kerala landscape: Western Ghats mist, golden tropical sun, coconut canopy
function panoTex(): Tex {
  const w = 1536, h = 256;
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const c = cv.getContext('2d')!;

  // Atmospheric sky gradient: from tropical azure blue to warm golden-hour haze near horizon
  const skyGrad = c.createLinearGradient(0, 0, 0, h);
  skyGrad.addColorStop(0, '#1c5e8c');
  skyGrad.addColorStop(0.35, '#529ec9');
  skyGrad.addColorStop(0.68, '#b6dcee');
  skyGrad.addColorStop(0.88, '#fce3b8');
  skyGrad.addColorStop(1.0, '#fed89f');
  c.fillStyle = skyGrad;
  c.fillRect(0, 0, w, h);

  // Radiant tropical sun with realistic volumetric corona
  const sunX = 420, sunY = 160;
  const sunGrad = c.createRadialGradient(sunX, sunY, 6, sunX, sunY, 180);
  sunGrad.addColorStop(0, 'rgba(255, 255, 245, 1)');
  sunGrad.addColorStop(0.12, 'rgba(255, 242, 190, 0.9)');
  sunGrad.addColorStop(0.35, 'rgba(255, 200, 110, 0.45)');
  sunGrad.addColorStop(0.7, 'rgba(255, 170, 70, 0.15)');
  sunGrad.addColorStop(1, 'rgba(255, 150, 40, 0)');
  c.fillStyle = sunGrad;
  c.fillRect(sunX - 220, 0, 440, h);

  // Soft cumulus monsoon clouds
  const rnd = mulberry32(101);
  for (let i = 0; i < 60; i++) {
    const cx = rnd() * w;
    const cy = 20 + rnd() * 110;
    const rx = 35 + rnd() * 65;
    const ry = rx * (0.28 + rnd() * 0.18);
    const alpha = 0.12 + rnd() * 0.32;

    const cloudGrad = c.createRadialGradient(cx, cy, 2, cx, cy, rx);
    cloudGrad.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
    cloudGrad.addColorStop(0.6, `rgba(255, 245, 230, ${alpha * 0.6})`);
    cloudGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    c.fillStyle = cloudGrad;
    c.beginPath();
    c.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    c.fill();
  }

  // Layer 1: Distant Western Ghats mountain ridges (Sahyadri) in blue-green atmospheric haze
  c.fillStyle = '#3a625a';
  c.beginPath();
  c.moveTo(0, h);
  for (let x = 0; x <= w; x += 6) {
    const y = h - 62 - Math.sin(x * 0.008) * 18 - Math.sin(x * 0.021 + 1.2) * 11 - Math.cos(x * 0.043) * 5;
    c.lineTo(x, y);
  }
  c.lineTo(w, h);
  c.fill();

  // Layer 2: Midground hills with lush tropical rainforest canopy
  c.fillStyle = '#264c3c';
  c.beginPath();
  c.moveTo(0, h);
  for (let x = 0; x <= w; x += 6) {
    const y = h - 42 - Math.sin(x * 0.014 + 2) * 14 - Math.cos(x * 0.035) * 8;
    c.lineTo(x, y);
  }
  c.lineTo(w, h);
  c.fill();

  // Layer 3: Foreground lush coconut palm groves silhouette & betel nut palms
  const drawPalmTree = (pxx: number, trunkH: number, lean: number) => {
    c.strokeStyle = '#183020';
    c.lineWidth = 3.6;
    c.beginPath();
    c.moveTo(pxx, h);
    const midX = pxx + lean * 10;
    const topX = pxx + lean * 22;
    const topY = h - trunkH;
    c.quadraticCurveTo(midX, h - trunkH * 0.55, topX, topY);
    c.stroke();

    // Palm fronds radiating with natural droop
    const fronds = 9;
    for (let f = 0; f < fronds; f++) {
      const angle = -Math.PI * 0.95 + (f / (fronds - 1)) * Math.PI * 1.9;
      const len = 34 + (f % 3) * 6;
      c.strokeStyle = '#122618';
      c.lineWidth = 2.2;
      c.beginPath();
      c.moveTo(topX, topY);
      const endX = topX + Math.cos(angle) * len;
      const endY = topY + Math.sin(angle) * (len * 0.6) + 12; // Natural gravity droop
      c.quadraticCurveTo(topX + Math.cos(angle) * (len * 0.6), topY + Math.sin(angle) * 10 - 6, endX, endY);
      c.stroke();
    }
  };

  for (let i = 0; i < 48; i++) {
    const pxPos = (i / 48) * w + rnd() * 24;
    const treeH = 55 + rnd() * 45;
    const lean = (rnd() - 0.5) * 2;
    drawPalmTree(pxPos, treeH, lean);
  }

  const d = c.getImageData(0, 0, w, h);
  return { w, h, data: new Uint32Array(d.data.buffer) };
}

function all() {
  return {
    plaster: plasterTex(),
    teak: teakTex(),
    laterite: lateriteTex(),
    window: windowTex(),
    terra: terraTex(),
    column: columnTex(),
    palm: palmTex(),
    banana: bananaTex(),
    door: doorTex(),
    fOxide: oxideFloorTex(),
    fCourt: courtTex(),
    fGrass: grassTex(),
    fVeranda: verandaTex(),
    ceil: ceilTex(),
    pano: panoTex(),
  };
}

export type TexSet = ReturnType<typeof all>;
export const TEX: TexSet = all();
