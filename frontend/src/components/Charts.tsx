import { useEffect, useRef } from 'react';
import type * as echarts from 'echarts';
import { useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

interface ChartProps {
  option: echarts.EChartsOption;
  height?: number;
  className?: string;
}

/** ECharts 通用封装：随主题自动重绘 */
export function Chart({ option, height = 280, className }: ChartProps) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);
  const echartsRef = useRef<typeof import('echarts') | null>(null);
  const [ready, setReady] = useState(false);
  const { theme } = useTheme();

  useEffect(() => {
    let cancelled = false;
    import('echarts').then((mod) => {
      if (cancelled) return;
      echartsRef.current = mod;
      setReady(true);
      // The theme effect owns chart initialization after the module is ready.
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!ref.current || !echartsRef.current) return;
    chartRef.current = echartsRef.current.init(ref.current);
    const onResize = () => chartRef.current?.resize();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      chartRef.current?.dispose();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    chartRef.current?.setOption(option, true);
  }, [option, ready]);

  useEffect(() => {
    chartRef.current?.dispose();
    if (ref.current && echartsRef.current) {
      chartRef.current = echartsRef.current.init(ref.current);
      chartRef.current.setOption(option);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, ready]);

  return <div ref={ref} style={{ height, width: '100%' }} className={className} />;
}

/** 折线图（进步曲线） */
export function LineTrendChart({ data, labels, name = '正确率', color = '#1D4ED8' }: {
  data: number[];
  labels: string[];
  name?: string;
  color?: string;
}) {
  const option: echarts.EChartsOption = {
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 20, top: 30, bottom: 30 },
    xAxis: { type: 'category', data: labels, axisLine: { lineStyle: { color: '#9ca3af' } } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: 'rgba(128,128,128,0.15)' } } },
    series: [{
      name,
      type: 'line',
      data,
      smooth: true,
      symbolSize: 8,
      lineStyle: { width: 3, color },
      itemStyle: { color },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: color + '55' },
            { offset: 1, color: color + '05' },
          ],
        },
      },
    }],
  };
  return <Chart option={option} />;
}

/** 雷达图（三科掌握度） */
export function RadarChart({ data }: { data: Array<{ name: string; value: number }> }) {
  const option: echarts.EChartsOption = {
    tooltip: {},
    radar: {
      indicator: data.map((d) => ({ name: d.name, max: 100 })),
      radius: '65%',
      splitArea: { areaStyle: { color: ['rgba(22,163,74,0.03)', 'rgba(22,163,74,0.06)'] } },
      axisName: { color: '#6b7280', fontSize: 12 },
    },
    series: [{
      type: 'radar',
      data: [{
        value: data.map((d) => d.value),
        name: '掌握度',
        areaStyle: { color: 'rgba(22,163,74,0.35)' },
        lineStyle: { color: '#1D4ED8', width: 2 },
        itemStyle: { color: '#1D4ED8' },
      }],
    }],
  };
  return <Chart option={option} />;
}

/** 环形图（三科掌握度） */
export function DonutChart({ data }: { data: Array<{ name: string; value: number }> }) {
  const option: echarts.EChartsOption = {
    tooltip: { trigger: 'item', formatter: '{b}: {c}%' },
    series: [{
      type: 'pie',
      radius: ['55%', '78%'],
      avoidLabelOverlap: false,
      label: { show: true, formatter: '{b}\n{c}%', fontSize: 11 },
      itemStyle: { borderRadius: 8, borderColor: 'transparent', borderWidth: 2 },
      data,
    }],
  };
  return <Chart option={option} height={220} />;
}
