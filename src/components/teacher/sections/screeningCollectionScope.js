// Display scope changes which recipients/statuses are shown, never the source
// assignment used when reusing its content.
export function scopeScreeningCollections(collections, pupilIds) {
  if (!pupilIds) return collections
  return collections.map(collection => ({ ...collection,
    members: collection.members.map(member => ({ ...member,
      studentIds: member.studentIds.filter(id => pupilIds.has(id))
    })).filter(member => member.studentIds.length)
  })).filter(collection => collection.members.length)
}
