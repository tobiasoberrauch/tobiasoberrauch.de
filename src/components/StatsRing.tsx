import { useEffect, useRef, useState } from 'react';

interface Props {
  value: number;
  max: number;
  label: string;
  suffix?: string;
  color?: string;
  size?: number;
}

export default function StatsRing({ value, max, label, suffix = '', color = '#B45309', size = 120 }: Props) {
  const [current, setCurrent] = useState(0);
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    let start = 0;
    const duration = 1500;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      start = eased * value;
      setCurrent(Math.round(start));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [visible, value]);

  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = visible ? (current / max) * circumference : 0;

  return (
    <div ref={ref} style={{ textAlign: 'center' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#E7E5E4"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.1s ease' }}
        />
        <text
          x={size / 2}
          y={size / 2 - 4}
          textAnchor="middle"
          dominantBaseline="central"
          style={{
            fontFamily: "'Fraunces', Georgia, serif",
            fontSize: size * 0.28,
            fontWeight: 700,
            fill: '#1C1917',
          }}
        >
          {current}{suffix}
        </text>
        <text
          x={size / 2}
          y={size / 2 + size * 0.18}
          textAnchor="middle"
          dominantBaseline="central"
          style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: size * 0.1,
            fontWeight: 400,
            fill: '#78716C',
          }}
        >
          {label}
        </text>
      </svg>
    </div>
  );
}
