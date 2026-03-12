export function SkipLink() {
  return (
    <a
      href="#main-canvas"
      className="absolute left-4 top-4 z-50 -translate-y-full focus:translate-y-0 transition-transform px-4 py-2 rounded text-sm font-medium"
      style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--surface-border)',
        color: 'var(--text-primary)',
      }}
    >
      Skip to canvas
    </a>
  );
}
