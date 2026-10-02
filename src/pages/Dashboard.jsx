import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

/* ── Simulated live data ──────────────────────────── */
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }

function generateSparkData() {
  return Array.from({ length: 12 }, () => rand(20, 100))
}

const RECENT_EVENTS = [
  { id: 1, sev: 'critical', type: 'SQL Injection', ip: '185.220.101.45', region: 'RU', time: '00:02:14', action: 'BLOCK' },
  { id: 2, sev: 'critical', type: 'Rate Limit Exceeded', ip: '104.21.55.200', region: 'US', time: '00:04:59', action: 'BLOCK' },
  { id: 3, sev: 'warning', type: 'XSS Attempt', ip: '91.108.56.130', region: 'DE', time: '00:08:33', action: 'BLOCK' },
  { id: 4, sev: 'info', type: 'Geo-Block Trigger', ip: '45.155.205.85', region: 'CN', time: '00:11:01', action: 'BLOCK' },
  { id: 5, sev: 'warning', type: 'Bot Signature Match', ip: '162.158.78.12', region: 'NL', time: '00:13:47', action: 'COUNT' },
  { id: 6, sev: 'info', type: 'Malformed Header', ip: '52.95.110.1', region: 'US', time: '00:17:22', action: 'BLOCK' },
  { id: 7, sev: 'critical', type: 'Command Injection', ip: '5.188.62.201', region: 'UA', time: '00:21:05', action: 'BLOCK' },
]

