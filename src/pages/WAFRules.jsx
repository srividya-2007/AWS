import { useState } from 'react'

const INITIAL_RULES = [
  {
    id: 'WR-001', name: 'AWSManagedRulesSQLiRuleSet', type: 'Managed', priority: 1,
    action: 'BLOCK', status: true, hits: 4820, description: 'Protects against SQL injection attacks.',
    group: 'AWS Managed',
  },
  {
    id: 'WR-002', name: 'XSSBlockRuleSet-v2', type: 'Custom', priority: 2,
    action: 'BLOCK', status: true, hits: 2340, description: 'Blocks cross-site scripting attempts in headers and query strings.',
    group: 'Custom',
  },
  {
    id: 'WR-003', name: 'RateLimitRule-4000rpm', type: 'Rate-based', priority: 3,
    action: 'BLOCK', status: true, hits: 3120, description: 'Blocks IPs exceeding 4,000 requests per minute.',
    group: 'Rate Limiting',
  },
  {
    id: 'WR-004', name: 'GeoMatchRule-CN-KP-RU-IR', type: 'Custom', priority: 4,
    action: 'BLOCK', status: true, hits: 940, description: 'Blocks traffic from high-risk geographic regions.',
    group: 'Geo Control',
  },
  {
    id: 'WR-005', name: 'AWSManagedRulesCommonRuleSet', type: 'Managed', priority: 5,
    action: 'BLOCK', status: true, hits: 1840, description: 'Core rule set protecting against OWASP Top 10.',
    group: 'AWS Managed',
  },
  {
    id: 'WR-006', name: 'BotControlManagedRule', type: 'Managed', priority: 6,
    action: 'COUNT', status: true, hits: 1280, description: 'Identifies and manages bot traffic.',
    group: 'AWS Managed',
  },
  {
    id: 'WR-007', name: 'AWSManagedRulesKnownBadInputs', type: 'Managed', priority: 7,
    action: 'BLOCK', status: true, hits: 760, description: 'Blocks requests matching patterns for known exploits (SSRF, XXE, Log4j).',
    group: 'AWS Managed',
  },
  {
    id: 'WR-008', name: 'HTTPFloodProtection', type: 'Rate-based', priority: 8,
    action: 'BLOCK', status: false, hits: 420, description: 'Protects against HTTP flood DDoS attacks (currently disabled for review).',
    group: 'Rate Limiting',
  },
  {
    id: 'WR-009', name: 'AuthHeaderCheck', type: 'Custom', priority: 9,
    action: 'COUNT', status: true, hits: 190, description: 'Counts requests missing Authorization header to /api/admin paths.',
    group: 'Custom',
  },
  {
    id: 'WR-010', name: 'SizeRestrictionRule', type: 'Custom', priority: 10,
    action: 'BLOCK', status: false, hits: 88, description: 'Blocks requests with body size exceeding 8KB (disabled — under configuration).',
    group: 'Custom',
  },
]

