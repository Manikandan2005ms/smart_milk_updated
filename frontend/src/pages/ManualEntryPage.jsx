import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FlaskConical, CheckCircle, XCircle, AlertTriangle, RotateCcw, ShieldAlert, Info } from 'lucide-react'
import api from '../utils/api'
import toast from 'react-hot-toast'

const EMPTY = {
  farmer_name: '', farmer_code: '', date: new Date().toISOString().slice(0,10),
  shift: 'morning', quantity: '',
  fat: '', snf: '', ph: '', acidity: '', temperature: '',
  specific_gravity: '', mbrt: '', raw_milk_temp: '',
  cob_test: 'negative', alcohol_test: 'negative',
  organoleptic: 'normal', sediment_test: 'clean',
}

function Field({ label, name, form, setForm, type = 'number', step = '0.001', placeholder = '' }) {
  return (
    <div>
      <label className="label text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5 ml-1 block">{label}</label>
      <input
        className="input py-2.5 text-sm"
        type={type} step={step}
        placeholder={placeholder}
        value={form[name]}
        onChange={e => setForm(p => ({ ...p, [name]: e.target.value }))}
      />
    </div>
  )
}

function SelectField({ label, name, form, setForm, options }) {
  return (
    <div>
      <label className="label text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5 ml-1 block">{label}</label>
      <select className="select py-2.5 text-sm" value={form[name]}
        onChange={e => setForm(p => ({ ...p, [name]: e.target.value }))}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

function ResultCard({ result }) {
  if (!result) return null
  const cfg = {
    accept:       { bg: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800', text: 'text-emerald-700 dark:text-emerald-400', icon: CheckCircle,   label: 'ACCEPTED' },
    reject:       { bg: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',         text: 'text-red-700 dark:text-red-400',     icon: XCircle,       label: 'REJECTED' },
    manual_check: { bg: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',     text: 'text-amber-700 dark:text-amber-400',   icon: AlertTriangle, label: 'MANUAL CHECK' },
  }[result.decision] || {}

  const Icon = cfg.icon
  const fraudColor = { low: 'text-slate-400', medium: 'text-orange-500 dark:text-orange-400', high: 'text-red-600 dark:text-red-400' }[result.fraud_risk]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`card border-2 p-6 sm:p-8 ${cfg.bg} shadow-xl relative overflow-hidden`}
    >
      {/* Decorative background icon */}
      <Icon size={120} className={`absolute -right-8 -bottom-8 opacity-5 dark:opacity-10 ${cfg.text}`}/>

      <div className="flex items-start gap-4 mb-6 relative z-10">
        <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center bg-white dark:bg-slate-900 shadow-sm border border-slate-100 dark:border-slate-800`}>
          <Icon size={32} className={cfg.text}/>
        </div>
        <div>
          <p className={`text-2xl sm:text-3xl font-black tracking-tight ${cfg.text}`}>{cfg.label}</p>
          <div className="flex flex-wrap items-center gap-3 mt-1">
             <p className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1">
              Fraud Risk: <span className={`font-black ${fraudColor}`}>{result.fraud_risk?.toUpperCase()}</span>
            </p>
            {result.ml_prediction !== 'unknown' && (
              <p className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1">
                ML Confidence: <span className="text-slate-800 dark:text-slate-200 font-black">{(result.ml_confidence * 100).toFixed(0)}%</span>
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-2.5 mb-8 relative z-10">
        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">System Analysis Notes</p>
        {result.reasons?.map((r, i) => (
          <div key={i} className="flex items-start gap-3 bg-white/50 dark:bg-black/10 p-3 rounded-xl border border-white/50 dark:border-white/5">
            <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${cfg.text.replace('text-', 'bg-')}`}/>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 leading-snug">{r}</span>
          </div>
        ))}
      </div>

      {/* Parameter flags */}
      {result.parameter_flags && (
        <div className="relative z-10">
           <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Quality Flags</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(result.parameter_flags).map(([k, v]) => {
              const c = { 
                pass: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800', 
                fail: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800', 
                warning: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800', 
                critical: 'bg-red-600 text-white font-black shadow-lg shadow-red-600/20' 
              }[v] || 'bg-slate-100 dark:bg-slate-800 text-slate-500'
              return (
                <span key={k} className={`text-[10px] px-3 py-1.5 rounded-lg border border-transparent uppercase font-bold tracking-wider ${c}`}>
                  {k.replace(/_/g, ' ')}: {v}
                </span>
              )
            })}
          </div>
        </div>
      )}
    </motion.div>
  )
}

