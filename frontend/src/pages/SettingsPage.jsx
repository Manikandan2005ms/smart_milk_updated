import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Save, RotateCcw, Settings2, ShieldCheck, Thermometer, FlaskConical } from 'lucide-react'
import api from '../utils/api'
import toast from 'react-hot-toast'

const GROUPS = [
  {
    title: 'Fat & SNF',
    icon: FlaskConical,
    color: 'text-emerald-400',
    bg: 'bg-emerald-900/20',
    fields: [
      { key: 'fat_min',  label: 'FAT Minimum (%)',   step: '0.01' },
      { key: 'fat_max',  label: 'FAT Maximum (%)',   step: '0.01' },
      { key: 'snf_min',  label: 'SNF Minimum (%)',   step: '0.01' },
      { key: 'snf_max',  label: 'SNF Maximum (%)',   step: '0.01' },
    ],
  },
  {
    title: 'pH & Acidity',
    icon: FlaskConical,
    color: 'text-blue-400',
    bg: 'bg-blue-900/20',
    fields: [
      { key: 'ph_min',       label: 'pH Minimum',        step: '0.01' },
      { key: 'ph_max',       label: 'pH Maximum',        step: '0.01' },
      { key: 'acidity_min',  label: 'Acidity Min (% LA)', step: '0.001' },
      { key: 'acidity_max',  label: 'Acidity Max (% LA)', step: '0.001' },
    ],
  },
  {
    title: 'Temperature',
    icon: Thermometer,
    color: 'text-orange-400',
    bg: 'bg-orange-900/20',
    fields: [
      { key: 'temp_ideal',       label: 'Ideal Temp Threshold (°C)',      step: '0.1' },
      { key: 'temp_acceptable',  label: 'Acceptable Temp Threshold (°C)', step: '0.1' },
      { key: 'raw_milk_temp_min', label: 'Raw Milk Temp Min (°C)',        step: '0.1' },
      { key: 'raw_milk_temp_max', label: 'Raw Milk Temp Max (°C)',        step: '0.1' },
    ],
  },
  {
    title: 'Specific Gravity & MBRT',
    icon: Settings2,
    color: 'text-purple-400',
    bg: 'bg-purple-900/20',
    fields: [
      { key: 'sg_min',    label: 'Specific Gravity Min', step: '0.0001' },
      { key: 'sg_max',    label: 'Specific Gravity Max', step: '0.0001' },
      { key: 'mbrt_good', label: 'MBRT Good Threshold (h)', step: '0.5' },
      { key: 'mbrt_check', label: 'MBRT Check Threshold (h)', step: '0.5' },
    ],
  },
  {
    title: 'System',
    icon: ShieldCheck,
    color: 'text-slate-400',
    bg: 'bg-slate-800/50',
    fields: [
      { key: 'company_name',    label: 'Company Name',           type: 'text' },
      { key: 'fraud_threshold', label: 'Fraud Flag Threshold (# of rejections)', step: '1' },
    ],
  },
]

const DEFAULTS = {
  fat_min: '3.2', fat_max: '3.5',
  snf_min: '8.3', snf_max: '8.5',
  ph_min: '6.5',  ph_max: '6.8',
  acidity_min: '0.10', acidity_max: '0.15',
  temp_ideal: '10', temp_acceptable: '15',
  raw_milk_temp_min: '25', raw_milk_temp_max: '37',
  sg_min: '1.028', sg_max: '1.032',
  mbrt_good: '3', mbrt_check: '2',
  company_name: 'DairyPure Quality Labs',
  fraud_threshold: '3',
}

export default function SettingsPage() {
  const [settings, setSettings] = useState(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get('/settings')
      .then(r => setSettings(prev => ({ ...prev, ...r.data })))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.post('/settings', settings)
      toast.success('Settings saved successfully')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setSettings(DEFAULTS)
    toast('Settings reset to defaults', { icon: '↩️' })
  }

  const set = (k, v) => setSettings(p => ({ ...p, [k]: v }))

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-milk-500 border-t-transparent rounded-full animate-spin"/>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-slate-400 text-sm">Configure quality thresholds and system parameters</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleReset} className="btn-secondary flex items-center gap-2">
            <RotateCcw size={15}/> Reset Defaults
          </button>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
            {saving
              ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
              : <Save size={15}/>
            }
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
        </div>
      </div>

      <div className="grid gap-5">
        {GROUPS.map(group => {
          const Icon = group.icon
          return (
            <motion.div
              key={group.title}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="card p-5 space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${group.bg}`}>
                  <Icon size={16} className={group.color}/>
                </div>
                <h3 className="font-semibold text-slate-200">{group.title}</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {group.fields.map(field => (
                  <div key={field.key}>
                    <label className="label text-xs">{field.label}</label>
                    <input
                      className="input text-sm py-2 font-mono"
                      type={field.type || 'number'}
                      step={field.step || '0.01'}
                      value={settings[field.key] ?? ''}
                      onChange={e => set(field.key, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Decision Logic Reference */}
      <div className="card p-5 border-slate-700/50">
        <h3 className="text-sm font-semibold text-slate-300 mb-4">Decision Logic Reference</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-emerald-900/20 border border-emerald-800/40 rounded-xl p-4">
            <p className="font-bold text-emerald-400 mb-2">✓ ACCEPT</p>
            <p className="text-slate-300">All parameters within acceptable ranges. No critical failures detected.</p>
          </div>
          <div className="bg-red-900/20 border border-red-800/40 rounded-xl p-4">
            <p className="font-bold text-red-400 mb-2">✗ REJECT</p>
            <ul className="text-slate-300 space-y-1">
              <li>• COB Test Positive</li>
              <li>• Alcohol Test Positive</li>
              <li>• Abnormal Organoleptic</li>
              <li>• Dirty Sediment</li>
              <li>• MBRT &lt; 2h</li>
              <li>• Raw Temp out of range</li>
              <li>• 3+ minor issues combined</li>
            </ul>
          </div>
          <div className="bg-amber-900/20 border border-amber-800/40 rounded-xl p-4">
            <p className="font-bold text-amber-400 mb-2">⚠ MANUAL CHECK</p>
            <ul className="text-slate-300 space-y-1">
              <li>• Temp 10–15°C</li>
              <li>• MBRT 2–3h</li>
              <li>• 1–2 minor parameter warnings</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
