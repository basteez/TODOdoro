const settingsIconStyle: React.CSSProperties = {
  position: 'fixed',
  top: 24,
  right: 24,
  width: 40,
  height: 40,
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

export function SettingsIcon() {
  return (
    <button
      aria-label="Open settings"
      style={settingsIconStyle}
      onMouseOver={(e) => ((e.currentTarget as HTMLButtonElement).style.opacity = '1')}
      onMouseOut={(e) => ((e.currentTarget as HTMLButtonElement).style.opacity = '0.35')}
      onFocus={(e) => ((e.currentTarget as HTMLButtonElement).style.opacity = '1')}
      onBlur={(e) => ((e.currentTarget as HTMLButtonElement).style.opacity = '0.35')}
    >
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M10 2v2M10 16v2M2 10h2M16 10h2M4.22 4.22l1.42 1.42M14.36 14.36l1.42 1.42M4.22 15.78l1.42-1.42M14.36 5.64l1.42-1.42"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
}
