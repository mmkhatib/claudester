import { describe, it, expect } from 'vitest';
import { cn } from '../utils';

describe('cn (className utility)', () => {
  it('merges class names correctly', () => {
    const result = cn('foo', 'bar');
    expect(result).toBe('foo bar');
  });

  it('handles conditional classes', () => {
    const result = cn('foo', false && 'bar', 'baz');
    expect(result).toBe('foo baz');
  });

  it('handles Tailwind conflicts correctly', () => {
    const result = cn('px-2 py-1', 'px-4');
    expect(result).toBe('py-1 px-4');
  });

  it('handles arrays of classes', () => {
    const result = cn(['foo', 'bar'], 'baz');
    expect(result).toBe('foo bar baz');
  });

  it('handles object syntax', () => {
    const result = cn({
      foo: true,
      bar: false,
      baz: true,
    });
    expect(result).toBe('foo baz');
  });

  it('handles mixed inputs', () => {
    const result = cn(
      'base-class',
      { active: true, disabled: false },
      ['additional', 'classes'],
      undefined,
      null,
      'final'
    );
    expect(result).toContain('base-class');
    expect(result).toContain('active');
    expect(result).not.toContain('disabled');
    expect(result).toContain('additional');
    expect(result).toContain('classes');
    expect(result).toContain('final');
  });

  it('returns empty string for no arguments', () => {
    const result = cn();
    expect(result).toBe('');
  });

  it('handles empty strings and whitespace', () => {
    const result = cn('', '  ', 'foo', '   ', 'bar');
    expect(result).toBe('foo bar');
  });
});
