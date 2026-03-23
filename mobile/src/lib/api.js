import axios from 'axios'
import { getItem, deleteItem } from './storage'

// Change this to your production API URL
const API_BASE = 'https://api.ivira.app/api/v1'

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
})

api.interceptors.request.use(async (config) => {
  try {
    const token = await getItem('ivira_member_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  } catch {}
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401) {
      try {
        await deleteItem('ivira_member_token')
        await deleteItem('ivira_member_data')
      } catch {}
    }
    return Promise.reject(err)
  }
)

export default api
