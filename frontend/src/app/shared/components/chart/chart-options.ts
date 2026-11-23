import { echartsTooltipTheme } from './echarts-tooltip';
export const chartText = {
  fontFamily: 'Montserrat, sans-serif',
  color: '#5d6656',
  fontSize: 12,
};
export const chartTooltip = {
  ...echartsTooltipTheme,
  trigger: 'axis' as const,
};
export const chartGridLine = {
  lineStyle: { color: '#e7e9e0', type: 'dashed' as const },
};

export const chartPalette = { dark: '#24543d', light: '#a8c66c' };
export { echartsTooltipTheme as chartTooltipTheme } from './echarts-tooltip';
