import { useEffect, useRef, useState } from 'react';

interface Node {
  id: string;
  label: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  radius: number;
  group: number;
}

interface Link {
  source: string;
  target: string;
}

const NODES_DATA: Omit<Node, 'x' | 'y' | 'vx' | 'vy'>[] = [
  { id: 'hb', label: 'Hochbegabung', color: '#B45309', radius: 24, group: 0 },
  { id: 'iq', label: 'IQ ≥ 130', color: '#D97706', radius: 16, group: 1 },
  { id: 'kreativ', label: 'Kreativität', color: '#4D7C6A', radius: 14, group: 1 },
  { id: 'sens', label: 'Sensibilität', color: '#4D7C6A', radius: 14, group: 1 },
  { id: 'perfekt', label: 'Perfektionismus', color: '#92400E', radius: 13, group: 2 },
  { id: 'schule', label: 'Schule', color: '#D97706', radius: 16, group: 2 },
  { id: 'unter', label: 'Unterforderung', color: '#92400E', radius: 13, group: 2 },
  { id: 'foerder', label: 'Förderung', color: '#4D7C6A', radius: 15, group: 3 },
  { id: 'skip', label: 'Überspringen', color: '#78716C', radius: 11, group: 3 },
  { id: 'enrich', label: 'Enrichment', color: '#78716C', radius: 11, group: 3 },
  { id: 'eltern', label: 'Elterngruppe', color: '#B45309', radius: 15, group: 4 },
  { id: 'lvh', label: 'LVH BaWü', color: '#B45309', radius: 14, group: 4 },
  { id: 'test', label: 'Testung', color: '#D97706', radius: 13, group: 1 },
  { id: 'async', label: 'Asynchronie', color: '#4D7C6A', radius: 12, group: 1 },
];

const LINKS_DATA: Link[] = [
  { source: 'hb', target: 'iq' },
  { source: 'hb', target: 'kreativ' },
  { source: 'hb', target: 'sens' },
  { source: 'hb', target: 'schule' },
  { source: 'hb', target: 'foerder' },
  { source: 'hb', target: 'eltern' },
  { source: 'hb', target: 'test' },
  { source: 'sens', target: 'perfekt' },
  { source: 'sens', target: 'async' },
  { source: 'schule', target: 'unter' },
  { source: 'schule', target: 'foerder' },
  { source: 'foerder', target: 'skip' },
  { source: 'foerder', target: 'enrich' },
  { source: 'eltern', target: 'lvh' },
  { source: 'unter', target: 'perfekt' },
  { source: 'iq', target: 'test' },
];

