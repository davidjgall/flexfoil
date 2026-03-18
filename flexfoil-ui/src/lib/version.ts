declare const __APP_VERSION__: string;

export const APP_VERSION: string =
  typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0-dev';

export type ChangeCategory = 'added' | 'changed' | 'fixed';

export interface ChangelogEntry {
  version: string;
  date: string;
  items: { category: ChangeCategory; text: string }[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.1.0-dev',
    date: '2026-03-18',
    items: [
      { category: 'added', text: 'Automatic L/D ratio column in Data Explorer, Plot Builder, and Polar plots' },
      { category: 'added', text: 'Custom computed columns — define algebraic expressions over existing data fields' },
      { category: 'added', text: 'Version & changelog dialogs accessible from the Help menu' },
      { category: 'added', text: 'Editable flap object model — add, edit, and remove multiple flaps with per-flap hinge y control' },
      { category: 'added', text: 'Flap definitions persisted in run database (flaps_json column)' },
      { category: 'fixed', text: 'Flap hinge y-coordinate was computed at arc-length midpoint instead of the actual hinge x station' },
      { category: 'fixed', text: 'Flap deflection now inserts break points at the hinge for a clean geometric discontinuity' },
    ],
  },
  {
    version: '1.0.0',
    date: '2026-03-18',
    items: [
      { category: 'added', text: 'Initial public release of FlexFoil' },
      { category: 'added', text: 'Real-time airfoil analysis powered by RustFoil WASM solver' },
      { category: 'added', text: 'Airfoil library with NACA and Selig database' },
      { category: 'added', text: 'Interactive shape editing (camber/thickness splines)' },
      { category: 'added', text: 'Viscous and inviscid solver modes' },
      { category: 'added', text: 'Polar sweep with multi-series overlay' },
      { category: 'added', text: 'Flow visualization (streamlines, smoke, Cp, boundary layer)' },
      { category: 'added', text: 'Data Explorer with AG Grid and SPLOM correlogram' },
      { category: 'added', text: 'Plot Builder with scatter, line, bar, and histogram charts' },
      { category: 'added', text: 'SQLite run database with export/import' },
      { category: 'added', text: 'Mobile-responsive layout' },
    ],
  },
];