export default function Dashboard() {
  const navigate = useNavigate()
  const [metrics, setMetrics] = useState({
    requestsBlocked: 14820,
    threatsDetected: 247,
    activeRules: 38,
    uptime: 99.98,
  })
  const [spark1] = useState(generateSparkData)
  const [spark2] = useState(generateSparkData)
  const [spark3] = useState(generateSparkData)
  const [barData] = useState(() => Array.from({ length: 24 }, (_, i) => ({
    hour: `${String(i).padStart(2, '0')}:00`,
    blocked: rand(200, 1400),
    allowed: rand(800, 4000),
  })))

  // Simulate live metric ticking
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(m => ({
        requestsBlocked: m.requestsBlocked + rand(0, 12),
        threatsDetected: m.threatsDetected + (Math.random() > 0.7 ? 1 : 0),
        activeRules: m.activeRules,
        uptime: m.uptime,
      }))
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  const topAttackTypes = [
    { name: 'SQL Injection', count: 4820, pct: 88 },
    { name: 'XSS', count: 2340, pct: 62 },
    { name: 'Rate Limiting', count: 3120, pct: 74 },
    { name: 'Bot Detection', count: 1840, pct: 50 },
    { name: 'Geo Block', count: 940, pct: 32 },
  ]

  return (
    <>
      {/* ─ Metric Cards ─ */}
      <div className="metrics-grid">
        <MetricCard
          icon={<ShieldIcon />}
          iconBg="rgba(255,59,92,0.12)"
          iconColor="var(--status-critical)"
          accentColor="var(--status-critical)"
          value={metrics.requestsBlocked.toLocaleString()}
          label="Requests Blocked (24h)"
          trend="+8.4%"
          trendDir="up"
          spark={spark1}
          sparkColor="rgba(255,59,92,0.5)"
        />
        <MetricCard
          icon={<AlertIcon />}
          iconBg="rgba(255,173,0,0.12)"
          iconColor="var(--status-warning)"
          accentColor="var(--status-warning)"
          value={metrics.threatsDetected}
          label="Threats Detected"
          trend="+3 today"
          trendDir="up"
          spark={spark2}
          sparkColor="rgba(255,173,0,0.5)"
        />
        <MetricCard
          icon={<RuleIcon />}
          iconBg="rgba(43,156,244,0.12)"
          iconColor="var(--status-info)"
          accentColor="var(--status-info)"
          value={metrics.activeRules}
          label="Active WAF Rules"
          trend="Stable"
          trendDir="neutral"
          spark={spark3}
          sparkColor="rgba(43,156,244,0.4)"
        />
        <MetricCard
          icon={<CheckIcon />}
          iconBg="rgba(0,214,143,0.12)"
          iconColor="var(--status-success)"
          accentColor="var(--status-success)"
          value={`${metrics.uptime}%`}
          label="Platform Uptime"
          trend="99.99% SLA"
          trendDir="neutral"
          spark={Array.from({ length: 12 }, () => rand(90, 100))}
          sparkColor="rgba(0,214,143,0.5)"
        />
      </div>

      {/* ─ Main grid ─ */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '16px' }}>
        {/* Traffic chart */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Request Traffic — Last 24h</div>
              <div className="card-subtitle">Blocked vs. allowed requests per hour</div>
            </div>
            <div style={{ display: 'flex', gap: '12px', fontSize: '11px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--status-critical)' }}>
                <span style={{ width: 8, height: 8, background: 'var(--status-critical)', borderRadius: '50%', display: 'inline-block' }} />
                Blocked
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--status-success)' }}>
                <span style={{ width: 8, height: 8, background: 'var(--status-success)', borderRadius: '50%', display: 'inline-block' }} />
                Allowed
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '120px', paddingTop: '8px' }}>
            {barData.map((d, i) => {
              const total = d.blocked + d.allowed
              const blockedPct = (d.blocked / total) * 100
              const allowedPct = (d.allowed / total) * 100
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px', height: '100%', cursor: 'pointer' }} title={`${d.hour}: ${d.blocked} blocked, ${d.allowed} allowed`}>
                  <div style={{ flex: blockedPct, background: 'var(--status-critical)', opacity: 0.75, borderRadius: '2px 2px 0 0', minHeight: '2px', transition: 'opacity 0.2s' }} onMouseEnter={e => e.target.style.opacity = 1} onMouseLeave={e => e.target.style.opacity = 0.75} />
                  <div style={{ flex: allowedPct, background: 'var(--status-success)', opacity: 0.45, borderRadius: '0', minHeight: '2px', transition: 'opacity 0.2s' }} onMouseEnter={e => e.target.style.opacity = 0.75} onMouseLeave={e => e.target.style.opacity = 0.45} />
                </div>
              )
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
            {['00:00', '06:00', '12:00', '18:00', '23:00'].map(h => (
              <span key={h} style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{h}</span>
            ))}
          </div>
        </div>

        {/* Attack breakdown */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Attack Breakdown</div>
              <div className="card-subtitle">Top threat categories</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {topAttackTypes.map(({ name, count, pct }) => (
              <div key={name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>{name}</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: 700 }}>{count.toLocaleString()}</span>
                </div>
                <div className="progress-wrap">
                  <div
                    className="progress-bar"
                    style={{
                      width: `${pct}%`,
                      '--prog-color': pct > 70 ? 'var(--status-critical)' : pct > 50 ? 'var(--status-warning)' : 'var(--status-info)',
                      '--prog-color-end': pct > 70 ? '#ff6b7a' : pct > 50 ? '#ffc24d' : '#5bb8ff',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─ Bottom grid ─ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* Recent events */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Recent Security Events</div>
              <div className="card-subtitle">Last 7 blocks / detections</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/alerts')}>View All →</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {RECENT_EVENTS.map(ev => (
              <div key={ev.id} className={`alert-item ${ev.sev}`} style={{ padding: '10px 12px' }}>
                <span className={`alert-dot ${ev.sev}`} />
                <div className="alert-body">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="alert-title">{ev.type}</span>
                    <span className={`badge badge-${ev.sev === 'critical' ? 'critical' : ev.sev === 'warning' ? 'warning' : 'info'}`}>{ev.action}</span>
                  </div>
                  <div className="alert-meta">
                    <span className="font-mono">{ev.ip}</span>
                    <span>{ev.region}</span>
                    <span>−{ev.time} ago</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Service health */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">AWS Service Health</div>
              <div className="card-subtitle">Connected platform components</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { name: 'AWS WAF v2', status: 'Operational', region: 'us-east-1', sev: 'success' },
              { name: 'CloudFront CDN', status: 'Operational', region: 'Global Edge', sev: 'success' },
              { name: 'Application Load Balancer', status: 'Operational', region: 'us-east-1', sev: 'success' },
              { name: 'CloudWatch Logs', status: 'Operational', region: 'us-east-1', sev: 'success' },
              { name: 'AWS Shield Standard', status: 'Active', region: 'Global', sev: 'success' },
              { name: 'S3 Log Bucket', status: 'Warning — High I/O', region: 'us-east-1', sev: 'warning' },
              { name: 'GuardDuty', status: 'Needs Config', region: 'us-east-1', sev: 'info' },
            ].map(svc => (
              <div key={svc.name} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 12px', background: 'var(--surface-1)', borderRadius: 'var(--radius-md)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className={`status-dot ${svc.sev === 'success' ? '' : svc.sev}`} style={{
                    background: svc.sev === 'success' ? 'var(--status-success)' : svc.sev === 'warning' ? 'var(--status-warning)' : 'var(--status-info)',
                    animation: 'none',
                  }} />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>{svc.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{svc.region}</div>
                  </div>
                </div>
                <span className={`badge badge-${svc.sev}`}>{svc.status}</span>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '16px', padding: '12px', background: 'var(--blue-50)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--blue-200)' }}>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              ⚡ <strong style={{ color: 'var(--accent)' }}>Spring Boot API</strong> — Connect your backend at{' '}
              <code className="font-mono" style={{ fontSize: '11px', color: 'var(--status-info)', background: 'rgba(43,156,244,0.1)', padding: '1px 5px', borderRadius: 4 }}>
                /api/*
              </code>{' '}
              to enable live data. See README for integration guide.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

/* ── Sub-components ──────────────────────────────── */
function MetricCard({ icon, iconBg, iconColor, accentColor, value, label, trend, trendDir, spark, sparkColor }) {
  return (
    <div className="metric-card" style={{ '--accent-color': accentColor }}>
      <div className="metric-icon-wrap" style={{ background: iconBg, color: iconColor }}>
        {icon}
      </div>
      <div className="metric-value">{value}</div>
      <div className="metric-label">{label}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '12px' }}>
        <div className={`metric-trend ${trendDir}`}>
          {trendDir === 'up' ? '▲' : trendDir === 'down' ? '▼' : '—'} {trend}
        </div>
        <div className="sparkline" style={{ width: '60px' }}>
          {spark.map((v, i) => (
            <div
              key={i}
              className="spark-bar"
              style={{
                height: `${v}%`,
                '--spark-color': sparkColor,
                background: sparkColor,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function ShieldIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  )
}

function AlertIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

function RuleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}
