import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('access_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

api.interceptors.response.use(
  r => r,
  async err => {
    const orig = err.config
    if (err.response?.status === 401 && !orig._retry) {
      orig._retry = true
      try {
        const refresh = localStorage.getItem('refresh_token')
        const r = await axios.post('/api/auth/refresh', {}, {
          headers: { Authorization: `Bearer ${refresh}` }
        })
        localStorage.setItem('access_token', r.data.access_token)
        orig.headers.Authorization = `Bearer ${r.data.access_token}`
        return api(orig)
      } catch {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)

export default api
