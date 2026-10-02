import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Alerts from './pages/Alerts'
import TrafficAnalysis from './pages/TrafficAnalysis'
import WAFRules from './pages/WAFRules'
import SecurityDemo from './pages/SecurityDemo'
import Settings from './pages/Settings'
import './App.css'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="alerts" element={<Alerts />} />
        <Route path="traffic" element={<TrafficAnalysis />} />
        <Route path="waf-rules" element={<WAFRules />} />
        <Route path="security-demo" element={<SecurityDemo />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  )
}
