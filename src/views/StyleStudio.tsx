import { Check, ChevronLeft, LockKeyhole, Palette, RotateCcw, Save, Scissors, Shirt, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useCelebration } from '../components/Celebration'
import { PetAvatar } from '../components/PetAvatar'
import { customizationSlots } from '../customizationData'
import { getSpecies, useGame } from '../state/GameContext'
import type { CustomizationDefinition, CustomizationSlot, PetAppearance } from '../types'
import styles from './StyleStudio.module.scss'

export function StyleStudio() {
  const { activePet, getCustomizationCatalog, savePetCustomization } = useGame()
  const celebrate = useCelebration()
  const [searchParams] = useSearchParams()
  const [tab, setTab] = useState<'salon' | 'wardrobe'>(() => searchParams.get('tab') === 'wardrobe' ? 'wardrobe' : 'salon')
  const [catalog, setCatalog] = useState<CustomizationDefinition[]>([])
  const [appearance, setAppearance] = useState<PetAppearance>({})
  const [palette, setPalette] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!activePet) return
    setAppearance(activePet.appearance ?? {})
    setPalette(activePet.palette)
    setLoading(true)
    void Promise.resolve(getCustomizationCatalog(activePet.id))
      .then(setCatalog)
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : 'The Style Studio could not open.'))
      .finally(() => setLoading(false))
  }, [activePet, getCustomizationCatalog])

  const changed = activePet ? palette !== activePet.palette || JSON.stringify(appearance) !== JSON.stringify(activePet.appearance ?? {}) : false
  const previewPet = useMemo(() => activePet ? { ...activePet, palette, appearance } : null, [activePet, appearance, palette])
  if (!activePet || !previewPet) return null

  const select = (slot: CustomizationSlot, id: string | null) => setAppearance((current) => {
    if (!id) { const next = { ...current }; delete next[slot]; return next }
    return { ...current, [slot]: id }
  })
  const reset = () => { setAppearance(activePet.appearance ?? {}); setPalette(activePet.palette); setError('') }
  const save = async () => {
    if (!changed || saving) return
    setSaving(true); setError('')
    try {
      await savePetCustomization(activePet.id, palette, appearance)
      celebrate({ level: 'major', icon: '✨', title: `${activePet.name} has a fresh new look!`, detail: 'Their Style Studio appearance was saved everywhere in Bramblewick.' })
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : 'That look could not be saved.') }
    finally { setSaving(false) }
  }

  const species = getSpecies(activePet.speciesId)
  const visibleSlots = customizationSlots.filter((slot) => slot.tab === tab)
  return <div className={styles.page}>
    <header className={styles.header}><Link to="/pet" aria-label={`Back to ${activePet.name}`}><ChevronLeft /></Link><div><span>BRAMBLEWICK STYLE STUDIO</span><h1>Make the look yours</h1><p>Physical traits are permanent unlocks. Wardrobe pieces come from your adventures and collection.</p></div><Scissors /></header>
    <div className={styles.workspace}>
      <aside className={styles.preview}>
        <div className={styles.sparkles}>✦ · ✧ · ✦</div>
        <PetAvatar pet={previewPet} />
        <div className={styles.previewName}><span>LIVE PREVIEW</span><strong>{activePet.name}</strong><small>{species.name} · Palette {palette + 1}</small></div>
      </aside>
      <main className={styles.controls}>
        <nav aria-label="Customization area"><button className={tab === 'salon' ? styles.activeTab : ''} onClick={() => setTab('salon')}><Scissors /> Salon<small>Traits & colors</small></button><button className={tab === 'wardrobe' ? styles.activeTab : ''} onClick={() => setTab('wardrobe')}><Shirt /> Wardrobe<small>Clothes & accessories</small></button></nav>
        {tab === 'salon' && <section className={styles.paletteSection}><header><div><span>BODY COLOR</span><h2><Palette /> {species.name} palette</h2></div></header><div className={styles.palettes}>{species.colors.map((color, index) => <button key={color} aria-label={`Palette ${index + 1}`} aria-pressed={palette === index} className={palette === index ? styles.selectedPalette : ''} style={{ '--swatch': color } as React.CSSProperties} onClick={() => setPalette(index)}><i /><small>{index === 0 ? 'Meadow' : index === 1 ? 'Berry' : 'Lagoon'}</small>{palette === index && <Check />}</button>)}</div></section>}
        {loading ? <section className={styles.loading}><Sparkles /><p>Opening the style drawers…</p></section> : visibleSlots.map((slot) => {
          const options = catalog.filter((entry) => entry.slot === slot.id)
          const selected = appearance[slot.id]
          return <section className={styles.slot} key={slot.id}><header><div><span>{slot.icon} {slot.label.toUpperCase()}</span><h2>{slot.label}</h2><p>{slot.description}</p></div><b>{selected ? options.find((option) => option.id === selected)?.icon : '○'}</b></header><div className={styles.options}><button className={!selected ? styles.selectedOption : ''} onClick={() => select(slot.id, null)}><b>○</b><strong>Natural</strong><small>No added layer</small>{!selected && <Check />}</button>{options.map((option) => <button key={option.id} disabled={!option.unlocked} className={selected === option.id ? styles.selectedOption : ''} onClick={() => select(slot.id, option.id)}><b className={styles.optionArt}><img src={option.assetPath} alt="" /></b><strong>{option.label}</strong><small>{option.unlocked ? option.description : option.source}{option.hidesSlots?.length ? ' · Covers hair while worn' : ''}</small>{option.unlocked ? selected === option.id && <Check /> : <LockKeyhole />}</button>)}</div></section>
        })}
        {error && <p className={styles.error} role="alert">{error}</p>}
      </main>
    </div>
    <footer className={styles.saveBar}><div><span>{changed ? 'UNSAVED LOOK' : 'LOOK SAVED'}</span><strong>{changed ? 'Your preview is ready when you are.' : `${activePet.name} is wearing this look around town.`}</strong></div><button className={styles.reset} disabled={!changed || saving} onClick={reset}><RotateCcw /> Reset</button><button className={styles.save} disabled={!changed || saving} onClick={() => void save()}><Save /> {saving ? 'Saving…' : 'Save look'}</button></footer>
  </div>
}
