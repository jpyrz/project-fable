import { describe, expect, it } from 'vitest'
import { expeditionLocations, getExpeditionLocation } from './expeditionData'

describe('expedition world', () => {
  it('provides three increasingly challenging regions', () => {
    expect(expeditionLocations.map((location) => location.level)).toEqual([1, 2, 3])
    expect(expeditionLocations.map((location) => location.id)).toEqual([
      'sunberry-glen',
      'mistbell-marsh',
      'moonroot-caverns',
    ])
  })

  it('gives every region a complete collection and several return scenes', () => {
    for (const location of expeditionLocations) {
      expect(new Set(location.collection).size).toBe(4)
      expect(location.scenes).toHaveLength(3)
      expect(location.scenes.every((scene) => scene.pathA.label && scene.pathB.label)).toBe(true)
    }
    expect(new Set(expeditionLocations.flatMap((location) => location.collection)).size).toBe(12)
  })

  it('can resolve every configured location by id', () => {
    for (const location of expeditionLocations) expect(getExpeditionLocation(location.id)).toBe(location)
  })
})
