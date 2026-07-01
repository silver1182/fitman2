import { useState } from 'react'
import NavBar from './components/NavBar'
import Home from './pages/Home'
import Workout from './pages/Workout'
import History from './pages/History'
import Templates from './pages/Templates'

export default function App() {
  const [tab, setTab] = useState('home')
  const [workoutTemplate, setWorkoutTemplate] = useState(null)

  function startWorkout(template) {
    setWorkoutTemplate(template)
    setTab('workout')
  }

  function finishWorkout() {
    setWorkoutTemplate(null)
    setTab('history')
  }

  return (
    <>
      <div id="scroll-root" style={{ flex: 1, overflowY: 'auto', paddingBottom: 64 }}>
        {tab === 'home' && <Home onStartWorkout={startWorkout} />}
        {tab === 'workout' && <Workout template={workoutTemplate} onFinish={finishWorkout} />}
        {tab === 'history' && <History />}
        {tab === 'templates' && <Templates />}
      </div>
      <NavBar active={tab} onChange={setTab} />
    </>
  )
}
