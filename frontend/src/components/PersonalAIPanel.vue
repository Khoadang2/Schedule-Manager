<template>
  <div class="personal-ai-view">
    <div class="view-header">
      <h1>🤖 AI Trợ lý Cá nhân</h1>
      <p class="subtitle">Phân tích thói quen và tối ưu hóa lịch làm việc/học tập của bạn</p>
    </div>

    <el-tabs v-model="activeTab" class="ai-tabs">
      <!-- TAB 1: PHÂN TÍCH THÓI QUEN -->
      <el-tab-pane label="📊 Phân tích thói quen" name="habits">
        <el-card v-loading="personalAIStore.loading">
          <template #header>
            <div class="card-header">
              <span>Thói quen làm việc/học tập của bạn</span>
              <el-button type="primary" @click="analyzeHabits" :loading="personalAIStore.loading">
                <el-icon><Refresh /></el-icon>
                Phân tích lại
              </el-button>
            </div>
          </template>

          <div v-if="habits" class="habits-content">
            <!-- Insights -->
            <div class="insights-section">
              <h3>💡 Nhận xét chi tiết</h3>
              <el-alert
                v-for="(insight, index) in habits.insights"
                :key="index"
                :type="getInsightType(insight.type)"
                :title="insight.title"
                :closable="false"
                class="insight-card"
              >
                <div v-html="formatMessage(insight.message)"></div>
              </el-alert>
            </div>

            <!-- Khung giờ vàng -->
            <div class="section" v-if="habits.timeAnalysis?.length > 0">
              <h3>⭐ Top 5 khung giờ hiệu quả nhất</h3>
              <el-table :data="habits.timeAnalysis.slice(0, 5)" stripe>
                <el-table-column label="Giờ" width="100">
                  <template #default="{ row }">
                    {{ row.hour_of_day }}:00 - {{ row.hour_of_day + 1 }}:00
                  </template>
                </el-table-column>
                <el-table-column prop="total_schedules" label="Số lịch" width="100" />
                <el-table-column prop="completed" label="Hoàn thành" width="120" />
                <el-table-column label="Tỷ lệ">
                  <template #default="{ row }">
                    <el-progress 
                      :percentage="parseFloat(row.completion_rate)" 
                      :color="getProgressColor(row.completion_rate)"
                    />
                  </template>
                </el-table-column>
              </el-table>
            </div>

            <!-- Thời lượng tối ưu -->
            <div class="section" v-if="habits.durationAnalysis?.length > 0">
              <h3>⏱️ Thời lượng làm việc hiệu quả</h3>
              <div class="duration-cards">
                <el-card
                  v-for="duration in habits.durationAnalysis"
                  :key="duration.duration_range"
                  shadow="hover"
                  class="duration-card"
                >
                  <div class="duration-info">
                    <div class="duration-label">{{ duration.duration_range }}</div>
                    <div class="duration-stats">
                      <div class="stat">
                        <span class="label">Số lịch:</span>
                        <span class="value">{{ duration.total }}</span>
                      </div>
                      <div class="stat">
                        <span class="label">Tỷ lệ hoàn thành:</span>
                        <span class="value success">{{ duration.avg_completion_rate.toFixed(1) }}%</span>
                      </div>
                    </div>
                  </div>
                </el-card>
              </div>
            </div>

            <!-- Ngày hiệu quả -->
            <div class="section" v-if="habits.dayAnalysis?.length > 0">
              <h3>📅 Hiệu suất theo ngày trong tuần</h3>
              <div class="day-cards">
                <el-card
                  v-for="day in habits.dayAnalysis"
                  :key="day.day_name"
                  shadow="hover"
                  class="day-card"
                  :class="{ 'best-day': day.completion_rate === getBestDayRate() }"
                >
                  <div class="day-name">{{ day.day_name }}</div>
                  <el-progress
                    type="circle"
                    :percentage="parseFloat(day.completion_rate)"
                    :color="getProgressColor(day.completion_rate)"
                  />
                  <div class="day-total">{{ day.total }} lịch</div>
                </el-card>
              </div>
            </div>
          </div>

          <el-empty v-else description="Chưa có dữ liệu phân tích. Click 'Phân tích lại' để bắt đầu!" />
        </el-card>
      </el-tab-pane>

      <!-- TAB 2: LỜI KHUYÊN CÁ NHÂN -->
      <el-tab-pane label="💡 Lời khuyên cá nhân" name="advice">
        <el-card>
          <template #header>
            <span>Nhận lời khuyên phù hợp với mục tiêu của bạn</span>
          </template>

          <!-- Form chọn mục tiêu -->
          <el-form :model="adviceForm" label-position="top">
            <el-form-item label="Mục tiêu của bạn">
              <el-select v-model="adviceForm.goal" placeholder="Chọn mục tiêu" style="width: 100%">
                <el-option label="🎯 Cải thiện năng suất" value="improve_productivity" />
                <el-option label="⚖️ Cân bằng work-life" value="work_life_balance" />
                <el-option label="📚 Học tập hiệu quả hơn" value="study_better" />
                <el-option label="⏰ Quản lý thời gian tốt hơn" value="time_management" />
              </el-select>
            </el-form-item>

            <el-form-item label="Tình trạng hiện tại">
              <el-input
                v-model="adviceForm.currentStatus"
                type="textarea"
                :rows="3"
                placeholder="VD: Tôi đang bị quá tải công việc, không có thời gian cho bản thân..."
              />
            </el-form-item>

            <el-form-item label="Khó khăn gặp phải">
              <el-input
                v-model="adviceForm.challenges"
                type="textarea"
                :rows="3"
                placeholder="VD: Khó tập trung, hay bị xao nhãng, mệt mỏi..."
              />
            </el-form-item>

            <el-button
              type="primary"
              @click="getAdvice"
              :loading="personalAIStore.loading"
              style="width: 100%"
            >
              <el-icon><MagicStick /></el-icon>
              Nhận lời khuyên AI
            </el-button>
          </el-form>

          <!-- Hiển thị kết quả -->
          <div v-if="advice" class="advice-result">
            <el-divider />
            
            <div class="greeting">
              <h2>{{ advice.greeting }}</h2>
            </div>

            <div v-if="advice.analysis?.length > 0" class="section">
              <h3>📊 Phân tích tình hình</h3>
              <el-alert
                v-for="(item, index) in advice.analysis"
                :key="index"
                type="info"
                :closable="false"
                class="advice-item"
              >
                <div v-html="formatMessage(item)"></div>
              </el-alert>
            </div>

            <div v-if="advice.recommendations?.length > 0" class="section">
              <h3>💡 Đề xuất cải thiện</h3>
              <div class="recommendations">
                <div
                  v-for="(item, index) in advice.recommendations"
                  :key="index"
                  class="recommendation-item"
                >
                  <el-icon><Check /></el-icon>
                  <span v-html="formatMessage(item)"></span>
                </div>
              </div>
            </div>

            <div v-if="advice.actionPlan?.length > 0" class="section">
              <h3>🎯 Kế hoạch hành động</h3>
              <el-timeline>
                <el-timeline-item
                  v-for="week in advice.actionPlan"
                  :key="week.week"
                  :timestamp="`Tuần ${week.week}`"
                  placement="top"
                >
                  <el-card>
                    <h4>{{ week.focus }}</h4>
                    <ul>
                      <li v-for="(task, index) in week.tasks" :key="index">{{ task }}</li>
                    </ul>
                  </el-card>
                </el-timeline-item>
              </el-timeline>
            </div>
          </div>
        </el-card>
      </el-tab-pane>

      <!-- TAB 3: TẠO KẾ HOẠCH -->
      <el-tab-pane label="📋 Tạo kế hoạch" name="plan">
        <el-card>
          <template #header>
            <span>Tạo kế hoạch học tập/làm việc tối ưu</span>
          </template>

          <el-form :model="planForm" label-position="top">
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="Loại kế hoạch">
                  <el-select v-model="planForm.planType" style="width: 100%">
                    <el-option label="💼 Làm việc" value="work" />
                    <el-option label="📚 Học tập" value="study" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="Thời gian">
                  <el-select v-model="planForm.duration" style="width: 100%">
                    <el-option label="1 tuần" value="1_week" />
                    <el-option label="2 tuần" value="2_weeks" />
                    <el-option label="1 tháng" value="1_month" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>

            <el-form-item label="Mục tiêu cụ thể">
              <el-input
                v-model="planForm.goals"
                type="textarea"
                :rows="3"
                placeholder="VD: Hoàn thành dự án X, Học xong khóa Y, Đạt target Z..."
              />
            </el-form-item>

            <el-form-item label="Ưu tiên cá nhân">
              <el-checkbox-group v-model="planForm.preferences">
                <el-checkbox label="focus_morning">Tập trung buổi sáng</el-checkbox>
                <el-checkbox label="short_sessions">Sessions ngắn (45-60 phút)</el-checkbox>
                <el-checkbox label="no_weekend">Không làm cuối tuần</el-checkbox>
                <el-checkbox label="flexible">Linh hoạt điều chỉnh</el-checkbox>
              </el-checkbox-group>
            </el-form-item>

            <el-button
              type="primary"
              @click="createPlan"
              :loading="personalAIStore.loading"
              style="width: 100%"
            >
              <el-icon><Calendar /></el-icon>
              Tạo kế hoạch AI
            </el-button>
          </el-form>

          <!-- Hiển thị kế hoạch -->
          <div v-if="plan" class="plan-result">
            <el-divider />
            
            <h2>{{ plan.title }}</h2>
            <p class="plan-duration">Thời gian: {{ plan.duration }}</p>

            <div class="schedule-grid">
              <el-card
                v-for="day in plan.schedule"
                :key="day.day"
                shadow="hover"
                class="day-schedule"
              >
                <template #header>
                  <strong>{{ day.day }}</strong>
                </template>
                <div class="sessions">
                  <div
                    v-for="(session, index) in day.sessions"
                    :key="index"
                    class="session"
                  >
                    <div class="session-time">⏰ {{ session.time }}</div>
                    <div class="session-activity">{{ session.activity }}</div>
                    <div class="session-note">💡 {{ session.note }}</div>
                  </div>
                </div>
              </el-card>
            </div>

            <div v-if="plan.tips?.length > 0" class="tips-section">
              <h3>💡 Lời khuyên</h3>
              <ul>
                <li v-for="(tip, index) in plan.tips" :key="index" v-html="formatMessage(tip)"></li>
              </ul>
            </div>
          </div>
        </el-card>
      </el-tab-pane>

      <!-- TAB 4: NHẮC NHỞ THÔNG MINH -->
      <el-tab-pane label="🔔 Nhắc nhở thông minh" name="reminders">
        <el-card v-loading="personalAIStore.loading">
          <template #header>
            <div class="card-header">
              <span>Phát hiện hoạt động định kỳ và tự động hóa</span>
              <el-button type="primary" @click="getReminders" :loading="personalAIStore.loading">
                <el-icon><Refresh /></el-icon>
                Quét lại
              </el-button>
            </div>
          </template>

          <div v-if="reminders">
            <el-alert
              :title="reminders.message"
              type="info"
              :closable="false"
              show-icon
            />

            <div v-if="reminders.reminders?.length > 0" class="reminders-list">
              <el-card
                v-for="(reminder, index) in reminders.reminders"
                :key="index"
                shadow="hover"
                class="reminder-card"
              >
                <div class="reminder-header">
                  <h4>{{ reminder.activity }}</h4>
                  <el-tag type="success">{{ reminder.frequency }} lần</el-tag>
                </div>
                <p class="reminder-suggestion">{{ reminder.suggestion }}</p>
                <div class="reminder-pattern">
                  <span>🗓️ {{ getDayName(reminder.pattern.day_of_week) }}</span>
                  <span>⏰ {{ reminder.pattern.hour_of_day }}:00</span>
                  <span>📂 {{ reminder.pattern.type === 'work' ? 'Làm việc' : 'Học tập' }}</span>
                </div>
                <el-button type="primary" size="small" @click="createAutoSchedule(reminder)">
                  Tự động tạo lịch
                </el-button>
              </el-card>
            </div>

            <el-empty v-else description="Chưa phát hiện hoạt động định kỳ nào" />
          </div>
        </el-card>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Refresh,
  MagicStick,
  Check,
  Calendar
} from '@element-plus/icons-vue'
import { usePersonalAIStore } from '@/stores/personalAI'

