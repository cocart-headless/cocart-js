import { describe, it, expect } from 'vitest';
import { MemoryStorage } from '../src/storage/memory-storage.js';

describe('MemoryStorage', () => {
  it('stores and retrieves a value', () => {
    const storage = new MemoryStorage();
    storage.set('key', 'value');
    expect(storage.get('key')).toBe('value');
  });

  it('returns null for missing keys', () => {
    const storage = new MemoryStorage();
    expect(storage.get('nonexistent')).toBeNull();
  });

  it('deletes a value', () => {
    const storage = new MemoryStorage();
    storage.set('key', 'value');
    storage.delete('key');
    expect(storage.get('key')).toBeNull();
  });

  it('overwrites existing values', () => {
    const storage = new MemoryStorage();
    storage.set('key', 'first');
    storage.set('key', 'second');
    expect(storage.get('key')).toBe('second');
  });

  it('handles multiple keys independently', () => {
    const storage = new MemoryStorage();
    storage.set('a', '1');
    storage.set('b', '2');
    expect(storage.get('a')).toBe('1');
    expect(storage.get('b')).toBe('2');
    storage.delete('a');
    expect(storage.get('a')).toBeNull();
    expect(storage.get('b')).toBe('2');
  });
});
