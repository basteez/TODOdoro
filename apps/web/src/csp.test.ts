import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// Load config files as raw text via Vite's import.meta.glob (no Node fs needed)
// ---------------------------------------------------------------------------

const viteConfigs = import.meta.glob('../vite.config.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
});
const viteConfigText = Object.values(viteConfigs)[0] as string;

const vercelConfigs = import.meta.glob('../vercel.json', {
  query: '?raw',
  import: 'default',
  eager: true,
});
const vercelJson = JSON.parse(Object.values(vercelConfigs)[0] as string) as {
  headers: { source: string; headers: { key: string; value: string }[] }[];
};

// Load all source files for dangerouslySetInnerHTML audit
const sourceFiles = import.meta.glob('./**/*.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse a CSP string into a Map of directive → values array. */
function parseCSP(csp: string): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const part of csp.split(';')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const [directive, ...values] = trimmed.split(/\s+/);
    map.set(directive!, values);
  }
  return map;
}

// ---------------------------------------------------------------------------
// Extract headers from config files
// ---------------------------------------------------------------------------

function getProductionHeaders() {
  const headers = vercelJson.headers[0]!.headers;
  return {
    csp: headers.find((h) => h.key === 'Content-Security-Policy')!.value,
    coep: headers.find((h) => h.key === 'Cross-Origin-Embedder-Policy')!.value,
    coop: headers.find((h) => h.key === 'Cross-Origin-Opener-Policy')!.value,
  };
}

function getDevHeaders() {
  // Extract COEP header value
  const coepMatch = viteConfigText.match(
    /'Cross-Origin-Embedder-Policy':\s*'([^']+)'/,
  );
  const coep = coepMatch?.[1] ?? '';

  // Extract COOP header value
  const coopMatch = viteConfigText.match(
    /'Cross-Origin-Opener-Policy':\s*'([^']+)'/,
  );
  const coop = coopMatch?.[1] ?? '';

  // Extract CSP directives from the array joined by '; '
  const cspLines: string[] = [];
  const cspArrayMatch = viteConfigText.match(
    /'Content-Security-Policy':\s*\[([\s\S]*?)\]\.join/,
  );
  if (cspArrayMatch?.[1]) {
    for (const m of cspArrayMatch[1].matchAll(/"([^"]+)"/g)) {
      cspLines.push(m[1]!);
    }
  }

  return { csp: cspLines.join('; '), coep, coop };
}

// ---------------------------------------------------------------------------
// Task 3: CSP verification tests
// ---------------------------------------------------------------------------

describe('Production CSP (vercel.json) — Architecture D9', () => {
  const prod = getProductionHeaders();
  const csp = parseCSP(prod.csp);

  it('includes COEP require-corp header', () => {
    expect(prod.coep).toBe('require-corp');
  });

  it('includes COOP same-origin header', () => {
    expect(prod.coop).toBe('same-origin');
  });

  it("sets default-src to 'self'", () => {
    expect(csp.get('default-src')).toEqual(["'self'"]);
  });

  it("sets script-src to 'self' 'wasm-unsafe-eval'", () => {
    expect(csp.get('script-src')).toEqual(["'self'", "'wasm-unsafe-eval'"]);
  });

  it("sets style-src to 'self' 'unsafe-inline'", () => {
    expect(csp.get('style-src')).toEqual(["'self'", "'unsafe-inline'"]);
  });

  it("sets img-src to 'self' data:", () => {
    expect(csp.get('img-src')).toEqual(["'self'", 'data:']);
  });

  it("sets connect-src to exactly 'none' (zero external network calls)", () => {
    expect(csp.get('connect-src')).toEqual(["'none'"]);
  });

  it("sets frame-src to 'none'", () => {
    expect(csp.get('frame-src')).toEqual(["'none'"]);
  });

  it("sets worker-src to 'self' blob:", () => {
    expect(csp.get('worker-src')).toEqual(["'self'", 'blob:']);
  });

  it('vercel.json source pattern covers all routes', () => {
    expect(vercelJson.headers[0]!.source).toBe('/(.*)');
  });
});

describe('Dev CSP (vite.config.ts) — superset of production', () => {
  const dev = getDevHeaders();
  const devCSP = parseCSP(dev.csp);

  it('includes COEP require-corp header', () => {
    expect(dev.coep).toBe('require-corp');
  });

  it('includes COOP same-origin header', () => {
    expect(dev.coop).toBe('same-origin');
  });

  it('dev CSP is a strict superset of production (only additive relaxations)', () => {
    const prod = getProductionHeaders();
    const prodCSP = parseCSP(prod.csp);

    for (const [directive, prodValues] of prodCSP) {
      const devValues = devCSP.get(directive);
      expect(devValues, `missing directive: ${directive}`).toBeDefined();

      for (const v of prodValues) {
        // connect-src is a special case: prod='none' means "block all",
        // dev='self' ws: is strictly more permissive (superset)
        if (directive === 'connect-src' && v === "'none'") continue;
        expect(devValues, `${directive} missing value ${v}`).toContain(v);
      }
    }
  });

  it('only script-src and connect-src differ from production', () => {
    const prod = getProductionHeaders();
    const prodCSP = parseCSP(prod.csp);

    for (const [directive, prodValues] of prodCSP) {
      const devValues = devCSP.get(directive)!;
      if (directive === 'script-src' || directive === 'connect-src') continue;
      expect(devValues, `unexpected divergence in ${directive}`).toEqual(
        prodValues,
      );
    }
  });
});

// ---------------------------------------------------------------------------
// Task 4: dangerouslySetInnerHTML codebase audit (NFR15)
// ---------------------------------------------------------------------------

describe('dangerouslySetInnerHTML guardrail (NFR15)', () => {
  it('no source file uses dangerouslySetInnerHTML', () => {
    const violations: string[] = [];
    for (const [path, content] of Object.entries(sourceFiles)) {
      if ((content as string).includes('dangerouslySetInnerHTML')) {
        violations.push(path);
      }
    }

    expect(
      violations,
      `dangerouslySetInnerHTML found in: ${violations.join(', ')}`,
    ).toEqual([]);
  });
});
