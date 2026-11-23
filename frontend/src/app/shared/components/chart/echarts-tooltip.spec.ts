import type { TooltipComponentOption } from 'echarts';
import { chartTooltipOptions, echartsTooltipTheme, escapeTooltipText } from './echarts-tooltip';

type Formatter = Exclude<NonNullable<TooltipComponentOption['formatter']>,string>;

describe('Shared ECharts tooltip', () => {
  const point={componentType:'series',seriesType:'bar',seriesIndex:0,seriesName:'Pedidos',name:'22/11',dataIndex:0,value:7,data:7,color:'#24543d',percent:25};
  it('uses a single visual theme for axis and item tooltips', () => {
    for (const trigger of ['axis','item'] as const) {
      const option=chartTooltipOptions(String,undefined,trigger);
      expect(option.textStyle).toEqual(echartsTooltipTheme.textStyle);
      expect(option.borderColor).toBe(echartsTooltipTheme.borderColor);
      expect(option.appendTo).toBe('body');
      expect(option.confine).toBeTrue();
    }
  });
  it('shows full titles and values while escaping dynamic text and colors', () => {
    const option=chartTooltipOptions(value=>`${value} unidades`,()=>'<img src=x onerror=alert(1)>');
    const formatter=option.formatter as Formatter;
    const html=formatter({...point,seriesName:'<script>unsafe</script>',color:'red;position:fixed'} as Parameters<Formatter>[0],'',()=>undefined);
    const element=document.createElement('div');element.innerHTML=String(html);
    expect(element.querySelector('img,script')).toBeNull();
    expect(element.textContent).toContain('<img src=x onerror=alert(1)>');
    expect(element.textContent).toContain('7 unidades');
    expect(String(html)).not.toContain('position:fixed');
    expect(escapeTooltipText('"&<>')).toBe('&quot;&amp;&lt;&gt;');
  });
  it('passes status percentages to the value formatter',()=>{
    const option=chartTooltipOptions((value,percent)=>`${value} (${percent}%)`,undefined,'item');
    const formatter=option.formatter as Formatter;
    expect(String(formatter(point as Parameters<Formatter>[0],'',()=>undefined))).toContain('7 (25%)');
  });
});
