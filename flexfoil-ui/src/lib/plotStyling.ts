import distinctColors from 'distinct-colors';
import type { RunRow } from '../types';
import { getPlotFieldLabel, isNumericPlotField } from './plotFields';

const DISTINCT_PALETTE = distinctColors({
  count: 48,
  chromaMin: 35,
  chromaMax: 90,
  lightMin: 35,
  lightMax: 80,
  quality: 40,
  samples: 1200,
}).map((color) => color.hex());

const MARKER_SYMBOLS = [
  'circle',
  'square',
  'diamond',
  'cross',
  'x',
  'triangle-up',
  'triangle-down',
  'triangle-left',
  'triangle-right',
  'star',
  'hexagram',
  'hourglass',
  'bowtie',
] as const;

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function valueKey(value: unknown): string {
  if (value == null) return 'null';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'nan';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return String(value);
}

export function colorForKey(key: string): string {
  return DISTINCT_PALETTE[hashString(key) % DISTINCT_PALETTE.length];
}

export function colorForValue(value: unknown): string {
  return colorForKey(valueKey(value));
}

function symbolForValue(value: unknown): (typeof MARKER_SYMBOLS)[number] {
  return MARKER_SYMBOLS[hashString(valueKey(value)) % MARKER_SYMBOLS.length];
}

function scaleNumericSizes(values: Array<number | null | undefined>, minSize: number, maxSize: number): number[] {
  const finite = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  if (finite.length === 0) return values.map(() => minSize);
  const min = Math.min(...finite);
  const max = Math.max(...finite);
  if (Math.abs(max - min) < 1e-12) {
    const mid = (minSize + maxSize) / 2;
    return values.map(() => mid);
  }
  return values.map((value) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return minSize;
    const t = (value - min) / (max - min);
    return minSize + t * (maxSize - minSize);
  });
}

function scaleCategoricalSizes(values: unknown[], minSize: number, maxSize: number): number[] {
  const unique = Array.from(new Set(values.map(valueKey))).sort();
  if (unique.length <= 1) return values.map(() => (minSize + maxSize) / 2);
  const lookup = new Map<string, number>();
  unique.forEach((key, index) => {
    const t = index / Math.max(1, unique.length - 1);
    lookup.set(key, minSize + t * (maxSize - minSize));
  });
  return values.map((value) => lookup.get(valueKey(value)) ?? minSize);
}

export interface MarkerEncodingOptions {
  rows: RunRow[];
  colorBy?: keyof RunRow | '';
  sizeBy?: keyof RunRow | '';
  symbolBy?: keyof RunRow | '';
  defaultColor: string;
  defaultSize: number;
  opacity?: number;
  minSize?: number;
  maxSize?: number;
  showColorScale?: boolean;
}

export interface MarkerEncodingResult {
  marker: Record<string, unknown>;
  lineColor: string;
}

export function buildMarkerEncoding(options: MarkerEncodingOptions): MarkerEncodingResult {
  const {
    rows,
    colorBy = '',
    sizeBy = '',
    symbolBy = '',
    defaultColor,
    defaultSize,
    opacity = 0.8,
    minSize = Math.max(3, defaultSize - 3),
    maxSize = defaultSize + 8,
    showColorScale = true,
  } = options;

  const marker: Record<string, unknown> = {
    color: defaultColor,
    size: defaultSize,
    opacity,
  };

  if (colorBy) {
    const values = rows.map((row) => row[colorBy]);
    if (isNumericPlotField(colorBy)) {
      marker.color = values.map((value) => (typeof value === 'number' && Number.isFinite(value) ? value : 0));
      marker.colorscale = 'Viridis';
      marker.showscale = showColorScale;
      if (showColorScale) {
        marker.colorbar = {
          title: getPlotFieldLabel(colorBy),
          thickness: 12,
          len: 0.45,
        };
      }
    } else {
      marker.color = values.map((value) => colorForValue(value));
    }
  }

  if (sizeBy) {
    const values = rows.map((row) => row[sizeBy]);
    marker.size = isNumericPlotField(sizeBy)
      ? scaleNumericSizes(values as Array<number | null | undefined>, minSize, maxSize)
      : scaleCategoricalSizes(values, minSize, maxSize);
  }

  if (symbolBy) {
    marker.symbol = rows.map((row) => symbolForValue(row[symbolBy]));
  }

  return {
    marker,
    lineColor: defaultColor,
  };
}
