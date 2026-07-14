import { Copy, Grid3X3, RotateCcw, ScanLine, SlidersHorizontal, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PetAvatar } from '../components/PetAvatar'
import { customizationAssets, customizationSlots, type CustomizationAsset } from '../customizationData'
import { species } from '../data'
import type { CustomizationSlot, Pet, PetAppearance, SpeciesId } from '../types'
import styles from './CustomizationLab.module.scss'

type Transform = CustomizationAsset['transform']
type TransformMap = Record<string, Transform>

const storageKey = 'project-fable-customization-lab-v1'

function manifestTransforms(): TransformMap {
  return Object.fromEntries(customizationAssets.map((asset) => [asset.id, { ...asset.transform }]))
}

function readTransforms(): TransformMap {
  const defaults = manifestTransforms()
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) ?? '{}') as Partial<TransformMap>
    return Object.fromEntries(Object.entries(defaults).map(([id, transform]) => [id, { ...transform, ...(saved[id] ?? {}) }]))
  } catch { return defaults }
}

function fullAppearance(speciesId: SpeciesId): PetAppearance {
  const appearance: PetAppearance = {}
  for (const asset of customizationAssets.filter((entry) => entry.speciesId === speciesId)) {
    if (!appearance[asset.slot]) appearance[asset.slot] = asset.id
  }
  return appearance
}

function labPet(speciesId: SpeciesId, appearance: PetAppearance, palette = 0): Pet {
  return { id: `lab-${speciesId}`, name: 'Preview', speciesId, palette, pronouns: 'they/them', hunger: 100, mood: 100, cleanliness: 100, equipped: {}, appearance }
}

function firstEditable(speciesId: SpeciesId) {
  return customizationAssets.find((asset) => asset.speciesId === speciesId && asset.slot === 'outfit')?.id
    ?? customizationAssets.find((asset) => asset.speciesId === speciesId)?.id
    ?? ''
}

