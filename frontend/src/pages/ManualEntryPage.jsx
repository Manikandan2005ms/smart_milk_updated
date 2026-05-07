import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { FlaskConical, CheckCircle, XCircle, AlertTriangle, RotateCcw, Info, ChevronDown, ChevronUp } from 'lucide-react'
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

function evaluateLive(data, sys) {
  if (!sys) return null;
  const flags = {}
  const reasons = []
  
  const f = v => (v === '' || isNaN(v) ? null : parseFloat(v))
  const s = k => parseFloat(sys[k] || 0)
  
  const fat = f(data.fat)
  const snf = f(data.snf)
  const ph = f(data.ph)
  const acidity = f(data.acidity)
  const temp = f(data.temperature)
  const sg = f(data.specific_gravity)
  const mbrt = f(data.mbrt)
  const rawTemp = f(data.raw_milk_temp)

  if (fat !== null) {
    if (fat < s('fat_min') || fat > s('fat_max')) { flags.fat = 'fail'; reasons.push(`FAT ${fat}% out of range (${s('fat_min')}-${s('fat_max')})`) }
    else flags.fat = 'pass'
  }
  if (snf !== null) {
    if (snf < s('snf_min') || snf > s('snf_max')) { flags.snf = 'fail'; reasons.push(`SNF ${snf}% out of range (${s('snf_min')}-${s('snf_max')})`) }
    else flags.snf = 'pass'
  }
  if (ph !== null) {
    if (ph < s('ph_min') || ph > s('ph_max')) { flags.ph = 'fail'; reasons.push(`pH ${ph} out of range (${s('ph_min')}-${s('ph_max')})`) }
    else flags.ph = 'pass'
  }
  if (acidity !== null) {
    if (acidity < s('acidity_min') || acidity > s('acidity_max')) { flags.acidity = 'fail'; reasons.push(`Acidity ${acidity}% out of range (${s('acidity_min')}-${s('acidity_max')})`) }
    else flags.acidity = 'pass'
  }
  if (temp !== null) {
    if (temp > s('temp_acceptable')) { flags.temperature = 'fail'; reasons.push(`Temp ${temp}°C too high (>${s('temp_acceptable')})`) }
    else flags.temperature = 'pass'
  }
  if (sg !== null) {
    if (sg < s('sg_min') || sg > s('sg_max')) { flags.specific_gravity = 'fail'; reasons.push(`Sp. Gravity ${sg} out of range (${s('sg_min')}-${s('sg_max')})`) }
    else flags.specific_gravity = 'pass'
  }
  
  if (data.cob_test === 'positive') { flags.cob_test = 'fail'; reasons.push('COB Positive (Reject)') }
  else if (data.cob_test) flags.cob_test = 'pass'
  
  if (data.alcohol_test === 'positive') { flags.alcohol_test = 'warning'; reasons.push('Alcohol Positive (Warning)') }
  else if (data.alcohol_test) flags.alcohol_test = 'pass'
  
  if (data.organoleptic === 'abnormal') { flags.organoleptic = 'warning'; reasons.push('Organoleptic Abnormal (Warning)') }
  else if (data.organoleptic) flags.organoleptic = 'pass'
  
  if (data.sediment_test === 'dirty') { flags.sediment_test = 'warning'; reasons.push('Sediment Dirty (Warning)') }
  else if (data.sediment_test) flags.sediment_test = 'pass'

  if (mbrt !== null) {
    if (mbrt < s('mbrt_check') || mbrt < 2.0) { flags.mbrt = 'fail'; reasons.push(`MBRT ${mbrt}h too low (<${s('mbrt_check') || 2.0})`) }
    else flags.mbrt = 'pass'
  }
  if (rawTemp !== null) {
    if (rawTemp < s('raw_milk_temp_min') || rawTemp > s('raw_milk_temp_max')) { flags.raw_milk_temp = 'warning'; reasons.push(`Raw Temp ${rawTemp}°C out of range (${s('raw_milk_temp_min')}-${s('raw_milk_temp_max')})`) }
    else flags.raw_milk_temp = 'pass'
  }

  const hasFail = Object.values(flags).some(f => f === 'fail' || f === 'critical');
  const decision = hasFail ? 'reject' : 'accept';
  return { decision, reasons, parameter_flags: flags, isLive: true }
}

