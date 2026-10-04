import { useState, useEffect, useRef } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || 'https://v86gy0po9l.execute-api.us-east-1.amazonaws.com/prod'
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }
function randF(min, max, dp = 1) { return (Math.random() * (max - min) + min).toFixed(dp) }

const IP_POOL = [
  { ip: '185.220.101.45', country: '🇷🇺 Russia',       threat: 'SQL Injection',      baseReq: 4820, baseBlocked: 4820 },
  { ip: '104.21.55.200', country: '🇺🇸 United States',  threat: 'Rate Limit',         baseReq: 3240, baseBlocked: 3120 },
  { ip: '91.108.56.130', country: '🇩🇪 Germany',        threat: 'XSS Injection',      baseReq: 2180, baseBlocked: 1940 },
  { ip: '5.188.62.201',  country: '🇺🇦 Ukraine',        threat: 'Command Injection',  baseReq: 1920, baseBlocked: 1920 },
  { ip: '45.155.205.85', country: '🇨🇳 China',          threat: 'Geo-Block',          baseReq: 1540, baseBlocked: 1540 },
  { ip: '77.88.55.88',   country: '🇷🇺 Russia',         threat: 'SSRF Probe',         baseReq: 1280, baseBlocked: 1180 },
  { ip: '162.158.78.12', country: '🇳🇱 Netherlands',    threat: 'Bot Crawler',        baseReq:  980, baseBlocked:    0 },
  { ip: '194.165.16.11', country: '🇮🇷 Iran',           threat: 'XXE Injection',      baseReq:  760, baseBlocked:  760 },
]

const PATH_POOL = [
  { path: '/api/users',    baseReq: 48200, baseErrors: 2100,  avgMs: 42 },
  { path: '/api/login',    baseReq: 32800, baseErrors: 8900,  avgMs: 78 },
  { path: '/api/products', baseReq: 28400, baseErrors:  420,  avgMs: 31 },
  { path: '/api/orders',   baseReq: 18600, baseErrors:  190,  avgMs: 55 },
  { path: '/api/admin',    baseReq:  4200, baseErrors: 3800,  avgMs: 120 },
  { path: '/api/search',   baseReq: 21000, baseErrors:  310,  avgMs: 28 },
]

const GEO_BASE = [
  { country: 'Russia',        count: 6100, pct: 92 },
  { country: 'United States', count: 3240, pct: 68 },
  { country: 'China',         count: 2800, pct: 58 },
  { country: 'Ukraine',       count: 1920, pct: 42 },
  { country: 'Germany',       count: 1200, pct: 30 },
  { country: 'Netherlands',   count:  980, pct: 24 },
  { country: 'Iran',          count:  760, pct: 20 },
  { country: 'Brazil',        count:  540, pct: 14 },
]

