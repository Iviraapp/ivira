import axios from 'axios'

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 15000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ivira_owner_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('ivira_owner_token')
      localStorage.removeItem('ivira_gym_id')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  },
)

export default api
