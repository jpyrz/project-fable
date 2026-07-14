import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'
import { PetAvatar } from '../components/PetAvatar'
import { species } from '../data'
import { customizationAssets } from '../customizationData'
import { useGame } from '../state/GameContext'
import type { Pet, SpeciesId } from '../types'
import styles from './Onboarding.module.scss'

export function Onboarding() {
  const { onboard, state, backend } = useGame()
  const [step, setStep] = useState(0)
  const [username, setUsername] = useState(state.username === 'NewKeeper' ? '' : state.username)
  const [petName, setPetName] = useState('')
  const [speciesId, setSpeciesId] = useState<SpeciesId>('mossling')
  const [palette, setPalette] = useState(0)
  const [starterHair, setStarterHair] = useState('none')
  const [pronouns, setPronouns] = useState<Pet['pronouns']>('they/them')
  const [age, setAge] = useState(false)
  const [error, setError] = useState('')
  const selected = species.find((entry) => entry.id === speciesId)!
  const starterHairOption = customizationAssets.find((asset) => asset.speciesId === speciesId && asset.slot === 'hair' && asset.starter)
  const appearance = starterHair !== 'none' && starterHairOption?.id === starterHair ? { hair: starterHair } as const : {}
  const previewPet: Pet = { id: 'preview', name: petName || 'Your Fable', speciesId, palette, pronouns, hunger: 100, mood: 100, cleanliness: 100, equipped: {}, appearance }
  const canContinue = step === 0 ? username.trim().length >= 3 && age : step === 1 ? Boolean(speciesId) : petName.trim().length >= 2
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'auto' }) }, [step])
  const complete = async () => {
    setError('')
    try { await onboard(username.trim(), petName.trim(), speciesId, palette, pronouns, appearance) }
    catch (onboardError) { setError(onboardError instanceof Error ? onboardError.message : 'Could not finish onboarding.') }
  }

  return (
    <main className={styles.page}>
      <div className={styles.sun} />
      <section className={styles.card}>
        <header><div className={styles.mark}>✦</div><p>WELCOME TO</p><h1>Project Fable</h1><span>Step {step + 1} of 3</span></header>
        {step === 0 && <div className={styles.content}>
          <Sparkles className={styles.sparkle} />
          <h2>Your story starts here</h2>
          <p>Choose the name other Keepers will see around Bramblewick.</p>
          <label>Keeper name<input value={username} maxLength={20} onChange={(event) => setUsername(event.target.value.replace(/[^a-zA-Z0-9_]/g, ''))} placeholder="e.g. JuniperJay" /></label>
          <label className={styles.check}><input type="checkbox" checked={age} onChange={(event) => setAge(event.target.checked)} /> <span>I confirm I am at least 13 years old.</span></label>
          <small>{backend === 'demo' ? 'This preview saves locally. Connect Supabase to enable shared play.' : 'Your verified account keeps this Fable safe across devices.'}</small>
          {error && <p role="alert">{error}</p>}
        </div>}
        {step === 1 && <div className={styles.content}>
          <h2>Meet your first Fable</h2><p>Each species has its own personality. You can befriend more later.</p>
          <div className={styles.speciesGrid}>{species.map((entry) => <button key={entry.id} className={speciesId === entry.id ? styles.selected : ''} onClick={() => { setSpeciesId(entry.id); setStarterHair('none') }}><img src={`/pets/customization/${entry.id}/base.png`} alt="" /><strong>{entry.name}</strong><span>{entry.tagline}</span></button>)}</div>
        </div>}
        {step === 2 && <div className={styles.content}>
          <div className={styles.petPreview}><PetAvatar pet={previewPet} /></div>
          <h2>A perfect match!</h2>
          <label>Pet name<input value={petName} maxLength={18} onChange={(event) => setPetName(event.target.value.replace(/[^a-zA-Z0-9 '-]/g, ''))} placeholder="What will you call them?" /></label>
          <fieldset><legend>Choose a color</legend><div className={styles.palettes}>{selected.colors.map((color, index) => <button key={color} aria-label={`Palette ${index + 1}`} className={palette === index ? styles.paletteSelected : ''} style={{ background: color }} onClick={() => setPalette(index)} />)}</div></fieldset>
          <fieldset><legend>Choose a starter trait</legend><div className={styles.choiceRow}><button className={starterHair === 'none' ? styles.choiceSelected : ''} onClick={() => setStarterHair('none')}>Natural look</button>{starterHairOption && <button className={starterHair === starterHairOption.id ? styles.choiceSelected : ''} onClick={() => setStarterHair(starterHairOption.id)}>{starterHairOption.icon} {starterHairOption.label}</button>}</div></fieldset>
          <label>Pronouns<select value={pronouns} onChange={(event) => setPronouns(event.target.value as Pet['pronouns'])}><option>they/them</option><option>she/her</option><option>he/him</option></select></label>
        </div>}
        <footer>
          {step > 0 ? <button className="button secondary" onClick={() => setStep(step - 1)}><ChevronLeft /> Back</button> : <span />}
          <button className="button primary" disabled={!canContinue} onClick={() => step < 2 ? setStep(step + 1) : void complete()}>{step === 2 ? 'Enter Bramblewick' : 'Continue'} <ChevronRight /></button>
        </footer>
      </section>
    </main>
  )
}
