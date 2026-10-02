import { useState, useMemo } from 'react'

const ALERTS_DATA = [
  { id: 'INC-0047', sev: 'critical', type: 'SQL Injection', ip: '185.220.101.45', country: 'Russia', action: 'BLOCK', rule: 'AWSManagedRulesSQLiRuleSet', time: '2026-10-02 19:42:14', path: '/api/users?id=1%20OR%201%3D1', status: 'Resolved' },
  { id: 'INC-0046', sev: 'critical', type: 'Rate Limit Exceeded', ip: '104.21.55.200', country: 'United States', action: 'BLOCK', rule: 'RateLimitRule-4000rpm', time: '2026-10-02 19:39:00', path: '/api/login', status: 'Open' },
  { id: 'INC-0045', sev: 'critical', type: 'Command Injection', ip: '5.188.62.201', country: 'Ukraine', action: 'BLOCK', rule: 'AWSManagedRulesCommonRuleSet', time: '2026-10-02 19:21:05', path: '/api/exec?cmd=ls+-la', status: 'Open' },
  { id: 'INC-0044', sev: 'warning', type: 'XSS Attempt', ip: '91.108.56.130', country: 'Germany', action: 'BLOCK', rule: 'XSSBlockRuleSet-v2', time: '2026-10-02 19:08:33', path: '/search?q=%3Cscript%3E', status: 'Resolved' },
  { id: 'INC-0043', sev: 'warning', type: 'Bot Signature', ip: '162.158.78.12', country: 'Netherlands', action: 'COUNT', rule: 'BotControlManagedRule', time: '2026-10-02 18:55:47', path: '/sitemap.xml', status: 'Monitoring' },
  { id: 'INC-0042', sev: 'info', type: 'Geo-Block Trigger', ip: '45.155.205.85', country: 'China', action: 'BLOCK', rule: 'GeoMatchRule-CN-KP', time: '2026-10-02 18:43:12', path: '/api/products', status: 'Resolved' },
  { id: 'INC-0041', sev: 'warning', type: 'Path Traversal', ip: '23.94.25.121', country: 'United States', action: 'BLOCK', rule: 'AWSManagedRulesCommonRuleSet', time: '2026-10-02 18:30:55', path: '/api/../../../etc/passwd', status: 'Open' },
  { id: 'INC-0040', sev: 'info', type: 'Malformed Header', ip: '52.95.110.1', country: 'United States', action: 'BLOCK', rule: 'HTTPFloodProtection', time: '2026-10-02 18:17:22', path: '/api/data', status: 'Resolved' },
  { id: 'INC-0039', sev: 'critical', type: 'SSRF Attempt', ip: '77.88.55.88', country: 'Russia', action: 'BLOCK', rule: 'AWSManagedRulesKnownBadInputs', time: '2026-10-02 17:59:08', path: '/api/fetch?url=http://169.254.169.254', status: 'Escalated' },
  { id: 'INC-0038', sev: 'warning', type: 'Suspicious UA', ip: '192.168.10.23', country: 'Brazil', action: 'COUNT', rule: 'BotControlManagedRule', time: '2026-10-02 17:44:30', path: '/api/catalog', status: 'Resolved' },
  { id: 'INC-0037', sev: 'info', type: 'Missing Auth Header', ip: '10.0.1.50', country: 'Internal', action: 'COUNT', rule: 'AuthHeaderCheck', time: '2026-10-02 17:30:01', path: '/api/admin', status: 'Monitoring' },
  { id: 'INC-0036', sev: 'critical', type: 'XXE Injection', ip: '194.165.16.11', country: 'Iran', action: 'BLOCK', rule: 'AWSManagedRulesKnownBadInputs', time: '2026-10-02 16:58:12', path: '/api/xml-parser', status: 'Resolved' },
]

const SEV_ORDER = { critical: 0, warning: 1, info: 2 }

