import { useState, useEffect, useRef } from 'react'

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }

const TOP_IPS = [
  { ip: '185.220.101.45', country: '🇷🇺 Russia', requests: 4820, blocked: 4820, threat: 'SQL Injection' },
  { ip: '104.21.55.200', country: '🇺🇸 United States', requests: 3240, blocked: 3120, threat: 'Rate Limit' },
  { ip: '91.108.56.130', country: '🇩🇪 Germany', requests: 2180, blocked: 1940, threat: 'XSS' },
  { ip: '5.188.62.201', country: '🇺🇦 Ukraine', requests: 1920, blocked: 1920, threat: 'Command Injection' },
  { ip: '45.155.205.85', country: '🇨🇳 China', requests: 1540, blocked: 1540, threat: 'Geo-Block' },
  { ip: '77.88.55.88', country: '🇷🇺 Russia', requests: 1280, blocked: 1180, threat: 'SSRF' },
  { ip: '162.158.78.12', country: '🇳🇱 Netherlands', requests: 980, blocked: 0, threat: 'Bot' },
  { ip: '194.165.16.11', country: '🇮🇷 Iran', requests: 760, blocked: 760, threat: 'XXE' },
]

const PATHS = [
  { path: '/api/users', requests: 48200, errors: 2100, avgMs: 42 },
  { path: '/api/login', requests: 32800, errors: 8900, avgMs: 78 },
  { path: '/api/products', requests: 28400, errors: 420, avgMs: 31 },
  { path: '/api/orders', requests: 18600, errors: 190, avgMs: 55 },
  { path: '/api/admin', requests: 4200, errors: 3800, avgMs: 120 },
  { path: '/api/search', requests: 21000, errors: 310, avgMs: 28 },
]

