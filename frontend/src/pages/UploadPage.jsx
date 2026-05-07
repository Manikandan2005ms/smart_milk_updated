import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, FileSpreadsheet, X, CheckCircle, XCircle, AlertTriangle, Loader2, Info, ShieldAlert, FileText, FileText as FileTextIcon, File as FileIcon } from 'lucide-react'
import api from '../utils/api'
import toast from 'react-hot-toast'

function DecisionBadge({ decision }) {
  const c = { accept: 'badge-accept', reject: 'badge-reject' }[decision]
  const label = { accept: 'Accept', reject: 'Reject' }[decision]
  return <span className={`${c} whitespace-nowrap`}>{label}</span>
}

export default function UploadPage() {
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState(null)
  const [isConfirmed, setIsConfirmed] = useState(false)
  const [sessionName, setSessionName] = useState('')
  const navigate = useNavigate()

  const onDrop = useCallback(files => {
    const f = files[0]
    if (!f) return
    const ext = f.name.split('.').pop().toLowerCase()
    if (!['xlsx', 'xls', 'csv', 'pdf', 'txt'].includes(ext)) {
      toast.error('Only .xlsx, .xls, .csv, .pdf, .txt files allowed')
      return
    }
    setFile(f)
    setResult(null)
    setIsConfirmed(false)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, multiple: false, accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
    }
  })

  const handleUpload = async (isPreview = true) => {
    if (!file) return
    setUploading(true)
    setProgress(10)
    const fd = new FormData()
    fd.append('file', file)
    if (sessionName) fd.append('session_name', sessionName)
    if (isPreview) fd.append('preview', 'true')
    try {
      setProgress(40)
      const r = await api.post('/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: e => setProgress(Math.min(80, Math.round(e.loaded / e.total * 80))),
      })
      setProgress(100)
      setResult(r.data)
      if (!isPreview) {
        setIsConfirmed(true)
        toast.success(`Processed & Saved ${r.data.total_rows} rows successfully`)
      } else {
        toast.success(`Preview generated successfully`)
      }
    } catch (err) {
      if (err.response?.data?.details?.length > 0) {
        toast.error(err.response.data.details[0])
      } else {
        toast.error(err.response?.data?.error || 'Upload failed')
      }
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5 sm:space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Batch Upload</h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm">Process milk records from Excel or CSV files</p>
        </div>
      </div>

      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={`card border-2 border-dashed p-8 sm:p-14 text-center cursor-pointer transition-all duration-300
          ${isDragActive 
            ? 'border-milk-500 bg-milk-50 dark:bg-milk-900/10' 
            : 'border-slate-200 dark:border-slate-800 hover:border-milk-400 dark:hover:border-milk-600 hover:bg-slate-50 dark:hover:bg-slate-800/30'}`}
      >
        <input {...getInputProps()}/>
        <div className="flex flex-col items-center gap-4">
          <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-sm
            ${isDragActive ? 'bg-milk-600 text-white scale-110' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'}`}>
            {file
              ? <FileSpreadsheet size={28} className="text-emerald-500 dark:text-emerald-400"/>
              : <Upload size={28} className={isDragActive ? 'text-white' : ''}/>
            }
          </div>
          {file ? (
            <div>
              <p className="font-bold text-slate-800 dark:text-white sm:text-lg">{file.name}</p>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-500 font-medium">{(file.size / 1024).toFixed(1)} KB — Ready to upload</p>
            </div>
          ) : (
            <div className="max-w-xs">
              <p className="font-bold text-slate-700 dark:text-slate-200">Drag & Drop your file here</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">Excel, CSV, PDF, or TXT files are supported. Max size 10MB.</p>
            </div>
          )}
        </div>
      </div>
      
      {file && (
        <div className="card p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">Session Name (Optional)</label>
            <input 
              type="text" 
              className="input text-sm w-full" 
              placeholder="e.g. Morning Collection - North Zone" 
              value={sessionName} 
              onChange={e => setSessionName(e.target.value)}
            />
          </div>
        </div>
      )}

      {file && !result && (
        <div className="flex flex-col sm:flex-row gap-3">
          <button onClick={() => handleUpload(true)} disabled={uploading} className="btn-primary flex items-center justify-center gap-2 px-10 py-3 shadow-lg shadow-milk-600/20">
            {uploading
              ? <Loader2 size={18} className="animate-spin"/>
              : <FileTextIcon size={18}/>
            }
            <span className="font-bold uppercase tracking-wider text-xs">{uploading ? 'Generating Preview…' : 'Generate Preview'}</span>
          </button>
          <button onClick={() => { setFile(null); setResult(null); setProgress(0); setIsConfirmed(false) }}
            className="btn-secondary flex items-center justify-center gap-2 px-6 py-3 border border-slate-200 dark:border-slate-800">
            <X size={18}/> <span className="font-bold uppercase tracking-wider text-xs">Cancel</span>
          </button>
        </div>
      )}

      {/* Progress */}
      <AnimatePresence>
        {uploading && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3 card p-4">
            <div className="flex justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
              <span>Extracting and validating data…</span>
              <span className="text-milk-600 dark:text-milk-400">{progress}%</span>
            </div>
            <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-200 dark:border-slate-700">
              <motion.div
                className="h-full bg-gradient-to-r from-milk-600 via-milk-500 to-milk-400 rounded-full shadow-[0_0_10px_rgba(58,163,246,0.5)]"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results summary */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-5 sm:space-y-6"
          >
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              {[
                { label: 'Total Rows',    value: result.total_rows,    color: 'text-slate-900 dark:text-white', bg: 'bg-slate-100 dark:bg-slate-800' },
                { label: 'Accepted',      value: result.accepted,      color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
                { label: 'Rejected',      value: result.rejected,      color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' },
              ].map(s => (
                <div key={s.label} className={`card p-4 sm:p-5 text-center flex flex-col items-center justify-center`}>
                  <p className={`text-2xl sm:text-3xl font-black ${s.color}`}>{s.value}</p>
                  <p className="text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-widest mt-1.5">{s.label}</p>
                </div>
              ))}
            </div>

            {result.fraud_alerts > 0 && (
              <div className="card border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 p-4 flex items-center gap-4 shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/40 flex items-center justify-center flex-shrink-0">
                  <ShieldAlert size={20} className="text-red-600 dark:text-red-400"/>
                </div>
                <div>
                  <p className="text-sm font-bold text-red-800 dark:text-red-200">
                    {result.fraud_alerts} potential fraud alerts detected
                  </p>
                  <p className="text-xs text-red-600 dark:text-red-400 font-medium mt-0.5">Please review the records carefully before final submission.</p>
                </div>
              </div>
            )}

            {/* Preview table */}
            <div className="card overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/30">
                <h3 className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Info size={14}/> {isConfirmed ? `Processed (Batch: ${result.batch_id})` : 'Preview Mode'}
                </h3>
              </div>
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
                      {['Farmer', 'Code', 'Date', 'Shift', 'Decision', 'Fraud', 'Reasons'].map(h => (
                        <th key={h} className="text-left px-4 py-3.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                    {result.rows?.slice(0, 20).map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3 text-slate-800 dark:text-slate-200 font-bold max-w-[140px] truncate">{row.farmer_name}</td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400 font-mono text-xs font-semibold">{row.farmer_code}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400 text-xs font-medium">{row.date}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400 capitalize text-xs font-bold">{row.shift}</td>
                        <td className="px-4 py-3"><DecisionBadge decision={row.decision}/></td>
                        <td className="px-4 py-3">
                          <span className={`text-[11px] font-black tracking-wider ${
                            row.fraud_risk === 'high' ? 'text-red-600 dark:text-red-400' :
                            row.fraud_risk === 'medium' ? 'text-orange-600 dark:text-orange-400' : 'text-slate-400'
                          }`}>{row.fraud_risk?.toUpperCase()}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-500 text-xs max-w-xs truncate font-medium">
                          {row.reasons?.[0] || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {result.rows?.length > 20 && (
                  <div className="px-5 py-3 text-center border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                     <p className="text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-widest">
                      Showing 20 of {result.rows.length} rows. Full results are available in Records.
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex justify-end pt-2 gap-3">
              {!isConfirmed ? (
                <>
                  <button onClick={() => { setFile(null); setResult(null); setProgress(0); setIsConfirmed(false) }}
                    className="btn-secondary flex items-center justify-center gap-2 px-6 py-3 border border-slate-200 dark:border-slate-800">
                    <X size={18}/> <span className="font-bold uppercase tracking-wider text-xs">Cancel</span>
                  </button>
                  <button onClick={() => handleUpload(false)} disabled={uploading}
                    className="btn-primary flex items-center justify-center gap-2 px-8 py-3 bg-emerald-600 hover:bg-emerald-500 border-emerald-600 text-white shadow-emerald-600/20">
                    {uploading ? <Loader2 size={18} className="animate-spin"/> : <CheckCircle size={18}/>}
                    <span className="font-bold uppercase tracking-wider text-xs">{uploading ? 'Saving...' : 'Confirm & Save Data'}</span>
                  </button>
                </>
              ) : (
                <button onClick={() => navigate(`/records?batch_id=${result.batch_id}`)}
                  className="btn-primary flex items-center justify-center gap-2 px-8 py-3">
                  <FileText size={18}/>
                  <span className="font-bold uppercase tracking-wider text-xs">View Full Batch Records</span>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Format guide */}
      <div className="card p-5 sm:p-6 bg-slate-50/50 dark:bg-slate-900/30 border-slate-200/60 dark:border-slate-800 space-y-5">
        <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-300 flex items-center gap-2 uppercase tracking-wider">
           <Info size={16} className="text-milk-600 dark:text-milk-400"/> Expected Column Headers
        </h4>
        
        <div>
          <p className="text-[10px] font-black text-red-500 dark:text-red-400 uppercase tracking-widest mb-2">Required Parameters *</p>
          <div className="flex flex-wrap gap-2 sm:gap-2.5">
            {['fat', 'snf', 'ph', 'acidity', 'temperature', 'specific_gravity', 'mbrt', 'cob_test'].map(h => (
              <span key={h} className="px-2.5 py-1.5 bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-300 rounded-lg text-[10px] font-bold font-mono border border-red-200 dark:border-red-900/50 shadow-sm">{h}</span>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Optional Parameters</p>
          <div className="flex flex-wrap gap-2 sm:gap-2.5">
            {['alcohol_test', 'organoleptic', 'sediment_test', 'raw_milk_temp', 'quantity', 'farmer_name', 'farmer_code', 'date', 'shift'].map(h => (
              <span key={h} className="px-2.5 py-1.5 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 rounded-lg text-[10px] font-bold font-mono border border-slate-200 dark:border-slate-800 shadow-sm">{h}</span>
            ))}
          </div>
        </div>

        <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-500 mt-5 font-medium leading-relaxed">
          <span className="font-bold text-slate-700 dark:text-slate-300">Note:</span> Missing optional columns are fine. Column names are flexible. Common aliases like "FAT %", "Sp Gravity", "Temp" are automatically detected.
        </p>
      </div>
    </div>
  )
}