const personalAIStore = usePersonalAIStore()
const activeTab = ref('habits')

// State
const habits = computed(() => personalAIStore.habits)
const advice = computed(() => personalAIStore.advice)
const plan = computed(() => personalAIStore.plan)
const reminders = computed(() => personalAIStore.reminders)

// Forms
const adviceForm = ref({
  goal: 'improve_productivity',
  currentStatus: '',
  challenges: ''
})

const planForm = ref({
  planType: 'work',
  duration: '1_week',
  goals: '',
  preferences: []
})

// Methods
const analyzeHabits = async () => {
  const result = await personalAIStore.analyzeHabits()
  if (result.success) {
    ElMessage.success('Phân tích thói quen thành công!')
  } else {
    ElMessage.error(result.message)
  }
}

const getAdvice = async () => {
  if (!adviceForm.value.currentStatus) {
    ElMessage.warning('Vui lòng mô tả tình trạng hiện tại')
    return
  }

  const result = await personalAIStore.getPersonalAdvice(adviceForm.value)
  if (result.success) {
    ElMessage.success('Đã nhận lời khuyên từ AI!')
  } else {
    ElMessage.error(result.message)
  }
}

const createPlan = async () => {
  if (!planForm.value.goals) {
    ElMessage.warning('Vui lòng nhập mục tiêu cụ thể')
    return
  }

  const result = await personalAIStore.createPersonalPlan(planForm.value)
  if (result.success) {
    ElMessage.success('Đã tạo kế hoạch thành công!')
  } else {
    ElMessage.error(result.message)
  }
}

