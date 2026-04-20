import { useEffect, useRef } from 'react';

export default function WaveSection() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    let W = 0;
    const H = 100;

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      W = rect?.width || 800;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener('resize', resize);

    let t = 0;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      t += 0.008;

      const waves = [
        { amp: 12, freq: 0.008, speed: 1, color: 'rgba(180, 83, 9, 0.08)', y: 50 },
        { amp: 8, freq: 0.012, speed: 1.3, color: 'rgba(77, 124, 106, 0.06)', y: 55 },
        { amp: 15, freq: 0.006, speed: 0.7, color: 'rgba(180, 83, 9, 0.04)', y: 45 },
      ];

      for (const wave of waves) {
        ctx.beginPath();
        ctx.moveTo(0, H);
        for (let x = 0; x <= W; x += 2) {
          const y = wave.y + Math.sin(x * wave.freq + t * wave.speed) * wave.amp
            + Math.sin(x * wave.freq * 2.3 + t * wave.speed * 0.7) * (wave.amp * 0.4);
          ctx.lineTo(x, y);
        }
        ctx.lineTo(W, H);
        ctx.closePath();
        ctx.fillStyle = wave.color;
        ctx.fill();
      }

      rafRef.current = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} style={{ display: 'block', width: '100%' }} />;
}
