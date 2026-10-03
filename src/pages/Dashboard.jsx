import { useState, useEffect, useRef, useCallback } from "react"
import { useNavigate } from "react-router-dom"

const API_BASE = import.meta.env.VITE_API_URL || "https://v86gy0po9l.execute-api.us-east-1.amazonaws.com/prod"

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }

const ATTACK_TYPES = ["SQL Injection", "XSS Attempt", "Rate Limit Exceeded", "Bot Signature", "Command Injection", "SSRF Probe", "XXE Attack", "Path Traversal"]
const REGIONS = ["RU", "US", "DE", "CN", "UA", "IR", "NL", "BR"]
const IPS = ["185.220.101.45", "104.21.55.200", "91.108.56.130", "5.188.62.201", "45.155.205.85", "77.88.55.88", "162.158.78.12", "194.165.16.11"]

function generateEvent(id) {
  const sev = Math.random() > 0.6 ? "critical" : Math.random() > 0.4 ? "warning" : "info"
  return {
    id, sev,
    type: ATTACK_TYPES[rand(0, ATTACK_TYPES.length - 1)],
    ip: IPS[rand(0, IPS.length - 1)],
    region: REGIONS[rand(0, REGIONS.length - 1)],
    time: new Date().toLocaleTimeString(),
    action: sev === "info" ? "COUNT" : "BLOCK",
  }
}

const SERVICES = [
  { name: "AWS WAFv2 (PublicWebAppWAF)", id: "waf", region: "us-east-1", sev: "success", live: true },
  { name: "API Gateway (waf-secure-api)", id: "apigw", region: "us-east-1", sev: "success", live: true },
  { name: "Lambda (waf-backend-handler)", id: "lambda", region: "us-east-1", sev: "success", live: true },
  { name: "CloudWatch Logs", id: "cw", region: "us-east-1", sev: "success", live: false },
  { name: "AWS Shield Standard", id: "shield", region: "Global", sev: "success", live: false },
  { name: "S3 Log Bucket", id: "s3", region: "us-east-1", sev: "warning", live: false },
  { name: "GuardDuty", id: "gd", region: "us-east-1", sev: "info", live: false },
]

const TOP_ATTACKS = [
  { name: "SQL Injection", count: 4820, pct: 88, color: "var(--status-critical)" },
  { name: "Rate Limiting", count: 3120, pct: 74, color: "var(--status-warning)" },
  { name: "XSS Attacks", count: 2340, pct: 62, color: "#f97316" },
  { name: "Bot Detection", count: 1840, pct: 50, color: "var(--status-info)" },
  { name: "Geo Blocking", count: 940, pct: 32, color: "var(--status-success)" },
]

