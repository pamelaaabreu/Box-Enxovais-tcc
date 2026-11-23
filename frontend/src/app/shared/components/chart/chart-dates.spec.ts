import { bucketLabel, civilDate, dateLabelInterval, periodLabels } from './chart-dates';

describe('Chart dates', () => {
  it('preserves civil dates and converts timestamps using the Brazilian timezone', () => {
    expect(civilDate('2026-11-22')).toBe('2026-11-22');
    expect(civilDate('2026-01-01T02:59:59Z')).toBe('2025-12-31');
    expect(civilDate('2026-01-01T03:00:00Z')).toBe('2026-01-01');
    expect(bucketLabel('2026-01-01', 'day')).toBe('01/01');
    expect(bucketLabel('2026-01-01', 'day', true)).toBe('01/01/2026');
    expect(bucketLabel('2026-01-01', 'month')).toBe('01/2026');
  });
  it('shows the last included date rather than the exclusive upper bound', () => {
    expect(periodLabels('2025-12-31T03:00:00Z', '2026-01-03T03:00:00Z')).toEqual({from:'31/12/2025',until:'02/01/2026'});
    expect(periodLabels('2024-02-01T03:00:00Z', '2024-03-01T03:00:00Z').until).toBe('29/02/2024');
    expect(periodLabels('2018-11-04T03:00:00Z', '2018-11-05T02:00:00Z')).toEqual({from:'04/11/2018',until:'04/11/2018'});
  });
  it('reduces labels without changing data or losing the last bucket', () => {
    for (const target of [3,5,7]) {
      const visible=Array.from({length:30},(_,index)=>index).filter(dateLabelInterval(30,target));
      expect(visible.length).toBeLessThanOrEqual(target);
      expect(visible[0]).toBe(0);
      expect(visible[visible.length-1]).toBe(29);
    }
    expect(dateLabelInterval(1)(0)).toBeTrue();
  });
});
