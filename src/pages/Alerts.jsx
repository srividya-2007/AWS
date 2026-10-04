import { useState, useMemo, useEffect, useRef } from 'react'

const LIVE_TYPES = [
  { type: 'SQL Injection',       sev: 'critical', action: 'BLOCK', rule: 'AWSManagedRulesSQLiRuleSet',       path: '/api/users?id=1%20OR%201%3D1' },
  { type: 'XSS Injection',       sev: 'warning',  action: 'BLOCK', rule: 'XSSBlockRuleSet-v2',               path: '/search?q=%3Cscript%3Ealert(1)%3C/script%3E' },
  { type: 'Rate Limit Exceeded', sev: 'critical', action: 'BLOCK', rule: 'RateLimitAbusiveClients',          path: '/api/login' },
  { type: 'Bot Signature',       sev: 'warning',  action: 'COUNT', rule: 'BlockBadBotsAndScrapers',          path: '/api/catalog' },
  { type: 'Path Traversal',      sev: 'warning',  action: 'BLOCK', rule: 'AWSManagedRulesCommonRuleSet',     path: '/api/../../etc/passwd' },
  { type: 'SSRF Probe',          sev: 'critical', action: 'BLOCK', rule: 'AWSManagedRulesKnownBadInputs',   path: '/api/fetch?url=http://169.254.169.254/latest' },
  { type: 'Geo-Block',           sev: 'info',     action: 'BLOCK', rule: 'GeoMatchRule-HighRisk',            path: '/api/products' },
  { type: 'Missing Auth Header', sev: 'info',     action: 'COUNT', rule: 'AuthHeaderCheck',                  path: '/api/admin' },
]
const LIVE_IPS = ['185.220.101.45','104.21.55.200','91.108.56.130','5.188.62.201','45.155.205.85','77.88.55.88','162.158.78.12','194.165.16.11']
const LIVE_COUNTRIES = ['Russia','United States','Germany','Ukraine','China','Netherlands','Iran','Brazil']
let incCounter = 48

function generateLiveAlert() {
  const t = LIVE_TYPES[Math.floor(Math.random() * LIVE_TYPES.length)]
  const idx = Math.floor(Math.random() * LIVE_IPS.length)
  const now = new Date()
  const id = `INC-${String(incCounter++).padStart(4, '0')}`
  return {
    ...t,
    id,
    ip: LIVE_IPS[idx],
    country: LIVE_COUNTRIES[idx],
    time: `${now.toISOString().slice(0,10)} ${now.toTimeString().slice(0,8)}`,
    status: 'Open',
    isNew: true,
  }
}

