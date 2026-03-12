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
  const remainingMinutes = Math.ceil(Math.max(configuredDurationMs - elapsedMs, 0) / 60_000);

  return (
    <div
      role="timer"
      aria-label={`${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''} remaining`}
      aria-live="off"
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
      }}
    >
      {onCancel && (
        <button
          aria-label="Cancel session"
          onClick={onCancel}
          style={{
            position: 'absolute',
            top: -14,
            right: -14,
            width: 44,
            height: 44,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--surface)',
            border: '1px solid var(--surface-border)',
            borderRadius: '50%',
            cursor: 'pointer',
            opacity: 0.5,
            color: 'var(--text-muted)',
            padding: 0,
            fontSize: 14,
            lineHeight: 1,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
            <path d="M9.35 3.35L6.71 6l2.64 2.65-.71.7L6 6.71 3.35 9.35l-.7-.7L5.29 6 2.65 3.35l.7-.7L6 5.29l2.65-2.64.7.7z" />
          </svg>
        </button>
      )}
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
          fontSize: 48,
          fontWeight: 600,
          color: 'var(--session-active)',
          lineHeight: 1,
        }}
      >
        {remainingMinutes}
      </span>
    </div>
  );
}
