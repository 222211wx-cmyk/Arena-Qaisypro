// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { clipId } from './validation';
describe('clipId', () => {
  it('accepts positive integer IDs', () => { expect(clipId('15')).toBe(15); });
  it.each([null, '', '0', '-1', '1.5', 'NaN', 'Infinity', '1e2', '9007199254740992'])('rejects %s', value => {
    expect(clipId(value)).toBeNull();
  });
});
