import { useEffect } from 'react';
import { useSettingsStore } from '../stores/useSettingsStore.js';

function applyTheme(theme: 'dark' | 'light' | 'system') {
  const resolved = theme === 'system'
    ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
    : theme;

  if (resolved === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
}

export function useThemeEffect() {
  const theme = useSettingsStore((s) => s.theme);

  useEffect(() => {
    applyTheme(theme);

    if (theme !== 'system') return;

    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const handler = () => applyTheme('system');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);
}