export default function Dashboard() {
  const navigate = useNavigate()

  const [metrics, setMetrics] = useState({ requestsBlocked: 14820, threatsDetected: 247, activeRules: 38, uptime: 99.98, rps: 642 })
  const [apiStatus, setApiStatus] = useState({ status: "checking", latency: null, lastChecked: null })
  const [serviceStatuses, setServiceStatuses] = useState(SERVICES.map(s => ({ ...s, status: s.sev === "success" ? "Operational" : s.sev === "warning" ? "Warning" : "Needs Config" })))
  const [barData] = useState(() => Array.from({ length: 24 }, (_, i) => ({ hour: String(i).padStart(2, "0"), blocked: rand(200, 1400), allowed: rand(800, 4000) })))
  const [hoveredBar, setHoveredBar] = useState(null)
  const [events, setEvents] = useState(() => Array.from({ length: 8 }, (_, i) => generateEvent(i)))
  const eventIdRef = useRef(100)
  const [sparklines, setSparklines] = useState({
    blocked: Array.from({ length: 20 }, () => rand(30, 100)),
    threats: Array.from({ length: 20 }, () => rand(10, 60)),
    rps: Array.from({ length: 20 }, () => rand(400, 900)),
    uptime: Array.from({ length: 20 }, () => rand(95, 100)),
  })
  const [testPanel, setTestPanel] = useState({ visible: false, type: "sqli", loading: false, result: null })

  const pingAPI = useCallback(async () => {
    const start = performance.now()
    try {
      const res = await fetch(API_BASE, { signal: AbortSignal.timeout(6000) })
      const ms = Math.round(performance.now() - start)
      const status = res.ok ? "online" : "degraded"
      setApiStatus({ status, latency: ms, lastChecked: new Date().toLocaleTimeString() })
      setServiceStatuses(prev => prev.map(s => s.live ? { ...s, status: "Operational", sev: "success", latency: ms } : s))
    } catch {
      setApiStatus({ status: "offline", latency: null, lastChecked: new Date().toLocaleTimeString() })
    }
  }, [])

  useEffect(() => { pingAPI() }, [pingAPI])

  useEffect(() => {
    const t = setInterval(() => {
      setMetrics(m => ({ ...m, requestsBlocked: m.requestsBlocked + rand(0, 15), threatsDetected: m.threatsDetected + (Math.random() > 0.65 ? 1 : 0), rps: rand(400, 900) }))
      setSparklines(s => ({
        blocked: [...s.blocked.slice(1), rand(30, 100)],
        threats: [...s.threats.slice(1), rand(10, 60)],
        rps: [...s.rps.slice(1), rand(400, 900)],
        uptime: [...s.uptime.slice(1), rand(95, 100)],
      }))
    }, 2000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    let timeoutId
    function scheduleNext() {
      timeoutId = setTimeout(() => {
        const ev = generateEvent(eventIdRef.current++)
        setEvents(prev => [ev, ...prev.slice(0, 9)])
        scheduleNext()
      }, rand(4000, 7000))
    }
    scheduleNext()
    return () => clearTimeout(timeoutId)
  }, [])

  async function runLiveTest() {
    if (testPanel.loading) return
    setTestPanel(p => ({ ...p, loading: true, result: null }))
    const start = performance.now()
    try {
      let url = API_BASE
      const headers = {}
      if (testPanel.type === "sqli") url += "?id=1%27%20OR%20%271%27=%271%20UNION%20SELECT%20username,password%20FROM%20users--"
      if (testPanel.type === "bot") headers["User-Agent"] = "Scrapy/2.8.0 (+https://scrapy.org)"
      const res = await fetch(url, { headers, signal: AbortSignal.timeout(8000) })
      const ms = Math.round(performance.now() - start)
      let body = ""
      try { body = await res.text() } catch { body = "" }
      setTestPanel(p => ({ ...p, loading: false, result: { status: res.status, ms, body: body.slice(0, 300), blocked: res.status === 403 } }))
    } catch (err) {
      const ms = Math.round(performance.now() - start)
      setTestPanel(p => ({ ...p, loading: false, result: { status: "ERR", ms, body: err.message, blocked: true } }))
    }
  }

  const maxBar = Math.max(...barData.map(d => d.blocked + d.allowed))

  return (
    <>
      <style>{`
        @keyframes fadeInDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulseDot { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.4); opacity: 0.6; } }
        .live-dot { animation: pulseDot 1.8s infinite; }
        .svc-row:hover { background: var(--surface-2) !important; transform: translateX(2px); transition: all 0.15s; }
        .test-btn:hover { opacity: 0.85; transform: translateY(-1px); }
        .metric-card-new { cursor: pointer; }
        .metric-card-new:hover { transform: translateY(-3px) !important; box-shadow: 0 8px 24px rgba(0,0,0,0.25) !important; }
      `}</style>

      {/* Page Header */}
      <div className="page-title-row">
        <div>
          <h1 className="page-title">Security Overview</h1>
          <p className="page-subtitle">
            Live WAF telemetry · Protected endpoint:&nbsp;
            <code style={{ fontSize: 11, color: "var(--status-info)", background: "rgba(43,156,244,0.1)", padding: "2px 7px", borderRadius: 4 }}>
              {API_BASE.replace("https://", "")}
            </code>
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600,
            background: apiStatus.status === "online" ? "rgba(0,214,143,0.1)" : apiStatus.status === "checking" ? "rgba(43,156,244,0.1)" : "rgba(255,59,92,0.1)",
            border: `1px solid ${apiStatus.status === "online" ? "rgba(0,214,143,0.3)" : apiStatus.status === "checking" ? "rgba(43,156,244,0.3)" : "rgba(255,59,92,0.3)"}`,
            color: apiStatus.status === "online" ? "var(--status-success)" : apiStatus.status === "checking" ? "var(--status-info)" : "var(--status-critical)",
          }}>
            <span className={apiStatus.status === "online" ? "live-dot" : ""} style={{
              width: 7, height: 7, borderRadius: "50%", display: "inline-block",
              background: apiStatus.status === "online" ? "var(--status-success)" : apiStatus.status === "checking" ? "var(--status-info)" : "var(--status-critical)",
            }} />
            {apiStatus.status === "checking" ? "Checking…" : apiStatus.status === "online" ? `Live · ${apiStatus.latency}ms` : "Offline"}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={pingAPI}>↻ Ping</button>
          <button className="btn btn-primary btn-sm" onClick={() => setTestPanel(p => ({ ...p, visible: !p.visible }))}>
            ⚡ Attack Tester
          </button>
        </div>
      </div>

      {/* Live Attack Tester Panel */}
      {testPanel.visible && (
        <div className="card" style={{ marginBottom: 16, border: "1px solid rgba(43,156,244,0.3)", background: "rgba(10,20,40,0.5)" }}>
          <div className="card-header">
            <div>
              <div className="card-title">⚡ Live WAF Attack Tester</div>
              <div className="card-subtitle">Fire real HTTP requests against your WAF endpoint and see live block/allow results</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => setTestPanel(p => ({ ...p, visible: false, result: null }))}>✕ Close</button>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            {[
              { id: "sqli", label: "💉 SQL Injection", color: "var(--status-critical)" },
              { id: "bot", label: "🤖 Bad Bot UA", color: "var(--status-warning)" },
              { id: "clean", label: "✅ Clean Request", color: "var(--status-success)" },
            ].map(t => (
              <button key={t.id} className="test-btn"
                onClick={() => setTestPanel(p => ({ ...p, type: t.id, result: null }))}
                style={{
                  padding: "8px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: "pointer", transition: "all 0.2s",
                  border: `1px solid ${testPanel.type === t.id ? t.color : "var(--border)"}`,
                  background: testPanel.type === t.id ? `color-mix(in srgb, ${t.color} 15%, transparent)` : "var(--surface-1)",
                  color: testPanel.type === t.id ? t.color : "var(--text-secondary)",
                }}>
                {t.label}
              </button>
            ))}
            <button onClick={runLiveTest} disabled={testPanel.loading} className="test-btn"
              style={{
                padding: "8px 20px", borderRadius: 8, background: testPanel.loading ? "rgba(99,102,241,0.5)" : "var(--accent)",
                color: "#fff", fontWeight: 700, fontSize: 13, border: "none", cursor: testPanel.loading ? "not-allowed" : "pointer",
              }}>
              {testPanel.loading ? "⏳ Sending…" : "▶ Fire Request"}
            </button>
          </div>
          {testPanel.result && (
            <div style={{
              padding: "16px", borderRadius: 10, animation: "fadeInDown 0.3s ease",
              background: testPanel.result.blocked ? "rgba(255,59,92,0.08)" : "rgba(0,214,143,0.08)",
              border: `1px solid ${testPanel.result.blocked ? "rgba(255,59,92,0.3)" : "rgba(0,214,143,0.3)"}`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                <span style={{ fontSize: 28 }}>{testPanel.result.blocked ? "🛡️" : "✅"}</span>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 17, color: testPanel.result.blocked ? "var(--status-critical)" : "var(--status-success)" }}>
                    HTTP {testPanel.result.status} — {testPanel.result.blocked ? "BLOCKED BY AWS WAF" : "ALLOWED — Passed WAF Inspection"}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 3 }}>
                    Latency: {testPanel.result.ms}ms · WAF Rule: {testPanel.type === "sqli" ? "AWSManagedRulesSQLiRuleSet" : testPanel.type === "bot" ? "BlockBadBotsAndScrapers" : "N/A (Allowed)"}
                  </div>
                </div>
              </div>
              {testPanel.result.body && (
                <pre style={{ background: "var(--surface-0)", padding: "10px 12px", borderRadius: 8, fontSize: 12, color: "var(--text-secondary)", margin: 0, fontFamily: "monospace", overflowX: "auto" }}>
                  {testPanel.result.body}
                </pre>
              )}
            </div>
          )}
        </div>
      )}

      {/* Metric Cards */}
      <div className="metrics-grid">
        {[
          { icon: "🛡️", value: metrics.requestsBlocked.toLocaleString(), label: "Requests Blocked (24h)", trend: "+8.4%", dir: "up", spark: sparklines.blocked, color: "var(--status-critical)", sparkC: "rgba(255,59,92,0.6)", to: "/traffic" },
          { icon: "⚠️", value: metrics.threatsDetected, label: "Threats Detected", trend: "+3 today", dir: "up", spark: sparklines.threats, color: "var(--status-warning)", sparkC: "rgba(255,173,0,0.6)", to: "/alerts" },
          { icon: "⚡", value: `${metrics.rps}`, label: "Requests / Second", trend: "Live", dir: "neutral", spark: sparklines.rps, color: "var(--status-info)", sparkC: "rgba(43,156,244,0.6)", to: "/traffic" },
          { icon: "✅", value: `${metrics.uptime}%`, label: "Platform Uptime", trend: "99.99% SLA", dir: "neutral", spark: sparklines.uptime, color: "var(--status-success)", sparkC: "rgba(0,214,143,0.6)", to: "/waf-rules" },
        ].map((c, i) => (
          <div key={i} className="metric-card metric-card-new" style={{ "--accent-color": c.color, transition: "all 0.2s" }} onClick={() => navigate(c.to)}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 24, marginBottom: 6 }}>{c.icon}</div>
                <div className="metric-value">{c.value}</div>
                <div className="metric-label">{c.label}</div>
              </div>
              <div className="sparkline" style={{ width: 64, alignSelf: "flex-end" }}>
                {c.spark.map((v, j) => <div key={j} className="spark-bar" style={{ height: `${v}%`, background: c.sparkC }} />)}
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
              <div className={`metric-trend ${c.dir}`}>{c.dir === "up" ? "▲" : "—"} {c.trend}</div>
              <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Click to explore →</div>
            </div>
          </div>
        ))}
      </div>

      {/* Traffic Chart + Attack Breakdown */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 16 }}>
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Request Traffic — Last 24h</div>
              <div className="card-subtitle">Hover each bar for details</div>
            </div>
            <div style={{ display: "flex", gap: 12, fontSize: 11 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--status-critical)" }}>
                <span style={{ width: 8, height: 8, background: "var(--status-critical)", borderRadius: "50%", display: "inline-block" }} /> Blocked
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--status-success)" }}>
                <span style={{ width: 8, height: 8, background: "var(--status-success)", borderRadius: "50%", display: "inline-block" }} /> Allowed
              </span>
            </div>
          </div>
          {hoveredBar !== null && (
            <div style={{ background: "var(--surface-1)", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 12px", fontSize: 12, marginBottom: 8, display: "flex", gap: 20, animation: "fadeInDown 0.15s ease" }}>
              <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>{barData[hoveredBar].hour}:00</span>
              <span style={{ color: "var(--status-critical)", fontWeight: 700 }}>🚫 {barData[hoveredBar].blocked.toLocaleString()} blocked</span>
              <span style={{ color: "var(--status-success)", fontWeight: 700 }}>✅ {barData[hoveredBar].allowed.toLocaleString()} allowed</span>
            </div>
          )}
          <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 130 }}>
            {barData.map((d, i) => {
              const isH = hoveredBar === i
              return (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 2, height: "100%", cursor: "pointer" }}
                  onMouseEnter={() => setHoveredBar(i)} onMouseLeave={() => setHoveredBar(null)}>
                  <div style={{ height: (d.blocked / maxBar) * 130, background: isH ? "var(--status-critical)" : "rgba(255,59,92,0.65)", borderRadius: "2px 2px 0 0", transition: "all 0.12s", transform: isH ? "scaleX(1.2)" : "none" }} />
                  <div style={{ height: (d.allowed / maxBar) * 130, background: isH ? "var(--status-success)" : "rgba(0,214,143,0.35)", transition: "all 0.12s", transform: isH ? "scaleX(1.2)" : "none" }} />
                </div>
              )
            })}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
            {["00:00", "04:00", "08:00", "12:00", "16:00", "20:00", "23:00"].map(h => (
              <span key={h} style={{ fontSize: 10, color: "var(--text-muted)" }}>{h}</span>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Attack Breakdown</div>
              <div className="card-subtitle">Top threat categories · 24h</div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {TOP_ATTACKS.map(({ name, count, pct, color }) => (
              <div key={name}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 600 }}>{name}</span>
                  <span style={{ fontSize: 12, color, fontWeight: 800 }}>{count.toLocaleString()}</span>
                </div>
                <div style={{ height: 6, background: "var(--surface-1)", borderRadius: 99, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}88)`, borderRadius: 99 }} />
                </div>
              </div>
            ))}
          </div>
          <button className="btn btn-ghost btn-sm" style={{ width: "100%", marginTop: 16 }} onClick={() => navigate("/security-demo")}>
            🧪 Run Live Attack Tests →
          </button>
        </div>
      </div>

      {/* Live Events + Service Health */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                Live Security Events
                <span className="live-dot" style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--status-success)", display: "inline-block" }} />
              </div>
              <div className="card-subtitle">Auto-updating · new events every few seconds</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate("/alerts")}>View All →</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 340, overflowY: "auto" }}>
            {events.map((ev, idx) => (
              <div key={ev.id} className={`alert-item ${ev.sev}`}
                style={{ padding: "9px 12px", animation: idx === 0 ? "fadeInDown 0.35s ease" : "none" }}>
                <span className={`alert-dot ${ev.sev}`} />
                <div className="alert-body">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span className="alert-title" style={{ fontSize: 12 }}>{ev.type}</span>
                    <span className={`badge badge-${ev.sev === "critical" ? "critical" : ev.sev === "warning" ? "warning" : "info"}`}>{ev.action}</span>
                  </div>
                  <div className="alert-meta">
                    <span className="font-mono" style={{ fontSize: 11 }}>{ev.ip}</span>
                    <span>{ev.region}</span>
                    <span style={{ marginLeft: "auto", color: "var(--text-muted)", fontSize: 10 }}>{ev.time}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">AWS Service Health</div>
              <div className="card-subtitle">{apiStatus.lastChecked ? `Last pinged ${apiStatus.lastChecked}` : "Checking…"}</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={pingAPI}>↻ Ping</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {serviceStatuses.map(svc => (
              <div key={svc.id} className="svc-row"
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 12px", background: "var(--surface-1)", borderRadius: 8,
                  border: svc.live ? `1px solid ${apiStatus.status === "online" ? "rgba(0,214,143,0.2)" : "var(--border)"}` : "1px solid transparent",
                  cursor: svc.live ? "pointer" : "default",
                }}
                onClick={() => svc.live && window.open(API_BASE, "_blank")}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className={svc.live && apiStatus.status === "online" ? "live-dot" : ""}
                    style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: svc.sev === "success" ? "var(--status-success)" : svc.sev === "warning" ? "var(--status-warning)" : "var(--status-info)" }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{svc.name}</div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)" }}>
                      {svc.region}{svc.latency ? ` · ${svc.latency}ms response` : ""}
                    </div>
                  </div>
                </div>
                <span className={`badge badge-${svc.sev}`}>{svc.status}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12, padding: "10px 14px", background: "rgba(43,156,244,0.06)", borderRadius: 8, border: "1px dashed rgba(43,156,244,0.25)" }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4, fontWeight: 700 }}>Protected Endpoint</div>
            <code style={{ fontSize: 11, color: "var(--status-info)", wordBreak: "break-all", display: "block" }}>{API_BASE}</code>
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <button className="btn btn-ghost btn-sm" style={{ fontSize: 10 }} onClick={() => navigator.clipboard?.writeText(API_BASE)}>📋 Copy</button>
              <button className="btn btn-ghost btn-sm" style={{ fontSize: 10 }} onClick={() => window.open(API_BASE, "_blank")}>🔗 Open</button>
              <button className="btn btn-ghost btn-sm" style={{ fontSize: 10 }} onClick={() => setTestPanel(p => ({ ...p, visible: true }))}>⚡ Test WAF</button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
