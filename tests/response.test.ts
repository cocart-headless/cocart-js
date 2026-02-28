import { describe, it, expect } from 'vitest';
import { Response } from '../src/response.js';

function makeResponse(status: number, body: string, headers: Record<string, string> = {}): Response {
  const h = new Headers(headers);
  return new Response(status, h, body);
}

describe('Response', () => {
  describe('toObject()', () => {
    it('parses JSON body', () => {
      const r = makeResponse(200, '{"name":"Test"}');
      expect(r.toObject()).toEqual({ name: 'Test' });
    });

    it('returns empty object for invalid JSON', () => {
      const r = makeResponse(200, 'not json');
      expect(r.toObject()).toEqual({});
    });

    it('caches parsed data', () => {
      const r = makeResponse(200, '{"a":1}');
      const first = r.toObject();
      const second = r.toObject();
      expect(first).toBe(second);
    });
  });

  describe('toJson()', () => {
    it('returns pretty JSON by default', () => {
      const r = makeResponse(200, '{"a":1}');
      expect(r.toJson()).toBe('{\n  "a": 1\n}');
    });

    it('returns compact JSON when pretty=false', () => {
      const r = makeResponse(200, '{"a":1}');
      expect(r.toJson(false)).toBe('{"a":1}');
    });
  });

  describe('isSuccessful() / isError()', () => {
    it('identifies 200 as successful', () => {
      const r = makeResponse(200, '{}');
      expect(r.isSuccessful()).toBe(true);
      expect(r.isError()).toBe(false);
    });

    it('identifies 201 as successful', () => {
      const r = makeResponse(201, '{}');
      expect(r.isSuccessful()).toBe(true);
    });

    it('identifies 400 as error', () => {
      const r = makeResponse(400, '{}');
      expect(r.isSuccessful()).toBe(false);
      expect(r.isError()).toBe(true);
    });

    it('identifies 500 as error', () => {
      const r = makeResponse(500, '{}');
      expect(r.isError()).toBe(true);
    });
  });

  describe('get() - dot notation', () => {
    const body = JSON.stringify({
      totals: { subtotal: '10.00', tax: '1.00' },
      items: [{ name: 'Widget' }, { name: 'Gadget' }],
      simple: 'value',
    });

    it('accesses top-level keys', () => {
      const r = makeResponse(200, body);
      expect(r.get('simple')).toBe('value');
    });

    it('accesses nested keys', () => {
      const r = makeResponse(200, body);
      expect(r.get('totals.subtotal')).toBe('10.00');
    });

    it('accesses array items by index', () => {
      const r = makeResponse(200, body);
      expect(r.get('items.0.name')).toBe('Widget');
      expect(r.get('items.1.name')).toBe('Gadget');
    });

    it('returns defaultValue for missing keys', () => {
      const r = makeResponse(200, body);
      expect(r.get('missing', 'fallback')).toBe('fallback');
    });

    it('returns undefined for missing keys with no default', () => {
      const r = makeResponse(200, body);
      expect(r.get('missing')).toBeUndefined();
    });
  });

  describe('has()', () => {
    const body = JSON.stringify({ a: { b: 1 }, c: null });

    it('returns true for existing keys', () => {
      const r = makeResponse(200, body);
      expect(r.has('a')).toBe(true);
      expect(r.has('a.b')).toBe(true);
    });

    it('returns false for missing keys', () => {
      const r = makeResponse(200, body);
      expect(r.has('x')).toBe(false);
      expect(r.has('a.z')).toBe(false);
    });

    it('returns true for null values (key exists)', () => {
      const r = makeResponse(200, body);
      expect(r.has('c')).toBe(true);
    });
  });

  describe('getHeader()', () => {
    it('returns header value', () => {
      const r = makeResponse(200, '{}', { 'X-Custom': 'test' });
      expect(r.getHeader('X-Custom')).toBe('test');
    });

    it('returns default for missing header', () => {
      const r = makeResponse(200, '{}');
      expect(r.getHeader('X-Missing', 'default')).toBe('default');
    });
  });

  describe('cart helpers', () => {
    const cartBody = JSON.stringify({
      cart_hash: 'abc123',
      items: [{ item_key: 'k1', name: 'Widget' }],
      item_count: 2,
      totals: { subtotal: '20.00', total: '22.00' },
      coupons: [{ coupon: 'SAVE10' }],
      customer: { billing_address: { city: 'NYC' } },
      currency: { currency_code: 'USD' },
      shipping: [{ package_name: 'Flat rate' }],
      fees: [{ name: 'Service fee' }],
      cross_sells: [{ id: 5, name: 'Related' }],
      notices: ['Item added'],
    });

    it('getCartKey() reads Cart-Key header', () => {
      const r = makeResponse(200, cartBody, { 'Cart-Key': 'ck_123' });
      expect(r.getCartKey()).toBe('ck_123');
    });

    it('getCartHash()', () => {
      const r = makeResponse(200, cartBody);
      expect(r.getCartHash()).toBe('abc123');
    });

    it('getItems() returns typed array', () => {
      const r = makeResponse(200, cartBody);
      expect(r.getItems()).toHaveLength(1);
      expect(r.getItems()[0].name).toBe('Widget');
    });

    it('getTotals()', () => {
      const r = makeResponse(200, cartBody);
      expect(r.getTotals().subtotal).toBe('20.00');
    });

    it('getItemCount() / hasItems() / isEmpty()', () => {
      const r = makeResponse(200, cartBody);
      expect(r.getItemCount()).toBe(2);
      expect(r.hasItems()).toBe(true);
      expect(r.isEmpty()).toBe(false);
    });

    it('isEmpty() for empty cart', () => {
      const r = makeResponse(200, JSON.stringify({ item_count: 0, items: [] }));
      expect(r.isEmpty()).toBe(true);
      expect(r.hasItems()).toBe(false);
    });

    it('getCoupons() / hasCoupons()', () => {
      const r = makeResponse(200, cartBody);
      expect(r.hasCoupons()).toBe(true);
      expect(r.getCoupons()[0].coupon).toBe('SAVE10');
    });

    it('getCustomer()', () => {
      const r = makeResponse(200, cartBody);
      expect(r.getCustomer().billing_address.city).toBe('NYC');
    });

    it('getCurrency()', () => {
      const r = makeResponse(200, cartBody);
      expect(r.getCurrency().currency_code).toBe('USD');
    });

    it('getShippingMethods()', () => {
      const r = makeResponse(200, cartBody);
      expect(r.getShippingMethods()).toHaveLength(1);
    });

    it('getFees()', () => {
      const r = makeResponse(200, cartBody);
      expect(r.getFees()).toHaveLength(1);
    });

    it('getCrossSells()', () => {
      const r = makeResponse(200, cartBody);
      expect(r.getCrossSells()).toHaveLength(1);
    });

    it('getNotices()', () => {
      const r = makeResponse(200, cartBody);
      expect(r.getNotices()).toHaveLength(1);
    });
  });

  describe('pagination helpers', () => {
    it('reads X-WP-Total and X-WP-TotalPages headers', () => {
      const r = makeResponse(200, '[]', {
        'X-WP-Total': '50',
        'X-WP-TotalPages': '5',
      });
      expect(r.getTotalResults()).toBe(50);
      expect(r.getTotalPages()).toBe(5);
    });

    it('returns null when pagination headers missing', () => {
      const r = makeResponse(200, '[]');
      expect(r.getTotalResults()).toBeNull();
      expect(r.getTotalPages()).toBeNull();
    });
  });

  describe('cache helpers', () => {
    it('getETag() returns ETag header', () => {
      const r = makeResponse(200, '{}', { 'ETag': '"abc123"' });
      expect(r.getETag()).toBe('"abc123"');
    });

    it('getETag() returns null when missing', () => {
      const r = makeResponse(200, '{}');
      expect(r.getETag()).toBeNull();
    });

    it('isNotModified() returns true for 304', () => {
      const r = makeResponse(304, '');
      expect(r.isNotModified()).toBe(true);
    });

    it('isNotModified() returns false for 200', () => {
      const r = makeResponse(200, '{}');
      expect(r.isNotModified()).toBe(false);
    });

    it('getCacheStatus() returns CoCart-Cache header', () => {
      const r = makeResponse(200, '{}', { 'CoCart-Cache': 'HIT' });
      expect(r.getCacheStatus()).toBe('HIT');
    });

    it('getCacheStatus() returns null when missing', () => {
      const r = makeResponse(200, '{}');
      expect(r.getCacheStatus()).toBeNull();
    });
  });

  describe('error helpers', () => {
    it('getErrorCode() returns code for error responses', () => {
      const r = makeResponse(400, JSON.stringify({ code: 'invalid_param', message: 'Bad' }));
      expect(r.getErrorCode()).toBe('invalid_param');
      expect(r.getErrorMessage()).toBe('Bad');
    });

    it('getErrorCode() returns null for success responses', () => {
      const r = makeResponse(200, JSON.stringify({ code: 'some_code' }));
      expect(r.getErrorCode()).toBeNull();
      expect(r.getErrorMessage()).toBeNull();
    });
  });
});
