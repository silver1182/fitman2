import { useState, useEffect } from 'react'

const EMPTY_EXERCISE = { name: '', sets: 3, reps: 10 }

export default function Templates() {
  const [templates, setTemplates] = useState([])
  const [editing, setEditing] = useState(null) // null | 'new' | template object
  const [form, setForm] = useState({ name: '', exercises: [{ ...EMPTY_EXERCISE }] })

  useEffect(() => {
    setTemplates(JSON.parse(localStorage.getItem('templates') || '[]'))
  }, [])

  function save(list) {
    localStorage.setItem('templates', JSON.stringify(list))
    setTemplates(list)
  }

  function openNew() {
    setForm({ name: '', exercises: [{ ...EMPTY_EXERCISE }] })
    setEditing('new')
  }

  function openEdit(t) {
    setForm({ name: t.name, exercises: t.exercises.map(e => ({ ...e })) })
    setEditing(t)
  }

  function deleteTemplate(id) {
    if (!window.confirm('确认删除？')) return
    save(templates.filter(t => t.id !== id))
  }

  function addExercise() {
    setForm(f => ({ ...f, exercises: [...f.exercises, { ...EMPTY_EXERCISE }] }))
  }

  function removeExercise(i) {
    setForm(f => ({ ...f, exercises: f.exercises.filter((_, idx) => idx !== i) }))
  }

  function updateExercise(i, field, value) {
    setForm(f => {
      const ex = [...f.exercises]
      ex[i] = { ...ex[i], [field]: field === 'name' ? value : Number(value) }
      return { ...f, exercises: ex }
    })
  }

  function submit() {
    if (!form.name.trim()) return alert('请输入模板名称')
    if (form.exercises.some(e => !e.name.trim())) return alert('动作名称不能为空')
    if (editing === 'new') {
      save([...templates, { id: Date.now(), ...form }])
    } else {
      save(templates.map(t => t.id === editing.id ? { ...editing, ...form } : t))
    }
    setEditing(null)
  }

  if (editing !== null) {
    return (
      <div style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20, gap: 12 }}>
          <button onClick={() => setEditing(null)} style={{ background: 'none', color: '#888', fontSize: 20 }}>←</button>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{editing === 'new' ? '新建模板' : '编辑模板'}</div>
        </div>

        <input
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          placeholder="模板名称（如：胸部训练）"
          style={{
            width: '100%', background: '#1a1a1a', border: '1px solid #2a2a2a',
            borderRadius: 10, padding: '12px 14px', color: '#f0f0f0',
            fontSize: 15, marginBottom: 20,
          }}
        />

        <div style={{ color: '#888', fontSize: 13, marginBottom: 10 }}>动作列表</div>
        {form.exercises.map((ex, i) => (
          <div key={i} style={{
            background: '#1a1a1a', borderRadius: 10, padding: 14, marginBottom: 10,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <input
                value={ex.name}
                onChange={e => updateExercise(i, 'name', e.target.value)}
                placeholder="动作名称（如：卧推）"
                style={{
                  flex: 1, background: '#252525', border: '1px solid #333',
                  borderRadius: 8, padding: '8px 10px', color: '#f0f0f0', fontSize: 14,
                }}
              />
              <button onClick={() => removeExercise(i)} style={{
                background: 'none', color: '#ef4444', fontSize: 18, marginLeft: 10, minWidth: 36,
              }}>×</button>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <label style={{ flex: 1, color: '#888', fontSize: 12 }}>
                组数
                <input
                  type="number" value={ex.sets} min={1} max={10}
                  onChange={e => updateExercise(i, 'sets', e.target.value)}
                  style={{
                    display: 'block', width: '100%', marginTop: 4,
                    background: '#252525', border: '1px solid #333',
                    borderRadius: 8, padding: '8px 10px', color: '#f0f0f0', fontSize: 14,
                  }}
                />
              </label>
              <label style={{ flex: 1, color: '#888', fontSize: 12 }}>
                次数
                <input
                  type="number" value={ex.reps} min={1} max={100}
                  onChange={e => updateExercise(i, 'reps', e.target.value)}
                  style={{
                    display: 'block', width: '100%', marginTop: 4,
                    background: '#252525', border: '1px solid #333',
                    borderRadius: 8, padding: '8px 10px', color: '#f0f0f0', fontSize: 14,
                  }}
                />
              </label>
            </div>
          </div>
        ))}

        <button onClick={addExercise} style={{
          width: '100%', background: 'none', border: '1px dashed #333',
          borderRadius: 10, padding: 12, color: '#555', fontSize: 14, marginBottom: 24,
        }}>+ 添加动作</button>

        <button onClick={submit} style={{
          width: '100%', background: '#4ade80', borderRadius: 12,
          padding: 14, color: '#0f0f0f', fontWeight: 700, fontSize: 16,
        }}>保存模板</button>
      </div>
    )
  }

  return (
    <div style={{ padding: 20 }}>
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>训练模板</div>
      {templates.length === 0 && (
        <div style={{ color: '#555', fontSize: 14, textAlign: 'center', padding: '40px 0' }}>
          还没有模板
        </div>
      )}
      {templates.map(t => (
        <div key={t.id} style={{
          background: '#1a1a1a', borderRadius: 12, padding: '14px 16px',
          marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>{t.name}</div>
            <div style={{ color: '#666', fontSize: 12, marginTop: 4 }}>
              {t.exercises.map(e => e.name).join(' · ')}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => openEdit(t)} style={{
              background: '#252525', borderRadius: 8, padding: '6px 12px', color: '#aaa', fontSize: 13,
            }}>编辑</button>
            <button onClick={() => deleteTemplate(t.id)} style={{
              background: '#252525', borderRadius: 8, padding: '6px 12px', color: '#ef4444', fontSize: 13,
            }}>删除</button>
          </div>
        </div>
      ))}
      <button onClick={openNew} style={{
        width: '100%', background: '#4ade80', borderRadius: 12,
        padding: 14, color: '#0f0f0f', fontWeight: 700, fontSize: 16, marginTop: 8,
      }}>+ 新建模板</button>
    </div>
  )
}
