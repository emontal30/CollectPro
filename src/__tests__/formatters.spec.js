import { describe, it, expect } from 'vitest';
import { formatDisplayNumber, getNetClass, parseNumber } from '../utils/formatters';

describe('Formatters Utility', () => {
  describe('formatDisplayNumber', () => {
    it('should format numbers with commas', () => {
      expect(formatDisplayNumber(1000)).toBe('1,000');
      expect(formatDisplayNumber(1000000)).toBe('1,000,000');
    });

    it('should handle zero', () => {
      expect(formatDisplayNumber(0)).toBe('0');
    });

    it('should handle null or undefined as 0', () => {
      expect(formatDisplayNumber(null)).toBe('0');
      expect(formatDisplayNumber(undefined)).toBe('0');
    });
  });

  describe('getNetClass', () => {
    it('should return positive for net > 0', () => {
      expect(getNetClass(100)).toBe('positive');
    });

    it('should return negative for net < 0', () => {
      expect(getNetClass(-50)).toBe('negative');
    });

    it('should return zero for net === 0', () => {
      expect(getNetClass(0)).toBe('zero');
    });
  });

  describe('parseNumber', () => {
    it('should parse English digits', () => {
      expect(parseNumber('123.45')).toBe(123.45);
    });

    it('should parse Arabic digits', () => {
      expect(parseNumber('١٢٣.٤٥')).toBe(123.45);
    });

    it('should remove non-numeric characters', () => {
      expect(parseNumber('1,234.56 L.E')).toBe(1234.56);
    });

    it('should return 0 for empty or invalid input', () => {
      expect(parseNumber('')).toBe(0);
      expect(parseNumber('abc')).toBe(0);
    });
  });
});