export default function Alerts() {
  const [search, setSearch] = useState('')
  const [sevFilter, setSevFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortField, setSortField] = useState('time')
  const [sortDir, setSortDir] = useState('desc')
  const [selectedAlert, setSelectedAlert] = useState(null)

  const filtered = useMemo(() => {
    let data = ALERTS_DATA

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
  }, [search, sevFilter, statusFilter, sortField, sortDir])

  const counts = {
    critical: ALERTS_DATA.filter(a => a.sev === 'critical').length,
    warning: ALERTS_DATA.filter(a => a.sev === 'warning').length,
    info: ALERTS_DATA.filter(a => a.sev === 'info').length,
  }

  function toggleSort(field) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('desc') }
  }

  return (
    <>
      <div className="page-title-row">
        <div>
          <h1 className="page-title">Alerts &amp; Incidents</h1>
          <p className="page-subtitle">Real-time WAF security event feed</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button id="export-alerts-btn" className="btn btn-secondary" onClick={() => exportCSV(filtered)}>
            <DownloadIcon /> Export CSV
          </button>
          <button id="clear-alerts-btn" className="btn btn-danger btn-sm" onClick={() => alert('This would clear resolved alerts. Connect Spring Boot API to enable.')}>
            Clear Resolved
          </button>
        </div>
      </div>

      {/* Summary pills */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {[
          { label: 'Critical', count: counts.critical, badge: 'badge-critical', filter: 'critical' },
          { label: 'Warning', count: counts.warning, badge: 'badge-warning', filter: 'warning' },
          { label: 'Info', count: counts.info, badge: 'badge-info', filter: 'info' },
          { label: 'All', count: ALERTS_DATA.length, badge: 'badge-neutral', filter: 'all' },
        ].map(({ label, count, badge, filter }) => (
          <button
            key={filter}
            id={`filter-sev-${filter}`}
            onClick={() => setSevFilter(filter)}
            className="btn btn-ghost btn-sm"
            style={sevFilter === filter ? { borderColor: 'var(--border-accent)', background: 'var(--surface-2)' } : {}}
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
            placeholder="Search by type, IP, country, rule..."
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
          <option value="all">All Statuses</option>
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
                <th>Incident ID</th>
                <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('sev')}>
                  Severity {sortField === 'sev' ? (sortDir === 'asc' ? '↑' : '↓') : '⇅'}
                </th>
                <th>Threat Type</th>
                <th>Source IP</th>
                <th>Country</th>
                <th>Action</th>
                <th>WAF Rule</th>
                <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('time')}>
                  Time {sortField === 'time' ? (sortDir === 'asc' ? '↑' : '↓') : '⇅'}
                </th>
                <th>Status</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    No alerts match your filters
                  </td>
                </tr>
              ) : filtered.map(alert => (
                <tr key={alert.id}>
                  <td>
                    <code className="font-mono" style={{ fontSize: '12px', color: 'var(--status-info)' }}>{alert.id}</code>
                  </td>
                  <td>
                    <span className={`badge badge-${alert.sev}`}>
                      {alert.sev.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{alert.type}</td>
                  <td><code className="font-mono" style={{ fontSize: '12px' }}>{alert.ip}</code></td>
                  <td>{alert.country}</td>
                  <td>
                    <span className={`badge ${alert.action === 'BLOCK' ? 'badge-critical' : 'badge-warning'}`}>
                      {alert.action}
                    </span>
                  </td>
                  <td style={{ fontSize: '11px', color: 'var(--text-muted)', maxWidth: '160px' }}>
                    <span className="truncate" style={{ display: 'block' }}>{alert.rule}</span>
                  </td>
                  <td>
                    <span className="font-mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {alert.time.split(' ')[1]}
                    </span>
                  </td>
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
                      onClick={() => setSelectedAlert(alert)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
        Showing {filtered.length} of {ALERTS_DATA.length} alerts
      </div>

      {/* Detail modal */}
      {selectedAlert && (
        <div className="modal-overlay" onClick={() => setSelectedAlert(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <div className="modal-title">Incident Detail</div>
                <code className="font-mono" style={{ fontSize: '13px', color: 'var(--status-info)' }}>{selectedAlert.id}</code>
              </div>
              <span className={`badge badge-${selectedAlert.sev}`}>{selectedAlert.sev.toUpperCase()}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
              {[
                { label: 'Threat Type', value: selectedAlert.type },
                { label: 'Action Taken', value: selectedAlert.action },
                { label: 'Source IP', value: selectedAlert.ip, mono: true },
                { label: 'Country', value: selectedAlert.country },
                { label: 'WAF Rule', value: selectedAlert.rule },
                { label: 'Status', value: selectedAlert.status },
                { label: 'Timestamp', value: selectedAlert.time, mono: true },
              ].map(({ label, value, mono }) => (
                <div key={label} style={{ background: 'var(--surface-1)', padding: '10px 12px', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>{label}</div>
                  <div className={mono ? 'font-mono' : ''} style={{ fontSize: '13px', color: 'var(--text-primary)', wordBreak: 'break-all' }}>{value}</div>
                </div>
              ))}
            </div>

            <div style={{ background: 'var(--surface-1)', padding: '12px', borderRadius: 'var(--radius-md)', marginBottom: '16px' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Request Path</div>
              <code className="font-mono" style={{ fontSize: '12px', color: 'var(--status-critical)', wordBreak: 'break-all' }}>{selectedAlert.path}</code>
            </div>

            <div style={{ background: 'var(--blue-50)', border: '1px dashed var(--blue-200)', padding: '10px 12px', borderRadius: 'var(--radius-md)', marginBottom: '20px' }}>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                💡 Connect your <strong style={{ color: 'var(--accent)' }}>Spring Boot API</strong> at{' '}
                <code className="font-mono" style={{ color: 'var(--status-info)' }}>/api/incidents/{'{id}'}</code> to enable live status updates and remediation actions.
              </p>
            </div>

            <div className="modal-actions">
              <button id="close-modal-btn" className="btn btn-ghost" onClick={() => setSelectedAlert(null)}>Close</button>
              <button id="escalate-btn" className="btn btn-danger" onClick={() => { alert(`Escalating ${selectedAlert.id} — Connect Spring Boot API to enable`); setSelectedAlert(null) }}>
                Escalate
              </button>
              <button id="resolve-btn" className="btn btn-primary" onClick={() => { alert(`Resolving ${selectedAlert.id} — Connect Spring Boot API to enable`); setSelectedAlert(null) }}>
                Mark Resolved
              </button>
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
  a.href = url; a.download = 'aws-alerts.csv'; a.click()
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
