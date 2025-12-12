<template>
  <div class="grid-view">
    <div class="view-header">
      <h1>📊 Dạng lưới</h1>

      <div class="view-controls">
        <el-radio-group v-model="viewMode" size="small">
          <el-radio-button label="all">Tất cả</el-radio-button>
          <el-radio-button label="work">Làm việc</el-radio-button>
          <el-radio-button label="study">Học tập</el-radio-button>
        </el-radio-group>

        <el-button size="small" @click="toggleShowPast">
          {{ showPast ? 'Ẩn lịch đã qua' : 'Hiện lịch đã qua' }}
        </el-button>
      </div>
    </div>

    <div class="grid-content" v-loading="scheduleStore.loading">
      <div class="schedules-grid">
        <el-card
          v-for="schedule in visibleSchedules"
          :key="schedule.schedule_id"
          shadow="hover"
          :body-style="{ padding: '0' }"
          class="schedule-card"
        >
          <div class="card-color-bar" :style="{ background: schedule.color }"></div>

          <div class="card-body">
            <div class="card-header">
              <el-tag :type="schedule.schedule_type === 'work' ? 'danger' : 'primary'" size="small">
                {{ schedule.schedule_type === 'work' ? '🏢' : '📚' }}
              </el-tag>
              <el-tag v-if="schedule.is_completed" type="success" size="small">
                <el-icon><Check /></el-icon>
              </el-tag>
            </div>

            <h3 class="card-title">{{ schedule.title }}</h3>

            <div class="card-info">
              <div class="info-item">
                <el-icon><Calendar /></el-icon>
                <span>{{ formatDate(schedule.start_time) }}</span>
              </div>
              <div class="info-item">
                <el-icon><Clock /></el-icon>
                <span>{{ formatTime(schedule.start_time) }} - {{ formatTime(schedule.end_time) }}</span>
              </div>
              <div class="info-item" v-if="schedule.location">
                <el-icon><Location /></el-icon>
                <span>{{ schedule.location }}</span>
              </div>
            </div>

            <p v-if="schedule.description" class="card-description">
              {{ schedule.description }}
            </p>

            <div class="card-actions">
              <el-button size="small" @click="editSchedule(schedule)">
                <el-icon><Edit /></el-icon>
                Chỉnh sửa
              </el-button>
              <el-button
                size="small"
                :type="schedule.is_completed ? 'default' : 'success'"
                @click="toggleComplete(schedule)"
              >
                <el-icon><Check /></el-icon>
              </el-button>
            </div>
          </div>
        </el-card>
      </div>

      <el-empty
        v-if="visibleSchedules.length === 0"
        description="Không có lịch nào"
        :image-size="200"
      />
    </div>

    <ScheduleFormDialog
      v-model="showEditDialog"
      :schedule="selectedSchedule"
      @success="handleUpdated"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Calendar, Clock, Location, Check, Edit } from '@element-plus/icons-vue'
import { useScheduleStore } from '@/stores/schedule'
import ScheduleFormDialog from '@/components/ScheduleFormDialog.vue'
import dayjs from 'dayjs'

const scheduleStore = useScheduleStore()
const showEditDialog = ref(false)
const selectedSchedule = ref(null)
const viewMode = ref('all')
const showPast = ref(false) // toggle hiển thị lịch đã qua

// === Filtered schedules by type ===
const filteredSchedules = computed(() => {
  let schedules = [...scheduleStore.schedules]
  if (viewMode.value !== 'all') {
    schedules = schedules.filter(s => s.schedule_type === viewMode.value)
  }
  return schedules
})

// === Visible schedules: hôm nay lên đầu, ẩn/hiện lịch quá khứ ===
const visibleSchedules = computed(() => {
  const today = dayjs().startOf('day')

  return filteredSchedules.value
    .filter(s => {
      const start = dayjs(s.start_time)
      if (!showPast.value && start.isBefore(today)) return false
      return true
    })
    .sort((a, b) => {
      const aDate = dayjs(a.start_time)
      const bDate = dayjs(b.start_time)
      const isTodayA = aDate.isSame(today, 'day') ? 0 : 1
      const isTodayB = bDate.isSame(today, 'day') ? 0 : 1
      if (isTodayA !== isTodayB) return isTodayA - isTodayB
      return aDate - bDate
    })
})

// === Format ===
const formatDate = (date) => dayjs(date).format('DD/MM/YYYY')
const formatTime = (time) => dayjs(time).format('HH:mm')

// === Actions ===
const toggleComplete = async (schedule) => {
  const result = await scheduleStore.toggleComplete(schedule.schedule_id, !schedule.is_completed)
  if (result.success) ElMessage.success('Đã cập nhật trạng thái')
}

const editSchedule = (schedule) => {
  selectedSchedule.value = { ...schedule }
  showEditDialog.value = true
}

const handleUpdated = () => {
  showEditDialog.value = false
  scheduleStore.fetchWeekSchedules()
}

// === Toggle show/hide past ===
const toggleShowPast = () => {
  showPast.value = !showPast.value
}
</script>

<style scoped lang="scss">
.grid-view {
  height: 100%;
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  gap: 16px;

  h1 {
    font-size: 24px;
    font-weight: 600;
    color: #1f2937;
    margin: 0;
  }
}

.view-controls {
  display: flex;
  gap: 12px;
}

.schedules-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.schedule-card {
  overflow: hidden;
  transition: all 0.3s;
  cursor: pointer;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  }

  .card-color-bar { height: 4px; }

  .card-body {
    padding: 20px;

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .card-title {
      font-size: 18px;
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 16px;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .card-info {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 12px;

      .info-item {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
        color: #6b7280;

        .el-icon { font-size: 16px; }
      }
    }

    .card-description {
      font-size: 14px;
      color: #6b7280;
      margin-bottom: 16px;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .card-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }
  }
}
</style>
