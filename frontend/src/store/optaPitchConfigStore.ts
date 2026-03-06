import { create } from 'zustand';

// ViewBox dimensions: the pitch is a 190×290 field inside a 200×300 canvas
const VB_SHORT = 200;  // short side (width in vertical, height in horizontal)
const VB_LONG = 300;   // long side  (height in vertical, width in horizontal)
const MARGIN = 5;

export type Orientation = 'vertical' | 'horizontal';

interface OptaPitchConfigState {
  orientation: Orientation;
  setOrientation: (orientation: Orientation) => void;
  getViewBoxDimensions: () => { width: number; height: number };
  /** Transforms Opta coordinates (0-100) to SVG coordinates. */
  transformOptaToSvg: (optaX: number, optaY: number) => { x: number; y: number };
  VB_SHORT: number;
  VB_LONG: number;
  MARGIN: number;
}

const useOptaPitchConfigStore = create<OptaPitchConfigState>((set, get) => ({
  orientation: 'vertical',
  setOrientation: (orientation: Orientation) => set({ orientation }),

  getViewBoxDimensions: () => {
    const { orientation } = get();
    return orientation === 'vertical'
      ? { width: VB_SHORT, height: VB_LONG }
      : { width: VB_LONG, height: VB_SHORT };
  },

  /**
   * Vertical  – optaX (lateral 0-100) → SVG X, optaY (longitudinal 0-100) → SVG Y (inverted)
   * Horizontal – 90° CW rotation: optaY → SVG X, optaX → SVG Y
   *   (the two inversions cancel out, so neither axis is inverted in horizontal mode)
   */
  transformOptaToSvg: (optaX: number, optaY: number) => {
    const { orientation } = get();
    const cx = Math.max(0, Math.min(100, optaX));
    const cy = Math.max(0, Math.min(100, optaY));
    const fieldShort = VB_SHORT - 2 * MARGIN;  // 190
    const fieldLong  = VB_LONG  - 2 * MARGIN;  // 290

    if (orientation === 'vertical') {
      return {
        x: MARGIN + (cx / 100) * fieldShort,
        y: MARGIN + ((100 - cy) / 100) * fieldLong,
      };
    } else {
      // Horizontal: Opta longitudinal (y) → SVG X, Opta lateral (x) → SVG Y
      return {
        x: MARGIN + (cy / 100) * fieldLong,
        y: MARGIN + (cx / 100) * fieldShort,
      };
    }
  },

  VB_SHORT,
  VB_LONG,
  MARGIN,
}));

export default useOptaPitchConfigStore;