export function CustomizationLab() {
  const [speciesId, setSpeciesId] = useState<SpeciesId>('lumipup')
  const [palette, setPalette] = useState(0)
  const [appearance, setAppearance] = useState<PetAppearance>(() => fullAppearance('lumipup'))
  const [editingId, setEditingId] = useState(() => firstEditable('lumipup'))
  const [transforms, setTransforms] = useState<TransformMap>(readTransforms)
  const [guides, setGuides] = useState(true)
  const [copied, setCopied] = useState('')
  const selectedSpecies = species.find((entry) => entry.id === speciesId)!
  const assets = customizationAssets.filter((entry) => entry.speciesId === speciesId)
  const editing = customizationAssets.find((entry) => entry.id === editingId && entry.speciesId === speciesId) ?? assets[0]
  const activeTransform = editing ? transforms[editing.id] : undefined
  const previewPet = labPet(speciesId, appearance, palette)
  const changed = useMemo(() => {
    const defaults = manifestTransforms()
    return Object.fromEntries(Object.entries(transforms).filter(([id, transform]) => JSON.stringify(transform) !== JSON.stringify(defaults[id])))
  }, [transforms])

  const persist = (next: TransformMap) => {
    setTransforms(next)
    localStorage.setItem(storageKey, JSON.stringify(next))
  }

  const chooseSpecies = (nextSpecies: SpeciesId) => {
    setSpeciesId(nextSpecies)
    setPalette(0)
    setAppearance(fullAppearance(nextSpecies))
    setEditingId(firstEditable(nextSpecies))
    setCopied('')
  }

  const chooseAsset = (asset: CustomizationAsset) => {
    setAppearance((current) => ({ ...current, [asset.slot]: asset.id }))
    setEditingId(asset.id)
    setCopied('')
  }

  const clearSlot = (slot: CustomizationSlot) => {
    setAppearance((current) => { const next = { ...current }; delete next[slot]; return next })
  }

  const updateTransform = (field: keyof Transform, value: number) => {
    if (!editing || !activeTransform || !Number.isFinite(value)) return
    persist({ ...transforms, [editing.id]: { ...activeTransform, [field]: value } })
  }

  const resetAsset = () => {
    if (!editing) return
    persist({ ...transforms, [editing.id]: { ...editing.transform } })
  }

  const resetLab = () => {
    const defaults = manifestTransforms()
    persist(defaults)
    setAppearance(fullAppearance(speciesId))
    setCopied('')
  }

  const copyText = async (label: string, value: string) => {
    try { await navigator.clipboard.writeText(value); setCopied(label) } catch { setCopied('Copy unavailable') }
  }

  const snippet = editing && activeTransform
    ? `transform: { x: ${activeTransform.x}, y: ${activeTransform.y}, scale: ${activeTransform.scale}${activeTransform.rotation ? `, rotation: ${activeTransform.rotation}` : ''} }`
    : ''

  return <main className={styles.page}>
    <header className={styles.header}>
      <div><span>LOCAL DEVELOPMENT ONLY</span><h1>Customization Lab</h1><p>Every species and fitted layer is unlocked here. Nothing changes your account, inventory, or saved pet.</p></div>
      <div className={styles.headerActions}><Link to="/town">Back to game</Link><button onClick={resetLab}><RotateCcw /> Reset lab</button></div>
    </header>

    <section className={styles.speciesPicker} aria-label="Preview species">
      {species.map((entry) => <button key={entry.id} className={speciesId === entry.id ? styles.activeSpecies : ''} onClick={() => chooseSpecies(entry.id)}><img src={`/pets/customization/${entry.id}/base.png`} alt="" /><span><strong>{entry.name}</strong><small>{customizationAssets.filter((asset) => asset.speciesId === entry.id).length} fitted layers</small></span></button>)}
    </section>

    <section className={styles.workspace}>
      <div className={styles.previewPanel}>
        <div className={styles.previewToolbar}><span><ScanLine /> Actual game renderer</span><button className={guides ? styles.activeGuide : ''} onClick={() => setGuides((current) => !current)}><Grid3X3 /> Guides {guides ? 'on' : 'off'}</button></div>
        <div className={styles.preview}><PetAvatar pet={previewPet} transformOverrides={transforms} debug={guides} selectedAssetId={editing?.id} /></div>
        <div className={styles.previewCaption}><strong>{selectedSpecies.name}</strong><span>Palette {palette + 1} · {Object.keys(appearance).length} active layers</span></div>
      </div>

      <aside className={styles.controls}>
        <section><header><span>BODY PALETTE</span><h2>Color check</h2></header><div className={styles.palettes}>{selectedSpecies.colors.map((color, index) => <button key={color} aria-label={`Palette ${index + 1}`} className={palette === index ? styles.selectedPalette : ''} style={{ '--swatch': color } as React.CSSProperties} onClick={() => setPalette(index)}><i /><span>{index + 1}</span></button>)}</div></section>
        {customizationSlots.map((slot) => {
          const slotAssets = assets.filter((asset) => asset.slot === slot.id)
          return <section key={slot.id}><header><span>{slot.icon} {slot.label.toUpperCase()}</span><h2>{slot.label}</h2></header><div className={styles.assetButtons}><button className={!appearance[slot.id] ? styles.selectedAsset : ''} onClick={() => clearSlot(slot.id)}><b>○</b><span>Natural</span></button>{slotAssets.map((asset) => <button key={asset.id} className={appearance[slot.id] === asset.id ? styles.selectedAsset : ''} onClick={() => chooseAsset(asset)}><b><img src={asset.assetPath} alt="" /></b><span>{asset.label}</span><small>{editing?.id === asset.id ? 'Editing placement' : 'Click to inspect'}</small></button>)}</div></section>
        })}
      </aside>
    </section>

    {editing && activeTransform && <section className={styles.tuner}>
      <header><div><span>LIVE PLACEMENT</span><h2><SlidersHorizontal /> {editing.label}</h2><p>Changes are stored only in this browser’s local lab until copied into the manifest.</p></div><button onClick={resetAsset}><RotateCcw /> Reset this layer</button></header>
      <div className={styles.sliders}>
        {([
          ['x', 'Horizontal', -0.5, 0.5, 0.005],
          ['y', 'Vertical', -0.5, 0.5, 0.005],
          ['scale', 'Scale', 0.1, 1.5, 0.01],
          ['rotation', 'Rotation', -30, 30, 0.5],
        ] as const).map(([field, label, min, max, step]) => <label key={field}><span>{label}</span><input type="range" min={min} max={max} step={step} value={activeTransform[field] ?? 0} onChange={(event) => updateTransform(field, Number(event.target.value))} /><input type="number" min={min} max={max} step={step} value={activeTransform[field] ?? 0} onChange={(event) => updateTransform(field, Number(event.target.value))} /></label>)}
      </div>
      <div className={styles.copyRow}><code>{snippet}</code><button onClick={() => void copyText('Transform copied', snippet)}><Copy /> {copied || 'Copy transform'}</button><button onClick={() => void copyText('Changes copied', JSON.stringify(changed, null, 2))}><Copy /> Copy all changes</button></div>
    </section>}

    <section className={styles.review}>
      <header><span>VISUAL CONTACT SHEET</span><h2><Sparkles /> Every fitted layer on {selectedSpecies.name}</h2><p>Each card isolates one asset so hats cannot hide hair and stacked clothing cannot conceal alignment problems.</p></header>
      <div className={styles.reviewGrid}>{assets.map((asset) => <button key={asset.id} onClick={() => chooseAsset(asset)}><div><PetAvatar pet={labPet(speciesId, { [asset.slot]: asset.id }, palette)} transformOverrides={transforms} /></div><strong>{asset.label}</strong><span>{asset.slot} · x {transforms[asset.id].x} · y {transforms[asset.id].y} · {transforms[asset.id].scale}×</span></button>)}</div>
    </section>

    <section className={styles.allSpecies}>
      <header><span>CROSS-SPECIES CHECK</span><h2>Complete starter looks</h2><p>Click any pet to move it into the large tuning preview.</p></header>
      <div>{species.map((entry) => <button key={entry.id} onClick={() => chooseSpecies(entry.id)}><PetAvatar pet={labPet(entry.id, fullAppearance(entry.id))} transformOverrides={transforms} /><strong>{entry.name}</strong></button>)}</div>
    </section>
  </main>
}
