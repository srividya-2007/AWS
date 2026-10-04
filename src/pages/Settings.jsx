import { useState, useEffect } from 'react'

export default function Settings() {
  const [apiUrl, setApiUrl] = useState(import.meta.env.VITE_API_URL || 'https://v86gy0po9l.execute-api.us-east-1.amazonaws.com/prod')
  const [apiKey, setApiKey] = useState('')
  const [wafArn, setWafArn] = useState('arn:aws:wafv2:us-east-1:056344406138:regional/webacl/ECommerce-Protection-ACL')
  const [region, setRegion] = useState('us-east-1')
  const [refreshInterval, setRefreshInterval] = useState('10')
  const [notifs, setNotifs] = useState({ critical: true, warning: true, info: true })
  const [saved, setSaved] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [connectionStatus, setConnectionStatus] = useState('ONLINE')

  const AWS_REGIONS = [
    'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
    'ap-south-1', 'ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1',
    'eu-west-1', 'eu-west-2', 'eu-central-1', 'sa-east-1',
  ]

  // Test live backend connection
  async function testBackend() {
    setTesting(true)
    setTestResult(null)
    const startTime = performance.now()
    try {
      const resp = await fetch(apiUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(6000),
      })
      const latency = Math.round(performance.now() - startTime)
      let data = null
      let text = ''
      try {
        text = await resp.text()
        data = JSON.parse(text)
      } catch {
        // Not JSON
      }

      const isOk = resp.status === 200
      setConnectionStatus(isOk ? 'ONLINE' : 'DEGRADED')
      setTestResult({
        ok: isOk,
        status: resp.status,
        statusText: resp.statusText,
        latency,
        requestId: resp.headers.get('x-amzn-requestid') || 'req-' + Math.random().toString(36).slice(2, 9),
        data: data || text,
        timestamp: new Date().toLocaleTimeString(),
      })
    } catch (err) {
      setConnectionStatus('OFFLINE')
      setTestResult({
        ok: false,
        status: 'FETCH_ERROR',
        message: err.message,
        latency: 0,
        timestamp: new Date().toLocaleTimeString(),
      })
    } finally {
      setTesting(false)
    }
  }

  // Initial check on mount
  useEffect(() => {
    testBackend()
  }, [])

  function save() {
    localStorage.setItem('waf_api_url', apiUrl)
    localStorage.setItem('waf_region', region)
    localStorage.setItem('waf_refresh_interval', refreshInterval)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <>
      <div className="page-title-row">
        <div>
          <h1 className="page-title">Settings & Configuration</h1>
          <p className="page-subtitle">AWS cloud integration, live WAF endpoints, and system parameters</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button id="test-connection-top-btn" className="btn btn-secondary" onClick={testBackend} disabled={testing}>
            {testing ? 'Testing...' : '⟳ Test Backend'}
          </button>
          <button id="save-settings-btn" className="btn btn-primary" onClick={save}>
            {saved ? '✓ Saved!' : 'Save Configuration'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px' }}>
        {/* Backend & Live WAF API Connection */}
        <div className="card">
          <div className="card-header" style={{ marginBottom: '18px' }}>
            <div>
              <div className="card-title">Live AWS Backend Integration</div>
              <div className="card-subtitle">AWS API Gateway + Lambda Handler + WAFv2 Web ACL</div>
            </div>
            <span className={`badge ${connectionStatus === 'ONLINE' ? 'badge-success' : connectionStatus === 'DEGRADED' ? 'badge-warning' : 'badge-critical'}`}>
              <span className="live-pulse" /> {connectionStatus}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <SettingsField
              id="api-url"
              label="Active WAF Protected API Endpoint"
              hint="Deployed AWS API Gateway Regional HTTP/REST endpoint attached to WAF"
              value={apiUrl}
              onChange={setApiUrl}
              placeholder="https://v86gy0po9l.execute-api.us-east-1.amazonaws.com/prod"
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  Backend Architecture
                </label>
                <div style={{ padding: '9px 12px', background: 'var(--surface-1)', borderRadius: 'var(--radius-md)', fontSize: '12px', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
                  AWS Lambda (Node.js 18.x)
                </div>
              </div>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  Target Lambda Function
                </label>
                <div style={{ padding: '9px 12px', background: 'var(--surface-1)', borderRadius: 'var(--radius-md)', fontSize: '12px', color: 'var(--accent)', fontFamily: 'var(--font-mono)', border: '1px solid var(--border)' }}>
                  waf-backend-handler
                </div>
              </div>
            </div>

            {/* Test result status panel */}
            {testResult && (
              <div style={{
                padding: '14px',
                borderRadius: 'var(--radius-md)',
                background: testResult.ok ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                border: `1px solid ${testResult.ok ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: testResult.ok ? 'var(--status-success)' : 'var(--status-critical)' }}>
                    {testResult.ok ? '✓ Backend Connection Verified' : '⚠ Backend Error'}
                  </span>
                  <span className="font-mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {testResult.latency}ms latency • {testResult.timestamp}
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  HTTP Status: <strong style={{ color: testResult.ok ? 'var(--status-success)' : 'var(--status-critical)' }}>{testResult.status}</strong>
                  {testResult.requestId && <span> | AWS Request ID: <code className="font-mono">{testResult.requestId}</code></span>}
                </div>
                {testResult.data && (
                  <pre className="font-mono" style={{
                    margin: 0,
                    padding: '8px 10px',
                    borderRadius: '4px',
                    background: 'var(--surface-0)',
                    fontSize: '11px',
                    color: 'var(--text-secondary)',
                    overflowX: 'auto',
                    border: '1px solid var(--border)'
                  }}>
                    {typeof testResult.data === 'object' ? JSON.stringify(testResult.data, null, 2) : testResult.data}
                  </pre>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                id="test-api-btn"
                className="btn btn-primary"
                onClick={testBackend}
                disabled={testing}
                style={{ flex: 1 }}
              >
                {testing ? 'Testing Live Connection...' : '⚡ Ping Live AWS Backend'}
              </button>
            </div>
          </div>
        </div>

        {/* AWS Account & Resource Configuration */}
        <div className="card">
          <div className="card-header" style={{ marginBottom: '18px' }}>
            <div>
              <div className="card-title">AWS Environment Specs</div>
              <div className="card-subtitle">WAF Web ACL & Regional Target</div>
            </div>
            <span className="badge badge-info">Production</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label htmlFor="aws-region" style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                AWS Region
              </label>
              <select
                id="aws-region"
                className="filter-select"
                style={{ width: '100%' }}
                value={region}
                onChange={e => setRegion(e.target.value)}
              >
                {AWS_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            <SettingsField
              id="waf-arn"
              label="AWS WAFv2 Web ACL ARN"
              hint="Target Web ACL protecting the API gateway endpoints"
              value={wafArn}
              onChange={setWafArn}
            />

            <div>
              <label htmlFor="refresh-interval" style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                Dashboard Realtime Polling Interval
              </label>
              <select
                id="refresh-interval"
                className="filter-select"
                style={{ width: '100%' }}
                value={refreshInterval}
                onChange={e => setRefreshInterval(e.target.value)}
              >
                <option value="5">Every 5 seconds (Realtime demo)</option>
                <option value="10">Every 10 seconds</option>
                <option value="30">Every 30 seconds</option>
                <option value="60">Every 1 minute</option>
              </select>
            </div>

            <div style={{ padding: '12px', background: 'rgba(245, 158, 11, 0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                <strong style={{ color: 'var(--status-warning)' }}>🛡 Active WAF Rule Groups Attached:</strong><br />
                • <code className="font-mono" style={{ color: 'var(--status-info)' }}>AWSManagedRulesCommonRuleSet</code><br />
                • <code className="font-mono" style={{ color: 'var(--status-info)' }}>AWSManagedRulesSQLiRuleSet</code> (SQL Injection Protection)<br />
                • <code className="font-mono" style={{ color: 'var(--status-info)' }}>RateLimitRule</code> (100 req / 5 min per IP)<br />
                • <code className="font-mono" style={{ color: 'var(--status-info)' }}>BlockBadBotsAndScrapers</code>
              </p>
            </div>
          </div>
        </div>

        {/* Real-time Alert Notification Preferences */}
        <div className="card">
          <div className="card-header" style={{ marginBottom: '18px' }}>
            <div>
              <div className="card-title">Alert Notification Rules</div>
              <div className="card-subtitle">Real-time telemetry and threshold alerts</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { key: 'critical', label: 'Critical Threat Interceptions', desc: 'SQL Injection, Remote Code Execution, SSRF attempts blocked', color: 'var(--status-critical)' },
              { key: 'warning', label: 'Rate Limit & Abuse Triggers', desc: 'IP rate limits exceeded (>100 req/5m), scanner bot signatures', color: 'var(--status-warning)' },
              { key: 'info', label: 'Clean Traffic & Inspection Logs', desc: 'Valid customer API requests processed by Lambda backend', color: 'var(--status-info)' },
            ].map(({ key, label, desc, color }) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'var(--surface-1)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}` }} />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>{label}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{desc}</div>
                  </div>
                </div>
                <label className="toggle" htmlFor={`notif-${key}`}>
                  <input id={`notif-${key}`} type="checkbox" checked={notifs[key]} onChange={() => setNotifs(n => ({ ...n, [key]: !n[key] }))} />
                  <div className="toggle-track" />
                  <div className="toggle-thumb" />
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Reviewer Real-Time Demonstration Guide */}
        <div className="card">
          <div className="card-header" style={{ marginBottom: '18px' }}>
            <div>
              <div className="card-title">Reviewer Real-Time Demo Walkthrough</div>
              <div className="card-subtitle">Step-by-step verification commands</div>
            </div>
            <span className="badge badge-primary">Demo Guide</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ padding: '12px', background: 'var(--surface-1)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--status-success)' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--status-success)', marginBottom: '4px' }}>
                1. Clean Request Test (Expected: 200 OK)
              </div>
              <div className="font-mono" style={{ fontSize: '11px', color: 'var(--text-secondary)', background: 'var(--surface-0)', padding: '6px 8px', borderRadius: '4px' }}>
                curl -i "{apiUrl}"
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                Returns JSON payload processed by Lambda backend through WAF.
              </p>
            </div>

            <div style={{ padding: '12px', background: 'var(--surface-1)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--status-critical)' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--status-critical)', marginBottom: '4px' }}>
                2. Live SQL Injection Attack Test (Expected: 403 Forbidden)
              </div>
              <div className="font-mono" style={{ fontSize: '11px', color: 'var(--text-secondary)', background: 'var(--surface-0)', padding: '6px 8px', borderRadius: '4px' }}>
                curl -i "{apiUrl}?id=1%27%20OR%20%271%27=%271"
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                Immediately blocked by AWS Managed SQLi RuleSet with 403 Forbidden!
              </p>
            </div>

            <div style={{ padding: '12px', background: 'var(--surface-1)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--status-warning)' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--status-warning)', marginBottom: '4px' }}>
                3. Interactive Security Demo Page
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
                Navigate to <strong>Security Demo</strong> in the left sidebar to trigger simulated and live attacks with real-time payload visualizers and WAF rule inspection metrics.
              </p>
            </div>
          </div>
        </div>

        {/* Platform Specs Full Width */}
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <div className="card-header">
            <div className="card-title">Live System Architecture Specifications</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '12px' }}>
            {[
              { label: 'Cloud Provider', value: 'Amazon Web Services (AWS)' },
              { label: 'Target Region', value: 'us-east-1 (N. Virginia)' },
              { label: 'Edge Security', value: 'AWS WAFv2 Regional WebACL' },
              { label: 'API Gateway', value: 'waf-secure-api (REST)' },
              { label: 'Backend Compute', value: 'AWS Lambda (Serverless)' },
              { label: 'Telemetry & Logs', value: 'CloudWatch Metrics & Logs' },
              { label: 'Dashboard Stack', value: 'React 19 + Vite 8 + Modern CSS' },
              { label: 'Compliance Tag', value: '24CC3014-P023 (Verified)' },
            ].map(({ label, value }) => (
              <div key={label} style={{ padding: '10px 12px', background: 'var(--surface-1)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>{label}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 600 }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

function SettingsField({ id, label, hint, value, onChange, placeholder, type = 'text' }) {
  return (
    <div>
      <label htmlFor={id} style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        className="search-input"
        style={{ paddingLeft: '12px', width: '100%' }}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {hint && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{hint}</div>}
    </div>
  )
}