const INITIAL_ALERTS = [
  { id: 'INC-0047', sev: 'critical', type: 'SQL Injection', ip: '185.220.101.45', country: 'Russia', action: 'BLOCK', rule: 'AWSManagedRulesSQLiRuleSet', time: '2026-10-04 06:12:14', path: '/api/users?id=1%20OR%201%3D1', status: 'Open' },
  { id: 'INC-0046', sev: 'critical', type: 'Rate Limit Exceeded', ip: '104.21.55.200', country: 'United States', action: 'BLOCK', rule: 'RateLimitAbusiveClients', time: '2026-10-04 06:08:00', path: '/api/login', status: 'Open' },
  { id: 'INC-0045', sev: 'critical', type: 'Command Injection', ip: '5.188.62.201', country: 'Ukraine', action: 'BLOCK', rule: 'AWSManagedRulesCommonRuleSet', time: '2026-10-04 05:45:05', path: '/api/exec?cmd=ls+-la', status: 'Escalated' },
  { id: 'INC-0044', sev: 'warning', type: 'XSS Attempt', ip: '91.108.56.130', country: 'Germany', action: 'BLOCK', rule: 'XSSBlockRuleSet-v2', time: '2026-10-04 05:32:33', path: '/search?q=%3Cscript%3E', status: 'Resolved' },
  { id: 'INC-0043', sev: 'warning', type: 'Bot Signature', ip: '162.158.78.12', country: 'Netherlands', action: 'COUNT', rule: 'BlockBadBotsAndScrapers', time: '2026-10-04 05:15:47', path: '/sitemap.xml', status: 'Monitoring' },
  { id: 'INC-0042', sev: 'info', type: 'Geo-Block Trigger', ip: '45.155.205.85', country: 'China', action: 'BLOCK', rule: 'GeoMatchRule-HighRisk', time: '2026-10-04 04:58:12', path: '/api/products', status: 'Resolved' },
  { id: 'INC-0041', sev: 'warning', type: 'Path Traversal', ip: '23.94.25.121', country: 'United States', action: 'BLOCK', rule: 'AWSManagedRulesCommonRuleSet', time: '2026-10-04 04:40:55', path: '/api/../../../etc/passwd', status: 'Open' },
  { id: 'INC-0040', sev: 'info', type: 'Malformed Header', ip: '52.95.110.1', country: 'United States', action: 'BLOCK', rule: 'AWSManagedRulesKnownBadInputs', time: '2026-10-04 04:22:22', path: '/api/data', status: 'Resolved' },
  { id: 'INC-0039', sev: 'critical', type: 'SSRF Attempt', ip: '77.88.55.88', country: 'Russia', action: 'BLOCK', rule: 'AWSManagedRulesKnownBadInputs', time: '2026-10-04 03:59:08', path: '/api/fetch?url=http://169.254.169.254', status: 'Escalated' },
  { id: 'INC-0038', sev: 'warning', type: 'Suspicious Crawler', ip: '192.168.10.23', country: 'Brazil', action: 'COUNT', rule: 'BlockBadBotsAndScrapers', time: '2026-10-04 03:44:30', path: '/api/catalog', status: 'Resolved' },
  { id: 'INC-0037', sev: 'info', type: 'Missing Auth Header', ip: '10.0.1.50', country: 'Internal', action: 'COUNT', rule: 'AuthHeaderCheck', time: '2026-10-04 03:30:01', path: '/api/admin', status: 'Monitoring' },
  { id: 'INC-0036', sev: 'critical', type: 'XXE Injection', ip: '194.165.16.11', country: 'Iran', action: 'BLOCK', rule: 'AWSManagedRulesKnownBadInputs', time: '2026-10-04 02:58:12', path: '/api/xml-parser', status: 'Resolved' },
]

const SEV_ORDER = { critical: 0, warning: 1, info: 2 }

