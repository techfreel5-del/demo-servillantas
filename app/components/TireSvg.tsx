"use client";

const COLORS = [
  { accent: "#E53935", rim: "#333" },
  { accent: "#3B82F6", rim: "#2A2A2A" },
  { accent: "#EF4444", rim: "#333" },
  { accent: "#F97316", rim: "#2A2A2A" },
  { accent: "#10B981", rim: "#333" },
  { accent: "#8B5CF6", rim: "#2A2A2A" },
  { accent: "#EC4899", rim: "#333" },
  { accent: "#06B6D4", rim: "#2A2A2A" },
  { accent: "#E53935", rim: "#1A1A1A" },
  { accent: "#EF4444", rim: "#1A1A1A" },
  { accent: "#3B82F6", rim: "#1A1A1A" },
  { accent: "#F97316", rim: "#1A1A1A" },
];

interface Props {
  seed?: number;
  size?: number;
  className?: string;
  brand?: string;
}

export default function TireSvg({ seed = 1, size = 160, className = "", brand }: Props) {
  const idx = ((seed - 1) % COLORS.length);
  const { accent, rim } = COLORS[idx];
  const treads = 8 + (seed % 4);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer tire */}
      <circle cx="100" cy="100" r="95" fill="#1A1A1A" stroke="#2A2A2A" strokeWidth="2" />
      {/* Tread band */}
      <circle cx="100" cy="100" r="85" fill="none" stroke="#2A2A2A" strokeWidth="12" />
      {/* Tread pattern */}
      {Array.from({ length: treads }).map((_, i) => {
        const angle = (i * 360) / treads;
        const rad = (angle * Math.PI) / 180;
        const x1 = 100 + 78 * Math.cos(rad);
        const y1 = 100 + 78 * Math.sin(rad);
        const x2 = 100 + 92 * Math.cos(rad);
        const y2 = 100 + 92 * Math.sin(rad);
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={accent}
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.7"
          />
        );
      })}
      {/* Inner sidewall */}
      <circle cx="100" cy="100" r="68" fill="#1A1A1A" stroke="#333" strokeWidth="1.5" />
      {/* Rim */}
      <circle cx="100" cy="100" r="42" fill={rim} stroke="#444" strokeWidth="2" />
      {/* Rim spokes */}
      {Array.from({ length: 5 }).map((_, i) => {
        const angle = (i * 72) - 90;
        const rad = (angle * Math.PI) / 180;
        const x2 = 100 + 36 * Math.cos(rad);
        const y2 = 100 + 36 * Math.sin(rad);
        return (
          <line
            key={i}
            x1="100"
            y1="100"
            x2={x2}
            y2={y2}
            stroke="#555"
            strokeWidth="3"
            strokeLinecap="round"
          />
        );
      })}
      {/* Hub */}
      <circle cx="100" cy="100" r="14" fill={accent} />
      <circle cx="100" cy="100" r="6" fill={rim} />
      {/* Brand label */}
      {brand && (
        <text
          x="100"
          y="160"
          textAnchor="middle"
          fill="#666"
          fontSize="9"
          fontFamily="Arial, sans-serif"
          fontWeight="bold"
          letterSpacing="1"
        >
          {brand.toUpperCase()}
        </text>
      )}
    </svg>
  );
}