export default function ForceGraph() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<Node[]>([]);
  const [hovered, setHovered] = useState<string | null>(null);
  const dragRef = useRef<{ node: Node | null; offsetX: number; offsetY: number }>({
    node: null, offsetX: 0, offsetY: 0,
  });
  const rafRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const W = 700;
    const H = 450;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = '100%';
    canvas.style.maxWidth = W + 'px';
    canvas.style.height = 'auto';
    canvas.style.aspectRatio = `${W}/${H}`;
    ctx.scale(dpr, dpr);

    const cx = W / 2;
    const cy = H / 2;

    nodesRef.current = NODES_DATA.map((n, i) => ({
      ...n,
      x: cx + (Math.random() - 0.5) * 200,
      y: cy + (Math.random() - 0.5) * 200,
      vx: 0,
      vy: 0,
    }));

    const getScale = () => {
      const rect = canvas.getBoundingClientRect();
      return rect.width / W;
    };

    const getMousePos = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const scale = getScale();
      return { x: (e.clientX - rect.left) / scale, y: (e.clientY - rect.top) / scale };
    };

    const findNode = (mx: number, my: number) => {
      for (const n of nodesRef.current) {
        const dx = mx - n.x;
        const dy = my - n.y;
        if (dx * dx + dy * dy < (n.radius + 8) * (n.radius + 8)) return n;
      }
      return null;
    };

    const onDown = (e: MouseEvent) => {
      const pos = getMousePos(e);
      const node = findNode(pos.x, pos.y);
      if (node) {
        dragRef.current = { node, offsetX: pos.x - node.x, offsetY: pos.y - node.y };
        canvas.style.cursor = 'grabbing';
      }
    };

    const onMove = (e: MouseEvent) => {
      const pos = getMousePos(e);
      if (dragRef.current.node) {
        dragRef.current.node.x = pos.x - dragRef.current.offsetX;
        dragRef.current.node.y = pos.y - dragRef.current.offsetY;
        dragRef.current.node.vx = 0;
        dragRef.current.node.vy = 0;
      } else {
        const found = findNode(pos.x, pos.y);
        canvas.style.cursor = found ? 'grab' : 'default';
        setHovered(found?.id || null);
      }
    };

    const onUp = () => {
      dragRef.current.node = null;
      canvas.style.cursor = 'default';
    };

    canvas.addEventListener('mousedown', onDown);
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseup', onUp);
    canvas.addEventListener('mouseleave', onUp);

    const nodeMap = new Map(nodesRef.current.map(n => [n.id, n]));

    const simulate = () => {
      const nodes = nodesRef.current;

      // Center gravity
      for (const n of nodes) {
        n.vx += (cx - n.x) * 0.001;
        n.vy += (cy - n.y) * 0.001;
      }

      // Repulsion
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[j].x - nodes[i].x;
          const dy = nodes[j].y - nodes[i].y;
          const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
          const force = 800 / (dist * dist);
          nodes[i].vx -= (dx / dist) * force;
          nodes[i].vy -= (dy / dist) * force;
          nodes[j].vx += (dx / dist) * force;
          nodes[j].vy += (dy / dist) * force;
        }
      }

      // Link attraction
      for (const link of LINKS_DATA) {
        const s = nodeMap.get(link.source);
        const t = nodeMap.get(link.target);
        if (!s || !t) continue;
        const dx = t.x - s.x;
        const dy = t.y - s.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const target = 70;
        const force = (dist - target) * 0.005;
        s.vx += (dx / dist) * force;
        s.vy += (dy / dist) * force;
        t.vx -= (dx / dist) * force;
        t.vy -= (dy / dist) * force;
      }

      // Apply velocity
      for (const n of nodes) {
        if (dragRef.current.node === n) continue;
        n.vx *= 0.9;
        n.vy *= 0.9;
        n.x += n.vx;
        n.y += n.vy;
        n.x = Math.max(n.radius, Math.min(W - n.radius, n.x));
        n.y = Math.max(n.radius, Math.min(H - n.radius, n.y));
      }
    };

    const draw = () => {
      simulate();
      ctx.clearRect(0, 0, W, H);
      const nodes = nodesRef.current;

      // Draw links
      for (const link of LINKS_DATA) {
        const s = nodeMap.get(link.source);
        const t = nodeMap.get(link.target);
        if (!s || !t) continue;
        const isHL = hovered === link.source || hovered === link.target;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(t.x, t.y);
        ctx.strokeStyle = isHL ? 'rgba(180, 83, 9, 0.35)' : 'rgba(180, 83, 9, 0.12)';
        ctx.lineWidth = isHL ? 1.5 : 0.8;
        ctx.stroke();
      }

      // Draw nodes
      for (const n of nodes) {
        const isHL = hovered === n.id;

        // Glow
        if (isHL) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.radius + 8, 0, Math.PI * 2);
          ctx.fillStyle = n.color + '18';
          ctx.fill();
        }

        // Circle
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fillStyle = isHL ? n.color : n.color + 'CC';
        ctx.fill();

        // Border
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Label
        ctx.fillStyle = '#1C1917';
        ctx.font = `${isHL ? 500 : 400} ${n.radius < 14 ? 9 : 10}px Outfit, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(n.label, n.x, n.y + n.radius + 14);
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(rafRef.current);
      canvas.removeEventListener('mousedown', onDown);
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mouseup', onUp);
      canvas.removeEventListener('mouseleave', onUp);
    };
  }, [hovered]);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      background: 'rgba(255,255,255,0.4)',
      borderRadius: '16px',
      border: '1px solid #E7E5E4',
      padding: '1rem',
      overflow: 'hidden',
    }}>
      <canvas ref={canvasRef} />
    </div>
  );
}
