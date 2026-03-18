/**
 * GeometryDesignPanel - GDES operations: flap deflection, TE gap, LE radius, transforms.
 *
 * Flaps are reactive: any change to the flap definitions instantly re-derives
 * geometry from baseCoordinates (the pre-flap shape). TE gap and LE radius
 * remain manual "Apply" operations that update baseCoordinates.
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { useAirfoilStore } from '../../stores/airfoilStore';
import {
  deflectFlap,
  setTeGap,
  setLeRadius,
  isWasmReady,
  repanelXfoil,
} from '../../lib/wasm';
import type { AirfoilPoint, FlapDefinition } from '../../types';

function applyAndRepanel(
  coords: { x: number; y: number }[],
  nPanels: number,
): { coordinates: AirfoilPoint[]; panels: AirfoilPoint[] } {
  const raw: AirfoilPoint[] = coords.map(p => ({ x: p.x, y: p.y }));
  if (isWasmReady()) {
    try {
      const repaneled = repanelXfoil(coords, nPanels);
      if (repaneled.length > 0) {
        const smooth = repaneled.map(pt => ({ x: pt.x, y: pt.y }));
        return { coordinates: smooth, panels: smooth };
      }
    } catch { /* keep raw */ }
  }
  return { coordinates: raw, panels: raw };
}

const sliderRow: React.CSSProperties = { display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' };
const labelStyle: React.CSSProperties = { color: 'var(--text-muted)', minWidth: '70px' };
const valueStyle: React.CSSProperties = { minWidth: '35px', textAlign: 'right' };
const fieldsetStyle: React.CSSProperties = {
  border: '1px solid var(--border-color)', borderRadius: 4, padding: '8px', marginBottom: '10px',
};
const legendStyle: React.CSSProperties = { fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', padding: '0 4px' };

function FlapRow({ flap, index, onChange, onRemove }: {
  flap: FlapDefinition;
  index: number;
  onChange: (id: string, updates: Partial<Omit<FlapDefinition, 'id'>>) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 3, padding: '6px', marginBottom: '6px', background: 'var(--bg-subtle, transparent)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', gap: '4px' }}>
        <input
          type="text"
          value={flap.name}
          onChange={e => onChange(flap.id, { name: e.target.value })}
          style={{
            flex: 1, fontSize: '10px', fontWeight: 600, padding: '1px 3px',
            background: 'transparent', border: '1px solid transparent',
            borderRadius: 2, color: 'var(--text-secondary)',
          }}
          onFocus={e => { e.target.style.borderColor = 'var(--border-color)'; e.target.style.background = 'var(--bg-input, #1a1a2e)'; }}
          onBlur={e => { e.target.style.borderColor = 'transparent'; e.target.style.background = 'transparent'; }}
        />
        <button
          className="btn btn-xs"
          onClick={() => onRemove(flap.id)}
          style={{ color: 'var(--text-error, #e55)', padding: '0 4px', lineHeight: '1.2', flexShrink: 0 }}
        >&times;</button>
      </div>
      <div style={sliderRow}>
        <label style={labelStyle}>Hinge x/c:</label>
        <input
          type="range" min={0.5} max={0.95} step={0.01}
          value={flap.hingeX}
          onChange={e => onChange(flap.id, { hingeX: parseFloat(e.target.value) })}
          style={{ flex: 1 }}
        />
        <span style={valueStyle}>{flap.hingeX.toFixed(2)}</span>
      </div>
      <div style={sliderRow}>
        <label style={labelStyle}>Hinge y/t:</label>
        <input
          type="range" min={0} max={1} step={0.05}
          value={flap.hingeYFrac}
          onChange={e => onChange(flap.id, { hingeYFrac: parseFloat(e.target.value) })}
          style={{ flex: 1 }}
        />
        <span style={valueStyle}>{flap.hingeYFrac.toFixed(2)}</span>
      </div>
      <div style={sliderRow}>
        <label style={labelStyle}>Deflection:</label>
        <input
          type="range" min={-30} max={30} step={0.5}
          value={flap.deflection}
          onChange={e => onChange(flap.id, { deflection: parseFloat(e.target.value) })}
          style={{ flex: 1 }}
        />
        <span style={valueStyle}>{flap.deflection.toFixed(1)}&deg;</span>
      </div>
    </div>
  );
}