export default function TrafficAnalysis() {
  const [liveData, setLiveData] = useState(() =>
    Array.from({ length: 60 }, (_, i) => ({
      t: i,
      rps: rand(200, 800),
      blocked: rand(20, 120),
    }))
  )
  const [totalRPS, setTotalRPS] = useState(642)
  const [blockedRPS, setBlockedRPS] = useState(84)
  const [tab, setTab] = useState('overview')
  const timerRef = useRef(null)

  useEffect(() => {
    timerRef.current = setInterval(() => {
      const newRPS = rand(200, 900)
      const newBlocked = rand(15, 140)
      setTotalRPS(newRPS)
      setBlockedRPS(newBlocked)
      setLiveData(prev => {
        const next = [...prev.slice(1), { t: prev[prev.length - 1].t + 1, rps: newRPS, blocked: newBlocked }]
        return next
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [])

  const maxRPS = Math.max(...liveData.map(d => d.rps))

  const geoAttackData = [
    { country: 'Russia', count: 6100, pct: 92 },
    { country: 'United States', count: 3240, pct: 68 },
    { country: 'China', count: 2800, pct: 58 },
    { country: 'Ukraine', count: 1920, pct: 42 },
    { country: 'Germany', count: 1200, pct: 30 },
    { country: 'Netherlands', count: 980, pct: 24 },
    { country: 'Iran', count: 760, pct: 20 },
    { country: 'Brazil', count: 540, pct: 14 },
  ]

  return (
    <>
      <div className="page-title-row">
        <div>
          <h1 className="page-title">Traffic Analysis</h1>
          <p className="page-subtitle">Real-time request monitoring and anomaly detection</p>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {['overview', 'ips', 'paths'].map(t => (
            <button
              key={t}
              id={`tab-${t}`}
              className={`btn ${tab === t ? 'btn-primary' : 'btn-ghost'} btn-sm`}
              onClick={() => setTab(t)}
            >
              {t === 'overview' ? 'Overview' : t === 'ips' ? 'Top IPs' : 'Request Paths'}
            </button>
          ))}
        </div>
      </div>

      {/* Live metrics row */}
      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '20px' }}>
        {[
          { label: 'Requests/sec', value: totalRPS.toLocaleString(), color: 'var(--status-info)', live: true },
          { label: 'Blocked/sec', value: blockedRPS, color: 'var(--status-critical)', live: true },
          { label: 'Block Rate', value: `${((blockedRPS / totalRPS) * 100).toFixed(1)}%`, color: 'var(--status-warning)', live: false },
          { label: 'Active Connections', value: rand(1200, 1400).toLocaleString(), color: 'var(--status-success)', live: false },
        ].map(({ label, value, color, live }) => (
          <div key={label} className="metric-card" style={{ '--accent-color': color }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
              {live && <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '10px', color: 'var(--status-success)' }}><span className="status-dot" style={{ width: 5, height: 5 }} />LIVE</span>}
            </div>
            <div style={{ fontSize: '26px', fontWeight: 800, color, letterSpacing: '-0.03em' }}>{value}</div>
          </div>
        ))}
      </div>

      {tab === 'overview' && (
        <>
          {/* Live RPS chart */}
          <div className="card" style={{ marginBottom: '16px' }}>
            <div className="card-header">
              <div>
                <div className="card-title">Live Request Stream</div>
                <div className="card-subtitle">Requests per second — last 60 seconds</div>
              </div>
              <div style={{ display: 'flex', gap: '12px', fontSize: '11px' }}>
                <span style={{ color: 'var(--status-info)' }}>● Total RPS</span>
                <span style={{ color: 'var(--status-critical)' }}>● Blocked RPS</span>
              </div>
            </div>
            <div style={{ height: '140px', display: 'flex', alignItems: 'flex-end', gap: '2px', position: 'relative' }}>
              {liveData.map((d, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%', gap: '1px' }}>
                  <div style={{
                    height: `${(d.blocked / maxRPS) * 100}%`,
                    background: 'var(--status-critical)',
                    opacity: 0.7,
                    borderRadius: '1px 1px 0 0',
                    minHeight: '1px',
                  }} />
                  <div style={{
                    height: `${((d.rps - d.blocked) / maxRPS) * 100}%`,
                    background: 'var(--status-info)',
                    opacity: 0.5,
                    minHeight: '1px',
                  }} />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '10px', color: 'var(--text-muted)' }}>
              <span>−60s</span>
              <span>−45s</span>
              <span>−30s</span>
              <span>−15s</span>
              <span>Now</span>
            </div>
          </div>

          {/* Geo + Protocol */}
          <div className="grid-2">
            <div className="card">
              <div className="card-header">
                <div className="card-title">Attack Origins by Country</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {geoAttackData.map(({ country, count, pct }) => (
                  <div key={country}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{country}</span>
                      <span style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: 700 }}>{count.toLocaleString()}</span>
                    </div>
                    <div className="progress-wrap">
                      <div className="progress-bar" style={{
                        width: `${pct}%`,
                        '--prog-color': pct > 80 ? 'var(--status-critical)' : pct > 50 ? 'var(--status-warning)' : 'var(--status-info)',
                        '--prog-color-end': pct > 80 ? '#ff6b7a' : pct > 50 ? '#ffc24d' : '#5bb8ff',
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <div className="card-title">Protocol & Method Breakdown</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  { label: 'HTTPS POST', pct: 52, color: 'var(--status-info)' },
                  { label: 'HTTPS GET', pct: 31, color: 'var(--status-success)' },
                  { label: 'HTTPS PUT', pct: 9, color: 'var(--status-warning)' },
                  { label: 'HTTP (unencrypted)', pct: 5, color: 'var(--status-critical)' },
                  { label: 'HTTPS DELETE', pct: 3, color: 'var(--blue-500)' },
                ].map(({ label, pct, color }) => (
                  <div key={label} style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '10px 12px', background: 'var(--surface-1)', borderRadius: 'var(--radius-md)',
                  }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: '10px', fontWeight: 700, color }}>{pct}%</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>{label}</div>
                      <div className="progress-wrap" style={{ height: '4px' }}>
                        <div className="progress-bar" style={{ width: `${pct}%`, '--prog-color': color, '--prog-color-end': color }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {tab === 'ips' && (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Source IP</th>
                  <th>Country</th>
                  <th>Total Requests</th>
                  <th>Blocked</th>
                  <th>Block Rate</th>
                  <th>Primary Threat</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {TOP_IPS.map(row => {
                  const blockRate = ((row.blocked / row.requests) * 100).toFixed(0)
                  return (
                    <tr key={row.ip}>
                      <td><code className="font-mono" style={{ fontSize: '12px', color: 'var(--status-info)' }}>{row.ip}</code></td>
                      <td>{row.country}</td>
                      <td style={{ fontWeight: 600 }}>{row.requests.toLocaleString()}</td>
                      <td style={{ color: 'var(--status-critical)' }}>{row.blocked.toLocaleString()}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div className="progress-wrap" style={{ width: '60px' }}>
                            <div className="progress-bar" style={{ width: `${blockRate}%`, '--prog-color': blockRate > 80 ? 'var(--status-critical)' : 'var(--status-warning)', '--prog-color-end': blockRate > 80 ? '#ff6b7a' : '#ffc24d' }} />
                          </div>
                          <span style={{ fontSize: '12px', fontWeight: 600 }}>{blockRate}%</span>
                        </div>
                      </td>
                      <td><span className="badge badge-critical">{row.threat}</span></td>
                      <td>
                        <button
                          id={`block-ip-${row.ip.replace(/\./g, '-')}`}
                          className="btn btn-danger btn-sm"
                          onClick={() => alert(`Block ${row.ip} — Connect Spring Boot API to enable permanent block`)}
                        >
                          Block IP
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'paths' && (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Request Path</th>
                  <th>Total Requests</th>
                  <th>4xx / 5xx Errors</th>
                  <th>Error Rate</th>
                  <th>Avg Latency</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {PATHS.map(row => {
                  const errRate = ((row.errors / row.requests) * 100).toFixed(1)
                  const isHigh = parseFloat(errRate) > 15
                  return (
                    <tr key={row.path}>
                      <td><code className="font-mono" style={{ fontSize: '12px', color: 'var(--status-info)' }}>{row.path}</code></td>
                      <td style={{ fontWeight: 600 }}>{row.requests.toLocaleString()}</td>
                      <td style={{ color: isHigh ? 'var(--status-critical)' : 'var(--text-primary)' }}>{row.errors.toLocaleString()}</td>
                      <td>
                        <span className={`badge ${isHigh ? 'badge-critical' : 'badge-success'}`}>{errRate}%</span>
                      </td>
                      <td>
                        <span className="font-mono" style={{ fontSize: '12px', color: row.avgMs > 80 ? 'var(--status-warning)' : 'var(--text-secondary)' }}>
                          {row.avgMs}ms
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${isHigh ? 'badge-critical' : 'badge-success'}`}>
                          {isHigh ? 'Anomalous' : 'Normal'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}
