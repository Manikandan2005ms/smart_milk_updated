import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Search, Trash2, Eye, Download, History, Calendar, LayoutDashboard, FileText } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'

export default function UploadHistoryPage() {
  const [batches, setBatches] = useState([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [shiftFilter, setShiftFilter] = useState('')
  const [downloadDropdown, setDownloadDropdown] = useState(null)
  const navigate = useNavigate()
  const { user } = useAuth()

  const fetchBatches = async (pg = page, isSilent = false) => {
    if (!isSilent) setLoading(true)
    try {
      const params = new URLSearchParams({ page: pg, per_page: 20 })
      if (search) params.append('search', search)
      if (dateFilter) params.append('date', dateFilter)
      if (shiftFilter) params.append('shift', shiftFilter)
      const r = await api.get(`/batches?${params}`)
      setBatches(r.data.batches)
      setTotal(r.data.total)
      setPages(r.data.pages)
    } catch (e) { console.error(e) }
    finally { if (!isSilent) setLoading(false) }
  }

  useEffect(() => { fetchBatches(1); setPage(1) }, [search, dateFilter, shiftFilter])
  useEffect(() => { fetchBatches(page) }, [page])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchBatches(page, true)
    }, 30000)
    return () => clearInterval(interval)
  }, [page, search, dateFilter, shiftFilter])

  const handleDelete = async (batchId) => {
    if (!window.confirm('Are you sure you want to delete this batch and ALL its records? This cannot be undone.')) return
    try {
      await api.delete(`/batches/${batchId}`)
      toast.success('Batch deleted successfully')
      fetchBatches()
    } catch (err) {
      toast.error('Failed to delete batch')
    }
  }

  const handleDownload = async (batchId, format) => {
    try {
      toast.loading(`Downloading ${format.toUpperCase()}...`, { id: 'download' })
      const res = await api.get(`/export/${format}?batch_id=${batchId}`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `batch_${batchId}.${format === 'excel' ? 'xlsx' : format}`)
      document.body.appendChild(link)
      link.click()
      link.parentNode.removeChild(link)
      toast.success('Download complete', { id: 'download' })
      setDownloadDropdown(null)
    } catch (err) {
      toast.error('Failed to download file', { id: 'download' })
      setDownloadDropdown(null)
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <History size={24} className="text-milk-600"/> Upload History
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-medium">{total.toLocaleString()} total batches found</p>
        </div>
      </div>

      <div className="card p-3 sm:p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input className="input pl-10 text-sm py-2.5 w-full" placeholder="Search by batch ID, session, or file name…"
            value={search} onChange={e => setSearch(e.target.value)}/>
        </div>
        <div className="flex gap-2">
          <input type="date" className="input text-sm py-2.5" 
            value={dateFilter} onChange={e => setDateFilter(e.target.value)} />
          <select className="select text-sm py-2.5" 
            value={shiftFilter} onChange={e => setShiftFilter(e.target.value)}>
            <option value="">All Shifts</option>
            <option value="morning">Morning</option>
            <option value="evening">Evening</option>
          </select>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
                {['Batch ID', 'Session', 'File Name', 'Date', 'Shift', 'Records', 'Acc', 'Rej', 'Uploaded By', 'Time', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-4 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {loading ? (
                <tr><td colSpan={11} className="text-center py-20 text-slate-500">
                  <div className="inline-block w-10 h-10 border-3 border-milk-500 border-t-transparent rounded-full animate-spin"/>
                </td></tr>
              ) : batches.length === 0 ? (
                <tr><td colSpan={11} className="text-center py-20 text-slate-500 font-bold">No batches found</td></tr>
              ) : batches.map(b => (
                <motion.tr
                  key={b.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group"
                >
                  <td className="px-4 py-3.5 text-slate-800 dark:text-slate-200 font-mono text-xs font-bold max-w-[150px] truncate">{b.batch_id}</td>
                  <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300 font-medium truncate max-w-[150px]">{b.session_name || '—'}</td>
                  <td className="px-4 py-3.5 text-slate-600 dark:text-slate-400 text-xs truncate max-w-[150px]" title={b.file_name}>{b.file_name || '—'}</td>
                  <td className="px-4 py-3.5 text-slate-600 dark:text-slate-400 text-xs whitespace-nowrap font-medium">{b.upload_date}</td>
                  <td className="px-4 py-3.5 text-slate-600 dark:text-slate-400 capitalize text-xs font-bold">{b.shift}</td>
                  <td className="px-4 py-3.5 text-slate-700 dark:text-slate-300 font-bold">{b.total_records}</td>
                  <td className="px-4 py-3.5 text-emerald-600 font-bold">{b.accepted}</td>
                  <td className="px-4 py-3.5 text-red-600 font-bold">{b.rejected}</td>
                  <td className="px-4 py-3.5 text-slate-600 dark:text-slate-400 text-xs truncate max-w-[100px]">{b.uploaded_by_name}</td>
                  <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400 text-[10px] whitespace-nowrap">{b.created_at ? new Date(b.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '—'}</td>

                  <td className="px-4 py-3.5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => navigate(`/records?batch_id=${b.batch_id}`)} title="View Records"
                        className="p-2 rounded-xl text-slate-400 hover:text-milk-600 hover:bg-milk-50 dark:hover:bg-milk-900/30 transition-all">
                        <Eye size={16}/>
                      </button>
                      <button onClick={() => setDownloadDropdown(b.batch_id)} title="Export Batch"
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                        <Download size={16}/>
                      </button>
                      <button onClick={() => toast('Original file storage is not implemented yet.')} title="Download Original File"
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                        <FileText size={16}/>
                      </button>
                      {user?.role === 'admin' && (
                        <button onClick={() => handleDelete(b.id)} title="Delete Batch"
                          className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all">
                          <Trash2 size={16}/>
                        </button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {downloadDropdown && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-xl max-w-sm w-full border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Export Batch {downloadDropdown}</h3>
            <div className="space-y-3">
              <button onClick={() => handleDownload(downloadDropdown, 'pdf')} className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800 hover:bg-milk-50 dark:hover:bg-milk-900/20 text-slate-700 dark:text-slate-300 rounded-xl transition-colors font-medium border border-slate-200 dark:border-slate-700">
                <span>PDF Document</span>
                <span className="text-xs text-slate-400 font-bold bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded-md">.pdf</span>
              </button>
              <button onClick={() => handleDownload(downloadDropdown, 'excel')} className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800 hover:bg-milk-50 dark:hover:bg-milk-900/20 text-slate-700 dark:text-slate-300 rounded-xl transition-colors font-medium border border-slate-200 dark:border-slate-700">
                <span>Excel Spreadsheet</span>
                <span className="text-xs text-slate-400 font-bold bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded-md">.xlsx</span>
              </button>
              <button onClick={() => handleDownload(downloadDropdown, 'csv')} className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800 hover:bg-milk-50 dark:hover:bg-milk-900/20 text-slate-700 dark:text-slate-300 rounded-xl transition-colors font-medium border border-slate-200 dark:border-slate-700">
                <span>CSV Data</span>
                <span className="text-xs text-slate-400 font-bold bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded-md">.csv</span>
              </button>
            </div>
            <div className="mt-6">
              <button onClick={() => setDownloadDropdown(null)} className="w-full py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">Cancel</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
