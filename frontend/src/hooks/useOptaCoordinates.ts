import { useMemo } from "react";

const useOptaCoordinates = (
  viewBoxWidth: number,
  viewBoxHeight: number,
  margin = 5
) => {
  const transformX = useMemo(
    () =>
      (optaX: number): number => {
        const clampedX = Math.max(0, Math.min(100, optaX));
        const fieldMinX = margin;
        const fieldMaxX = viewBoxWidth - margin;
        return fieldMinX + (clampedX / 100) * (fieldMaxX - fieldMinX);
      },
    [viewBoxWidth, margin]
  );

  const transformY = useMemo(
    () =>
      (optaY: number): number => {
        // SVG Y axis is inverted compared to Opta (0,0 = bottom-left in Opta)
        const clampedY = Math.max(0, Math.min(100, optaY));
        const invertedOptaY = 100 - clampedY;
        const fieldMinY = margin;
        const fieldMaxY = viewBoxHeight - margin;
        return fieldMinY + (invertedOptaY / 100) * (fieldMaxY - fieldMinY);
      },
    [viewBoxHeight, margin]
  );

  return { transformX, transformY };
};

export default useOptaCoordinates;
