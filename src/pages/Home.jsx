import { useState, useEffect } from 'react'

export default function Home({ onStartWorkout }) {
  const [templates, setTemplates] = useState([])
  const [todayWorkout, setTodayWorkout] = useState(null)
  const [recentWorkouts, setRecentWorkouts] = useState([])

  useEffect(() => {
    const t = JSON.parse(localStorage.getItem('templates') || '[]')
    setTemplates(t)
    const w = JSON.parse(localStorage.getItem('workouts') || '[]')
    const today = new Date().toLocaleDateString('zh-CN')
    setTodayWorkout(w.find(x => x.date === today) || null)
    setRecentWorkouts(w.slice(-3).reverse())
  }, [])

  const today = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
  })

  return (
    <div style={{ padding: 20 }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ color: '#888', fontSize: 13, marginBottom: 4 }}>{today}</div>
        <div style={{ fontSize: 22, fontWeight: 700 }}>
          {todayWorkout ? '✅ 今日已训练' : '今日未训练'}
        </div>
      </div>

      <div style={{ marginBottom: 28 }}>
        <div style={{ color: '#888', fontSize: 13, marginBottom: 12 }}>快速开始</div>
        {templates.length === 0 ? (
          <div style={{
            background: '#1a1a1a', borderRadius: 12, padding: 16,
            color: '#555', fontSize: 14, textAlign: 'center'
          }}>
            还没有模板，去模板页创建一个
          </div>
        ) : (
          templates.map(t => (
            <button
              key={t.id}
              onClick={() => onStartWorkout(t)}
              style={{
                width: '100%', background: '#1a1a1a', border: '1px solid #2a2a2a',
                borderRadius: 12, padding: '14px 16px', marginBottom: 10,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                color: '#f0f0f0',
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{t.name}</div>
                <div style={{ color: '#666', fontSize: 12 }}>
                  {t.exercises.length} 个动作
                </div>
              </div>
              <span style={{ color: '#4ade80', fontSize: 20 }}>▶</span>
            </button>
          ))
        )}
        <button
          onClick={() => onStartWorkout(null)}
          style={{
            width: '100%', background: 'none', border: '1px dashed #333',
            borderRadius: 12, padding: '14px 16px',
            color: '#555', fontSize: 14,
          }}
        >
          + 空白训练
        </button>
      </div>

      {recentWorkouts.length > 0 && (
        <div>
          <div style={{ color: '#888', fontSize: 13, marginBottom: 12 }}>最近训练</div>
          {recentWorkouts.map(w => (
            <div key={w.id} style={{
              background: '#1a1a1a', borderRadius: 10, padding: '12px 14px', marginBottom: 8,
              display: 'flex', justifyContent: 'space-between',
            }}>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{w.templateName || '空白训练'}</div>
              <div style={{ color: '#666', fontSize: 12 }}>{w.date}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
