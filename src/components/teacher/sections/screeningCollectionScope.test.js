import { expect, test } from 'vitest'
import { scopeScreeningCollections } from './screeningCollectionScope'

test('A group sees only its pupils and member statuses, retaining the collection identity and original assignments', () => {
  const source = [{ id: 'a+b', members: [
    { assignmentId: 'a', studentIds: ['one', 'two'], status: 'active' },
    { assignmentId: 'b', studentIds: ['three'], status: 'stopped' }
  ] }]
  const scoped = scopeScreeningCollections(source, new Set(['three']))
  expect(scoped[0].id).toBe('a+b')
  expect(scoped[0].members).toEqual([source[0].members[1]])
  expect(source[0].members[0].studentIds).toEqual(['one', 'two'])
  expect(scopeScreeningCollections(source, new Set(['unknown']))).toEqual([])
})
