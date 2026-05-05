import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, BarChart, Bar, Legend
} from 'recharts'
import {
  CheckCircle2, XCircle, AlertTriangle, ShieldAlert,
  Sunrise, Moon, TrendingUp, Users2
} from 'lucide-react'
import api from '../utils/api'
import { useTheme } from '../context/ThemeContext'

const COLORS = { accept: '#10b981', reject: '#ef4444', manual_check: '#f59e0b' }

function StatCard({ label, value, icon: Icon, color, sub, theme }) {
  const isDark = theme === 'dark'

  // Dynamic background for the icon based on theme
  const iconBg = color.replace('text-', 'bg-').replace('-400', isDark ? '-900/40' : '-100').replace('-300', isDark ? '-900/40' : '-100').replace('-500', isDark ? '-900/40' : '-100').replace('-600', isDark ? '-900/40' : '-100')

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="stat-card"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{label}</p>
          <p className={`text-xl sm:text-3xl font-bold mt-1 ${color}`}>{value?.toLocaleString() ?? '—'}</p>
          {sub && <p className="text-[10px] sm:text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium">{sub}</p>}
        </div>
        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center ${iconBg}`}>
          <Icon size={18} className={color} />
        </div>
      </div>
    </motion.div>
  )
}

export default function DashboardPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  useEffect(() => {
    api.get('/dashboard')
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-milk-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const kpis = data?.kpis || {}
  const pieData = [
    { name: 'Accepted', value: kpis.accepted || 0 },
    { name: 'Rejected', value: kpis.rejected || 0 },
    { name: 'Manual Check', value: kpis.manual_check || 0 },
  ]
  const pieColors = ['#10b981', '#ef4444', '#f59e0b']

  const trend = (data?.daily_trend || []).slice(-14)

  // Chart configuration based on theme
  const chartConfig = {
    grid: isDark ? '#1e293b' : '#e2e8f0',
    text: isDark ? '#64748b' : '#94a3b8',
    tooltip: {
      bg: isDark ? '#1e293b' : '#ffffff',
      border: isDark ? '#334155' : '#e2e8f0',
      label: isDark ? '#94a3b8' : '#64748b'
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Dashboard Overview</h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-0.5">Live milk quality metrics and analytics</p>
        </div>
        <div className="text-[10px] font-bold text-milk-600 dark:text-milk-400 bg-milk-50 dark:bg-milk-900/30 px-3 py-1 rounded-full border border-milk-100 dark:border-milk-800 w-fit">
          LIVE UPDATES ENABLED
        </div>
      </div>

      {/* KPI rows */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard theme={theme} label="Total Records" value={kpis.total} icon={TrendingUp} color="text-milk-600 dark:text-milk-400" sub={`${data?.accept_rate}% acceptance`} />
        <StatCard theme={theme} label="Accepted" value={kpis.accepted} icon={CheckCircle2} color="text-emerald-600 dark:text-emerald-400" sub="Passed checks" />
        <StatCard theme={theme} label="Rejected" value={kpis.rejected} icon={XCircle} color="text-red-600 dark:text-red-400" sub="Failures" />
        <StatCard theme={theme} label="Manual Check" value={kpis.manual_check} icon={AlertTriangle} color="text-amber-600 dark:text-amber-400" sub="Needs verification" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard theme={theme} label="Fraud High" value={kpis.fraud_high} icon={ShieldAlert} color="text-red-600 dark:text-red-400" sub="High risk" />
        <StatCard theme={theme} label="Fraud Medium" value={kpis.fraud_medium} icon={ShieldAlert} color="text-orange-600 dark:text-orange-400" sub="Medium risk" />
        <StatCard theme={theme} label="Morning (L)" value={Number(kpis.morning_qty).toFixed(1)} icon={Sunrise} color="text-sky-600 dark:text-sky-400" sub="Today" />
        <StatCard theme={theme} label="Evening (L)" value={Number(kpis.evening_qty).toFixed(1)} icon={Moon} color="text-indigo-600 dark:text-indigo-400" sub="Today" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Pie */}
        <div className="card p-4 sm:p-5">
          <h3 className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-milk-500" />
            Decision Distribution
          </h3>
          <ResponsiveContainer width="100%" height={window.innerWidth < 640 ? 180 : 200}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75}
                dataKey="value" paddingAngle={4}>
                {pieData.map((_, i) => <Cell key={i} fill={pieColors[i]} className="outline-none" />)}
              </Pie>
              <Tooltip
                contentStyle={{ background: chartConfig.tooltip.bg, border: `1px solid ${chartConfig.tooltip.border}`, borderRadius: 12, boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                labelStyle={{ color: chartConfig.tooltip.label }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-around mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            {pieData.map((d, i) => (
              <div key={i} className="text-center">
                <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-tighter">
                  <span className="w-2 h-2 rounded-full" style={{ background: pieColors[i] }} />
                  {d.name.split(' ')[0]}
                </div>
                <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{d.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Area trend */}
        <div className="card p-4 sm:p-5 lg:col-span-2">
          <h3 className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            14-Day Quality Trend
          </h3>
          <ResponsiveContainer width="100%" height={window.innerWidth < 640 ? 200 : 240}>
            <AreaChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gAccept" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gReject" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={chartConfig.grid} vertical={false} />
              <XAxis dataKey="date" tick={{ fill: chartConfig.text, fontSize: 10 }}
                axisLine={false} tickLine={false} dy={10}
                tickFormatter={v => v.slice(5)} />
              <YAxis tick={{ fill: chartConfig.text, fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: chartConfig.tooltip.bg, border: `1px solid ${chartConfig.tooltip.border}`, borderRadius: 12, fontSize: 11, boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              />
              <Legend wrapperStyle={{ fontSize: 11, fontWeight: 600, color: chartConfig.text, paddingTop: 20 }} />
              <Area type="monotone" dataKey="accept" name="Accept"
                stroke="#10b981" fill="url(#gAccept)" strokeWidth={2.5} />
              <Area type="monotone" dataKey="reject" name="Reject"
                stroke="#ef4444" fill="url(#gReject)" strokeWidth={2.5} />
              <Area type="monotone" dataKey="manual_check" name="Manual"
                stroke="#f59e0b" fill="none" strokeWidth={1.5} strokeDasharray="4 4" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Shift comparison + Top farmers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Shift bar */}
        <div className="card p-4 sm:p-5">
          <h3 className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            Shift Performance
          </h3>
          <ResponsiveContainer width="100%" height={window.innerWidth < 640 ? 180 : 200}>
            <BarChart data={[
              { shift: 'Morning', count: data?.shift_comparison?.morning?.count || 0, qty: data?.shift_comparison?.morning?.quantity || 0 },
              { shift: 'Evening', count: data?.shift_comparison?.evening?.count || 0, qty: data?.shift_comparison?.evening?.quantity || 0 },
            ]} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartConfig.grid} vertical={false} />
              <XAxis dataKey="shift" tick={{ fill: chartConfig.text, fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} dy={10} />
              <YAxis tick={{ fill: chartConfig.text, fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: chartConfig.tooltip.bg, border: `1px solid ${chartConfig.tooltip.border}`, borderRadius: 12, fontSize: 11, boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
              <Bar dataKey="count" name="Records" fill="#3aa3f6" radius={[4, 4, 0, 0]} barSize={40} />
              <Bar dataKey="qty" name="Qty (L)" fill="#818cf8" radius={[4, 4, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top farmers */}
        <div className="card p-4 sm:p-5">
          <h3 className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Top Performing Suppliers
          </h3>
          <div className="space-y-2 overflow-y-auto max-h-[200px] pr-1 custom-scrollbar">
            {(data?.top_farmers || []).slice(0, 8).map((f, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border border-slate-100/50 dark:border-transparent group">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 w-5 h-5 rounded-lg bg-white dark:bg-slate-900 flex items-center justify-center shadow-sm border border-slate-100 dark:border-slate-800">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-milk-600 dark:group-hover:text-milk-400 transition-colors">{f.farmer_name}</p>
                  <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-500 font-mono tracking-tighter uppercase">{f.farmer_code}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">{f.accepted}</p>
                  <p className="text-[9px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-widest">ACCEPTED</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}


