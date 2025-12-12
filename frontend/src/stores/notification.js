import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/services/api'

export const useNotificationStore = defineStore('notification', () => {
  const notifications = ref([])
  const unreadCount = ref(0)
  const loading = ref(false)

  // Fetch notifications
  const fetchNotifications = async (params = {}) => {
    loading.value = true
    try {
      const response = await api.get('/notifications', { params })
      if (response.data.success) {
        notifications.value = response.data.data
        unreadCount.value = response.data.unread_count
        return { success: true }
      }
    } catch (error) {
      console.error('Fetch notifications error:', error)
      return { success: false }
    } finally {
      loading.value = false
    }
  }

  // Mark as read
  const markAsRead = async (id) => {
    try {
      const response = await api.patch(`/notifications/${id}/read`)
      if (response.data.success) {
        const notification = notifications.value.find(n => n.notification_id === id)
        if (notification) {
          notification.is_read = true
          unreadCount.value = Math.max(0, unreadCount.value - 1)
        }
        return { success: true }
      }
    } catch (error) {
      return { success: false }
    }
  }

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      const response = await api.patch('/notifications/read-all')
      if (response.data.success) {
        notifications.value.forEach(n => n.is_read = true)
        unreadCount.value = 0
        return { success: true }
      }
    } catch (error) {
      return { success: false }
    }
  }

  // Delete notification
  const deleteNotification = async (id) => {
    try {
      const response = await api.delete(`/notifications/${id}`)
      if (response.data.success) {
        const index = notifications.value.findIndex(n => n.notification_id === id)
        if (index !== -1) {
          if (!notifications.value[index].is_read) {
            unreadCount.value = Math.max(0, unreadCount.value - 1)
          }
          notifications.value.splice(index, 1)
        }
        return { success: true }
      }
    } catch (error) {
      return { success: false }
    }
  }

  // Create reminders
  const createReminders = async () => {
    try {
      await api.post('/notifications/create-reminders')
      await fetchNotifications()
    } catch (error) {
      console.error('Create reminders error:', error)
    }
  }

  return {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    createReminders
  }
})