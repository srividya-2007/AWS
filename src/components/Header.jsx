import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const PAGE_TITLES = {
  '/dashboard': { title: 'Dashboard', sub: 'Security Overview' },
  '/alerts': { title: 'Alerts & Incidents', sub: 'Real-time threat feed' },
  '/traffic': { title: 'Traffic Analysis', sub: 'Request patterns & anomalies' },
  '/waf-rules': { title: 'WAF Rules', sub: 'Web Application Firewall management' },
  '/security-demo': { title: 'Security Demo', sub: 'Simulation environment' },
  '/settings': { title: 'Settings', sub: 'Platform configuration' },
}

export default function Header({ location, onMenuClick }) {
  const [time, setTime] = useState(new Date())
  const [showNotifPanel, setShowNotifPanel] = useState(false)
  const navigate = useNavigate()

  const pageInfo = PAGE_TITLES[location.pathname] || { title: 'Page', sub: '' }

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const formatTime = (d) =>
    d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  const notifications = [
    { id: 1, sev: 'critical', msg: 'SQL Injection attempt blocked from 185.220.101.45', time: '2m ago' },
    { id: 2, sev: 'critical', msg: 'Rate limit exceeded — 4,320 req/min from US-East', time: '5m ago' },
    { id: 3, sev: 'warning', msg: 'WAF rule "XSS-Block-v2" updated by admin', time: '11m ago' },
    { id: 4, sev: 'info', msg: 'CloudFront distribution cache invalidated', time: '18m ago' },
    { id: 5, sev: 'info', msg: 'New WAF log group created in CloudWatch', time: '34m ago' },
  ]

  return (
    <header className="page-header">
      <div className="header-left">
        {/* Mobile hamburger */}
        <button
          id="mobile-menu-btn"
          className="icon-btn"
          onClick={onMenuClick}
          aria-label="Toggle navigation menu"
          style={{ display: 'none' }}
        >
          <MenuIcon />
        </button>

        <style>{`
          @media (max-width: 768px) {
            #mobile-menu-btn { display: flex !important; }
          }
        `}</style>

        <div className="breadcrumb">
          <span>AWS Security</span>
          <span className="breadcrumb-sep">›</span>
          <span className="breadcrumb-current">{pageInfo.title}</span>
        </div>
      </div>

      <div className="header-right">
        {/* Live clock */}
        <span className="font-mono" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          {formatTime(time)} UTC+5:30
        </span>

        {/* System status pill */}
        <div className="header-status-pill">
          <span className="status-dot" />
          All Systems Operational
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            id="notif-btn"
            className="icon-btn"
            aria-label="Notifications"
            onClick={() => setShowNotifPanel(v => !v)}
          >
            <BellIcon />
            <span className="notif-badge">7</span>
          </button>

          {showNotifPanel && (
            <>
              <div
                style={{ position: 'fixed', inset: 0, zIndex: 199 }}
                onClick={() => setShowNotifPanel(false)}
              />
              <div className="notif-panel" style={{
                position: 'absolute', top: 'calc(100% + 10px)', right: 0,
                width: '360px', background: 'var(--bg-card)',
                border: '1px solid var(--border-card)', borderRadius: 'var(--radius-lg)',
                boxShadow: '0 16px 48px rgba(0,0,0,0.5)', zIndex: 200,
                overflow: 'hidden',
              }}>
                <div style={{
                  padding: '14px 18px', borderBottom: '1px solid var(--border-subtle)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <span style={{ fontWeight: 700, fontSize: '14px' }}>Notifications</span>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => { setShowNotifPanel(false); navigate('/alerts') }}
                  >
                    View All
                  </button>
                </div>
                <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                  {notifications.map(n => (
                    <div
                      key={n.id}
                      style={{
                        padding: '12px 18px', borderBottom: '1px solid var(--border-subtle)',
                        display: 'flex', gap: '10px', alignItems: 'flex-start',
                        cursor: 'pointer', transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      onClick={() => { setShowNotifPanel(false); navigate('/alerts') }}
                    >
                      <span style={{
                        width: 8, height: 8, borderRadius: '50%', marginTop: 5, flexShrink: 0,
                        background: n.sev === 'critical' ? 'var(--status-critical)' :
                                    n.sev === 'warning' ? 'var(--status-warning)' : 'var(--status-info)',
                      }} />
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '12px', color: 'var(--text-primary)', lineHeight: 1.5 }}>{n.msg}</p>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{n.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Refresh button */}
        <button
          id="refresh-btn"
          className="icon-btn"
          aria-label="Refresh data"
          title="Refresh data"
          onClick={() => window.location.reload()}
        >
          <RefreshIcon />
        </button>
      </div>
    </header>
  )
}

function MenuIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  )
}

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

function RefreshIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  )
}
