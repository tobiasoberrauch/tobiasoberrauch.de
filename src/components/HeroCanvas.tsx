import { useEffect, useRef } from 'react';

// === Mathematical constants ===
const PHI = (1 + Math.sqrt(5)) / 2; // Golden ratio
const TAU = Math.PI * 2;
const GOLDEN_ANGLE = TAU / (PHI * PHI); // ~137.5° — nature's optimal packing angle

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  energy: number;      // excitation level (0–1), Game-of-Life-inspired
  phase: number;       // Kuramoto oscillator phase
  omega: number;       // natural frequency (unique per particle)
  refractory: number;  // cooldown after firing (like a neuron)
  opacity: number;
  generation: number;  // life cycles survived
}

// === Deterministic hash-based noise ===
// Uses integer hashing instead of Math.random for reproducible flow fields
function ihash(n: number): number {
  n = (n << 13) ^ n;
  return ((n * (n * n * 15731 + 789221) + 1376312589) & 0x7fffffff) / 0x7fffffff;
}

function noise2D(x: number, y: number): number {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  // Hermite smoothstep for organic interpolation
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const a = ihash(ix * 1597 + iy * 51749);
  const b = ihash((ix + 1) * 1597 + iy * 51749);
  const c = ihash(ix * 1597 + (iy + 1) * 51749);
  const d = ihash((ix + 1) * 1597 + (iy + 1) * 51749);
  return a * (1 - sx) * (1 - sy) + b * sx * (1 - sy) + c * (1 - sx) * sy + d * sx * sy;
}

// Fractal Brownian Motion with golden-ratio frequency scaling
// Unlike standard fbm (which uses freq *= 2), using PHI creates
// non-repeating, self-similar patterns at every scale
function fbm(x: number, y: number, octaves: number): number {
  let val = 0, amp = 1, freq = 1, max = 0;
  for (let i = 0; i < octaves; i++) {
    val += noise2D(x * freq, y * freq) * amp;
    max += amp;
    amp *= 0.5;
    freq *= PHI; // Golden ratio scaling — mathematically unique
  }
  return val / max;
}

// Logistic map: x_{n+1} = r * x_n * (1 - x_n)
// At r ≈ 4.0 this produces deterministic chaos — seemingly random
// but fully determined by the initial state. Used for spontaneous firing.
function logistic(x: number): number {
  return 3.9999 * x * (1 - x);
}