export function GeometryDesignPanel() {
  const {
    coordinates, nPanels, geometryDesign, setGeometryDesign,
    addFlap, updateFlap, removeFlap,
  } = useAirfoilStore();

  const flaps = geometryDesign.flaps;
  const flapsJsonRef = useRef('');

  // Reactively re-derive geometry from baseCoordinates whenever flaps change.
  // Strategy: fit a high-resolution spline through the base airfoil first
  // (1000 points), then define the hinge and rotate on that dense representation.
  // The kink at the hinge spans < 0.001c and is invisible. Then repanel down
  // to nPanels for the solver.
  const HIRES_POINTS = 1000;

  useEffect(() => {
    if (!isWasmReady()) return;

    const snapshot = JSON.stringify(flaps.map(f => [f.hingeX, f.hingeYFrac, f.deflection]));
    if (snapshot === flapsJsonRef.current) return;
    flapsJsonRef.current = snapshot;

    const base = useAirfoilStore.getState().baseCoordinates;
    if (base.length < 4) return;

    const hasDeflection = flaps.some(f => Math.abs(f.deflection) >= 0.01);

    if (flaps.length === 0 || !hasDeflection) {
      const { coordinates: c, panels: p } = applyAndRepanel(
        base.map(pt => ({ x: pt.x, y: pt.y })),
        nPanels,
      );
      useAirfoilStore.setState({ coordinates: c, panels: p });
      return;
    }

    // Fit a dense spline through the base airfoil — no kink yet, so the spline is clean
    const hiRes = repanelXfoil(base, HIRES_POINTS);
    if (hiRes.length === 0) return;

    // Apply flaps to the dense point cloud — kink spans ~1 point out of 200
    let pts: { x: number; y: number }[] = hiRes;
    for (const flap of flaps) {
      if (Math.abs(flap.deflection) < 0.01) continue;
      const result = deflectFlap(pts, flap.hingeX, flap.hingeYFrac, flap.deflection);
      if (result.length > 0) pts = result;
    }

    // Visual coordinates = high-res flapped geometry (smooth enough for the canvas spline)
    const coordinates: AirfoilPoint[] = pts.map(p => ({ x: p.x, y: p.y }));

    // Solver panels = repanel the high-res flapped geometry down to nPanels
    const solverPanels = repanelXfoil(pts, nPanels);
    const panels: AirfoilPoint[] = solverPanels.length > 0
      ? solverPanels.map(pt => ({ x: pt.x, y: pt.y }))
      : coordinates;

    useAirfoilStore.setState({ coordinates, panels });
  }, [flaps, nPanels]);

  const applyTeGap = useCallback(() => {
    if (!isWasmReady()) return;
    const result = setTeGap(coordinates, geometryDesign.teGap, geometryDesign.teGapBlend);
    if (result.length > 0) {
      const { coordinates: c, panels: p } = applyAndRepanel(result, nPanels);
      useAirfoilStore.setState({ coordinates: c, panels: p, baseCoordinates: c });
    }
  }, [coordinates, nPanels, geometryDesign.teGap, geometryDesign.teGapBlend]);

  const applyLeRadius = useCallback(() => {
    if (!isWasmReady()) return;
    const result = setLeRadius(coordinates, geometryDesign.leRadiusFactor);
    if (result.length > 0) {
      const { coordinates: c, panels: p } = applyAndRepanel(result, nPanels);
      useAirfoilStore.setState({ coordinates: c, panels: p, baseCoordinates: c });
    }
  }, [coordinates, nPanels, geometryDesign.leRadiusFactor]);

  return (
    <div className="geometry-design-panel" style={{ overflow: 'auto', fontSize: '12px' }}>
      {/* Flaps */}
      <fieldset style={fieldsetStyle}>
        <legend style={legendStyle}>Flaps</legend>
        {flaps.length === 0 && (
          <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginBottom: '6px' }}>
            No flaps defined. Click "Add Flap" to create one.
          </div>
        )}
        {flaps.map((flap, i) => (
          <FlapRow
            key={flap.id}
            flap={flap}
            index={i}
            onChange={updateFlap}
            onRemove={removeFlap}
          />
        ))}
        <button className="btn btn-xs" onClick={addFlap}>Add Flap</button>
      </fieldset>

      {/* TE Gap */}
      <fieldset style={fieldsetStyle}>
        <legend style={legendStyle}>Trailing-Edge Gap</legend>
        <div style={sliderRow}>
          <label style={labelStyle}>Gap (% c):</label>
          <input
            type="range" min={0} max={0.05} step={0.001}
            value={geometryDesign.teGap}
            onChange={e => setGeometryDesign({ teGap: parseFloat(e.target.value) })}
            style={{ flex: 1 }}
          />
          <span style={valueStyle}>{(geometryDesign.teGap * 100).toFixed(1)}%</span>
        </div>
        <div style={sliderRow}>
          <label style={labelStyle}>Blend:</label>
          <input
            type="range" min={0.2} max={1.0} step={0.05}
            value={geometryDesign.teGapBlend}
            onChange={e => setGeometryDesign({ teGapBlend: parseFloat(e.target.value) })}
            style={{ flex: 1 }}
          />
          <span style={valueStyle}>{geometryDesign.teGapBlend.toFixed(2)}</span>
        </div>
        <button className="btn btn-xs btn-primary" onClick={applyTeGap}>Apply TE Gap</button>
      </fieldset>

      {/* LE Radius */}
      <fieldset style={fieldsetStyle}>
        <legend style={legendStyle}>Leading-Edge Radius</legend>
        <div style={sliderRow}>
          <label style={labelStyle}>Scale:</label>
          <input
            type="range" min={0.2} max={3.0} step={0.05}
            value={geometryDesign.leRadiusFactor}
            onChange={e => setGeometryDesign({ leRadiusFactor: parseFloat(e.target.value) })}
            style={{ flex: 1 }}
          />
          <span style={valueStyle}>{geometryDesign.leRadiusFactor.toFixed(2)}&times;</span>
        </div>
        <button className="btn btn-xs btn-primary" onClick={applyLeRadius}>Apply LE Radius</button>
      </fieldset>
    </div>
  );
}
