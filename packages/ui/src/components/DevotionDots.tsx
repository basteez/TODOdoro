export interface DevotionDotsProps {
  count: number;
  maxVisible?: number;
  onClick?: () => void;
}

export function DevotionDots({ count, maxVisible = 5, onClick }: DevotionDotsProps) {
  if (count <= 0) return null;

  const totalSlots = count >= maxVisible ? count : maxVisible;

  const dots = (
    <div
      aria-label={`${count} Pomodoro${count !== 1 ? 's' : ''} invested`}
      style={{
        display: 'flex',
        gap: 4,
        marginTop: 6,
      }}
    >
      {Array.from({ length: totalSlots }, (_, i) => (
        <span
          key={i}
          aria-hidden="true"
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            backgroundColor: 'var(--devotion)',
            opacity: i < count ? 1 : 0.25,
            display: 'inline-block',
          }}
        />
      ))}
    </div>
  );

  if (onClick) {
    return (
      <button
        type="button"
        aria-label="Open Devotion Record"
        onClick={onClick}
        style={{
          background: 'none',
          border: 'none',
          padding: '8px 4px',
          margin: '-8px -4px',
          cursor: 'pointer',
          display: 'inline-flex',
          minWidth: 44,
          minHeight: 44,
          alignItems: 'center',
        }}
      >
        {dots}
      </button>
    );
  }

  return dots;
}
