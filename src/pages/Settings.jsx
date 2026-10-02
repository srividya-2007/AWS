import { useState } from 'react'

export default function Settings() {
  const [apiUrl, setApiUrl] = useState('http://localhost:8080')
  const [apiKey, setApiKey] = useState('')
  const [wafArn, setWafArn] = useState('')
  const [region, setRegion] = useState('us-east-1')
  const [refreshInterval, setRefreshInterval] = useState('30')
  const [notifs, setNotifs] = useState({ critical: true, warning: true, info: false })
  const [darkMode] = useState(true)
  const [saved, setSaved] = useState(false)

  function save() {
    // In production: POST to Spring Boot /api/settings
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const AWS_REGIONS = [
    'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
    'ap-south-1', 'ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1',
    'eu-west-1', 'eu-west-2', 'eu-central-1', 'sa-east-1',
  ]

  return (
    <>
      <div className="page-title-row">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Platform configuration and integration</p>
        </div>
        <button id="save-settings-btn" className="btn btn-primary" onClick={save}>
          {saved ? '✓ Saved!' : 'Save Changes'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* API Integration */}
        <div className="card">
          <div className="card-header" style={{ marginBottom: '20px' }}>
            <div>
              <div className="card-title">Spring Boot API Connection</div>
              <div className="card-subtitle">Configure your backend API endpoint</div>
            </div>
            <span className="badge badge-warning">Not Connected</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <SettingsField
              id="api-url"
              label="API Base URL"
              hint="Your Spring Boot backend URL (e.g. https://api.yourdomain.com)"
              value={apiUrl}
              onChange={setApiUrl}
              placeholder="http://localhost:8080"
            />
            <SettingsField
              id="api-key"
              label="API Key / Bearer Token"
              hint="Will be sent as Authorization: Bearer <token> header"
              value={apiKey}
              onChange={setApiKey}
              placeholder="sk-..."
              type="password"
            />
            <div style={{ padding: '12px', background: 'rgba(43,156,244,0.06)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(43,156,244,0.15)' }}>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '8px' }}>
                <strong style={{ color: 'var(--status-info)' }}>How to connect your Spring Boot API:</strong>
              </p>
              <ul style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.8, paddingLeft: '16px' }}>
                <li>Expose REST endpoints at <code className="font-mono" style={{ color: 'var(--status-info)', fontSize: '11px' }}>/api/alerts</code>, <code className="font-mono" style={{ color: 'var(--status-info)', fontSize: '11px' }}>/api/waf/rules</code>, <code className="font-mono" style={{ color: 'var(--status-info)', fontSize: '11px' }}>/api/metrics</code></li>
                <li>Enable CORS for your frontend domain</li>
                <li>Set <code className="font-mono" style={{ color: 'var(--status-info)', fontSize: '11px' }}>VITE_API_URL</code> in <code className="font-mono" style={{ fontSize: '11px' }}>.env.production</code></li>
                <li>Replace mock data hooks with real <code className="font-mono" style={{ color: 'var(--status-info)', fontSize: '11px' }}>fetch()</code> / Axios calls</li>
              </ul>
            </div>
            <button
              id="test-api-btn"
              className="btn btn-secondary"
              onClick={() => alert(`Testing connection to ${apiUrl}/api/health\n\nConnect your Spring Boot API to enable real health checks.`)}
            >
              Test Connection
            </button>
          </div>
        </div>

        {/* AWS Config */}
        <div className="card">
          <div className="card-header" style={{ marginBottom: '20px' }}>
            <div>
              <div className="card-title">AWS Configuration</div>
              <div className="card-subtitle">WAF and regional settings</div>
            </div>
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
              label="WAF Web ACL ARN"
              hint="arn:aws:wafv2:REGION:ACCOUNT:regional/webacl/NAME/ID"
              value={wafArn}
              onChange={setWafArn}
              placeholder="arn:aws:wafv2:us-east-1:123456789012:regional/webacl/..."
            />
            <div>
              <label htmlFor="refresh-interval" style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                Dashboard Refresh Interval
              </label>
              <select
                id="refresh-interval"
                className="filter-select"
                style={{ width: '100%' }}
                value={refreshInterval}
                onChange={e => setRefreshInterval(e.target.value)}
              >
                <option value="10">Every 10 seconds</option>
                <option value="30">Every 30 seconds</option>
                <option value="60">Every 1 minute</option>
                <option value="300">Every 5 minutes</option>
              </select>
            </div>

            {/* Deployment notes */}
            <div style={{ padding: '12px', background: 'var(--status-warning-bg)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(217, 119, 6, 0.2)' }}>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                <strong style={{ color: 'var(--status-warning)' }}>⚠ Important:</strong> Never store AWS credentials in the frontend.
                Use IAM roles on EC2, or pre-signed requests via your Spring Boot API.
                AWS WAF credentials should remain server-side only.
              </p>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="card">
          <div className="card-header" style={{ marginBottom: '20px' }}>
            <div>
              <div className="card-title">Alert Notifications</div>
              <div className="card-subtitle">Configure which alerts generate notifications</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { key: 'critical', label: 'Critical Alerts', desc: 'SQL injection, command injection, SSRF attempts', color: 'var(--status-critical)' },
              { key: 'warning', label: 'Warning Alerts', desc: 'XSS attempts, rate limits, bot detections', color: 'var(--status-warning)' },
              { key: 'info', label: 'Info Events', desc: 'Geo-blocks, missing headers, bot counts', color: 'var(--status-info)' },
            ].map(({ key, label, desc, color }) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'var(--surface-1)', borderRadius: 'var(--radius-md)' }}>
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

        {/* Deployment Guide */}
        <div className="card">
          <div className="card-header" style={{ marginBottom: '20px' }}>
            <div>
              <div className="card-title">Deployment Guide</div>
              <div className="card-subtitle">AWS deployment options for this frontend</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ padding: '14px', background: 'var(--surface-1)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--accent)' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>Option A: S3 + CloudFront</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--status-info)', lineHeight: 1.8 }}>
                <div>$ npm run build</div>
                <div>$ aws s3 sync ./dist s3://your-bucket --delete</div>
                <div>$ aws cloudfront create-invalidation --distribution-id XXXXX --paths "/*"</div>
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
                Upload the <code className="font-mono">dist/</code> folder to S3. Enable static website hosting.
                Add CloudFront distribution with S3 origin. Configure WAF Web ACL on the distribution.
              </p>
            </div>

            <div style={{ padding: '14px', background: 'var(--surface-1)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--status-info)' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>Option B: EC2 + Nginx + ALB</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--status-info)', lineHeight: 1.8 }}>
                <div>$ npm run build</div>
                <div>$ scp -r dist/ ec2-user@your-ec2:/var/www/html</div>
                <div style={{ color: 'var(--text-muted)' }}># Configure Nginx to serve dist/ with try_files for SPA routing</div>
                <div style={{ color: 'var(--text-muted)' }}># Attach WAF Web ACL to ALB</div>
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
                Nginx must include <code className="font-mono">try_files $uri /index.html</code> for React Router to work.
                Configure WAF Web ACL on the ALB (not EC2 directly).
              </p>
            </div>

            <div style={{ padding: '10px 14px', background: 'rgba(255,59,92,0.06)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,59,92,0.15)' }}>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                <strong style={{ color: 'var(--status-critical)' }}>⚠ Note:</strong> AWS WAF must be manually configured after deployment.
                This frontend does <strong>not</strong> create any AWS infrastructure automatically.
                You must manually configure WAF Web ACLs, rules, and associations.
              </p>
            </div>
          </div>
        </div>

        {/* About */}
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <div className="card-header">
            <div className="card-title">Platform Information</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
            {[
              { label: 'Platform', value: 'AWS Threat Monitor' },
              { label: 'Version', value: '1.0.0' },
              { label: 'Framework', value: 'React 19 + Vite 8' },
              { label: 'Router', value: 'React Router v7' },
              { label: 'Build Target', value: 'ES2015+' },
              { label: 'Theme', value: 'Dark (AWS Brand)' },
              { label: 'API Ready', value: 'Awaiting Spring Boot' },
              { label: 'AWS WAF', value: 'Manual Config Required' },
            ].map(({ label, value }) => (
              <div key={label} style={{ padding: '10px 12px', background: 'var(--surface-1)', borderRadius: 'var(--radius-md)' }}>
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
