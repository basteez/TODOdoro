export interface AnalogTimerWipeProps {
  elapsedMs: number;
  configuredDurationMs: number;
  onCancel?: () => void;
}

const SIZE = 100;
const STROKE_WIDTH = 6;
const RADIUS = (SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function AnalogTimerWipe({ elapsedMs, configuredDurationMs, onCancel }: AnalogTimerWipeProps) {
  const progress = Math.min(Math.max(elapsedMs / configuredDurationMs, 0), 1);
  const offset = CIRCUMFERENCE * (1 - progress);
  const remainingMs = Math.max(configuredDurationMs - elapsedMs, 0);
  const remainingTotalSeconds = Math.ceil(remainingMs / 1_000);
  const displayMinutes = Math.floor(remainingTotalSeconds / 60);
  const displaySeconds = remainingTotalSeconds % 60;
  const displayText = `${displayMinutes}:${String(displaySeconds).padStart(2, '0')}`;
  const ariaMinutes = Math.ceil(remainingMs / 60_000);

  return (
    <div
      role="timer"
      aria-label={`${ariaMinutes} minute${ariaMinutes !== 1 ? 's' : ''} remaining`}
      aria-live="off"
      onClick={onCancel}
      style={{
        position: 'fixed',
        bottom: 24,
        left: 24,
        zIndex: 40,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        pointerEvents: 'auto',
        cursor: onCancel ? 'pointer' : undefined,
      }}
      title={onCancel ? 'Click to cancel session' : undefined}
    >
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        style={{ transform: 'rotate(-90deg)' }}
        aria-hidden="true"
      >
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="var(--surface-border)"
          strokeWidth={STROKE_WIDTH}
        />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="var(--session-active)"
          strokeWidth={STROKE_WIDTH}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.3s linear' }}
        />
      </svg>
      <span
        style={{
          fontFamily: "'JetBrains Mono', 'Inter Mono', ui-monospace, monospace",
          fontSize: 32,
          fontWeight: 600,
          color: 'var(--session-active)',
          lineHeight: 1,
        }}
      >
        {displayText}
      </span>
    </div>
  );
}
