// ==========================================
// FILE: src/stores/personalAI.js
// Pinia Store cho Personal AI
// ==========================================

import { defineStore } from 'pinia'
import { ref } from 'vue'
import personalAIService from '@/services/personalAI'

export const usePersonalAIStore = defineStore('personalAI', () => {
  // State
  const habits = ref(null)
  const advice = ref(null)
  const plan = ref(null)
  const reminders = ref(null)
  const loading = ref(false)
  const error = ref(null)

  // Phân tích thói quen
  const analyzeHabits = async () => {
    loading.value = true
    error.value = null
    
    try {
      const result = await personalAIService.analyzeHabits()
      
      if (result.success) {
        habits.value = result.data
        return { success: true, data: result.data }
      } else {
        error.value = result.message
        return { success: false, message: result.message }
      }
    } catch (err) {
      error.value = 'Có lỗi xảy ra khi phân tích thói quen'
      return { success: false, message: error.value }
    } finally {
      loading.value = false
    }
  }

  // Lấy lời khuyên cá nhân
  const getPersonalAdvice = async (params) => {
    loading.value = true
    error.value = null
    
    try {
      const result = await personalAIService.getPersonalAdvice(params)
      
      if (result.success) {
        advice.value = result.data
        return { success: true, data: result.data }
      } else {
        error.value = result.message
        return { success: false, message: result.message }
      }
    } catch (err) {
      error.value = 'Có lỗi xảy ra khi lấy lời khuyên'
      return { success: false, message: error.value }
    } finally {
      loading.value = false
    }
  }

  // Tạo kế hoạch cá nhân
  const createPersonalPlan = async (params) => {
    loading.value = true
    error.value = null
    
    try {
      const result = await personalAIService.createPersonalPlan(params)
      
      if (result.success) {
        plan.value = result.data
        return { success: true, data: result.data }
      } else {
        error.value = result.message
        return { success: false, message: result.message }
      }
    } catch (err) {
      error.value = 'Có lỗi xảy ra khi tạo kế hoạch'
      return { success: false, message: error.value }
    } finally {
      loading.value = false
    }
  }

  // Lấy nhắc nhở thông minh
  const getSmartReminders = async () => {
    loading.value = true
    error.value = null
    
    try {
      const result = await personalAIService.getSmartReminders()
      
      if (result.success) {
        reminders.value = result.data
        return { success: true, data: result.data }
      } else {
        error.value = result.message
        return { success: false, message: result.message }
      }
    } catch (err) {
      error.value = 'Có lỗi xảy ra khi lấy nhắc nhở'
      return { success: false, message: error.value }
    } finally {
      loading.value = false
    }
  }

  // Chat với AI
  const chat = async (message, context = {}) => {
    loading.value = true
    error.value = null
    
    try {
      const result = await personalAIService.chat(message, context)
      
      if (result.success) {
        return { success: true, data: result.data }
      } else {
        error.value = result.message
        return { success: false, message: result.message }
      }
    } catch (err) {
      error.value = 'Có lỗi xảy ra khi chat với AI'
      return { success: false, message: error.value }
    } finally {
      loading.value = false
    }
  }

  // Reset state
  const reset = () => {
    habits.value = null
    advice.value = null
    plan.value = null
    reminders.value = null
    error.value = null
  }

  return {
    // State
    habits,
    advice,
    plan,
    reminders,
    loading,
    error,
    
    // Actions
    analyzeHabits,
    getPersonalAdvice,
    createPersonalPlan,
    getSmartReminders,
    chat,
    reset
  }
})