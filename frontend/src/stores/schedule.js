// ==========================================
// FILE: frontend/src/stores/schedule.js
// FIXED VERSION - Đảm bảo UI cập nhật ngay lập tức
// ==========================================

import { defineStore } from 'pinia'
import api from '@/services/api'
import dayjs from 'dayjs'

export const useScheduleStore = defineStore('schedule', {
  state: () => ({
    schedules: [],
    loading: false,
    error: null,
    currentWeekStart: dayjs().startOf('week'),
    filterType: null, // ⭐ Thêm filter type
  }),

  getters: {
    // Lọc schedules theo query và filter type
    filteredSchedules: (state) => {
      let filtered = state.schedules

      // ⭐ Lọc theo type (work/study)
      if (state.filterType) {
        filtered = filtered.filter(s => s.schedule_type === state.filterType)
      }

      return filtered
    },

    // Lấy schedules theo ngày
    schedulesByDay: (state) => (day) => {
      return state.schedules.filter((s) => {
        const scheduleDay = dayjs(s.start_time).day()
        return scheduleDay === day
      })
    },
  },

  actions: {
    // ========================================
    // FETCH SCHEDULES
    // ========================================
    async fetchWeekSchedules() {
      this.loading = true
      this.error = null

      try {
        const start = this.currentWeekStart.format('YYYY-MM-DD')
        const end = this.currentWeekStart.add(6, 'day').format('YYYY-MM-DD')

        console.log('📅 Fetching schedules for week:', { start, end })

        const response = await api.get('/schedules', { 
          params: { start, end } 
        })

        console.log('✅ Received schedules:', response.data)

        // ⭐ CẬP NHẬT STATE
        this.schedules = response.data.schedules || []

        return {
          success: true,
          count: this.schedules.length
        }

      } catch (error) {
        console.error('❌ Fetch schedules error:', error)
        this.error = error.message
        this.schedules = []
        
        return {
          success: false,
          message: error.response?.data?.message || 'Lỗi khi tải lịch'
        }
      } finally {
        this.loading = false
      }
    },

    // ========================================
    // CREATE SCHEDULE
    // ========================================
    async createSchedule(scheduleData) {
      try {
        console.log('📝 Creating schedule:', scheduleData)

        const response = await api.post('/schedules', scheduleData)

        console.log('✅ Create response:', response.data)

        if (response.data.success && response.data.data) {
          // ⭐ THÊM NGAY VÀO STATE
          this.schedules.push(response.data.data)
          
          // ⭐ SORT LẠI THEO THỜI GIAN
          this.schedules.sort((a, b) => 
            new Date(a.start_time) - new Date(b.start_time)
          )

          console.log('✅ Added to state. Total schedules:', this.schedules.length)

          // Refresh để đảm bảo đồng bộ
          setTimeout(() => {
            this.fetchWeekSchedules()
          }, 500)

          return { 
            success: true, 
            message: 'Tạo lịch thành công',
            data: response.data.data
          }
        }

        throw new Error('Không nhận được dữ liệu từ server')

      } catch (error) {
        console.error('❌ Create schedule error:', error)
        return {
          success: false,
          message: error.response?.data?.message || 'Tạo lịch thất bại',
        }
      }
    },

    // ========================================
    // UPDATE SCHEDULE
    // ========================================
    async updateSchedule(id, updates) {
      try {
        console.log('✏️ Updating schedule:', { id, updates })

        const response = await api.put(`/schedules/${id}`, updates)

        console.log('✅ Update response:', response.data)

        if (response.data.success && response.data.data) {
          // ⭐ CẬP NHẬT NGAY TRONG STATE
          const index = this.schedules.findIndex((s) => s.schedule_id === id)
          if (index !== -1) {
            this.schedules[index] = response.data.data
            console.log('✅ Updated in state at index:', index)
          }

          // Refresh để đảm bảo đồng bộ
          setTimeout(() => {
            this.fetchWeekSchedules()
          }, 500)

          return { 
            success: true,
            message: 'Cập nhật thành công'
          }
        }

        throw new Error('Không nhận được dữ liệu từ server')

      } catch (error) {
        console.error('❌ Update schedule error:', error)
        return {
          success: false,
          message: error.response?.data?.message || 'Cập nhật thất bại',
        }
      }
    },

    // ========================================
    // TOGGLE COMPLETE
    // ========================================
    async toggleComplete(schedule_id, newState) {
      try {
        console.log('✔️ Toggling complete:', { schedule_id, newState })

        const response = await api.put(`/schedules/${schedule_id}/complete`, { 
          is_completed: newState 
        })

        if (response.data.success) {
          // ⭐ CẬP NHẬT NGAY UI
          const schedule = this.schedules.find(s => s.schedule_id === schedule_id)
          if (schedule) {
            schedule.is_completed = newState ? 1 : 0
            console.log('✅ Toggled in state')
          }

          return { success: true }
        }

        throw new Error('Toggle failed')

      } catch (error) {
        console.error('❌ Toggle complete error:', error)
        return { success: false }
      }
    },

    // ========================================
    // DELETE SCHEDULE
    // ========================================
    async deleteSchedule(id) {
      try {
        console.log('🗑️ Deleting schedule:', id)

        const response = await api.delete(`/schedules/${id}`)

        if (response.data.success) {
          // ⭐ XÓA NGAY KHỎI STATE
          const index = this.schedules.findIndex(s => s.schedule_id === id)
          if (index !== -1) {
            this.schedules.splice(index, 1)
            console.log('✅ Deleted from state. Remaining:', this.schedules.length)
          }
          
          return { 
            success: true,
            message: 'Đã xóa lịch thành công'
          }
        }

        throw new Error('Delete failed')

      } catch (error) {
        console.error('❌ Delete schedule error:', error)
        return {
          success: false,
          message: error.response?.data?.message || 'Xóa thất bại',
        }
      }
    },

    // ========================================
    // NAVIGATION
    // ========================================
    nextWeek() {
      this.currentWeekStart = this.currentWeekStart.add(1, 'week')
      this.fetchWeekSchedules()
    },

    previousWeek() {
      this.currentWeekStart = this.currentWeekStart.subtract(1, 'week')
      this.fetchWeekSchedules()
    },

    goToToday() {
      this.currentWeekStart = dayjs().startOf('week')
      this.fetchWeekSchedules()
    },

    // ========================================
    // SEARCH
    // ========================================
    async searchSchedules(keyword) {
      try {
        const response = await api.get('/schedules/search', { 
          params: { keyword } 
        })
        return response.data.schedules || []
      } catch (error) {
        console.error('❌ Search error:', error)
        return []
      }
    },
  },
})