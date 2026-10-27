// Original, versioned geometry drawings. Taxonomy is teacher metadata, never alt text.
const polygon = points => `<polygon points="${points}"/>`
const triangle = polygon('20,105 80,15 140,105')
const square = polygon('35,20 125,20 125,110 35,110')
const rectangle = polygon('15,35 145,35 145,95 15,95')
const drawings = {
  circle: '<circle cx="80" cy="65" r="48"/>', triangle, square, rectangle,
  rhombus: polygon('10,65 80,20 150,65 80,110'),
  parallelogram: polygon('40,30 150,30 120,100 10,100'),
  trapezoid: polygon('45,30 115,30 150,100 10,100'),
  pentagon: polygon('80,10 140,52 118,115 42,115 20,52'),
  hexagon: polygon('45,15 115,15 150,65 115,115 45,115 10,65'),
  sphere: '<circle cx="80" cy="65" r="48"/><ellipse cx="80" cy="65" rx="48" ry="15" stroke-dasharray="5 4"/><path d="M80 17C115 30 115 100 80 113"/>',
  cube: '<path d="M30 40 95 40 95 110 30 110Z M30 40 65 15 130 15 130 85 95 110 M95 40 130 15"/><path d="M30 110 65 85 130 85 M65 85V15" stroke-dasharray="5 4"/>',
  cuboid: '<path d="M15 45 115 45 115 110 15 110Z M15 45 45 20 145 20 145 85 115 110 M115 45 145 20"/><path d="M15 110 45 85 145 85 M45 85V20" stroke-dasharray="5 4"/>',
  cylinder: '<ellipse cx="80" cy="25" rx="45" ry="14"/><path d="M35 25V100C35 119 125 119 125 100V25"/><path d="M35 100C35 81 125 81 125 100" stroke-dasharray="5 4"/>',
  cone: '<path d="M35 100 80 12 125 100C125 119 35 119 35 100Z"/><path d="M35 100C35 81 125 81 125 100" stroke-dasharray="5 4"/>',
  pyramid: '<path d="M80 10 15 90 100 118 145 80 80 10 100 118 M15 90 80 10"/><path d="M15 90 60 62 145 80 M60 62 80 10" stroke-dasharray="5 4"/>'
}
const names = { circle: 'Cirkel', triangle: 'Triangel', square: 'Kvadrat', rectangle: 'Rektangel',
  rhombus: 'Romb', parallelogram: 'Parallellogram', trapezoid: 'Parallelltrapets', pentagon: 'Femhörning',
  hexagon: 'Sexhörning', sphere: 'Klot', cube: 'Kub', cuboid: 'Rätblock', cylinder: 'Cylinder', cone: 'Kon', pyramid: 'Pyramid' }
const classes = { square: ['kvadrat', 'rektangel', 'romb', 'parallellogram', 'fyrhörning'],
  rectangle: ['rektangel', 'parallellogram', 'fyrhörning'], rhombus: ['romb', 'parallellogram', 'fyrhörning'],
  parallelogram: ['parallellogram', 'fyrhörning'], trapezoid: ['parallelltrapets', 'fyrhörning'] }
const properties = { triangle: { sides: 3, corners: 3 }, square: { sides: 4, corners: 4 },
  rectangle: { sides: 4, corners: 4 }, rhombus: { sides: 4, corners: 4 },
  parallelogram: { sides: 4, corners: 4 }, trapezoid: { sides: 4, corners: 4 },
  pentagon: { sides: 5, corners: 5 }, hexagon: { sides: 6, corners: 6 },
  cube: { faces: 6, corners: 8, edges: 12 }, cuboid: { faces: 6, corners: 8, edges: 12 },
  pyramid: { faces: 5, corners: 5, edges: 8 } }
export const screeningFigures = Object.keys(drawings).flatMap((kind, index) => {
  const variants = index < 9 ? ['standard', 'rotated', 'small'] : ['standard']
  return variants.map(variant => ({ id: `${kind}-${variant}`, version: 1, kind, variant,
    nameSv: `${names[kind]}${variant === 'rotated' ? ' · vriden' : variant === 'small' ? ' · mindre' : ''}`,
    tags: classes[kind] || [names[kind].toLocaleLowerCase('sv')], properties: properties[kind] || {}, dimensions: index < 9 ? 2 : 3 }))
})
export const findScreeningFigure = (id, version = 1) => screeningFigures.find(item => item.id === id && item.version === version)
export const searchScreeningFigures = (query = '') => screeningFigures.filter(item =>
  `${item.nameSv} ${item.tags.join(' ')} ${item.dimensions}d ${item.properties.corners ?? ''} hörn ${item.properties.sides ?? ''} sidor ${item.properties.faces ?? ''} sidoytor ${item.properties.edges ?? ''} kanter`
    .toLocaleLowerCase('sv').includes(String(query).toLocaleLowerCase('sv')))
export function screeningFigureSvg(id, version = 1) {
  const figure = findScreeningFigure(id, version)
  if (!figure) return null
  const transform = figure.variant === 'rotated' ? 'rotate(35 80 65) scale(.75) translate(27 22)'
    : figure.variant === 'small' ? 'translate(30 24) scale(.62 .7)' : ''
  // Keep regular figures regular when changing size.
  const safeTransform = figure.variant === 'small' && ['circle', 'square', 'pentagon', 'hexagon'].includes(figure.kind)
    ? 'translate(30 25) scale(.62)' : transform
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 130"><g transform="${safeTransform}" fill="none" stroke="#172536" stroke-width="2.5" stroke-linejoin="round">${drawings[figure.kind]}</g></svg>`
}
export const figureRef = id => ({ source: 'bank', id, version: 1 })
