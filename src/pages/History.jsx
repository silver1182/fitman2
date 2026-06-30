import { useState, useEffect } from 'react'

// 格式化 Date → "2026/6/29"
function formatDate(d) {
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
}

// 周几（周一=0，周日=6）
function dayOfWeek(d) {
  const day = d.getDay()
  return day === 0 ? 6 : day - 1
}

// 统计每天完成的组数
function dailySetCounts(workouts) {
  const map = {}
  if (!Array.isArray(workouts)) return map
  workouts.forEach(w => {
    if (!w) return
    let count = 0
    const exercises = Array.isArray(w.exercises) ? w.exercises : []
    exercises.forEach(ex => {
      if (!ex) return
      const sets = Array.isArray(ex.sets) ? ex.sets : []
      sets.forEach(s => {
        if (s && s.done) count++
      })
    })
    if (count > 0 && w.date) map[w.date] = (map[w.date] || 0) + count
  })
  return map
}

// 热力图颜色
function cellColor(count) {
  if (!count) return '#1a1a1a'
  if (count <= 3)  return '#0e4429'
  if (count <= 8)  return '#006d32'
  if (count <= 15) return '#26a641'
  return '#39d353'
}

const WEEK_LABELS = ['一', '二', '三', '四', '五', '六', '日']

// ====== 热力图组件 ======
function Heatmap({ workouts }) {
  const [weeks, setWeeks] = useState(12)
  const [cells, setCells] = useState([])
  const [weekGrid, setWeekGrid] = useState([])

  useEffect(() => {
    try {
      const counts = dailySetCounts(workouts || [])

      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const dow = dayOfWeek(today)
      const endDate = new Date(today)
      endDate.setDate(today.getDate() + (6 - dow))

      const startDate = new Date(endDate)
      startDate.setDate(endDate.getDate() - weeks * 7 + 1)

      const result = []
      const current = new Date(startDate)
      while (current <= endDate) {
        const key = formatDate(current)
        result.push({
          key,
          count: counts[key] || 0,
          date: new Date(current),
        })
        current.setDate(current.getDate() + 1)
      }
      setCells(result)

      // 按周分组
      const grid = []
      let currentWeek = new Array(7).fill(null)
      result.forEach(cell => {
        const d = dayOfWeek(cell.date)
        currentWeek[d] = cell
        if (d === 6) {
          grid.push([...currentWeek])
          currentWeek = new Array(7).fill(null)
        }
      })
      if (currentWeek.some(c => c !== null)) grid.push([...currentWeek])
      setWeekGrid(grid)
    } catch (e) {
      // 静默失败
    }
  }, [workouts, weeks])

  return (
    <div style={{
      background: '#111', borderRadius: 14, padding: 16, marginBottom: 20,
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 14,
      }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#ccc' }}>训练热力图</div>
        <button
          onClick={() => setWeeks(weeks === 12 ? 52 : 12)}
          style={{ background: 'none', border: 'none', color: '#666', fontSize: 12 }}
        >
          {weeks === 12 ? '查看全部' : '近 3 个月'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 4 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginRight: 4, paddingTop: 2 }}>
          {WEEK_LABELS.map((label, i) => (
            <div key={i} style={{
              width: 16, height: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#555', fontSize: 10,
            }}>
              {i % 2 === 0 ? label : ''}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 4, overflowX: 'auto', flex: 1 }}>
          {weekGrid.map((week, wi) => (
            <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {week.map((cell, di) => (
                <div
                  key={di}
                  title={cell ? `${cell.key}: ${cell.count} 组` : ''}
                  style={{
                    width: 16, height: 16, borderRadius: 3,
                    background: cell ? cellColor(cell.count) : 'transparent',
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 4, marginTop: 12,
        justifyContent: 'flex-end',
      }}>
        <span style={{ color: '#555', fontSize: 10, marginRight: 4 }}>少</span>
        {['0', '1', '4', '9', '16'].map(label => (
          <div key={label} style={{
            width: 12, height: 12, borderRadius: 2,
            background: label === '0' ? '#1a1a1a' : cellColor(Number(label)),
          }} />
        ))}
        <span style={{ color: '#555', fontSize: 10, marginLeft: 4 }}>多</span>
      </div>
    </div>
  )
}

// ====== 历史页 ======
export default function History() {
  const [workouts, setWorkouts] = useState([])
  const [expanded, setExpanded] = useState(null)

  useEffect(() => { load() }, [])

  function load() {
    try {
      const w = JSON.parse(localStorage.getItem('workouts') || '[]')
      setWorkouts([...w].reverse())
    } catch (e) {
      setWorkouts([])
    }
  }

  function deleteWorkout(id) {
    if (!window.confirm('确认删除这条记录？')) return
    try {
      const w = JSON.parse(localStorage.getItem('workouts') || '[]')
      localStorage.setItem('workouts', JSON.stringify(w.filter(x => x.id !== id)))
      load()
    } catch (e) {}
  }

  return (
    <div style={{ padding: 20 }}>
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>训练历史</div>

      <Heatmap workouts={workouts} />

      {workouts.length === 0 && (
        <div style={{ color: '#555', textAlign: 'center', padding: '40px 0', fontSize: 14 }}>
          还没有训练记录
        </div>
      )}

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
