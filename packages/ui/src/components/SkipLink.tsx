export function SkipLink() {
  return (
    <a
      href="#main-canvas"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:rounded focus:text-sm focus:font-medium"
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
