export const SHAPES_2D = Object.freeze({
  triangle: { label: 'triangel', sides: 3 },
  quadrilateral: { label: 'fyrhörning', sides: 4 },
  pentagon: { label: 'femhörning', sides: 5 },
  hexagon: { label: 'sexhörning', sides: 6 },
  circle: { label: 'cirkel', sides: 0 },
  parallelogram: { label: 'parallellogram', sides: 4 },
  rhombus: { label: 'romb', sides: 4 },
  rectangle: { label: 'rektangel', sides: 4 },
  square: { label: 'kvadrat', sides: 4 }
})

export const SOLIDS = Object.freeze({
  cuboid: { label: 'rätblock', faces: 6, edges: 12, vertices: 8, faceShape: 'rektanglar, varav minst två inte är kvadrater' },
  cube: { label: 'kub', faces: 6, edges: 12, vertices: 8, faceShape: 'kvadrater' },
  pyramid: { label: 'fyrsidig pyramid', faces: 5, edges: 8, vertices: 5, faceShape: 'trianglar och en kvadrat' },
  cylinder: { label: 'cylinder', faces: 3, edges: 2, vertices: 0, faceShape: 'två cirklar och en böjd yta' },
  cone: { label: 'kon', faces: 2, edges: 1, vertices: 1, faceShape: 'en cirkel och en böjd yta' },
  sphere: { label: 'klot', faces: 1, edges: 0, vertices: 0, faceShape: 'en böjd yta' }
})

export const QUADRILATERAL_RELATIONS = Object.freeze({
  square_rectangle: true,
  square_rhombus: true,
  square_parallelogram: true,
  rectangle_square: false,
  rectangle_parallelogram: true,
  rhombus_square: false,
  rhombus_parallelogram: true,
  parallelogram_rectangle: false
})

export function option(id, label, errorPattern = '') {
  return { id, label, concept: id, errorPattern }
}
