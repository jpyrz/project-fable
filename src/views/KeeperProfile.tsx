import { Award, BookOpen, Heart, Users } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PetAvatar } from '../components/PetAvatar'
import { items } from '../data'
import { getSpecies, useGame } from '../state/GameContext'
import type { PublicKeeperProfile } from '../types'
import styles from './KeeperProfile.module.scss'

export function KeeperProfile() {
  const { username = '' } = useParams()
  const { getPublicProfile, state } = useGame()
  const [profile, setProfile] = useState<PublicKeeperProfile | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    setProfile(null)
    setError('')
    void Promise.resolve(getPublicProfile(username))
      .then((result) => { if (active) setProfile(result) })
      .catch((requestError) => { if (active) setError(requestError instanceof Error ? requestError.message : 'Keeper not found.') })
    return () => { active = false }
  }, [getPublicProfile, username])

  if (error) return <main className={styles.state}><b>🪹</b><h1>We couldn’t find that Keeper</h1><p>{error}</p><Link to="/plaza">Back to the Plaza</Link></main>
  if (!profile) return <main className={styles.state}><b>✦</b><h1>Opening Keeper profile…</h1></main>

  const pet = profile.activePet
  const levelProgress = profile.reputationXp % 100
  return <div className={styles.page}>
    <section className={styles.banner}>
      <div className={styles.identity}><div className={styles.avatar}>{profile.username.slice(0, 1)}</div><div><span>KEEPER PROFILE</span><h1>{profile.username}</h1><p>Showing off a little corner of Bramblewick.</p></div></div>
      {pet && <div className={styles.pet}><PetAvatar pet={pet} /><div><span>ACTIVE COMPANION</span><h2>{pet.name}</h2><p>{getSpecies(pet.speciesId).name} · {pet.variant === 'tufted' ? 'Tufted' : 'Classic'}</p></div></div>}
    </section>
    <section className={styles.stats}><article><Award /><b>Reputation Level {profile.reputation}</b><span>{levelProgress}/100 to Level {profile.reputation + 1}</span></article><article><BookOpen /><b>{profile.collected.length} highlights</b><span>Favorite collection finds</span></article><article><Users /><b>{profile.friendCount} friends</b><span>Keepers in their circle</span></article></section>
    <section className={styles.badges}><header><div><span>EXPEDITION BADGES</span><h2>Field achievements</h2></div><Award /></header>{profile.badges.length ? <div>{profile.badges.map((badge) => <article key={badge.id}><b>{badge.icon}</b><strong>{badge.label}</strong><small>{badge.description}</small></article>)}</div> : <p>No expedition badges earned yet.</p>}</section>
    <Showcase title="Collection highlights" eyebrow="SHOWCASE" ids={profile.collected} icon={<Award />} empty="No collection highlights yet." />
    <Showcase title="Dreaming of these" eyebrow="WISHLIST" ids={profile.wishlist} icon={<Heart />} empty="Their wishlist is empty." />
    {profile.username.toLowerCase() === state.username.toLowerCase() && <Link className={styles.edit} to="/profile">Edit your profile and account</Link>}
  </div>
}

function Showcase({ title, eyebrow, ids, icon, empty }: { title: string; eyebrow: string; ids: string[]; icon: ReactNode; empty: string }) {
  return <section className={styles.showcase}><header><div><span>{eyebrow}</span><h2>{title}</h2></div>{icon}</header>{ids.length ? <div>{ids.map((id) => { const item = items.find((entry) => entry.id === id); return item ? <article key={id}><b>{item.icon}</b><span>{item.name}</span></article> : null })}</div> : <p>{empty}</p>}</section>
}
