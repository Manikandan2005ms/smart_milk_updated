import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import { useTheme } from './context/ThemeContext'
import Layout from './components/common/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import UploadPage from './pages/UploadPage'
import ManualEntryPage from './pages/ManualEntryPage'
import RecordsPage from './pages/RecordsPage'
import FarmersPage from './pages/FarmersPage'
import FarmerDetailPage from './pages/FarmerDetailPage'
import SettingsPage from './pages/SettingsPage'
import ReportsPage from './pages/ReportsPage'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center transition-colors duration-300">
      <div className="w-10 h-10 border-2 border-milk-500 border-t-transparent rounded-full animate-spin"/>
    </div>
  )
  return user ? children : <Navigate to="/login" replace/>
}

export default function App() {
  const { theme } = useTheme()
  
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: { 
              background: theme === 'dark' ? '#1e293b' : '#ffffff', 
              color: theme === 'dark' ? '#f1f5f9' : '#1e293b',
              border: `1px solid ${theme === 'dark' ? '#334155' : '#e2e8f0'}`,
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: '500',
            },
            success: { iconTheme: { primary: '#10b981', secondary: theme === 'dark' ? '#1e293b' : '#ffffff' } },
            error: { iconTheme: { primary: '#ef4444', secondary: theme === 'dark' ? '#1e293b' : '#ffffff' } },
          }}
        />
        <Routes>
          <Route path="/login" element={<LoginPage/>}/>
          <Route path="/" element={
            <ProtectedRoute>
              <Layout/>
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/dashboard" replace/>}/>
            <Route path="dashboard"      element={<DashboardPage/>}/>
            <Route path="upload"         element={<UploadPage/>}/>
            <Route path="manual-entry"   element={<ManualEntryPage/>}/>
            <Route path="records"        element={<RecordsPage/>}/>
            <Route path="farmers"        element={<FarmersPage/>}/>
            <Route path="farmers/:id"    element={<FarmerDetailPage/>}/>
            <Route path="reports"        element={<ReportsPage/>}/>
            <Route path="settings"       element={<SettingsPage/>}/>
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace/>}/>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

