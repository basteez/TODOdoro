const shelfIconStyle: React.CSSProperties = {
  position: 'fixed',
  bottom: 24,
  right: 24,
  width: 44,
  height: 44,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  opacity: 0.35,
  color: 'var(--text-primary)',
  borderRadius: 8,
  transition: 'opacity 0.15s ease',
  padding: 0,
};

export interface ShelfIconProps {
  onClick?: (() => void) | undefined;
}

export function ShelfIcon({ onClick }: ShelfIconProps) {
  return (
    <button
      aria-label="Open shelf"
      style={shelfIconStyle}
      onClick={onClick}
      onMouseOver={(e) => ((e.currentTarget as HTMLButtonElement).style.opacity = '1')}
      onMouseOut={(e) => ((e.currentTarget as HTMLButtonElement).style.opacity = '0.35')}
      onFocus={(e) => ((e.currentTarget as HTMLButtonElement).style.opacity = '1')}
      onBlur={(e) => ((e.currentTarget as HTMLButtonElement).style.opacity = '0.35')}
    >
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <rect x="2" y="13" width="16" height="2" rx="1" fill="currentColor" />
        <rect x="2" y="9" width="16" height="2" rx="1" fill="currentColor" />
        <rect x="2" y="5" width="16" height="2" rx="1" fill="currentColor" />
      </svg>
    </button>
  );
}
