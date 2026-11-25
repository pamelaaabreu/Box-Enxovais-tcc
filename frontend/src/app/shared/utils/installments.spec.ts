import { installmentSummary, splitInstallments } from './installments';
describe('installments', () => {
  it('preserves cents exactly for every plan from 1 to 6', () => {
    for (const total of [0, 1, 5, 100, 10001, 14281, 999999999])
      for (let n = 1; n <= 6; n++) {
        const a = splitInstallments(total, n);
        expect(a.reduce((sum, v) => sum + v, 0)).toBe(total);
        expect(a.length).toBe(n);
        expect(a[0] - a[n - 1]).toBeLessThanOrEqual(1);
      }
  });
  it('does not invent a plan for historical orders', () => {
    expect(installmentSummary(1000, null)).toBe('Parcelamento não registrado');
  });
  it('reports exact unequal groups and rejects invalid input', () => {
    expect(installmentSummary(100, 6)).toContain('4x');
    expect(installmentSummary(100, 6)).toContain('2x');
    expect(() => splitInstallments(100, 7)).toThrowError(RangeError);
  });
});