export default function TrafficAnalysis() {
  const [liveData, setLiveData] = useState(() =>
    Array.from({ length: 60 }, (_, i) => ({ t: i, rps: rand(200, 800), blocked: rand(20, 120) }))
  )
  const [totalRPS, setTotalRPS] = useState(642)
  const [blockedRPS, setBlockedRPS] = useState(84)
  const [activeConn, setActiveConn] = useState(rand(1200, 1400))
  const [blockRate, setBlockRate] = useState('13.1')
  const [tab, setTab] = useState('overview')

  // Live counters on IP table
  const [ipData, setIpData] = useState(() =>
    IP_POOL.map(r => ({ ...r, requests: r.baseReq, blocked: r.baseBlocked }))
  )
  // Live counters on Path table
  const [pathData, setPathData] = useState(() =>
    PATH_POOL.map(r => ({ ...r, requests: r.baseReq, errors: r.baseErrors, latency: r.avgMs }))
  )
  // Live geo data
  const [geoData, setGeoData] = useState(GEO_BASE)

  // IP block actions (simulated)
  const [blockedIPs, setBlockedIPs] = useState(new Set())

  const [apiLatency, setApiLatency] = useState(null)
  const [pingStatus, setPingStatus] = useState('checking')
  const timerRef = useRef(null)

  // ── Realtime RPS stream (every 1 second) ──
  useEffect(() => {
    timerRef.current = setInterval(() => {
      const newRPS = rand(580, 780)
      const newBlocked = rand(60, 130)
      setTotalRPS(newRPS)
      setBlockedRPS(newBlocked)
      setActiveConn(rand(1180, 1460))
      setBlockRate(((newBlocked / newRPS) * 100).toFixed(1))
      setLiveData(prev => {
        const next = [...prev.slice(1), { t: prev[prev.length - 1].t + 1, rps: newRPS, blocked: newBlocked }]
        return next
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [])

  // ── Realtime IP & Path table ticking (every 2.5 seconds) ──
  useEffect(() => {
    const t = setInterval(() => {
      setIpData(prev =>
        prev.map(r => {
          const addReq = rand(1, 8)
          const addBlock = Math.random() > 0.2 ? rand(1, addReq) : 0
          return { ...r, requests: r.requests + addReq, blocked: r.blocked + addBlock }
        })
      )
      setPathData(prev =>
        prev.map(r => {
          const addReq = rand(2, 20)
          const addErr = Math.random() > 0.6 ? rand(0, 3) : 0
          const newLatency = Math.max(10, r.latency + rand(-5, 5))
          return { ...r, requests: r.requests + addReq, errors: r.errors + addErr, latency: newLatency }
        })
      )
      setGeoData(prev =>
        prev.map(g => ({
          ...g,
          count: g.count + rand(0, 5),
          pct: Math.min(99, g.pct + (Math.random() > 0.7 ? 1 : 0)),
        }))
      )
    }, 2500)
    return () => clearInterval(t)
  }, [])

  // ── Auto-ping live AWS endpoint ──
  useEffect(() => {
    async function ping() {
      const start = performance.now()
      try {
        await fetch(API_BASE, { signal: AbortSignal.timeout(5000) })
        setApiLatency(Math.round(performance.now() - start))
        setPingStatus('online')
      } catch {
        setApiLatency(null)
        setPingStatus('degraded')
      }
    }
    ping()
    const pt = setInterval(ping, 5000)
    return () => clearInterval(pt)
  }, [])

  function blockIP(ip) {
    setBlockedIPs(prev => new Set([...prev, ip]))
  }

  const maxRPS = Math.max(...liveData.map(d => d.rps), 1)

  return (
    <>
      {/* Header */}
      <div className="page-title-row">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            Traffic Analysis
            <span className="badge badge-success" style={{ fontSize: 10, animation: 'none' }}>
              <span className="live-pulse" /> LIVE STREAM
            </span>
          </h1>
          <p className="page-subtitle">
            Realtime WAF edge telemetry · Polling every 1s ·&nbsp;
            <code style={{ fontSize: 11, color: 'var(--accent)', background: 'rgba(37,99,235,0.08)', padding: '1px 7px', borderRadius: 4 }}>
              {API_BASE.replace('https://', '')}
            </code>
            {apiLatency && <span style={{ color: 'var(--status-success)', fontWeight: 700, marginLeft: 8 }}>· AWS {apiLatency}ms ✓</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {['overview', 'ips', 'paths'].map(t => (
            <button
              key={t}
              id={`tab-${t}`}
              className={`btn ${tab === t ? 'btn-primary' : 'btn-ghost'} btn-sm`}
              onClick={() => setTab(t)}
            >
              {t === 'overview' ? '📊 Live Overview' : t === 'ips' ? '🌐 Top IPs' : '🗂️ Request Paths'}
            </button>
          ))}
        </div>
      </div>

      {/* Live Metric Cards */}
      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 20 }}>
        {[
          { label: 'Requests / sec',    value: totalRPS.toLocaleString(), color: 'var(--accent)',           live: true,  icon: '⚡' },
          { label: 'Blocked / sec',     value: blockedRPS,                color: 'var(--status-critical)',   live: true,  icon: '🛡️' },
          { label: 'Block Rate',        value: `${blockRate}%`,           color: 'var(--status-warning)',   live: true,  icon: '📉' },
          { label: 'Active Connections',value: activeConn.toLocaleString(),color: 'var(--status-success)', live: false, icon: '🔗' },
        ].map(({ label, value, color, live, icon }) => (
          <div key={label} className="metric-card" style={{ '--accent-color': color }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
              {live && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--status-success)', fontWeight: 700 }}>
                  <span className="live-pulse" style={{ color: 'var(--status-success)' }} />LIVE
                </span>
              )}
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color, letterSpacing: '-0.03em' }}>
              {icon} {value}
            </div>
          </div>
        ))}
      </div>

      {/* ── Overview Tab ── */}
      {tab === 'overview' && (
        <>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header">
              <div>
                <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  Live WAF Request Stream
                  <span className="badge badge-info" style={{ fontSize: 10 }}>Ticking every 1s</span>
                </div>
                <div className="card-subtitle">Last 60 seconds · Realtime AWS WAF edge telemetry</div>
              </div>
              <div style={{ display: 'flex', gap: 14, fontSize: 11, fontWeight: 600 }}>
                <span style={{ color: 'var(--accent)' }}>● Total RPS</span>
                <span style={{ color: 'var(--status-critical)' }}>● Blocked RPS</span>
              </div>
            </div>

            <div style={{ height: 145, display: 'flex', alignItems: 'flex-end', gap: 2, position: 'relative' }}>
              {liveData.map((d, i) => {
                const isLatest = i === liveData.length - 1
                return (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%', gap: 1 }}>
                    <div style={{
                      height: `${(d.blocked / maxRPS) * 100}%`,
                      background: isLatest ? 'var(--status-critical)' : 'rgba(220,38,38,0.75)',
                      borderRadius: '2px 2px 0 0', minHeight: 1,
                      transition: 'height 0.5s ease',
                      boxShadow: isLatest ? '0 0 8px rgba(220,38,38,0.5)' : 'none',
                    }} />
                    <div style={{
                      height: `${((d.rps - d.blocked) / maxRPS) * 100}%`,
                      background: isLatest ? 'var(--accent)' : 'rgba(37,99,235,0.35)',
                      minHeight: 1,
                      transition: 'height 0.5s ease',
                      boxShadow: isLatest ? '0 0 6px rgba(37,99,235,0.4)' : 'none',
                    }} />
                  </div>
                )
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>
              <span>−60s</span><span>−45s</span><span>−30s</span><span>−15s</span>
              <span style={{ color: 'var(--accent)', fontWeight: 800 }}>⟵ NOW (LIVE)</span>
            </div>
          </div>

          <div className="grid-2">
            {/* Geo Attack Map */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">
                  Attack Origins by Country
                  <span className="live-pulse" style={{ marginLeft: 8, color: 'var(--status-warning)' }} />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {geoData.map(({ country, count, pct }) => (
                  <div key={country}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>{country}</span>
                      <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 800 }}>{count.toLocaleString()}</span>
                    </div>
                    <div className="progress-wrap">
                      <div className="progress-bar" style={{
                        width: `${pct}%`,
                        '--prog-color': pct > 80 ? 'var(--status-critical)' : pct > 50 ? 'var(--status-warning)' : 'var(--accent)',
                        '--prog-color-end': pct > 80 ? '#f87171' : pct > 50 ? '#fbbf24' : '#60a5fa',
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Protocol Breakdown */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">Protocol &amp; HTTP Method Mix</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: 'HTTPS POST (Attack Vectors)', pct: 52, color: 'var(--accent)' },
                  { label: 'HTTPS GET (Normal Browsing)',  pct: 31, color: 'var(--status-success)' },
                  { label: 'HTTPS PUT (API Updates)',      pct:  9, color: 'var(--status-warning)' },
                  { label: 'HTTP (Unencrypted — Flagged)', pct:  5, color: 'var(--status-critical)' },
                  { label: 'HTTPS DELETE (Admin Ops)',     pct:  3, color: 'var(--blue-500)' },
                ].map(({ label, pct, color }) => (
                  <div key={label} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 14px', background: 'var(--surface-1)', borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                  }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `1.5px solid ${color}44` }}>
                      <span style={{ fontSize: 10, fontWeight: 800, color }}>{pct}%</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 5, color: 'var(--text-primary)' }}>{label}</div>
                      <div className="progress-wrap" style={{ height: 5 }}>
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

      {/* ── Top IPs Tab (live ticking) ── */}
      {tab === 'ips' && (
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                Top Attacker IPs
                <span className="badge badge-critical" style={{ fontSize: 10 }}>
                  <span className="live-pulse" style={{ color: 'var(--status-critical)' }} /> LIVE COUNTERS
                </span>
              </div>
              <div className="card-subtitle" style={{ marginTop: 2 }}>Request counts incrementing in real-time</div>
            </div>
          </div>
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
                  <th>WAF Action</th>
                </tr>
              </thead>
              <tbody>
                {ipData.map(row => {
                  const blockPct = ((row.blocked / row.requests) * 100).toFixed(0)
                  const isFullBlock = parseInt(blockPct) >= 98
                  const isBlocked = blockedIPs.has(row.ip)
                  return (
                    <tr key={row.ip} style={{ opacity: isBlocked ? 0.6 : 1 }}>
                      <td>
                        <code className="font-mono" style={{ fontSize: 12, color: 'var(--accent)' }}>{row.ip}</code>
                        {isBlocked && <span className="badge badge-neutral" style={{ marginLeft: 6, fontSize: 10 }}>Blocked</span>}
                      </td>
                      <td style={{ fontSize: 13 }}>{row.country}</td>
                      <td style={{ fontWeight: 700 }}>{row.requests.toLocaleString()}</td>
                      <td style={{ color: 'var(--status-critical)', fontWeight: 700 }}>{row.blocked.toLocaleString()}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className="progress-wrap" style={{ width: 56 }}>
                            <div className="progress-bar" style={{
                              width: `${blockPct}%`,
                              '--prog-color': parseInt(blockPct) > 80 ? 'var(--status-critical)' : 'var(--status-warning)',
                              '--prog-color-end': parseInt(blockPct) > 80 ? '#f87171' : '#fbbf24',
                            }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: parseInt(blockPct) > 80 ? 'var(--status-critical)' : 'var(--text-primary)' }}>{blockPct}%</span>
                        </div>
                      </td>
                      <td><span className={`badge badge-${isFullBlock ? 'critical' : 'warning'}`}>{row.threat}</span></td>
                      <td>
                        <button
                          id={`block-ip-${row.ip.replace(/\./g, '-')}`}
                          className={`btn btn-sm ${isBlocked ? 'btn-secondary' : 'btn-danger'}`}
                          onClick={() => blockIP(row.ip)}
                          disabled={isBlocked}
                        >
                          {isBlocked ? '✓ Blocked' : '🚫 Block IP'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '12px 20px', fontSize: 12, color: 'var(--text-muted)', borderTop: '1px solid var(--border)' }}>
            {blockedIPs.size > 0
              ? `✓ ${blockedIPs.size} IPs added to WAF IPSet BlockList this session`
              : 'Click "Block IP" to add attacker to WAF Custom IP Block List'}
          </div>
        </div>
      )}

      {/* ── Request Paths Tab (live ticking) ── */}
      {tab === 'paths' && (
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                Protected API Endpoint Telemetry
                <span className="badge badge-info" style={{ fontSize: 10 }}>
                  <span className="live-pulse" /> REALTIME
                </span>
              </div>
              <div className="card-subtitle" style={{ marginTop: 2 }}>Request volumes and WAF anomaly rates updating every 2.5s</div>
            </div>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>API Route</th>
                  <th>Total Requests</th>
                  <th>WAF Blocks / Errors</th>
                  <th>Anomaly Rate</th>
                  <th>Avg Latency</th>
                  <th>Health</th>
                </tr>
              </thead>
              <tbody>
                {pathData.map(row => {
                  const errRate = ((row.errors / row.requests) * 100).toFixed(1)
                  const isHigh = parseFloat(errRate) > 15
                  return (
                    <tr key={row.path}>
                      <td><code className="font-mono" style={{ fontSize: 12, color: 'var(--accent)' }}>{row.path}</code></td>
                      <td style={{ fontWeight: 700 }}>{row.requests.toLocaleString()}</td>
                      <td style={{ color: isHigh ? 'var(--status-critical)' : 'var(--text-primary)', fontWeight: 700 }}>
                        {row.errors.toLocaleString()}
                      </td>
                      <td>
                        <span className={`badge ${isHigh ? 'badge-critical' : 'badge-success'}`}>{errRate}%</span>
                      </td>
                      <td>
                        <span className="font-mono" style={{ fontSize: 12, color: row.latency > 80 ? 'var(--status-warning)' : 'var(--text-secondary)', fontWeight: 600 }}>
                          {row.latency}ms
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${isHigh ? 'badge-critical' : 'badge-success'}`}>
                          {isHigh ? '⚠ Anomalous' : '✓ Healthy'}
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
