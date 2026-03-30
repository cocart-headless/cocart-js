import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

const bundlePath = path.resolve(__dirname, '../dist/index.global.js');

describe('CDN bundle (IIFE)', () => {
  it('dist/index.global.js exists', () => {
    expect(fs.existsSync(bundlePath)).toBe(true);
  });

  it('is non-empty', () => {
    const stat = fs.statSync(bundlePath);
    expect(stat.size).toBeGreaterThan(0);
  });

  it('exposes exports on globalThis when evaluated', async () => {
    const code = fs.readFileSync(bundlePath, 'utf8');

    // Run the bundle in a minimal global context
    const context = { globalThis: {} as Record<string, unknown> } as Record<string, unknown>;
    context.window = context.globalThis;
    context.self = context.globalThis;

    const fn = new Function('globalThis', 'window', 'self', code);
    fn(context.globalThis, context.window, context.self);

    const g = context.globalThis as Record<string, unknown>;

    // Core classes
    expect(typeof g.CoCart).toBe('function');
    expect(typeof g.Response).toBe('function');
    expect(typeof g.Paginator).toBe('function');
    expect(typeof g.JwtManager).toBe('function');
    expect(typeof g.SessionManager).toBe('function');

    // Endpoints
    expect(typeof g.Endpoint).toBe('function');
    expect(typeof g.Cart).toBe('function');
    expect(typeof g.Products).toBe('function');
    expect(typeof g.Store).toBe('function');
    expect(typeof g.Sessions).toBe('function');

    // Exceptions
    expect(typeof g.CoCartError).toBe('function');
    expect(typeof g.AuthenticationError).toBe('function');
    expect(typeof g.ValidationError).toBe('function');
    expect(typeof g.VersionError).toBe('function');

    // Utilities
    expect(typeof g.CurrencyFormatter).toBe('function');
    expect(typeof g.TimezoneHelper).toBe('function');
    expect(typeof g.validateProductId).toBe('function');
    expect(typeof g.validateQuantity).toBe('function');
    expect(typeof g.validateEmail).toBe('function');

    // Storage
    expect(typeof g.MemoryStorage).toBe('function');
    expect(typeof g.LocalStorage).toBe('function');
    expect(typeof g.EncryptedStorage).toBe('function');
  });

  it('CoCart class is instantiable', () => {
    const code = fs.readFileSync(bundlePath, 'utf8');

    const context = { globalThis: {} as Record<string, unknown> } as Record<string, unknown>;
    context.window = context.globalThis;
    context.self = context.globalThis;

    const fn = new Function('globalThis', 'window', 'self', code);
    fn(context.globalThis, context.window, context.self);

    const g = context.globalThis as Record<string, unknown>;
    const CoCartClass = g.CoCart as new (url: string) => unknown;
    const instance = new CoCartClass('https://example.com');
    expect(instance).toBeDefined();
  });
});
