import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/services/api'
import router from '@/router'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const token = ref(localStorage.getItem('token') || null)
  const isAuthenticated = computed(() => !!token.value && !!user.value)

  // Login
  const login = async (credentials) => {
    try {
      const response = await api.post('/auth/login', credentials)
      if (response.data.success) {
        token.value = response.data.data.token
        user.value = response.data.data.user
        
        localStorage.setItem('token', token.value)
        if (credentials.remember) {
          localStorage.setItem('remember', 'true')
        }
        
        return { success: true }
      }
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Đăng nhập thất bại' 
      }
    }
  }

  // Register
  const register = async (userData) => {
    try {
      const response = await api.post('/auth/register', userData)
      if (response.data.success) {
        return { success: true, message: 'Đăng ký thành công!' }
      }
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Đăng ký thất bại' 
      }
    }
  }

  // Logout
  const logout = async () => {
    try {
      await api.post('/auth/logout')
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      token.value = null
      user.value = null
      localStorage.removeItem('token')
      localStorage.removeItem('remember')
      router.push('/login')
    }
  }

  // Check authentication
  const checkAuth = async () => {
    if (!token.value) {
      return false
    }

    try {
      const response = await api.get('/auth/me')
      if (response.data.success) {
        user.value = response.data.data
        return true
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      logout()
      return false
    }
  }

  // Forgot password
  const forgotPassword = async (email) => {
    try {
      const response = await api.post('/auth/forgot-password', { email })
      return { 
        success: true, 
        message: response.data.message 
      }
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Có lỗi xảy ra' 
      }
    }
  }

  return {
    user,
    token,
    isAuthenticated,
    login,
    register,
    logout,
    checkAuth,
    forgotPassword
  }
})