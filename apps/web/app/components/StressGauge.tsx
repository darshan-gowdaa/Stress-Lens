interface StressGaugeProps {
  level: number; // 1-10
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

// maps stress 1-10 to color and emoji
function stressColor(level: number): string {
  if (level <= 3) return '#22c55e';   // green
  if (level <= 6) return '#f59e0b';   // amber
  return '#ef4444';                    // red
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
  return `https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/${names[level - 1]}`;
}

function stressLabel(level: number): string {
  if (level <= 3) return 'Low';
  if (level <= 6) return 'Moderate';
  if (level <= 8) return 'High';
  return 'Critical';
}

const sizes = {
  sm: { outer: 64, stroke: 5, fontSize: 16, emojiSize: 'text-xl' },
  md: { outer: 100, stroke: 7, fontSize: 26, emojiSize: 'text-3xl' },
  lg: { outer: 140, stroke: 9, fontSize: 36, emojiSize: 'text-5xl' },
};

export default function StressGauge({ level, size = 'md', showLabel = true }: StressGaugeProps) {
  const { outer, stroke, fontSize, emojiSize } = sizes[size];
  const radius = (outer - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  // arc covers 270 degrees (from 135deg to 405deg = 3/4 circle)
  const arcLength = circumference * 0.75;
  const filled = arcLength * ((level - 1) / 9);
  const color = stressColor(level);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: outer, height: outer }}>
        <svg
          width={outer}
          height={outer}
          viewBox={`0 0 ${outer} ${outer}`}
          style={{ transform: 'rotate(135deg)' }}
          aria-label={`Stress level ${level} out of 10`}
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
          {/* filled arc */}
          <circle
            cx={outer / 2}
            cy={outer / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeDasharray={`${filled} ${circumference}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.3s ease, stroke 0.3s ease' }}
          />
        </svg>
        {/* center emoji */}
        <div
          className={`absolute inset-0 flex items-center justify-center`}
          style={{ transform: 'none' }}
          aria-hidden="true"
        >
          <img src={stressIconUrl(level)} alt="Stress emoji" style={{ width: radius, height: radius }} />
        </div>
      </div>

      {showLabel && (
        <div className="text-center">
          <div className="font-bold" style={{ color, fontSize }}>
            {level}<span className="text-[var(--color-on-surface-variant)] font-normal text-sm">/10</span>
          </div>
          <div className="text-xs font-medium text-[var(--color-on-surface-variant)]">
            {stressLabel(level)}
          </div>
        </div>
      )}
    </div>
  );
}

// exported for use in dashboard bars
export { stressColor, stressLabel, stressIconUrl };