export default function Alerts() {
  const [alerts, setAlerts] = useState(INITIAL_ALERTS)
  const [search, setSearch] = useState('')
  const [sevFilter, setSevFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortField, setSortField] = useState('time')
  const [sortDir, setSortDir] = useState('desc')
  const [selectedAlert, setSelectedAlert] = useState(null)
  const [toastMessage, setToastMessage] = useState(null)
  const [liveCount, setLiveCount] = useState(0)
  const alertTimerRef = useRef(null)

  // ── Auto-stream new security alerts every 5-9 seconds ──
  useEffect(() => {
    function scheduleNext() {
      const delay = 5000 + Math.random() * 4000
      alertTimerRef.current = setTimeout(() => {
        const newAlert = generateLiveAlert()
        setAlerts(prev => [newAlert, ...prev])
        setLiveCount(c => c + 1)
        scheduleNext()
      }, delay)
    }
    scheduleNext()
    return () => clearTimeout(alertTimerRef.current)
  }, [])

  function showToast(msg) {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  function updateStatus(id, newStatus) {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a))
    if (selectedAlert && selectedAlert.id === id) {
      setSelectedAlert(prev => ({ ...prev, status: newStatus }))
    }
    showToast(`✓ Alert ${id} updated to ${newStatus}`)
  }

  function clearResolved() {
    const resolvedCount = alerts.filter(a => a.status === 'Resolved').length
    if (resolvedCount === 0) {
      showToast('No resolved alerts to clear.')
      return
    }
    setAlerts(prev => prev.filter(a => a.status !== 'Resolved'))
    showToast(`Cleared ${resolvedCount} resolved alert${resolvedCount > 1 ? 's' : ''}.`)
  }

  function blockIPInWAF(ip, alertId) {
    showToast(`🛡 Source IP ${ip} permanently added to WAF BlockList IPSet!`)
    updateStatus(alertId, 'Resolved')
    setSelectedAlert(null)
  }

  const filtered = useMemo(() => {
    let data = alerts

    if (search) {
      const q = search.toLowerCase()
      data = data.filter(a =>
        a.type.toLowerCase().includes(q) ||
        a.ip.includes(q) ||
        a.country.toLowerCase().includes(q) ||
        a.rule.toLowerCase().includes(q) ||
        a.id.toLowerCase().includes(q)
      )
    }

    if (sevFilter !== 'all') data = data.filter(a => a.sev === sevFilter)
    if (statusFilter !== 'all') data = data.filter(a => a.status.toLowerCase() === statusFilter.toLowerCase())

    data = [...data].sort((a, b) => {
      if (sortField === 'sev') {
        const cmp = SEV_ORDER[a.sev] - SEV_ORDER[b.sev]
        return sortDir === 'asc' ? cmp : -cmp
      }
      if (sortField === 'time') {
        const cmp = a.time.localeCompare(b.time)
        return sortDir === 'asc' ? cmp : -cmp
      }
      return 0
    })

    return data
  }, [alerts, search, sevFilter, statusFilter, sortField, sortDir])

  const counts = {
    critical: alerts.filter(a => a.sev === 'critical').length,
    warning: alerts.filter(a => a.sev === 'warning').length,
    info: alerts.filter(a => a.sev === 'info').length,
  }

  function toggleSort(field) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('desc') }
  }

  return (
    <>
      <div className="page-title-row">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            Alerts &amp; Incidents
            {liveCount > 0 && (
              <span style={{
                fontSize: 11, background: 'rgba(220, 38, 38, 0.12)', color: 'var(--status-critical)',
                padding: '2px 9px', borderRadius: 99, fontWeight: 700, border: '1px solid rgba(220, 38, 38, 0.3)',
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <span className="live-pulse" style={{ color: 'var(--status-critical)' }} />
                +{liveCount} live
              </span>
            )}
          </h1>
          <p className="page-subtitle">Streaming realtime AWS WAF security events &amp; incident triage &middot; Auto-updating every few seconds</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button id="export-alerts-btn" className="btn btn-secondary" onClick={() => exportCSV(filtered)}>
            <DownloadIcon /> Export CSV
          </button>
          <button id="clear-alerts-btn" className="btn btn-danger btn-sm" onClick={clearResolved}>
            Clear Resolved
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: 'var(--surface-3)',
          border: '1px solid var(--accent)',
          color: 'var(--text-primary)',
          padding: '12px 18px',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-lg)',
          zIndex: 9999,
          fontSize: '13px',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          animation: 'fadeIn 0.2s ease',
        }}>
          {toastMessage}
        </div>
      )}

      {/* Summary pills */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {[
          { label: 'Critical', count: counts.critical, badge: 'badge-critical', filter: 'critical' },
          { label: 'Warning', count: counts.warning, badge: 'badge-warning', filter: 'warning' },
          { label: 'Info', count: counts.info, badge: 'badge-info', filter: 'info' },
          { label: 'All Active', count: alerts.length, badge: 'badge-neutral', filter: 'all' },
        ].map(({ label, count, badge, filter }) => (
          <button
            key={filter}
            id={`filter-sev-${filter}`}
            onClick={() => setSevFilter(filter)}
            className="btn btn-ghost btn-sm"
            style={sevFilter === filter ? { borderColor: 'var(--accent)', background: 'var(--surface-2)', color: 'var(--accent)' } : {}}
          >
            <span className={`badge ${badge}`}>{count}</span>
            {label}
          </button>
        ))}
      </div>

      {/* Filter bar */}
      <div className="filter-bar">
        <div className="search-input-wrap">
          <SearchIcon className="search-icon" />
          <input
            id="alerts-search"
            type="text"
            className="search-input"
            placeholder="Search by threat type, IP, country, WAF rule, or ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          id="status-filter"
          className="filter-select"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="all">All Incident Statuses</option>
          <option value="open">Open</option>
          <option value="resolved">Resolved</option>
          <option value="monitoring">Monitoring</option>
          <option value="escalated">Escalated</option>
        </select>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '100px' }}>ID</th>
                <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('sev')}>
                  Severity {sortField === 'sev' ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
                </th>
                <th>Threat Signature</th>
                <th>Source IP</th>
                <th>Country</th>
                <th>Action</th>
                <th>WAF Rule Triggered</th>
                <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('time')}>
                  Timestamp {sortField === 'time' ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
                </th>
                <th>Status</th>
                <th>Triage</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                    No alerts matching current filters.
                  </td>
                </tr>
              ) : (
                filtered.map(alert => (
                  <tr key={alert.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedAlert(alert)}>
                    <td><code className="font-mono" style={{ color: 'var(--accent)', fontSize: '11px' }}>{alert.id}</code></td>
                    <td>
                      <span className={`badge badge-${alert.sev}`}>
                        <span className="live-pulse" style={{ width: 6, height: 6 }} />
                        {alert.sev.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{alert.type}</td>
                    <td><code className="font-mono" style={{ fontSize: '12px' }}>{alert.ip}</code></td>
                    <td style={{ color: 'var(--text-secondary)' }}>{alert.country}</td>
                    <td>
                      <span className={`badge ${alert.action === 'BLOCK' ? 'badge-critical' : 'badge-warning'}`}>
                        {alert.action}
                      </span>
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{alert.rule}</td>
                    <td className="font-mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{alert.time}</td>
                    <td>
                      <span className={`badge ${
                        alert.status === 'Open' ? 'badge-critical' :
                        alert.status === 'Resolved' ? 'badge-success' :
                        alert.status === 'Escalated' ? 'badge-warning' : 'badge-info'
                      }`}>{alert.status}</span>
                    </td>
                    <td>
                      <button
                        id={`detail-btn-${alert.id}`}
                        className="btn btn-ghost btn-sm"
                        onClick={(e) => { e.stopPropagation(); setSelectedAlert(alert) }}
                      >
                        Triage →
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
        <span>Showing {filtered.length} of {alerts.length} security alerts</span>
        <span>Click any row to inspect payload or execute remediation</span>
      </div>

      {/* Detail modal */}
      {selectedAlert && (
        <div className="modal-overlay" onClick={() => setSelectedAlert(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <div className="modal-title">Security Incident Analysis &amp; Remediation</div>
                <code className="font-mono" style={{ fontSize: '13px', color: 'var(--accent)' }}>{selectedAlert.id}</code>
              </div>
              <span className={`badge badge-${selectedAlert.sev}`}>{selectedAlert.sev.toUpperCase()}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
              {[
                { label: 'Threat Type', value: selectedAlert.type },
                { label: 'WAF Action Taken', value: selectedAlert.action },
                { label: 'Attacker Source IP', value: selectedAlert.ip, mono: true },
                { label: 'Origin Geo Country', value: selectedAlert.country },
                { label: 'Triggered WAF Rule', value: selectedAlert.rule },
                { label: 'Current Incident Status', value: selectedAlert.status },
                { label: 'Detection Timestamp', value: selectedAlert.time, mono: true },
              ].map(({ label, value, mono }) => (
                <div key={label} style={{ background: 'var(--surface-1)', padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>{label}</div>
                  <div className={mono ? 'font-mono' : ''} style={{ fontSize: '13px', color: 'var(--text-primary)', wordBreak: 'break-all' }}>{value}</div>
                </div>
              ))}
            </div>

            <div style={{ background: 'var(--surface-1)', padding: '12px', borderRadius: 'var(--radius-md)', marginBottom: '16px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
                Intercepted URI / Payload
              </div>
              <code className="font-mono" style={{ fontSize: '12px', color: 'var(--status-critical)', wordBreak: 'break-all' }}>
                {selectedAlert.path}
              </code>
            </div>

            <div style={{ background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.25)', padding: '10px 14px', borderRadius: 'var(--radius-md)', marginBottom: '20px' }}>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                🛡 <strong>WAF Remediation Status:</strong> Request was intercepted at AWS CloudFront/ALB edge by Web ACL rule <code className="font-mono" style={{ color: 'var(--accent)' }}>{selectedAlert.rule}</code>. Backend Lambda did not execute malicious commands.
              </p>
            </div>

            <div className="modal-actions" style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
              <button
                id="block-ip-btn"
                className="btn btn-secondary btn-sm"
                onClick={() => blockIPInWAF(selectedAlert.ip, selectedAlert.id)}
              >
                🚫 Add IP to WAF IPSet
              </button>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button id="close-modal-btn" className="btn btn-ghost" onClick={() => setSelectedAlert(null)}>Close</button>
                <button
                  id="escalate-btn"
                  className="btn btn-danger"
                  onClick={() => updateStatus(selectedAlert.id, 'Escalated')}
                >
                  Escalate Incident
                </button>
                <button
                  id="resolve-btn"
                  className="btn btn-primary"
                  onClick={() => updateStatus(selectedAlert.id, 'Resolved')}
                >
                  ✓ Mark Resolved
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function exportCSV(data) {
  const headers = ['ID', 'Severity', 'Type', 'IP', 'Country', 'Action', 'Rule', 'Time', 'Status']
  const rows = data.map(a => [a.id, a.sev, a.type, a.ip, a.country, a.action, a.rule, a.time, a.status])
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `aws-waf-alerts-${Date.now()}.csv`; a.click()
  URL.revokeObjectURL(url)
}

function SearchIcon({ className }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}
