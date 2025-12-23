import { describe, it, expect } from 'vitest';
import { addOne } from './simple-math';

describe('addOne', () => {
  it('adds one to a positive number', () => {
    expect(addOne(1)).toBe(2);
  });

  it('adds one to zero', () => {
    expect(addOne(0)).toBe(1);
  });

  it('adds one to a negative number', () => {
    expect(addOne(-5)).toBe(-4);
  });
});