export default function WAFRules() {
  const [rules, setRules] = useState(INITIAL_RULES)
  const [search, setSearch] = useState('')
  const [groupFilter, setGroupFilter] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editRule, setEditRule] = useState(null)
  const [newRule, setNewRule] = useState({ name: '', description: '', action: 'BLOCK', group: 'Custom' })

  const filtered = rules.filter(r => {
    const matchSearch = r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.description.toLowerCase().includes(search.toLowerCase())
    const matchGroup = groupFilter === 'all' || r.group === groupFilter
    return matchSearch && matchGroup
  })

  function toggleRule(id) {
    setRules(prev => prev.map(r => r.id === id ? { ...r, status: !r.status } : r))
  }

  function deleteRule(id) {
    if (window.confirm('Delete this WAF rule? This action cannot be undone.')) {
      setRules(prev => prev.filter(r => r.id !== id))
    }
  }

  function addRule() {
    if (!newRule.name.trim()) return
    const id = `WR-${String(rules.length + 1).padStart(3, '0')}`
    setRules(prev => [...prev, {
      id, ...newRule, type: 'Custom', priority: prev.length + 1,
      status: true, hits: 0,
    }])
    setNewRule({ name: '', description: '', action: 'BLOCK', group: 'Custom' })
    setShowAddModal(false)
  }

  const groups = ['all', ...Array.from(new Set(INITIAL_RULES.map(r => r.group)))]

  const activeCount = rules.filter(r => r.status).length
  const disabledCount = rules.filter(r => !r.status).length

  return (
    <>
      <div className="page-title-row">
        <div>
          <h1 className="page-title">WAF Rules</h1>
          <p className="page-subtitle">Web Application Firewall rule management</p>
        </div>
        <button id="add-rule-btn" className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <PlusIcon /> Add Rule
        </button>
      </div>

      {/* Stats */}
      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '20px' }}>
        {[
          { label: 'Total Rules', value: rules.length, color: 'var(--text-primary)' },
          { label: 'Active', value: activeCount, color: 'var(--status-success)' },
          { label: 'Disabled', value: disabledCount, color: 'var(--status-warning)' },
          { label: 'Total Hits (24h)', value: rules.reduce((s, r) => s + r.hits, 0).toLocaleString(), color: 'var(--status-critical)' },
        ].map(({ label, value, color }) => (
          <div key={label} className="metric-card" style={{ '--accent-color': color }}>
            <div style={{ fontSize: '28px', fontWeight: 800, color, letterSpacing: '-0.03em' }}>{value}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <div className="search-input-wrap">
          <SearchIcon className="search-icon" />
          <input
            id="rules-search"
            type="text"
            className="search-input"
            placeholder="Search rules by name or description..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          id="group-filter"
          className="filter-select"
          value={groupFilter}
          onChange={e => setGroupFilter(e.target.value)}
        >
          {groups.map(g => (
            <option key={g} value={g}>{g === 'all' ? 'All Groups' : g}</option>
          ))}
        </select>
      </div>

      {/* Rules list */}
      <div className="card" style={{ padding: 0 }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>No rules match your filters</div>
        ) : filtered.map(rule => (
          <div key={rule.id} className="rule-item" style={{ padding: '16px 20px' }}>
            {/* Priority badge */}
            <div style={{
              width: 36, height: 36, borderRadius: 'var(--radius-md)',
              background: 'var(--surface-2)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontWeight: 800, fontSize: '13px',
              color: 'var(--accent)', flexShrink: 0,
            }}>
              {rule.priority}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span className="rule-name">{rule.name}</span>
                <span className={`badge ${rule.type === 'Managed' ? 'badge-info' : rule.type === 'Rate-based' ? 'badge-warning' : 'badge-neutral'}`}>
                  {rule.type}
                </span>
                <span className={`badge ${rule.action === 'BLOCK' ? 'badge-critical' : 'badge-warning'}`}>
                  {rule.action}
                </span>
              </div>
              <div className="rule-desc">{rule.description}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Group: {rule.group} &nbsp;·&nbsp; {rule.id} &nbsp;·&nbsp;
                <span style={{ color: 'var(--status-critical)' }}>{rule.hits.toLocaleString()} hits</span>
              </div>
            </div>

            {/* Toggle */}
            <label className="toggle" title={rule.status ? 'Disable rule' : 'Enable rule'} htmlFor={`toggle-${rule.id}`}>
              <input
                id={`toggle-${rule.id}`}
                type="checkbox"
                checked={rule.status}
                onChange={() => toggleRule(rule.id)}
              />
              <div className="toggle-track" />
              <div className="toggle-thumb" />
            </label>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
              <button
                id={`edit-rule-${rule.id}`}
                className="btn btn-ghost btn-sm"
                onClick={() => setEditRule(rule)}
              >
                Edit
              </button>
              <button
                id={`delete-rule-${rule.id}`}
                className="btn btn-danger btn-sm"
                onClick={() => deleteRule(rule.id)}
                disabled={rule.type === 'Managed'}
                title={rule.type === 'Managed' ? 'AWS Managed rules cannot be deleted' : ''}
                style={rule.type === 'Managed' ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '12px', padding: '12px 16px', background: 'var(--blue-50)', border: '1px dashed var(--blue-200)', borderRadius: 'var(--radius-md)', fontSize: '12px', color: 'var(--text-secondary)' }}>
        ⚡ <strong style={{ color: 'var(--accent)' }}>API Integration:</strong> Connect your Spring Boot API at{' '}
        <code className="font-mono" style={{ color: 'var(--status-info)' }}>/api/waf/rules</code>{' '}
        to persist rule changes to AWS WAF via the SDK. Toggle states and new rules are currently frontend-only.
      </div>

      {/* Add Rule Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Add WAF Rule</div>
            <p className="modal-body" style={{ marginBottom: '20px' }}>Create a custom WAF rule. Changes will be persisted via your Spring Boot API.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Rule Name *</label>
                <input
                  id="new-rule-name"
                  className="search-input"
                  style={{ paddingLeft: '12px', width: '100%' }}
                  placeholder="e.g. CustomSQLiBlock-v3"
                  value={newRule.name}
                  onChange={e => setNewRule(r => ({ ...r, name: e.target.value }))}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Description</label>
                <input
                  id="new-rule-desc"
                  className="search-input"
                  style={{ paddingLeft: '12px', width: '100%' }}
                  placeholder="Describe what this rule does..."
                  value={newRule.description}
                  onChange={e => setNewRule(r => ({ ...r, description: e.target.value }))}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Action</label>
                  <select id="new-rule-action" className="filter-select" style={{ width: '100%' }} value={newRule.action} onChange={e => setNewRule(r => ({ ...r, action: e.target.value }))}>
                    <option value="BLOCK">BLOCK</option>
                    <option value="COUNT">COUNT</option>
                    <option value="ALLOW">ALLOW</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Group</label>
                  <select id="new-rule-group" className="filter-select" style={{ width: '100%' }} value={newRule.group} onChange={e => setNewRule(r => ({ ...r, group: e.target.value }))}>
                    <option value="Custom">Custom</option>
                    <option value="Rate Limiting">Rate Limiting</option>
                    <option value="Geo Control">Geo Control</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button id="cancel-add-rule-btn" className="btn btn-ghost" onClick={() => setShowAddModal(false)}>Cancel</button>
              <button id="confirm-add-rule-btn" className="btn btn-primary" onClick={addRule} disabled={!newRule.name.trim()} style={!newRule.name.trim() ? { opacity: 0.5 } : {}}>
                Add Rule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Rule Modal */}
      {editRule && (
        <div className="modal-overlay" onClick={() => setEditRule(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Edit Rule</div>
            <p className="modal-body" style={{ marginBottom: '20px' }}>
              <code className="font-mono" style={{ color: 'var(--status-info)' }}>{editRule.id}</code> — {editRule.name}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Action</label>
                <select
                  id="edit-rule-action"
                  className="filter-select"
                  style={{ width: '100%' }}
                  value={editRule.action}
                  onChange={e => setEditRule(r => ({ ...r, action: e.target.value }))}
                >
                  <option value="BLOCK">BLOCK</option>
                  <option value="COUNT">COUNT</option>
                  <option value="ALLOW">ALLOW</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>Description</label>
                <input
                  id="edit-rule-desc"
                  className="search-input"
                  style={{ paddingLeft: '12px', width: '100%' }}
                  value={editRule.description}
                  onChange={e => setEditRule(r => ({ ...r, description: e.target.value }))}
                />
              </div>
            </div>
            <div className="modal-actions">
              <button id="cancel-edit-rule-btn" className="btn btn-ghost" onClick={() => setEditRule(null)}>Cancel</button>
              <button
                id="save-edit-rule-btn"
                className="btn btn-primary"
                onClick={() => {
                  setRules(prev => prev.map(r => r.id === editRule.id ? editRule : r))
                  setEditRule(null)
                }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function SearchIcon({ className }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}
