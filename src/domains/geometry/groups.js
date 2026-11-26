export const geometryGroups = {
  geometry_lines: 'Linjer och sträckor',
  geometry_plane: 'Plana figurer',
  geometry_solids: 'Kroppar (3D)'
}

export const isGeometrySkill = skill => Object.hasOwn(geometryGroups, skill)
