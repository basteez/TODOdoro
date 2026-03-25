import { describe, it, expect } from 'vitest';
// @ts-expect-error — Node built-ins available at test-time but not in browser tsconfig
import { readFileSync } from 'node:fs';
// @ts-expect-error — same as above
import { resolve } from 'node:path';

// @ts-expect-error — process is available at test-time (Node)
const cwd: string = process.cwd();
const css = readFileSync(resolve(cwd, 'src/index.css'), 'utf-8');

describe('Reduced motion CSS rule', () => {
  it('index.css contains prefers-reduced-motion media query', () => {
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
  });

  it('global rule suppresses transitions and animations with !important', () => {
    expect(css).toContain('transition-duration: 0s !important');
    expect(css).toContain('animation-duration: 0s !important');
  });
});
