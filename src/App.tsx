import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { useGame } from './state/GameContext'
import { Onboarding } from './views/Onboarding'
import { Town } from './views/Town'
import { PetHome } from './views/PetHome'
import { Market } from './views/Market'
import { Workshop } from './views/Workshop'
import { Plaza } from './views/Plaza'
import { Arcade } from './views/Arcade'
import { Profile } from './views/Profile'
import { Inbox } from './views/Inbox'
import { AuthScreen } from './views/AuthScreen'
import { ResetPassword } from './views/ResetPassword'
import { Bag } from './views/Bag'
import { Friends } from './views/Friends'
import { KeeperProfile } from './views/KeeperProfile'
import { Expeditions } from './views/Expeditions'
import { ExpeditionJournal } from './views/ExpeditionJournal'

export default function App() {
  const { state, status, error } = useGame()
  if (status === 'loading') return <main className="systemState"><b>✦</b><h1>Gathering your Fables…</h1></main>
  if (status === 'signed_out') return <AuthScreen />
  if (status === 'password_recovery') return <ResetPassword />
  if (status === 'error') return <main className="systemState"><b>!</b><h1>We lost the trail</h1><p>{error}</p><button className="button primary" onClick={() => window.location.reload()}>Try again</button></main>
  if (!state.onboarded) return <Onboarding />
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/town" element={<Town />} />
        <Route path="/pet" element={<PetHome />} />
        <Route path="/market" element={<Market />} />
        <Route path="/bag" element={<Bag />} />
        <Route path="/workshop" element={<Workshop />} />
        <Route path="/plaza" element={<Plaza />} />
        <Route path="/arcade" element={<Arcade />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/inbox" element={<Inbox />} />
        <Route path="/friends" element={<Friends />} />
        <Route path="/keeper/:username" element={<KeeperProfile />} />
        <Route path="/expeditions" element={<Expeditions />} />
        <Route path="/expedition-journal" element={<ExpeditionJournal />} />
        <Route path="*" element={<Navigate to="/town" replace />} />
      </Route>
    </Routes>
  )
}
