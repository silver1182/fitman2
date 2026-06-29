import { useState, useEffect, useMemo } from 'react'

// 解析 "2026/6/29" 格式日期
function parseDate(str) {
  if (!str) return null
  const parts = str.split('/')
  if (parts.length !== 3) return null
  return new Date(+parts[0], +parts[1] - 1, +parts[2])
}

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
  workouts.forEach(w => {
    let count = 0
    w.exercises?.forEach(ex => {
      ex.sets?.forEach(s => {
        if (s.done) count++
      })
    })
    if (count > 0) map[w.date] = (map[w.date] || 0) + count
  })
  return map
}

// 热力图颜色
function cellColor(count) {
  if (!count || count === 0) return '#1a1a1a'
  if (count <= 3)  return '#0e4429'
  if (count <= 8)  return '#006d32'
  if (count <= 15) return '#26a641'
  return '#39d353'
}

const WEEK_LABELS = ['一', '二', '三', '四', '五', '六', '日']

// ====== 热力图组件 ======
function Heatmap({ workouts }) {
  const [weeks, setWeeks] = useState(12)

  const counts = useMemo(() => dailySetCounts(workouts), [workouts])

  const cells = useMemo(() => {
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
      result.push({
        key: formatDate(current),
        count: counts[formatDate(current)] || 0,
        date: new Date(current),
      })
      current.setDate(current.getDate() + 1)
    }
    return result
  }, [counts, weeks])

  // 按周分组
  const weekGrid = useMemo(() => {
    const grid = []
    let currentWeek = new Array(7).fill(null)
    cells.forEach(cell => {
      const d = dayOfWeek(cell.date)
      currentWeek[d] = cell
      if (d === 6) {
        grid.push([...currentWeek])
        currentWeek = new Array(7).fill(null)
      }
    })
    if (currentWeek.some(c => c !== null)) grid.push([...currentWeek])
    return grid
  }, [cells])

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

  // 正序数据给热力图用
  const allWorkouts = useMemo(() => {
    return JSON.parse(localStorage.getItem('workouts') || '[]')
  }, [])

  return (
    <div style={{ padding: 20 }}>
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>训练历史</div>

      {/* 训练热力图 */}
      {allWorkouts.length > 0 && <Heatmap workouts={allWorkouts} />}

      {workouts.length === 0 ? (
        <div style={{ color: '#555', textAlign: 'center', padding: '40px 0', fontSize: 14 }}>
          还没有训练记录
        </div>
      ) : (
        workouts.map(w => (
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
        ))
      )}
    </div>
  )
}