export default function HeroCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let W = 0, H = 0;

    const resize = () => {
      const dpr = window.devicePixelRatio;
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    // === Initialize using golden angle spiral ===
    // This is how sunflower seeds pack — maximally spread, no clustering
    const count = Math.min(Math.floor((W * H) / 4200), 170);

    particlesRef.current = Array.from({ length: count }, (_, i) => {
      const norm = i / count;
      const r = Math.sqrt(norm) * Math.min(W, H) * 0.5;
      const theta = i * GOLDEN_ANGLE;
      return {
        x: W / 2 + Math.cos(theta) * r + (Math.random() - 0.5) * W * 0.3,
        y: H / 2 + Math.sin(theta) * r + (Math.random() - 0.5) * H * 0.3,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        radius: 1.5 + Math.random() * 2.5,
        energy: Math.random() * 0.15,
        // Kuramoto: each particle has a unique natural frequency
        // distributed around a mean — like fireflies or neurons
        phase: Math.random() * TAU,
        omega: 0.012 + Math.random() * 0.024,
        refractory: 0,
        opacity: 0.25 + Math.random() * 0.4,
        generation: 0,
      };
    });

    // Clamp to viewport
    for (const p of particlesRef.current) {
      p.x = Math.max(5, Math.min(W - 5, p.x));
      p.y = Math.max(5, Math.min(H - 5, p.y));
    }

    const handleMouse = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const handleLeave = () => {
      mouseRef.current = { x: -1000, y: -1000 };
    };

    canvas.addEventListener('mousemove', handleMouse);
    canvas.addEventListener('mouseleave', handleLeave);
    window.addEventListener('resize', resize);

    let t = 0;
    let chaos = 0.4; // logistic map initial state

    const draw = () => {
      t += 0.007;
      ctx.clearRect(0, 0, W, H);

      const particles = particlesRef.current;
      const mouse = mouseRef.current;
      const N = particles.length;

      // === LOGISTIC MAP CHAOS: spontaneous firing ===
      // Iterate the logistic map 3 times per frame for richer chaos
      for (let i = 0; i < 3; i++) chaos = logistic(chaos);

      // When chaos lands in certain windows, fire a particle
      // This creates unpredictable but deterministic bursts
      if (chaos > 0.96) {
        const idx = Math.floor(chaos * N) % N;
        if (particles[idx].refractory <= 0) {
          particles[idx].energy = 1.0;
          particles[idx].generation++;
        }
      }

      // === UPDATE EACH PARTICLE ===
      for (const p of particles) {
        // 1. FLOW FIELD: fractal noise creates organic currents
        const fAngle = fbm(p.x * 0.0018 + t * 0.25, p.y * 0.0018 + 7.7, 3) * TAU * 2;
        const fMag = fbm(p.x * 0.0018 + 43, p.y * 0.0018 + t * 0.25, 2) * 0.1;
        p.vx += Math.cos(fAngle) * fMag;
        p.vy += Math.sin(fAngle) * fMag;

        // 2. KURAMOTO: advance oscillator phase
        p.phase = (p.phase + p.omega) % TAU;

        // 3. MOUSE INTERACTION
        const mdx = mouse.x - p.x;
        const mdy = mouse.y - p.y;
        const mD = Math.sqrt(mdx * mdx + mdy * mdy);
        if (mD < 240) {
          const pull = (1 - mD / 240) * 0.0006;
          p.vx += mdx * pull;
          p.vy += mdy * pull;
          // Mouse excites nearby particles (like touching a neural network)
          if (mD < 130 && p.refractory <= 0) {
            p.energy = Math.min(1, p.energy + 0.018);
          }
        }

        // 4. ENERGY LIFECYCLE (Game of Life inspired)
        if (p.energy > 0.8 && p.refractory <= 0) {
          // FIRING! Enter refractory period — can't fire again until recovered
          p.refractory = 70 + Math.floor(p.omega * 500); // varied recovery time
        }
        if (p.refractory > 0) {
          p.refractory--;
          p.energy *= 0.93; // rapid decay post-firing
        } else {
          // Slow recovery toward resting potential
          p.energy += (0.12 - p.energy) * 0.003;
        }

        // 5. LÉVY FLIGHT: rare long-distance jumps
        // In nature, many organisms forage using Lévy flights —
        // mostly small steps, occasionally a giant leap
        if (Math.random() < 0.0002) {
          const jumpAngle = Math.random() * TAU;
          // Power-law distributed jump distance (Lévy distribution approximation)
          const u = Math.random();
          const jumpDist = 40 / Math.pow(u, 0.5); // heavy-tailed
          p.x += Math.cos(jumpAngle) * Math.min(jumpDist, 300);
          p.y += Math.sin(jumpAngle) * Math.min(jumpDist, 300);
          p.energy = Math.min(1, p.energy + 0.6); // arrival burst
        }

        // 6. VELOCITY DAMPING with spatial variation
        p.vx *= 0.992;
        p.vy *= 0.992;
        p.x += p.vx;
        p.y += p.vy;

        // Soft boundary wrap (particles loop around seamlessly)
        const m = 40;
        if (p.x < -m) p.x += W + m * 2;
        if (p.x > W + m) p.x -= W + m * 2;
        if (p.y < -m) p.y += H + m * 2;
        if (p.y > H + m) p.y -= H + m * 2;
      }

      // === NEIGHBOR INTERACTIONS ===
      const maxDist = 165;
      const maxDistSq = maxDist * maxDist;

      for (let i = 0; i < N; i++) {
        const pi = particles[i];
        let nCount = 0;

        for (let j = i + 1; j < N; j++) {
          const pj = particles[j];
          const dx = pi.x - pj.x;
          const dy = pi.y - pj.y;
          const dSq = dx * dx + dy * dy;
          if (dSq > maxDistSq) continue;

          const d = Math.sqrt(dSq);
          nCount++;

          // KURAMOTO COUPLING: neighbors synchronize their phases
          // This creates emergent "breathing" patterns where clusters
          // of particles pulse in unison — like synchronized fireflies
          const kCoupling = 0.0025 * (1 - d / maxDist);
          const pDiff = Math.sin(pj.phase - pi.phase);
          pi.phase += kCoupling * pDiff;
          pj.phase -= kCoupling * pDiff;

          // ENERGY PROPAGATION: excited particles excite neighbors
          // This creates visible WAVES traveling through the network
          const eCoupling = (1 - d / maxDist) * 0.007;
          if (pi.energy > 0.65 && pj.refractory <= 0) {
            pj.energy = Math.min(1, pj.energy + eCoupling * pi.energy);
          }
          if (pj.energy > 0.65 && pi.refractory <= 0) {
            pi.energy = Math.min(1, pi.energy + eCoupling * pj.energy);
          }

          // SOFT REPULSION prevents particle overlap
          if (d < 55) {
            const rep = (55 - d) / 55 * 0.012;
            const nx = dx / d, ny = dy / d;
            pi.vx += nx * rep;
            pi.vy += ny * rep;
            pj.vx -= nx * rep;
            pj.vy -= ny * rep;
          }

          // === DRAW CONNECTION ===
          const dAlpha = 1 - d / maxDist;
          const eAvg = (pi.energy + pj.energy) / 2;
          // Phase synchronization creates brighter bonds between in-sync particles
          const sync = (1 + Math.cos(pi.phase - pj.phase)) / 2;
          const alpha = dAlpha * (0.04 + eAvg * 0.3 + sync * 0.06);

          // Color shifts: amber → gold → bright as energy increases
          const cr = 180 + Math.floor(eAvg * 55);
          const cg = 83 + Math.floor(eAvg * 80);
          const cb = 9 + Math.floor(eAvg * 30);

          ctx.beginPath();
          ctx.moveTo(pi.x, pi.y);
          ctx.lineTo(pj.x, pj.y);
          ctx.strokeStyle = `rgba(${cr},${cg},${cb},${alpha})`;
          ctx.lineWidth = 0.3 + eAvg * 1.6 + sync * 0.4;
          ctx.stroke();
        }

        // === GAME OF LIFE SURVIVAL RULES ===

        // ISOLATION (< 2 neighbors): drift toward center, slowly die
        if (nCount < 2) {
          pi.vx += (W / 2 - pi.x) * 0.000025;
          pi.vy += (H / 2 - pi.y) * 0.000025;
        }

        // OVERCROWDING (> 7 neighbors): repel outward, dampen
        if (nCount > 7) {
          pi.vx += (pi.x - W / 2) * 0.000035;
          pi.vy += (pi.y - H / 2) * 0.000035;
          pi.energy *= 0.97;
        }

        // THRIVING (3–5 neighbors): optimal state, gentle energy boost
        // This is the "Rule of Three" from Game of Life — life prospers
        if (nCount >= 3 && nCount <= 5 && pi.refractory <= 0) {
          pi.energy = Math.min(1, pi.energy + 0.0006);
        }
      }

      // === DRAW PARTICLES ===
      for (const p of particles) {
        // Kuramoto phase creates visible "breathing"
        const breathe = 1 + Math.sin(p.phase) * 0.2;
        const eScale = 1 + p.energy * 1.4;
        const r = p.radius * breathe * eScale;

        // Color: warm amber base → bright gold when excited
        const pr = 180 + Math.floor(p.energy * 65);
        const pg = 83 + Math.floor(p.energy * 95);
        const pb = 9 + Math.floor(p.energy * 40);
        const a = Math.min(1, p.opacity + p.energy * 0.55);

        // Core dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, TAU);
        ctx.fillStyle = `rgba(${pr},${pg},${pb},${a})`;
        ctx.fill();

        // Soft energy glow halo
        if (p.energy > 0.3) {
          const gr = r * (2.5 + p.energy * 4.5);
          const g = ctx.createRadialGradient(p.x, p.y, r * 0.4, p.x, p.y, gr);
          g.addColorStop(0, `rgba(${pr},${pg},${pb},${p.energy * 0.15})`);
          g.addColorStop(1, `rgba(${pr},${pg},${pb},0)`);
          ctx.beginPath();
          ctx.arc(p.x, p.y, gr, 0, TAU);
          ctx.fillStyle = g;
          ctx.fill();
        }

        // FIRING BURST: bright flash when energy peaks
        if (p.energy > 0.82) {
          const intensity = (p.energy - 0.82) * 5.5;
          const br = r * 8;
          const bg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, br);
          bg.addColorStop(0, `rgba(255,210,70,${Math.min(0.5, intensity * 0.4)})`);
          bg.addColorStop(0.3, `rgba(255,165,40,${Math.min(0.3, intensity * 0.15)})`);
          bg.addColorStop(1, 'rgba(255,165,40,0)');
          ctx.beginPath();
          ctx.arc(p.x, p.y, br, 0, TAU);
          ctx.fillStyle = bg;
          ctx.fill();
        }
      }

      // Mouse glow
      if (mouse.x > 0 && mouse.y > 0) {
        const mg = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 160);
        mg.addColorStop(0, 'rgba(180,83,9,0.06)');
        mg.addColorStop(0.6, 'rgba(180,83,9,0.02)');
        mg.addColorStop(1, 'rgba(180,83,9,0)');
        ctx.fillStyle = mg;
        ctx.fillRect(mouse.x - 160, mouse.y - 160, 320, 320);
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      canvas.removeEventListener('mousemove', handleMouse);
      canvas.removeEventListener('mouseleave', handleLeave);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'auto',
      }}
    />
  );
}
