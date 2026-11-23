import type { TooltipComponentOption } from 'echarts';

export const echartsTooltipTheme = {
  renderMode: 'html' as const,
  appendTo: 'body',
  confine: true,
  backgroundColor: '#fffdf8',
  borderColor: '#dfe5d8',
  borderWidth: 1,
  padding: [12, 14],
  textStyle: {
    fontFamily: 'Montserrat, sans-serif',
    fontSize: 13,
    fontWeight: 600,
    color: '#243427',
  },
  extraCssText:
    'border-radius:12px;box-shadow:0 7px 22px rgba(37,54,36,.14);max-width:min(340px,calc(100vw - 32px));white-space:normal;box-sizing:border-box;line-height:1.55;',
};

export function escapeTooltipText(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        character
      ] ?? character,
  );
}

export function chartTooltipOptions(
  formatValue: (value: number, percent?: number) => string,
  title: (index: number, name: string) => string = (_index, name) => name,
  trigger: 'axis' | 'item' = 'axis',
): TooltipComponentOption {
  return {
    ...echartsTooltipTheme,
    trigger,
    axisPointer: {
      type: 'line',
      lineStyle: { color: '#829475', width: 1.5, type: 'dashed' },
    },
    formatter: (params) => {
      const points = Array.isArray(params) ? params : [params];
      const first = points[0];
      if (!first) return '';

      const heading = `<div style="font-size:13px;font-weight:750;line-height:1.45;margin-bottom:7px;overflow-wrap:anywhere;color:#243427">${escapeTooltipText(title(first.dataIndex, first.name))}</div>`;
      const rows = points
        .map((point) => {
          const color =
            typeof point.color === 'string' &&
            /^#[a-f\d]{3,8}$/i.test(point.color)
              ? point.color
              : '#24543d';
          const rawValue = Array.isArray(point.value)
            ? point.value[point.value.length - 1]
            : point.value;
          const numeric = Number(rawValue);
          const formatted = escapeTooltipText(
            formatValue(numeric, point.percent),
          );
          const series = escapeTooltipText(point.seriesName || 'Quantidade');

          return `<div style="display:flex;align-items:baseline;gap:8px;line-height:1.55"><span aria-hidden="true" style="flex:none;width:8px;height:8px;border-radius:50%;background:${color}"></span><span style="color:#4a604c;font-weight:600">${series}</span><strong style="color:#243427;font-size:13px;font-weight:750;margin-left:auto;white-space:nowrap">${formatted}</strong></div>`;
        })
        .join('');

      return heading + rows;
    },
  };
}
