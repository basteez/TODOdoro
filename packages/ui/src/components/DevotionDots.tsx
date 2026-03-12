export interface DevotionDotsProps {
  count: number;
}

export function DevotionDots({ count }: DevotionDotsProps) {
  if (count <= 0) return null;

  return (
    <div
      aria-label={`${count} Pomodoro${count !== 1 ? 's' : ''} invested`}
      style={{
        display: 'flex',
        gap: 4,
        marginTop: 6,
      }}
    >
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          aria-hidden="true"
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            backgroundColor: 'var(--devotion)',
            display: 'inline-block',
          }}
        />
      ))}
    </div>
  );
}