export default function ManualEntryPage() {
  const [form, setForm] = useState(EMPTY)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const r = await api.post('/predict', form)
      setResult(r.data)
      toast.success(`Decision: ${r.data.decision.toUpperCase()}`)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Prediction failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5 sm:space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Manual Quality Check</h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm">Instant analysis for individual milk collections</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Form */}
        <div className="lg:col-span-3 space-y-5">
          {/* Section 1 */}
          <div className="card p-5 sm:p-6 space-y-5">
            <h3 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-3">
              <span className="w-7 h-7 rounded-xl bg-milk-600 text-white text-[10px] flex items-center justify-center font-black shadow-lg shadow-milk-600/20">1</span>
              Supplier & Collection Info
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Farmer Name" name="farmer_name" form={form} setForm={setForm} type="text" placeholder="e.g. John Doe"/>
              <Field label="Farmer Code" name="farmer_code" form={form} setForm={setForm} type="text" placeholder="e.g. MK-001"/>
              <div className="sm:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-4">
                <Field label="Date" name="date" form={form} setForm={setForm} type="date" step="1"/>
                <SelectField label="Shift" name="shift" form={form} setForm={setForm} options={[{value:'morning',label:'Morning'},{value:'evening',label:'Evening'}]}/>
                <Field label="Qty (L)" name="quantity" form={form} setForm={setForm} step="0.01" placeholder="0.0"/>
              </div>
            </div>
          </div>

          {/* Section 2 */}
          <div className="card p-5 sm:p-6 space-y-5">
            <h3 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-3">
               <span className="w-7 h-7 rounded-xl bg-indigo-600 text-white text-[10px] flex items-center justify-center font-black shadow-lg shadow-indigo-600/20">2</span>
              Core Lab Parameters
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Field label="FAT %" name="fat" form={form} setForm={setForm} placeholder="0.0"/>
              <Field label="SNF %" name="snf" form={form} setForm={setForm} placeholder="0.0"/>
              <Field label="pH Level" name="ph" form={form} setForm={setForm} step="0.01" placeholder="0.0"/>
              <Field label="Acidity" name="acidity" form={form} setForm={setForm} placeholder="0.0"/>
              <Field label="Temp (°C)" name="temperature" form={form} setForm={setForm} step="0.1" placeholder="0.0"/>
              <Field label="Sp. Gravity" name="specific_gravity" form={form} setForm={setForm} placeholder="0.0"/>
              <Field label="MBRT (hr)" name="mbrt" form={form} setForm={setForm} step="0.5" placeholder="0.0"/>
              <Field label="Raw Temp" name="raw_milk_temp" form={form} setForm={setForm} step="0.1" placeholder="0.0"/>
            </div>
          </div>

          {/* Section 3 */}
          <div className="card p-5 sm:p-6 space-y-5">
            <h3 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-3">
               <span className="w-7 h-7 rounded-xl bg-emerald-600 text-white text-[10px] flex items-center justify-center font-black shadow-lg shadow-emerald-600/20">3</span>
              Qualitative Tests
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <SelectField label="COB Test" name="cob_test" form={form} setForm={setForm}
                options={[{value:'negative',label:'Negative ✓'},{value:'positive',label:'Positive ✗'}]}/>
              <SelectField label="Alcohol Test" name="alcohol_test" form={form} setForm={setForm}
                options={[{value:'negative',label:'Negative ✓'},{value:'positive',label:'Positive ✗'}]}/>
              <SelectField label="Organoleptic" name="organoleptic" form={form} setForm={setForm}
                options={[{value:'normal',label:'Normal ✓'},{value:'abnormal',label:'Abnormal ✗'}]}/>
              <SelectField label="Sediment" name="sediment_test" form={form} setForm={setForm}
                options={[{value:'clean',label:'Clean ✓'},{value:'dirty',label:'Dirty ✗'}]}/>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="btn-primary flex-1 flex items-center justify-center gap-2 py-4 shadow-xl shadow-milk-600/20"
            >
              {loading
                ? <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"/>
                : <FlaskConical size={20}/>
              }
              <span className="font-black uppercase tracking-widest sm:text-sm">{loading ? 'Processing…' : 'Analyze & Verify'}</span>
            </button>
            <button
              onClick={() => { setForm(EMPTY); setResult(null) }}
              className="btn-secondary px-6 border border-slate-200 dark:border-slate-800"
              title="Reset form"
            >
              <RotateCcw size={20}/>
            </button>
          </div>
        </div>

        {/* Result Area */}
        <div className="lg:col-span-2 space-y-6">
          <AnimatePresence mode="wait">
            {result ? (
              <ResultCard key="result" result={result}/>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="card p-10 flex flex-col items-center justify-center text-center gap-5 h-full min-h-[300px] bg-slate-50/50 dark:bg-slate-900/30 border-dashed border-2 border-slate-200 dark:border-slate-800"
              >
                <div className="w-20 h-20 rounded-full bg-white dark:bg-slate-900 flex items-center justify-center shadow-inner">
                  <FlaskConical size={40} className="text-slate-300 dark:text-slate-700"/>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-300">Analysis Engine Ready</p>
                  <p className="text-xs text-slate-500 dark:text-slate-500 mt-2 max-w-[200px] mx-auto leading-relaxed">
                    Please provide the quality parameters on the left to generate an instant decision.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Quick reference */}
          <div className="card p-5 sm:p-6 bg-slate-50/50 dark:bg-slate-900/30 border-slate-200/60 dark:border-slate-800">
            <h4 className="text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest mb-5 flex items-center gap-2">
              <Info size={14}/> Quality Standard Reference
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-x-6 gap-y-3">
              {[
                ['FAT %', '3.2 – 3.5%'], ['SNF %', '8.3 – 8.5%'],
                ['pH Value', '6.5 – 6.8'], ['Acidity', '0.10 – 0.15%'],
                ['Temperature', '≤ 15°C'], ['Sp. Gravity', '1.028 – 1.032'],
                ['MBRT', '> 3h (Good)'], ['Raw Temp', '25 – 37°C'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800/50 pb-1.5">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{k}</span>
                  <span className="text-[11px] font-black text-slate-800 dark:text-slate-200 font-mono bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-100 dark:border-slate-800">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

