import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Search, Filter, ChevronLeft, ChevronRight, Eye, Calendar, Clock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../utils/api'

function DecisionBadge({ d }) {
  const c = { accept: 'badge-accept', reject: 'badge-reject', manual_check: 'badge-manual' }[d] || 'badge-low'
  const l = { accept: 'Accept', reject: 'Reject', manual_check: 'Manual Check' }[d] || d
  return <span className={`${c} whitespace-nowrap`}>{l}</span>
}
function FraudBadge({ r }) {
  const c = { high: 'badge-high', medium: 'badge-medium', low: 'badge-low' }[r] || 'badge-low'
  return <span className={`${c} whitespace-nowrap`}>{r?.toUpperCase()}</span>
}

export default function RecordsPage() {
  const [records, setRecords] = useState([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({ decision: '', shift: '', date_from: '', date_to: '', search: '' })
  const navigate = useNavigate()

  const fetchRecords = async (pg = page) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: pg, per_page: 30, ...Object.fromEntries(Object.entries(filters).filter(([,v]) => v)) })
      const r = await api.get(`/records?${params}`)
      setRecords(r.data.records)
      setTotal(r.data.total)
      setPages(r.data.pages)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchRecords(1); setPage(1) }, [filters])
  useEffect(() => { fetchRecords(page) }, [page])

  const setFilter = (k, v) => setFilters(p => ({ ...p, [k]: v }))

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Quality Records</h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-medium">{total.toLocaleString()} total entries found</p>
        </div>
        <div className="flex items-center gap-2">
           <button onClick={() => setFilters({ decision:'', shift:'', date_from:'', date_to:'', search:'' })}
             className="btn-secondary text-xs py-2 px-4 w-full sm:w-auto">Reset Filters</button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-3 sm:p-4 flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input className="input pl-10 text-sm py-2.5" placeholder="Farmer name or code…"
            value={filters.search} onChange={e => setFilter('search', e.target.value)}/>
        </div>
        <div className="grid grid-cols-2 sm:flex gap-2">
          <select className="select flex-1 sm:w-40 text-sm py-2.5" value={filters.decision}
            onChange={e => setFilter('decision', e.target.value)}>
            <option value="">Decisions</option>
            <option value="accept">Accept</option>
            <option value="reject">Reject</option>
            <option value="manual_check">Manual</option>
          </select>
          <select className="select flex-1 sm:w-36 text-sm py-2.5" value={filters.shift}
            onChange={e => setFilter('shift', e.target.value)}>
            <option value="">All Shifts</option>
            <option value="morning">Morning</option>
            <option value="evening">Evening</option>
          </select>
        </div>
        <div className="grid grid-cols-2 sm:flex gap-2">
          <div className="relative flex-1 sm:w-40">
            <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
            <input type="date" className="input pl-9 text-xs sm:text-sm py-2.5" value={filters.date_from}
              onChange={e => setFilter('date_from', e.target.value)}/>
          </div>
          <div className="relative flex-1 sm:w-40">
            <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
            <input type="date" className="input pl-9 text-xs sm:text-sm py-2.5" value={filters.date_to}
              onChange={e => setFilter('date_to', e.target.value)}/>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
                {['ID','Farmer','Code','Date','Shift','FAT','SNF','pH','Acidity','Temp','MBRT','COB','Alcohol','Decision','Fraud','Reasons',''].map(h => (
                  <th key={h} className="text-left px-4 py-4 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {loading ? (
                <tr><td colSpan={17} className="text-center py-20 text-slate-500">
                  <div className="inline-block w-10 h-10 border-3 border-milk-500 border-t-transparent rounded-full animate-spin"/>
                </td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={17} className="text-center py-20 text-slate-500 font-bold">No records found matching filters</td></tr>
              ) : records.map(r => (
                <motion.tr
                  key={r.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group"
                >
                  <td className="px-4 py-3.5 text-slate-400 dark:text-slate-500 font-mono text-[10px]">{r.id}</td>
                  <td className="px-4 py-3.5 text-slate-800 dark:text-slate-200 font-bold max-w-[160px] truncate">{r.farmer_name}</td>
                  <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400 font-mono text-xs font-semibold uppercase">{r.farmer_code || '—'}</td>
                  <td className="px-4 py-3.5 text-slate-600 dark:text-slate-400 text-xs whitespace-nowrap font-medium">{r.date}</td>
                  <td className="px-4 py-3.5 text-slate-600 dark:text-slate-400 capitalize text-xs font-bold">{r.shift}</td>
                  <td className="px-4 py-3.5 text-slate-700 dark:text-slate-300 font-mono font-bold text-xs">{r.fat?.toFixed(2) ?? '—'}</td>
                  <td className="px-4 py-3.5 text-slate-700 dark:text-slate-300 font-mono font-bold text-xs">{r.snf?.toFixed(2) ?? '—'}</td>
                  <td className="px-4 py-3.5 text-slate-700 dark:text-slate-300 font-mono font-bold text-xs">{r.ph?.toFixed(2) ?? '—'}</td>
                  <td className="px-4 py-3.5 text-slate-700 dark:text-slate-300 font-mono font-bold text-xs">{r.acidity?.toFixed(3) ?? '—'}</td>
                  <td className="px-4 py-3.5 text-slate-700 dark:text-slate-300 font-mono font-bold text-xs">{r.temperature?.toFixed(1) ?? '—'}</td>
                  <td className="px-4 py-3.5 text-slate-700 dark:text-slate-300 font-mono font-bold text-xs">{r.mbrt?.toFixed(1) ?? '—'}</td>
                  <td className="px-4 py-3.5">
                    <span className={r.cob_test === 'positive' ? 'text-red-600 dark:text-red-400 font-black text-xs' : 'text-slate-400 dark:text-slate-500 text-xs font-bold'}>
                      {r.cob_test === 'positive' ? 'POS' : 'NEG'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={r.alcohol_test === 'positive' ? 'text-red-600 dark:text-red-400 font-black text-xs' : 'text-slate-400 dark:text-slate-500 text-xs font-bold'}>
                      {r.alcohol_test === 'positive' ? 'POS' : 'NEG'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5"><DecisionBadge d={r.decision}/></td>
                  <td className="px-4 py-3.5"><FraudBadge r={r.fraud_risk}/></td>
                  <td className="px-4 py-3.5 text-slate-500 dark:text-slate-500 text-[11px] max-w-[200px] truncate font-medium" title={r.reasons?.join(', ')}>
                    {r.reasons && r.reasons.length > 0 ? r.reasons[0] : '—'}
                    {r.reasons && r.reasons.length > 1 && <span className="ml-1.5 text-milk-600 dark:text-milk-400 font-black tracking-tighter">+{r.reasons.length - 1}</span>}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    {r.farmer_id && (
                      <button onClick={() => navigate(`/farmers/${r.farmer_id}`)}
                        className="p-2.5 rounded-xl text-slate-400 hover:text-milk-600 dark:hover:text-milk-400 hover:bg-milk-50 dark:hover:bg-milk-900/30 transition-all shadow-sm sm:shadow-none border border-transparent hover:border-milk-100 dark:hover:border-milk-800">
                        <Eye size={16}/>
                      </button>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="px-4 py-5 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/30">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
              Page <span className="text-slate-900 dark:text-white">{page}</span> of {pages}
            </p>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
                className="p-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm">
                <ChevronLeft size={18}/>
              </button>
              <div className="flex items-center gap-1 mx-1">
                {Array.from({ length: Math.min(window.innerWidth < 640 ? 3 : 5, pages) }, (_, i) => {
                  let pg;
                  if (pages <= 5) pg = i + 1;
                  else if (page <= 3) pg = i + 1;
                  else if (page >= pages - 2) pg = pages - 4 + i;
                  else pg = page - 2 + i;
                  
                  if (pg < 1 || pg > pages) return null;
                  
                  return (
                    <button key={pg} onClick={() => setPage(pg)}
                      className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl text-xs font-black transition-all shadow-sm border
                        ${pg === page 
                          ? 'bg-milk-600 border-milk-600 text-white shadow-milk-600/30 scale-110 z-10' 
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                      {pg}
                    </button>
                  )
                })}
              </div>
              <button onClick={() => setPage(p => Math.min(pages, p+1))} disabled={page === pages}
                className="p-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm">
                <ChevronRight size={18}/>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


