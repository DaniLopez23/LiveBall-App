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
   * Opta coordinates always come in horizontal field format:
   *   optaX: lateral (0=left, 100=right)
   *   optaY: longitudinal (0=bottom, 100=top)
   * 
   * Vertical – Rotation 90° CW + inversion: optaY (inverted) → SVG X, optaX (inverted) → SVG Y
   *   Opta (0,0) = bottom-right, (100,100) = top-left
   * Horizontal – Direct mapping: optaY → SVG X, optaX → SVG Y
   */
  transformOptaToSvg: (optaX: number, optaY: number) => {
    const { orientation } = get();
    const cx = Math.max(0, Math.min(100, optaX));
    const cy = Math.max(0, Math.min(100, optaY));
    const fieldShort = VB_SHORT - 2 * MARGIN;  // 190
    const fieldLong  = VB_LONG  - 2 * MARGIN;  // 290

    if (orientation === 'vertical') {
      // Rotate 90° CW: Opta Y (long) → SVG X (short), Opta X (short) → SVG Y (long)
      // Both axes inverted for correct positioning
      return {
        x: MARGIN + ((100 - cy) / 100) * fieldShort,
        y: MARGIN + ((100 - cx) / 100) * fieldLong,
      };
    } else {
      // Horizontal: Opta Y (longitudinal) → SVG X, Opta X (lateral) → SVG Y
      return {
        x: MARGIN + ((100 - cy) / 100) * fieldLong,
        y: MARGIN + (cx / 100) * fieldShort,
      };
    }
  },

  VB_SHORT,
  VB_LONG,
  MARGIN,
}));

export default useOptaPitchConfigStore;