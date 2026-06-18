import { useState, useEffect } from 'react'

export default function History() {
  const [workouts, setWorkouts] = useState([])
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    load()
  }, [])

  function load() {
    const w = JSON.parse(localStorage.getItem('workouts') || '[]')
    setWorkouts([...w].reverse())
  }

  function deleteWorkout(id) {
    if (!window.confirm('确认删除这条记录？')) return
    const w = JSON.parse(localStorage.getItem('workouts') || '[]')
    localStorage.setItem('workouts', JSON.stringify(w.filter(x => x.id !== id)))
    load()
  }

  if (workouts.length === 0) {
    return (
      <div style={{ padding: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>训练历史</div>
        <div style={{ color: '#555', textAlign: 'center', padding: '60px 0', fontSize: 14 }}>
          还没有训练记录
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: 20 }}>
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>训练历史</div>
      {workouts.map(w => (
        <div key={w.id} style={{
          background: '#1a1a1a', borderRadius: 12, marginBottom: 12, overflow: 'hidden',
        }}>
          <div
            style={{
              padding: '14px 16px', display: 'flex',
              justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer',
            }}
            onClick={() => setExpanded(expanded === w.id ? null : w.id)}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{w.templateName || '空白训练'}</div>
              <div style={{ color: '#666', fontSize: 12, marginTop: 4 }}>
                {w.date} · {w.exercises?.length || 0} 个动作
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                onClick={e => { e.stopPropagation(); deleteWorkout(w.id) }}
                style={{ background: 'none', color: '#ef4444', fontSize: 13, padding: '4px 8px' }}
              >删除</button>
              <span style={{ color: '#555', fontSize: 16 }}>{expanded === w.id ? '▲' : '▼'}</span>
            </div>
          </div>

          {expanded === w.id && (
            <div style={{ borderTop: '1px solid #2a2a2a', padding: '12px 16px' }}>
              {w.exercises?.map((ex, i) => (
                <div key={i} style={{ marginBottom: 12 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>{ex.name}</div>
                  {ex.sets?.map((s, j) => (
                    <div key={j} style={{
                      display: 'flex', gap: 12, fontSize: 13, color: s.done ? '#4ade80' : '#888',
                      marginBottom: 4, paddingLeft: 8,
                    }}>
                      <span>第{j + 1}组</span>
                      <span>{s.weight || 0} kg</span>
                      <span>× {s.reps || 0}</span>
                      {s.done && <span>✓</span>}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
