import { describe, expect, it } from 'vitest'
import {
  appearanceForSpecies,
  customizationAsset,
  customizationAssetForItem,
  customizationAssets,
  customizationSlots,
} from './customizationData'

describe('customization catalog', () => {
  it('keeps asset ids and slots unique', () => {
    expect(new Set(customizationAssets.map((asset) => asset.id)).size).toBe(customizationAssets.length)
    expect(new Set(customizationSlots.map((slot) => slot.id)).size).toBe(customizationSlots.length)
  })

  it('provides one starter asset for every slot and species', () => {
    for (const speciesId of ['mossling', 'lumipup', 'cloudkip', 'pebblit']) {
      expect(customizationAssets.filter((asset) => asset.speciesId === speciesId).map((asset) => asset.slot).sort()).toEqual(['hair', 'head', 'marking', 'outfit'])
    }
  })

  it('removes incompatible species layers from an appearance', () => {
    expect(appearanceForSpecies({ hair: 'mossling-hair-leafy-mohawk' }, 'cloudkip')).toEqual({})
    expect(appearanceForSpecies({ background: 'background-garden' }, 'cloudkip')).toEqual({ background: 'background-garden' })
  })

  it('maps owned items to fitted species layers', () => {
    expect(customizationAssetForItem('item-16', 'mossling')?.id).toBe('mossling-head-sunhat')
    expect(customizationAssetForItem('item-16', 'cloudkip')?.id).toBe('cloudkip-head-sunhat')
    expect(customizationAssetForItem('item-121', 'pebblit')?.id).toBe('pebblit-outfit-sunberry-tunic')
    expect(customizationAssetForItem('item-120', 'pebblit')?.id).toBe('background-moonroot-sky')
  })

  it('keeps approved Lumipup layer alignments', () => {
    expect(customizationAsset('lumipup-marking-comet-dust')?.transform).toEqual({ x: -0.095, y: -0.085, scale: 1.23 })
    expect(customizationAsset('lumipup-hair-nova-swoop')?.transform).toEqual({ x: -0.105, y: -0.15, scale: 0.99 })
    expect(customizationAsset('lumipup-outfit-sunberry-tunic')?.transform).toEqual({ x: 0.105, y: 0.295, scale: 0.6 })
    expect(customizationAsset('lumipup-head-sunhat')?.transform).toEqual({ x: 0.06, y: -0.105, scale: 0.71, rotation: 3.5 })
  })

  it('keeps approved Mossling layer alignments', () => {
    expect(customizationAsset('mossling-hair-leafy-mohawk')?.transform).toEqual({ x: 0.15, y: -0.12, scale: 0.7 })
    expect(customizationAsset('mossling-head-sunhat')?.transform).toEqual({ x: 0.17, y: -0.09, scale: 0.66 })
    expect(customizationAsset('mossling-outfit-sunberry-tunic')?.assetPath).toBe('/pets/customization/mossling/layers/outfit-sunberry-tunic-v4.png')
    expect(customizationAsset('mossling-outfit-sunberry-tunic')?.transform).toEqual({ x: 0.14, y: 0.325, scale: 0.71 })
  })

  it('keeps approved Cloudkip layer alignments', () => {
    expect(customizationAsset('cloudkip-marking-raindrop-blush')?.transform).toEqual({ x: -0.035, y: 0, scale: 1 })
    expect(customizationAsset('cloudkip-hair-storm-curl')?.transform).toEqual({ x: -0.03, y: -0.04, scale: 0.95 })
    expect(customizationAsset('cloudkip-outfit-sunberry-tunic')?.assetPath).toBe('/pets/customization/cloudkip/layers/outfit-sunberry-tunic-v3.png')
    expect(customizationAsset('cloudkip-outfit-sunberry-tunic')?.transform).toEqual({ x: 0.125, y: 0.42, scale: 0.56, rotation: 0.5 })
    expect(customizationAsset('cloudkip-head-sunhat')?.transform).toEqual({ x: 0.05, y: -0.005, scale: 0.75, rotation: 3 })
  })

  it('keeps approved Pebblit layer alignments', () => {
    expect(customizationAsset('pebblit-marking-geode-freckles')?.transform).toEqual({ x: -0.01, y: -0.02, scale: 1.04 })
    expect(customizationAsset('pebblit-hair-crystal-crest')?.transform).toEqual({ x: 0.08, y: -0.08, scale: 0.87, rotation: -4.5 })
    expect(customizationAsset('pebblit-outfit-sunberry-tunic')?.assetPath).toBe('/pets/customization/pebblit/layers/outfit-sunberry-tunic-v2.png')
    expect(customizationAsset('pebblit-outfit-sunberry-tunic')?.transform).toEqual({ x: 0.275, y: 0.46, scale: 0.43 })
    expect(customizationAsset('pebblit-head-sunhat')?.transform).toEqual({ x: 0.19, y: 0.02, scale: 0.63, rotation: -6 })
  })
})
