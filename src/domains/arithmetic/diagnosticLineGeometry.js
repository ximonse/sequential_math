// Old lines retain their original inset geometry. Only newly tagged lines snap.
export function diagnosticLineCoordinates(line) {
  if (line.placement === 'grid-border') return line.axis === 'horizontal'
    ? { x1: line.from.column, y1: line.from.row + 1, x2: line.to.column + 1, y2: line.from.row + 1 }
    : { x1: line.from.column + 1, y1: line.from.row, x2: line.from.column + 1, y2: line.to.row + 1 }
  return line.axis === 'horizontal'
    ? { x1: line.from.column + 0.08, y1: line.from.row + 0.88,
      x2: line.to.column + 0.92, y2: line.from.row + 0.88 }
    : { x1: line.from.column + 0.88, y1: line.from.row + 0.08,
      x2: line.from.column + 0.88, y2: line.to.row + 0.92 }
}

export function lineTouchesPoint(line, point, tolerance = 0.18) {
  const { x1, y1, x2, y2 } = diagnosticLineCoordinates(line)
  return line.axis === 'horizontal'
    ? Math.abs(point.row - y1) <= tolerance && point.column >= x1 - tolerance && point.column <= x2 + tolerance
    : Math.abs(point.column - x1) <= tolerance && point.row >= y1 - tolerance && point.row <= y2 + tolerance
}
