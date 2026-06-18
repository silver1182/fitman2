const tabs = [
  { key: 'home', label: '首页', icon: '🏠' },
  { key: 'workout', label: '训练', icon: '💪' },
  { key: 'history', label: '历史', icon: '📋' },
  { key: 'templates', label: '模板', icon: '📝' },
]

export default function NavBar({ active, onChange }) {
  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      width: '100%',
      maxWidth: 430,
      background: '#1a1a1a',
      borderTop: '1px solid #2a2a2a',
      display: 'flex',
      height: 64,
      zIndex: 100,
    }}>
      {tabs.map(t => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            background: 'none',
            color: active === t.key ? '#4ade80' : '#666',
            fontSize: 10,
            transition: 'color 0.2s',
          }}
        >
          <span style={{ fontSize: 22 }}>{t.icon}</span>
          {t.label}
        </button>
      ))}
    </nav>
  )
}
