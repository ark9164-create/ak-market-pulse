/** Renders an inline SVG sparkline from an array of numbers */
export function renderSparkline(
  data: number[],
  width = 80,
  height = 24,
  color?: string
): string {
  if (!data.length || data.length < 2) return '';

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const strokeColor = color ?? (data[data.length - 1] >= data[0] ? 'var(--green)' : 'var(--red)');

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 2) - 1;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return `<svg class="sparkline" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <polyline fill="none" stroke="${strokeColor}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"
      points="${points.join(' ')}" />
  </svg>`;
}