function ResultCard({ result }) {
  if (!result) return null
  const isAccept = result.decision === 'accept'
  const cfg = isAccept 
    ? { bg: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800', text: 'text-emerald-700 dark:text-emerald-400', icon: CheckCircle,  label: 'ACCEPTED' }
    : { bg: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800', text: 'text-red-700 dark:text-red-400', icon: XCircle, label: 'REJECTED' }

  const Icon = cfg.icon
  const fraudColor = { low: 'text-slate-400', medium: 'text-orange-500 dark:text-orange-400', high: 'text-red-600 dark:text-red-400' }[result.fraud_risk || 'low']

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`card border-2 p-6 sm:p-8 ${cfg.bg} shadow-xl relative overflow-hidden`}
    >
      {result.isLive && (
        <div className="absolute top-4 right-4 bg-amber-100 text-amber-700 px-2 py-1 rounded text-[10px] font-bold tracking-wider animate-pulse">LIVE PREVIEW</div>
      )}
      
      <Icon size={120} className={`absolute -right-8 -bottom-8 opacity-5 dark:opacity-10 ${cfg.text}`}/>

      <div className="flex items-start gap-4 mb-6 relative z-10">
        <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center bg-white dark:bg-slate-900 shadow-sm border border-slate-100 dark:border-slate-800`}>
          <Icon size={32} className={cfg.text}/>
        </div>
        <div>
          <p className={`text-2xl sm:text-3xl font-black tracking-tight ${cfg.text}`}>{cfg.label}</p>
          <div className="flex flex-wrap items-center gap-3 mt-1">
             {!result.isLive && result.fraud_risk && (
               <p className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1">
                Fraud Risk: <span className={`font-black ${fraudColor}`}>{result.fraud_risk?.toUpperCase()}</span>
              </p>
             )}
            {!result.isLive && result.ml_prediction && result.ml_prediction !== 'unknown' && (
              <p className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1">
                ML Confidence: <span className="text-slate-800 dark:text-slate-200 font-black">{(result.ml_confidence * 100).toFixed(0)}%</span>
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-2.5 mb-8 relative z-10">
        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Analysis Notes</p>
        {result.reasons?.length === 0 ? (
          <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">All parameters within acceptable ranges.</p>
        ) : (
          result.reasons?.map((r, i) => (
            <div key={i} className="flex items-start gap-3 bg-white/50 dark:bg-black/10 p-3 rounded-xl border border-white/50 dark:border-white/5">
              <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${cfg.text.replace('text-', 'bg-')}`}/>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 leading-snug">{r}</span>
            </div>
          ))
        )}
      </div>

      {result.parameter_flags && Object.keys(result.parameter_flags).length > 0 && (
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
  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm({ defaultValues: EMPTY })
  const [serverResult, setServerResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [livePreview, setLivePreview] = useState(null)
  const [settings, setSettings] = useState(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  
  const formValues = watch()

  useEffect(() => {
    api.get('/settings').then(r => setSettings(r.data)).catch(console.error)
  }, [])

  useEffect(() => {
    // Only show live preview if there's no server result yet
    if (!serverResult && settings) {
      // Don't show preview if form is completely empty
      const hasValues = Object.values(formValues).some(v => v !== '' && v !== 'negative' && v !== 'normal' && v !== 'clean' && v !== 'morning' && !v.includes('T'))
      if (hasValues) {
        setLivePreview(evaluateLive(formValues, settings))
      } else {
        setLivePreview(null)
      }
    }
  }, [formValues, serverResult, settings])

  const onSubmit = async (data) => {
    setLoading(true)
    setServerResult(null)
    try {
      const r = await api.post('/predict', data)
      setServerResult(r.data)
      toast.success(`Entry saved successfully! Decision: ${r.data.decision.toUpperCase()}`)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Entry submission failed')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    reset(EMPTY)
    setServerResult(null)
    setLivePreview(null)
  }

  const displayResult = serverResult || livePreview

  // Helper to determine border color
  const getBorderColor = (name) => {
    if (errors[name]) return 'border-red-500 focus:ring-red-500'
    const flag = displayResult?.parameter_flags?.[name]
    if (flag === 'fail' || flag === 'critical') return 'border-red-500 focus:ring-red-500 text-red-700 bg-red-50 dark:bg-red-900/10'
    if (flag === 'pass') return 'border-emerald-500 focus:ring-emerald-500 text-emerald-700 bg-emerald-50 dark:bg-emerald-900/10'
    return ''
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5 sm:space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Manual Entry</h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm">Live validation & instant quality checks</p>
        </div>
        {serverResult && (
          <span className="badge-primary px-3 py-1 font-bold">Entry Mode: Manual</span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <form onSubmit={handleSubmit(onSubmit)} className="lg:col-span-3 space-y-5">
          <div className="card p-5 sm:p-6 space-y-5">
            <h3 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-3">
               <span className="w-7 h-7 rounded-xl bg-indigo-600 text-white text-[10px] flex items-center justify-center font-black shadow-lg shadow-indigo-600/20">1</span>
              Core Parameters (Mandatory *)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {['fat', 'snf', 'ph', 'acidity', 'temperature', 'specific_gravity', 'mbrt'].map(field => (
                <div key={field}>
                  <label className="label text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5 ml-1 block">
                    {field.replace(/_/g, ' ')} *
                  </label>
                  <input type="number" step="0.001" className={`input py-2.5 text-sm ${getBorderColor(field)}`} {...register(field, { required: true })} placeholder="0.0"/>
                </div>
              ))}
              <div>
                <label className="label text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5 ml-1 block">COB Test *</label>
                <select className={`select py-2.5 text-sm ${getBorderColor('cob_test')}`} {...register('cob_test', { required: true })}>
                  <option value="negative">Negative ✓</option>
                  <option value="positive">Positive ✗</option>
                </select>
              </div>
            </div>
          </div>

          <div className="card p-0 overflow-hidden border border-slate-200/60 dark:border-slate-800">
            <button 
              type="button" 
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full p-4 sm:p-5 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/30 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors"
            >
              <h3 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-3">
                <span className="w-7 h-7 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] flex items-center justify-center font-black">2</span>
                Optional Details (Farmer & Advanced Tests)
              </h3>
              {showAdvanced ? <ChevronUp size={20} className="text-slate-400"/> : <ChevronDown size={20} className="text-slate-400"/>}
            </button>
            
            <AnimatePresence>
              {showAdvanced && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }} 
                  animate={{ height: 'auto', opacity: 1 }} 
                  exit={{ height: 0, opacity: 0 }}
                  className="px-5 pb-5 sm:px-6 sm:pb-6 space-y-5 border-t border-slate-200/60 dark:border-slate-800"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="label text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5 ml-1 block">Farmer Name</label>
                      <input className={`input py-2.5 text-sm ${getBorderColor('farmer_name')}`} {...register('farmer_name')} placeholder="e.g. John Doe"/>
                    </div>
                    <div>
                      <label className="label text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5 ml-1 block">Farmer Code</label>
                      <input className={`input py-2.5 text-sm ${getBorderColor('farmer_code')}`} {...register('farmer_code')} placeholder="e.g. MK-001"/>
                    </div>
                    <div className="sm:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="label text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5 ml-1 block">Date</label>
                        <input type="date" className={`input py-2.5 text-sm ${getBorderColor('date')}`} {...register('date')} />
                      </div>
                      <div>
                        <label className="label text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5 ml-1 block">Shift</label>
                        <select className={`select py-2.5 text-sm ${getBorderColor('shift')}`} {...register('shift')}>
                          <option value="morning">Morning</option>
                          <option value="evening">Evening</option>
                        </select>
                      </div>
                      <div>
                        <label className="label text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5 ml-1 block">Qty (L)</label>
                        <input type="number" step="0.01" className={`input py-2.5 text-sm ${getBorderColor('quantity')}`} {...register('quantity')} placeholder="0.0"/>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800/50">
                    <div>
                      <label className="label text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5 ml-1 block">Alcohol Test</label>
                      <select className={`select py-2.5 text-sm ${getBorderColor('alcohol_test')}`} {...register('alcohol_test')}>
                        <option value="negative">Negative ✓</option>
                        <option value="positive">Positive ✗</option>
                      </select>
                    </div>
                    <div>
                      <label className="label text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5 ml-1 block">Organoleptic</label>
                      <select className={`select py-2.5 text-sm ${getBorderColor('organoleptic')}`} {...register('organoleptic')}>
                        <option value="normal">Normal ✓</option>
                        <option value="abnormal">Abnormal ✗</option>
                      </select>
                    </div>
                    <div>
                      <label className="label text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5 ml-1 block">Sediment</label>
                      <select className={`select py-2.5 text-sm ${getBorderColor('sediment_test')}`} {...register('sediment_test')}>
                        <option value="clean">Clean ✓</option>
                        <option value="dirty">Dirty ✗</option>
                      </select>
                    </div>
                    <div>
                      <label className="label text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5 ml-1 block">Raw Milk Temp</label>
                      <input type="number" step="0.1" className={`input py-2.5 text-sm ${getBorderColor('raw_milk_temp')}`} {...register('raw_milk_temp')} placeholder="0.0"/>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex-1 flex items-center justify-center gap-2 py-4 shadow-xl shadow-milk-600/20"
            >
              {loading
                ? <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"/>
                : <CheckCircle size={20}/>
              }
              <span className="font-black uppercase tracking-widest sm:text-sm">{loading ? 'Saving...' : 'Verify & Save'}</span>
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="btn-secondary px-6 border border-slate-200 dark:border-slate-800"
              title="Reset form"
            >
              <RotateCcw size={20}/>
            </button>
          </div>
        </form>

        <div className="lg:col-span-2 space-y-6">
          <AnimatePresence mode="wait">
            {displayResult ? (
              <ResultCard key={displayResult.isLive ? 'live' : 'server'} result={displayResult}/>
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
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-300">Live Prediction Engine</p>
                  <p className="text-xs text-slate-500 dark:text-slate-500 mt-2 max-w-[200px] mx-auto leading-relaxed">
                    Start entering values to see real-time analysis. Click Verify & Save to commit the record.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="card p-5 sm:p-6 bg-slate-50/50 dark:bg-slate-900/30 border-slate-200/60 dark:border-slate-800">
            <h4 className="text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest mb-5 flex items-center gap-2">
              <Info size={14}/> Quality Standard Reference
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-x-6 gap-y-3">
              {settings ? [
                ['FAT %', `${settings.fat_min} – ${settings.fat_max}%`],
                ['SNF %', `${settings.snf_min} – ${settings.snf_max}%`],
                ['pH Value', `${settings.ph_min} – ${settings.ph_max}`],
                ['Acidity', `${settings.acidity_min} – ${settings.acidity_max}%`],
                ['Temperature', `≤ ${settings.temp_acceptable}°C`],
                ['Sp. Gravity', `${settings.sg_min} – ${settings.sg_max}`],
                ['MBRT', `> ${settings.mbrt_good}h`],
                ['Raw Temp', `${settings.raw_milk_temp_min} – ${settings.raw_milk_temp_max}°C`],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800/50 pb-1.5">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{k}</span>
                  <span className="text-[11px] font-black text-slate-800 dark:text-slate-200 font-mono bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-100 dark:border-slate-800">{v}</span>
                </div>
              )) : (
                <div className="py-4 flex justify-center"><div className="w-5 h-5 border-2 border-milk-500 border-t-transparent rounded-full animate-spin"></div></div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