const getReminders = async () => {
  const result = await personalAIStore.getSmartReminders()
  if (result.success) {
    ElMessage.success('Đã quét nhắc nhở thông minh!')
  } else {
    ElMessage.error(result.message)
  }
}

const createAutoSchedule = (reminder) => {
  ElMessage.info('Tính năng đang phát triển - Sẽ tự động tạo lịch định kỳ')
}

// Helpers
const formatMessage = (text) => {
  return text
    .replace(/\n/g, '<br>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/•/g, '•')
}

const getInsightType = (type) => {
  const types = {
    best_time: 'success',
    optimal_duration: 'info',
    productive_day: 'success',
    workload_warning: 'warning',
    improvement: 'info'
  }
  return types[type] || 'info'
}

const getProgressColor = (rate) => {
  if (rate >= 80) return '#67C23A'
  if (rate >= 60) return '#E6A23C'
  return '#F56C6C'
}

const getBestDayRate = () => {
  if (!habits.value?.dayAnalysis) return 0
  return Math.max(...habits.value.dayAnalysis.map(d => parseFloat(d.completion_rate)))
}

const getDayName = (dayNum) => {
  const days = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7']
  return days[dayNum - 1] || dayNum
}

onMounted(() => {
  analyzeHabits()
})
</script>

<style scoped lang="scss">
.personal-ai-view {
  max-width: 1200px;
  margin: 0 auto;
}

.view-header {
  margin-bottom: 24px;
  
  h1 {
    font-size: 28px;
    font-weight: 700;
    color: #1f2937;
    margin-bottom: 8px;
  }
  
  .subtitle {
    color: #6b7280;
    font-size: 15px;
  }
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.habits-content,
.advice-result,
.plan-result {
  .section {
    margin-bottom: 32px;
    
    h3 {
      font-size: 18px;
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 16px;
    }
  }
}

.insights-section {
  margin-bottom: 32px;
  
  .insight-card {
    margin-bottom: 12px;
  }
}

.duration-cards,
.day-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.duration-card {
  .duration-info {
    .duration-label {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 12px;
    }
    
    .stat {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      
      .value {
        font-weight: 600;
        
        &.success {
          color: #67C23A;
        }
      }
    }
  }
}

.day-card {
  text-align: center;
  
  &.best-day {
    border: 2px solid #67C23A;
  }
  
  .day-name {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 16px;
  }
  
  .day-total {
    margin-top: 12px;
    color: #6b7280;
  }
}

.greeting {
  text-align: center;
  margin-bottom: 24px;
  
  h2 {
    font-size: 24px;
    color: #1f2937;
  }
}

.advice-item {
  margin-bottom: 12px;
}

.recommendations {
  .recommendation-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 12px;
    padding: 12px;
    background: #f9fafb;
    border-radius: 8px;
    
    .el-icon {
      color: #67C23A;
      font-size: 18px;
      margin-top: 2px;
    }
  }
}

.schedule-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.day-schedule {
  .sessions {
    .session {
      margin-bottom: 16px;
      padding-bottom: 16px;
      border-bottom: 1px solid #e5e7eb;
      
      &:last-child {
        border-bottom: none;
        margin-bottom: 0;
        padding-bottom: 0;
      }
      
      .session-time {
        font-weight: 600;
        color: #2563eb;
        margin-bottom: 4px;
      }
      
      .session-activity {
        font-size: 14px;
        color: #1f2937;
        margin-bottom: 4px;
      }
      
      .session-note {
        font-size: 13px;
        color: #6b7280;
      }
    }
  }
}

.tips-section {
  background: #eff6ff;
  padding: 20px;
  border-radius: 8px;
  
  ul {
    margin: 0;
    padding-left: 20px;
    
    li {
      margin-bottom: 8px;
    }
  }
}

.reminders-list {
  margin-top: 24px;
  
  .reminder-card {
    margin-bottom: 16px;
    
    .reminder-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      
      h4 {
        margin: 0;
        font-size: 16px;
      }
    }
    
    .reminder-suggestion {
      color: #6b7280;
      margin-bottom: 12px;
    }
    
    .reminder-pattern {
      display: flex;
      gap: 16px;
      margin-bottom: 12px;
      font-size: 14px;
      color: #6b7280;
    }
  }
}
</style>