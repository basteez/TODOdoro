export interface ExplorationButtonProps {
  disabled?: boolean;
  onClick: () => void;
}

const buttonStyle: React.CSSProperties = {
  position: 'fixed',
  bottom: 24,
  left: 24,
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

const disabledStyle: React.CSSProperties = {
  ...buttonStyle,
  cursor: 'not-allowed',
  opacity: 0.15,
};

export function ExplorationButton({ disabled = false, onClick }: ExplorationButtonProps) {
  return (
    <button
      aria-label="Start exploration session"
      disabled={disabled}
      style={disabled ? disabledStyle : buttonStyle}
      onClick={onClick}
      onMouseOver={(e) => {
        if (!disabled) (e.currentTarget as HTMLButtonElement).style.opacity = '1';
      }}
      onMouseOut={(e) => {
        if (!disabled) (e.currentTarget as HTMLButtonElement).style.opacity = '0.35';
      }}
      onFocus={(e) => {
        if (!disabled) (e.currentTarget as HTMLButtonElement).style.opacity = '1';
      }}
      onBlur={(e) => {
        if (!disabled) (e.currentTarget as HTMLButtonElement).style.opacity = '0.35';
      }}
    >
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <polygon points="8,6 15,10 8,14" fill="currentColor" />
      </svg>
    </button>
  );
}
