<template>
  <div class="today-view">
    <div class="view-header">
      <h1>📅 Hôm nay</h1>
      <div class="today-date">{{ todayFormatted }}</div>
    </div>

    <div class="today-content" v-loading="scheduleStore.loading">
      <el-timeline>
        <el-timeline-item
          v-for="schedule in todaySchedules"
          :key="schedule.schedule_id"
          :timestamp="formatTime(schedule.start_time)"
          placement="top"
          :color="schedule.color"
        >
          <el-card shadow="hover" class="schedule-card">
            <div class="card-header">
              <h4>{{ schedule.title }}</h4>
              <el-tag :type="schedule.schedule_type === 'work' ? 'danger' : 'primary'" size="small">
                {{ schedule.schedule_type === 'work' ? '🏢 Làm việc' : '📚 Học tập' }}
              </el-tag>
            </div>
            
            <div class="card-content">
              <p v-if="schedule.description">{{ schedule.description }}</p>
              <div class="card-meta">
                <span v-if="schedule.location">
                  <el-icon><Location /></el-icon>
                  {{ schedule.location }}
                </span>
                <span>
                  <el-icon><Clock /></el-icon>
                  {{ formatTime(schedule.start_time) }} - {{ formatTime(schedule.end_time) }}
                </span>
              </div>
            </div>

            <div class="card-actions">
              <el-button
                :type="schedule.is_completed ? 'default' : 'success'"
                size="small"
                @click="toggleComplete(schedule)"
              >
                <el-icon><Check /></el-icon>
                {{ schedule.is_completed ? 'Hoàn thành' : 'Đánh dấu hoàn thành' }}
              </el-button>
              <el-button size="small" @click="editSchedule(schedule)">
                <el-icon><Edit /></el-icon>
              </el-button>
            </div>
          </el-card>
        </el-timeline-item>
      </el-timeline>

      <el-empty
        v-if="todaySchedules.length === 0"
        description="Không có lịch nào hôm nay"
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
import { Location, Clock, Check, Edit } from '@element-plus/icons-vue'
import { useScheduleStore } from '@/stores/schedule'
import ScheduleFormDialog from '@/components/ScheduleFormDialog.vue'
import dayjs from 'dayjs'

const scheduleStore = useScheduleStore()
const showEditDialog = ref(false)
const selectedSchedule = ref(null)

const todayFormatted = computed(() => {
  return dayjs().format('dddd, DD THÁNG MM, YYYY')
})

const todaySchedules = computed(() => {
  const today = dayjs().format('YYYY-MM-DD')
  return scheduleStore.schedules
    .filter(s => dayjs(s.start_time).format('YYYY-MM-DD') === today)
    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
})

const formatTime = (time) => {
  return dayjs(time).format('HH:mm')
}

const toggleComplete = async (schedule) => {
  const result = await scheduleStore.toggleComplete(
    schedule.schedule_id,
    !schedule.is_completed
  )
  if (result.success) {
    ElMessage.success(schedule.is_completed ? 'Đã đánh dấu chưa hoàn thành' : 'Đã đánh dấu hoàn thành')
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
.today-view {
  max-width: 800px;
  margin: 0 auto;
}

.view-header {
  text-align: center;
  margin-bottom: 32px;

  h1 {
    font-size: 32px;
    font-weight: 700;
    color: #1f2937;
    margin-bottom: 8px;
  }

  .today-date {
    font-size: 16px;
    color: #6b7280;
    text-transform: capitalize;
  }
}

.today-content {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.schedule-card {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;

    h4 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: #1f2937;
    }
  }

  .card-content {
    margin-bottom: 16px;

    p {
      color: #6b7280;
      margin-bottom: 12px;
    }

    .card-meta {
      display: flex;
      gap: 16px;
      font-size: 14px;
      color: #6b7280;

      span {
        display: flex;
        align-items: center;
        gap: 4px;
      }
    }
  }

  .card-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  }
}
</style>