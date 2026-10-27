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
// Later additions: explicit metadata, appended so existing ids and drawings stay frozen.
const label = (x, y, text, anchor = 'middle') =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" fill="#172536" stroke="none" font-family="sans-serif" font-size="12">${text}</text>`
const dot = (x, y) => `<circle cx="${x}" cy="${y}" r="2.5" fill="#172536" stroke="none"/>`
const triangleTypes = { variants: ['standard', 'rotated'], dimensions: 2, properties: { sides: 3, corners: 3 } }
const measured = { variants: ['standard'], dimensions: 2 }
const additions = {
  'triangle-equilateral': { ...triangleTypes, nameSv: 'Liksidig triangel', draw: polygon('20,110 80,6 140,110'),
    tags: ['triangel', 'liksidig triangel', 'likbent triangel', 'spetsvinklig triangel'] },
  'triangle-isosceles': { ...triangleTypes, nameSv: 'Likbent triangel', draw: polygon('45,115 80,10 115,115'),
    tags: ['triangel', 'likbent triangel', 'spetsvinklig triangel'] },
  'triangle-right': { ...triangleTypes, nameSv: 'Rätvinklig triangel', draw: `${polygon('25,110 25,20 145,110')}<path d="M25 98H37V110"/>`,
    tags: ['triangel', 'rätvinklig triangel', 'oliksidig triangel'] },
  'triangle-obtuse': { ...triangleTypes, nameSv: 'Trubbvinklig triangel', draw: polygon('10,100 100,100 150,40'),
    tags: ['triangel', 'trubbvinklig triangel', 'oliksidig triangel'] },
  'triangle-scalene': { ...triangleTypes, nameSv: 'Oliksidig triangel', draw: polygon('15,105 135,105 95,20'),
    tags: ['triangel', 'oliksidig triangel', 'spetsvinklig triangel'] },
  'circle-radius': { ...measured, nameSv: 'Cirkel med radie', draw: `<circle cx="80" cy="65" r="48"/>${dot(80, 65)}<path d="M80 65H128"/>${label(104, 59, 'r')}`,
    tags: ['cirkel', 'radie'] },
  'circle-diameter': { ...measured, nameSv: 'Cirkel med diameter', draw: `<circle cx="80" cy="65" r="48"/>${dot(80, 65)}<path d="M32 65H128"/>${label(80, 59, 'd')}`,
    tags: ['cirkel', 'diameter'] },
  'rectangle-measured': { ...measured, nameSv: 'Rektangel 6 cm × 4 cm', draw: `${polygon('15,30 115,30 115,97 15,97')}${label(65, 115, '6 cm')}${label(121, 68, '4 cm', 'start')}`,
    tags: ['rektangel', 'parallellogram', 'fyrhörning', 'mått', 'area', 'omkrets'], properties: { sides: 4, corners: 4 } },
  'square-measured': { ...measured, nameSv: 'Kvadrat 5 cm', draw: `${polygon('30,20 110,20 110,100 30,100')}${label(70, 117, '5 cm')}${label(115, 64, '5 cm', 'start')}`,
    tags: ['kvadrat', 'rektangel', 'romb', 'parallellogram', 'fyrhörning', 'mått', 'area', 'omkrets'], properties: { sides: 4, corners: 4 } },
  'triangle-measured': { ...measured, nameSv: 'Triangel bas 8 cm, höjd 5 cm',
    draw: `${polygon('15,105 135,105 55,25')}<path d="M55 25V105" stroke-dasharray="5 4"/><path d="M55 95H65V105"/>${label(75, 121, '8 cm')}${label(59, 72, '5 cm', 'start')}`,
    tags: ['triangel', 'mått', 'area', 'höjd'], properties: { sides: 3, corners: 3 } },
  'cuboid-measured': { ...measured, dimensions: 3, nameSv: 'Rätblock 5 cm × 3 cm × 2 cm',
    draw: `<g transform="translate(8 0)"><path d="M25 65H105V97H25Z M25 65 49 45H129V77L105 97 M105 65 129 45"/><path d="M25 97 49 77H129 M49 77V45" stroke-dasharray="5 4"/>${label(65, 112, '5 cm')}${label(21, 85, '2 cm', 'end')}${label(121, 95, '3 cm', 'start')}</g>`,
    tags: ['rätblock', 'mått', 'volym'], properties: { faces: 6, corners: 8, edges: 12 } }
}
for (const [kind, item] of Object.entries(additions)) drawings[kind] = item.draw
const variantName = variant => variant === 'rotated' ? ' · vriden' : variant === 'small' ? ' · mindre' : ''
export const screeningFigures = Object.keys(drawings).filter(kind => !additions[kind]).flatMap((kind, index) => {
  const variants = index < 9 ? ['standard', 'rotated', 'small'] : ['standard']
  return variants.map(variant => ({ id: `${kind}-${variant}`, version: 1, kind, variant,
    nameSv: `${names[kind]}${variantName(variant)}`,
    tags: classes[kind] || [names[kind].toLocaleLowerCase('sv')], properties: properties[kind] || {}, dimensions: index < 9 ? 2 : 3 }))
}).concat(Object.entries(additions).flatMap(([kind, item]) => item.variants.map(variant => ({
  id: variant === 'standard' ? kind : `${kind}-${variant}`, version: 1, kind, variant,
  nameSv: `${item.nameSv}${variantName(variant)}`, tags: item.tags, properties: item.properties || {}, dimensions: item.dimensions }))))
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
