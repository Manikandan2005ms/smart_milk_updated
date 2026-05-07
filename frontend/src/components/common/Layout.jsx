import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Upload, ClipboardEdit, FileText,
  Users, BarChart3, Settings, LogOut, Menu, X,
  Droplets, ChevronRight, Bell, Sun, Moon, History
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import toast from 'react-hot-toast'

const NAV = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard'     },
  { to: '/upload',       icon: Upload,          label: 'Upload Data'   },
  { to: '/upload-history',icon: History,        label: 'Upload History'},
  { to: '/manual-entry', icon: ClipboardEdit,   label: 'Manual Entry'  },
  { to: '/records',      icon: FileText,        label: 'Records'       },
  { to: '/farmers',      icon: Users,           label: 'Farmers'       },
  { to: '/reports',      icon: BarChart3,       label: 'Reports'       },
  { to: '/settings',     icon: Settings,        label: 'Settings'      },
]

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 1024)
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()

  // Close sidebar on mobile when route changes
  useEffect(() => {
    if (window.innerWidth < 1024) {
      setSidebarOpen(false)
    }
  }, [location.pathname])

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 1024) setSidebarOpen(true)
      else setSidebarOpen(false)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleLogout = async () => {
    await logout()
    toast.success('Logged out successfully')
    navigate('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && window.innerWidth < 1024 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ 
          width: sidebarOpen ? 260 : (window.innerWidth < 1024 ? 0 : 80),
          x: (window.innerWidth < 1024 && !sidebarOpen) ? -260 : 0
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className={`fixed inset-y-0 left-0 lg:relative z-50 flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-shrink-0 overflow-hidden shadow-2xl lg:shadow-none`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-200 dark:border-slate-800 min-h-[70px]">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-milk-500 to-milk-700 flex items-center justify-center flex-shrink-0 shadow-lg shadow-milk-500/20">
            <Droplets size={20} className="text-white"/>
          </div>
          <AnimatePresence>
            {(sidebarOpen || window.innerWidth < 1024) && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                className="overflow-hidden whitespace-nowrap"
              >
                <p className="text-base font-bold text-slate-900 dark:text-white leading-tight">SmartMilk</p>
                <p className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">Decision Tool</p>
              </motion.div>
            )}
          </AnimatePresence>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden ml-auto p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X size={20}/>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to} to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group
                 ${isActive
                   ? 'bg-milk-600/10 dark:bg-milk-600/20 text-milk-600 dark:text-milk-400 border border-milk-600/10 dark:border-milk-600/30 shadow-sm'
                   : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/50'}`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={20} className={`flex-shrink-0 ${isActive ? 'text-milk-600 dark:text-milk-400' : 'group-hover:scale-110 transition-transform'}`}/>
                  <AnimatePresence>
                    {(sidebarOpen || window.innerWidth < 1024) && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-sm font-semibold whitespace-nowrap overflow-hidden"
                      >
                        {label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                  {isActive && (sidebarOpen || window.innerWidth < 1024) && (
                    <motion.div layoutId="nav-indicator" className="ml-auto">
                      <ChevronRight size={14} className="text-milk-600 dark:text-milk-400"/>
                    </motion.div>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="px-3 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className={`flex items-center gap-3 px-2 py-2 rounded-xl ${(sidebarOpen || window.innerWidth < 1024) ? '' : 'justify-center'}`}>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-milk-400 to-milk-600 flex items-center justify-center flex-shrink-0 text-white text-xs font-bold shadow-sm ring-2 ring-white dark:ring-slate-800">
              {user?.username?.[0]?.toUpperCase() || 'U'}
            </div>
            <AnimatePresence>
              {(sidebarOpen || window.innerWidth < 1024) && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 overflow-hidden"
                >
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{user?.full_name || user?.username}</p>
                  <p className="text-[10px] font-medium text-slate-500 truncate capitalize">{user?.role}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button
            onClick={handleLogout}
            className={`mt-2 flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 ${(sidebarOpen || window.innerWidth < 1024) ? '' : 'justify-center'}`}
          >
            <LogOut size={18} className="flex-shrink-0"/>
            <AnimatePresence>
              {(sidebarOpen || window.innerWidth < 1024) && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-xs font-bold"
                >
                  Log out
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </motion.aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Topbar */}
        <header className="flex items-center gap-4 px-4 lg:px-8 py-4 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl z-30">
          <button
            onClick={() => setSidebarOpen(p => !p)}
            className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 shadow-sm lg:shadow-none"
          >
            {sidebarOpen ? <X size={20}/> : <Menu size={20}/>}
          </button>
          
          <div className="flex-1 flex items-center lg:hidden">
            <Droplets size={20} className="text-milk-600 mr-2"/>
            <span className="font-bold text-slate-900 dark:text-white text-sm">SmartMilk</span>
          </div>

          <div className="flex items-center gap-2 lg:gap-3">
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 transition-all duration-200 shadow-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? <Sun size={18}/> : <Moon size={18}/>}
            </button>
            <button className="p-2.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 transition-all relative shadow-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
              <Bell size={18}/>
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900 shadow-sm"/>
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8 custom-scrollbar">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="max-w-[1600px] mx-auto"
          >
            <Outlet/>
          </motion.div>
        </main>
      </div>
    </div>
  )
}


