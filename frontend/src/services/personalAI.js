// ==========================================
// FILE: frontend/src/services/personalAI.js
// Service gọi Personal AI API từ Frontend
// ==========================================

import api from './api'

const personalAIService = {
  /**
   * Phân tích thói quen làm việc/học tập cá nhân
   * Trả về: khung giờ vàng, thời lượng tối ưu, ngày hiệu quả nhất
   */
  async analyzeHabits() {
    try {
      const response = await api.get('/personal-ai/analyze-habits')
      return {
        success: true,
        data: response.data.data
      }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Lỗi phân tích thói quen'
      }
    }
  },

  /**
   * Lời khuyên cá nhân theo mục tiêu
   * @param {Object} params - { goal, currentStatus, challenges }
   */
  async getPersonalAdvice(params) {
    try {
      const response = await api.post('/personal-ai/personal-advice', params)
      return {
        success: true,
        data: response.data.data
      }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Lỗi lấy lời khuyên'
      }
    }
  },

  /**
   * Tạo kế hoạch học tập/làm việc cá nhân
   * @param {Object} params - { planType, duration, preferences, goals }
   */
  async createPersonalPlan(params) {
    try {
      const response = await api.post('/personal-ai/create-personal-plan', params)
      return {
        success: true,
        data: response.data.data
      }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Lỗi tạo kế hoạch'
      }
    }
  },

  /**
   * Nhắc nhở thông minh dựa trên pattern
   */
  async getSmartReminders() {
    try {
      const response = await api.get('/personal-ai/smart-reminders')
      return {
        success: true,
        data: response.data.data
      }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Lỗi lấy nhắc nhở'
      }
    }
  },

  /**
   * Chat với AI - Sử dụng API đã có
   */
  async chat(message, context = {}) {
    try {
      const response = await api.post('/ai/chat', { message, context })
      return {
        success: true,
        data: response.data.data
      }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Lỗi AI chat'
      }
    }
  },

  /**
   * Phân tích hiệu suất
   */
  async analyzePerformance() {
    try {
      const response = await api.get('/ai/analyze-performance')
      return {
        success: true,
        data: response.data.data
      }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Lỗi phân tích hiệu suất'
      }
    }
  },

  /**
   * Tạo lịch tối ưu tự động
   */
  async generateSchedule(params) {
    try {
      const response = await api.post('/ai/generate-schedule', params)
      return {
        success: true,
        data: response.data.data
      }
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Lỗi tạo lịch'
      }
    }
  }
}

export default personalAIService