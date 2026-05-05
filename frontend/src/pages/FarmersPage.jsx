import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Search, ShieldAlert, ChevronRight, UserCircle } from 'lucide-react'
import api from '../utils/api'

export default function FarmersPage() {
  const [farmers, setFarmers] = useState([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [fraudOnly, setFraudOnly] = useState(false)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const fetch = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page, per_page: 30, search, fraud_only: fraudOnly })
      const r = await api.get(`/farmers?${params}`)
      setFarmers(r.data.farmers)
      setTotal(r.data.total)
      setPages(r.data.pages)
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetch() }, [page, search, fraudOnly])

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Farmers</h1>
          <p className="text-slate-400 text-sm">{total} registered suppliers</p>
        </div>
      </div>

      <div className="card p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/>
          <input className="input pl-8 text-sm py-2" placeholder="Search by name or code…"
            value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}/>
        </div>
        <button
          onClick={() => { setFraudOnly(p => !p); setPage(1) }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-colors
            ${fraudOnly ? 'bg-red-900/30 border-red-600/50 text-red-300' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'}`}
        >
          <ShieldAlert size={15}/>
          Fraud Flagged Only
        </button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/60">
              {['Farmer', 'Code', 'Location', 'Submissions', 'Accepted', 'Rejected', 'Avg FAT', 'Avg SNF', 'Fraud', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} className="text-center py-12">
                <div className="inline-block w-6 h-6 border-2 border-milk-500 border-t-transparent rounded-full animate-spin"/>
              </td></tr>
            ) : farmers.length === 0 ? (
              <tr><td colSpan={10} className="text-center py-12 text-slate-500">No farmers found</td></tr>
            ) : farmers.map(f => (
              <motion.tr key={f.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors cursor-pointer"
                onClick={() => navigate(`/farmers/${f.id}`)}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-milk-600 to-milk-800 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {f.full_name[0]?.toUpperCase()}
                    </div>
                    <span className="text-slate-200 font-medium">{f.full_name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-400 font-mono text-xs">{f.farmer_code}</td>
                <td className="px-4 py-3 text-slate-400 text-xs">{f.village || f.district || '—'}</td>
                <td className="px-4 py-3 text-slate-300 font-semibold">{f.total_submissions}</td>
                <td className="px-4 py-3 text-emerald-400 font-semibold">{f.total_accepted}</td>
                <td className="px-4 py-3 text-red-400 font-semibold">{f.total_rejected}</td>
                <td className="px-4 py-3 text-slate-300 font-mono">{f.avg_fat?.toFixed(2) ?? '—'}</td>
                <td className="px-4 py-3 text-slate-300 font-mono">{f.avg_snf?.toFixed(2) ?? '—'}</td>
                <td className="px-4 py-3">
                  {f.fraud_flag
                    ? <span className="badge-high flex items-center gap-1"><ShieldAlert size={11}/> FLAGGED</span>
                    : <span className="badge-low">Clear</span>
                  }
                </td>
                <td className="px-4 py-3"><ChevronRight size={16} className="text-slate-600"/></td>
              </motion.tr>
            ))}
          </tbody>
        </table>
        {pages > 1 && (
          <div className="px-4 py-3 border-t border-slate-800 flex justify-between items-center">
            <p className="text-xs text-slate-500">Page {page} of {pages}</p>
            <div className="flex gap-1">
              <button disabled={page === 1} onClick={() => setPage(p => p-1)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 disabled:opacity-40 text-xs hover:bg-slate-700 transition-colors">Prev</button>
              <button disabled={page === pages} onClick={() => setPage(p => p+1)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 disabled:opacity-40 text-xs hover:bg-slate-700 transition-colors">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
