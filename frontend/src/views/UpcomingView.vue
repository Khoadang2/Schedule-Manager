<template>
  <div class="upcoming-view">
    <div class="view-header">
      <h1>📥 Hộp thư đến</h1>
    </div>

    <div class="upcoming-content" v-loading="scheduleStore.loading">
      <div v-for="group in groupedSchedules" :key="group.date" class="schedule-group">
        <h3 class="group-header">{{ group.dateLabel }}</h3>
        
        <el-card
          v-for="schedule in group.schedules"
          :key="schedule.schedule_id"
          shadow="hover"
          class="schedule-item"
          @click="editSchedule(schedule)"
        >
          <div class="schedule-content">
            <div class="schedule-info">
              <h4>{{ schedule.title }}</h4>
              <p v-if="schedule.description">{{ schedule.description }}</p>
              <div class="schedule-meta">
                <el-tag :type="schedule.schedule_type === 'work' ? 'danger' : 'primary'" size="small">
                  {{ schedule.schedule_type === 'work' ? '🏢 Làm việc' : '📚 Học tập' }}
                </el-tag>
                <span>
                  <el-icon><Clock /></el-icon>
                  {{ formatTime(schedule.start_time) }} - {{ formatTime(schedule.end_time) }}
                </span>
                <span v-if="schedule.location">
                  <el-icon><Location /></el-icon>
                  {{ schedule.location }}
                </span>
              </div>
            </div>

            <div class="schedule-actions">
              <el-button
                circle
                :type="schedule.is_completed ? 'default' : 'success'"
                @click.stop="toggleComplete(schedule)"
              >
                <el-icon><Check /></el-icon>
              </el-button>
            </div>
          </div>
        </el-card>
      </div>

      <el-empty
        v-if="upcomingSchedules.length === 0"
        description="Không có lịch sắp tới"
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
import { Clock, Location, Check } from '@element-plus/icons-vue'
import { useScheduleStore } from '@/stores/schedule'
import ScheduleFormDialog from '@/components/ScheduleFormDialog.vue'
import dayjs from 'dayjs'

const scheduleStore = useScheduleStore()
const showEditDialog = ref(false)
const selectedSchedule = ref(null)

const upcomingSchedules = computed(() => {
  const now = dayjs()
  return scheduleStore.schedules
    .filter(s => dayjs(s.start_time).isAfter(now))
    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
})

const groupedSchedules = computed(() => {
  const groups = {}
  
  upcomingSchedules.value.forEach(schedule => {
    const date = dayjs(schedule.start_time).format('YYYY-MM-DD')
    if (!groups[date]) {
      groups[date] = {
        date,
        dateLabel: getDateLabel(schedule.start_time),
        schedules: []
      }
    }
    groups[date].schedules.push(schedule)
  })
  
  return Object.values(groups)
})

const getDateLabel = (date) => {
  const scheduleDate = dayjs(date)
  const today = dayjs()
  const tomorrow = today.add(1, 'day')
  
  if (scheduleDate.format('YYYY-MM-DD') === today.format('YYYY-MM-DD')) {
    return 'Hôm nay'
  } else if (scheduleDate.format('YYYY-MM-DD') === tomorrow.format('YYYY-MM-DD')) {
    return 'Ngày mai'
  } else {
    return scheduleDate.format('dddd, DD THÁNG MM')
  }
}

const formatTime = (time) => {
  return dayjs(time).format('HH:mm')
}

const toggleComplete = async (schedule) => {
  const result = await scheduleStore.toggleComplete(
    schedule.schedule_id,
    !schedule.is_completed
  )
  if (result.success) {
    ElMessage.success('Đã cập nhật trạng thái')
  }
}

const editSchedule = (schedule) => {
  selectedSchedule.value = { ...schedule }
  showEditDialog.value = true
}

const handleUpdated = () => {
  showEditDialog.value = false
  scheduleStore.fetchWeekSchedules()
}
</script>

<style scoped lang="scss">
.upcoming-view {
  max-width: 900px;
  margin: 0 auto;
}

.view-header {
  margin-bottom: 32px;

  h1 {
    font-size: 28px;
    font-weight: 700;
    color: #1f2937;
  }
}

.upcoming-content {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.schedule-group {
  .group-header {
    font-size: 16px;
    font-weight: 600;
    color: #1f2937;
    margin-bottom: 16px;
    padding-bottom: 8px;
    border-bottom: 2px solid #e5e7eb;
  }
}

.schedule-item {
  margin-bottom: 12px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .schedule-content {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
  }

  .schedule-info {
    flex: 1;

    h4 {
      font-size: 16px;
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 8px;
    }

    p {
      color: #6b7280;
      margin-bottom: 12px;
    }

    .schedule-meta {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
      font-size: 14px;
      color: #6b7280;

      span {
        display: flex;
        align-items: center;
        gap: 4px;
      }
    }
  }

  .schedule-actions {
    flex-shrink: 0;
  }
}
</style>