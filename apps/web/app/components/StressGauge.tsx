'use client';
import { motion } from 'framer-motion';

interface StressGaugeProps {
  level: number; // 1-10
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showLabel?: boolean;
  glow?: boolean;
  className?: string;
}

// Maps stress 1-10 to theme colors
function stressColor(level: number): string {
  if (level <= 3) return '#22c55e'; // green (low)
  if (level <= 6) return '#f59e0b'; // amber (moderate)
  if (level <= 8) return '#f97316'; // orange (high)
  return '#ef4444';                  // red (critical)
}

function stressGlowColor(level: number): string {
  if (level <= 3) return 'rgba(34, 197, 94, 0.35)';
  if (level <= 6) return 'rgba(245, 158, 11, 0.35)';
  if (level <= 8) return 'rgba(249, 115, 22, 0.45)';
  return 'rgba(239, 68, 68, 0.55)';
}

function stressIconUrl(level: number): string {
  const names = [
    'Beaming%20Face%20with%20Smiling%20Eyes.png',
    'Smiling%20Face%20with%20Smiling%20Eyes.png',
    'Slightly%20Smiling%20Face.png',
    'Neutral%20Face.png',
    'Confused%20Face.png',
    'Worried%20Face.png',
    'Anxious%20Face%20with%20Sweat.png',
    'Tired%20Face.png',
    'Loudly%20Crying%20Face.png',
    'Exploding%20Head.png'
  ];
  const safeLevel = Math.max(1, Math.min(10, Math.round(level)));
  return `https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/${names[safeLevel - 1]}`;
}

function stressLabel(level: number): string {
  if (level <= 3) return 'Low';
  if (level <= 6) return 'Moderate';
  if (level <= 8) return 'High';
  return 'Critical';
}

const sizes = {
  sm: { outer: 64, stroke: 5, fontSize: 16, emojiSize: 28 },
  md: { outer: 104, stroke: 8, fontSize: 26, emojiSize: 48 },
  lg: { outer: 140, stroke: 10, fontSize: 36, emojiSize: 64 },
  xl: { outer: 180, stroke: 12, fontSize: 44, emojiSize: 84 },
};

export default function StressGauge({
  level,
  size = 'md',
  showLabel = true,
  glow = true,
  className = '',
}: StressGaugeProps) {
  const boundedLevel = Math.max(1, Math.min(10, level));
  const { outer, stroke, fontSize, emojiSize } = sizes[size];
  const radius = (outer - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  // Arc covers 270 degrees (3/4 of a circle)
  const arcLength = circumference * 0.75;
  const filled = arcLength * ((boundedLevel - 1) / 9);
  const color = stressColor(boundedLevel);
  const glowShadow = glow ? `0 0 20px ${stressGlowColor(boundedLevel)}` : undefined;

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <div
        className="relative flex items-center justify-center transition-all duration-300"
        style={{
          width: outer,
          height: outer,
          filter: glow ? `drop-shadow(0 0 8px ${color}66)` : undefined,
        }}
      >
        <svg
          width={outer}
          height={outer}
          viewBox={`0 0 ${outer} ${outer}`}
          style={{ transform: 'rotate(135deg)' }}
          aria-label={`Stress gauge showing level ${boundedLevel} out of 10`}
          role="img"
        >
          {/* background track */}
          <circle
            cx={outer / 2}
            cy={outer / 2}
            r={radius}
            fill="none"
            stroke="var(--color-surface-variant)"
            strokeWidth={stroke}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeLinecap="round"
          />
          {/* filled dynamic arc */}
          <circle
            cx={outer / 2}
            cy={outer / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeDasharray={`${filled} ${circumference}`}
            strokeLinecap="round"
            style={{
              transition: 'stroke-dasharray 0.35s ease, stroke 0.35s ease',
            }}
          />
        </svg>

        {/* Center animated emoji */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
          aria-hidden="true"
        >
          <motion.div
            key={boundedLevel}
            initial={{ scale: 0.8, rotate: -8 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 22 }}
            className="flex items-center justify-center"
          >
            <img
              src={stressIconUrl(boundedLevel)}
              alt={`Level ${boundedLevel} emoji`}
              style={{ width: emojiSize, height: emojiSize }}
              className="object-contain drop-shadow-sm"
              loading="eager"
            />
          </motion.div>
        </div>
      </div>

      {showLabel && (
        <div className="text-center select-none">
          <div className="font-bold leading-tight" style={{ color, fontSize }}>
            {boundedLevel}
            <span className="text-[var(--color-on-surface-variant)] font-normal text-sm ml-0.5">
              /10
            </span>
          </div>
          <div
            className="text-xs font-semibold px-2.5 py-0.5 mt-0.5 rounded-full inline-block transition-colors duration-200"
            style={{
              backgroundColor: `${color}18`,
              color: color,
            }}
          >
            {stressLabel(boundedLevel)}
          </div>
        </div>
      )}
    </div>
  );
}

// Exports for reusable indicators across pages
export { stressColor, stressLabel, stressIconUrl, stressGlowColor };

