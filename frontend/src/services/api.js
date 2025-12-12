import axios from 'axios'
import { ElMessage } from 'element-plus'
import router from '@/router'

// ⭐ TẠO AXIOS INSTANCE
const API_BASE_URL = process.env.VUE_APP_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// ========================================
// REQUEST INTERCEPTOR
// ========================================
api.interceptors.request.use(
  (config) => {
    // Thêm token vào header
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    // Log request để debug
    console.log('📤 API Request:', {
      method: config.method?.toUpperCase(),
      url: config.url,
      baseURL: config.baseURL,
      fullURL: `${config.baseURL}${config.url}`,
      data: config.data,
      params: config.params,
      headers: {
        Authorization: config.headers.Authorization ? '✅ Has token' : '❌ No token'
      }
    })

    return config
  },
  (error) => {
    console.error('❌ Request interceptor error:', error)
    return Promise.reject(error)
  }
)

// ========================================
// RESPONSE INTERCEPTOR
// ========================================
api.interceptors.response.use(
  (response) => {
    // Log response để debug
    console.log('✅ API Response:', {
      url: response.config.url,
      method: response.config.method?.toUpperCase(),
      status: response.status,
      data: response.data
    })

    return response
  },
  (error) => {
    console.error('❌ API Error:', {
      url: error.config?.url,
      method: error.config?.method?.toUpperCase(),
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    })

    // Xử lý errors
    if (error.response) {
      const { status, data } = error.response

      switch (status) {
        case 400:
          ElMessage.error(data.message || 'Dữ liệu không hợp lệ')
          break

        case 401:
          ElMessage.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.')
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          router.push('/login')
          break

        case 403:
          ElMessage.error('Bạn không có quyền thực hiện thao tác này')
          break

        case 404:
          ElMessage.error(data.message || 'Không tìm thấy dữ liệu')
          break

        case 500:
          ElMessage.error('Lỗi server. Vui lòng thử lại sau.')
          break

        default:
          ElMessage.error(data.message || 'Có lỗi xảy ra')
      }
    } else if (error.request) {
      ElMessage.error('Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.')
      console.error('❌ No response from server:', {
        baseURL: error.config?.baseURL,
        url: error.config?.url
      })
    } else {
      ElMessage.error('Có lỗi xảy ra: ' + error.message)
    }

    return Promise.reject(error)
  }
)

// ========================================
// EXPORT
// ========================================
export default api

// Test connection function
export const testConnection = async () => {
  try {
    const response = await api.get('/health')
    console.log('✅ Backend connection OK:', response.data)
    return true
  } catch (error) {
    console.error('❌ Backend connection FAILED')
    return false
  }
}