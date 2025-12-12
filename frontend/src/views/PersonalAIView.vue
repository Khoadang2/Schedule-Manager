<template>
  <div class="personal-ai-view">
    <div class="view-header">
      <h1>🤖 AI Trợ lý Cá nhân</h1>
      <p class="subtitle">Phân tích thói quen và tối ưu hóa lịch làm việc/học tập của bạn</p>
    </div>

    <el-tabs v-model="activeTab" class="ai-tabs">
      <!-- TAB 1: PHÂN TÍCH THÓI QUEN -->
      <el-tab-pane label="📊 Phân tích thói quen" name="habits">
        <el-card v-loading="loading">
          <template #header>
            <div class="card-header">
              <span>Thói quen làm việc/học tập của bạn</span>
              <el-button type="primary" @click="analyzeHabits" :loading="loading">
                <el-icon><Refresh /></el-icon>
                Phân tích lại
              </el-button>
            </div>
          </template>

          <div v-if="habitsData" class="habits-content">
            <!-- Insights -->
            <div class="insights-section">
              <h3>💡 Nhận xét chi tiết</h3>
              <el-alert
                v-for="(insight, index) in habitsData.insights"
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
            <div class="section" v-if="habitsData.timeAnalysis?.length > 0">
              <h3>⭐ Top 5 khung giờ hiệu quả nhất</h3>
              <el-table :data="habitsData.timeAnalysis.slice(0, 5)" stripe>
                <el-table-column label="Giờ" width="120">
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
            <div class="section" v-if="habitsData.durationAnalysis?.length > 0">
              <h3>⏱️ Thời lượng làm việc hiệu quả</h3>
              <div class="duration-cards">
                <el-card
                  v-for="duration in habitsData.durationAnalysis"
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
            <div class="section" v-if="habitsData.dayAnalysis?.length > 0">
              <h3>📅 Hiệu suất theo ngày trong tuần</h3>
              <div class="day-cards">
                <el-card
                  v-for="day in habitsData.dayAnalysis"
                  :key="day.day_name"
                  shadow="hover"
                  class="day-card"
                  :class="{ 'best-day': day.completion_rate === getBestDayRate() }"
                >
                  <div class="day-name">{{ getVietnameseDay(day.day_name) }}</div>
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
      <el-tab-pane label="💡 Lời khuyên" name="advice">
        <el-card>
          <template #header>
            <span>Nhận lời khuyên phù hợp với mục tiêu của bạn</span>
          </template>

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
              :loading="loading"
              style="width: 100%"
            >
              <el-icon><MagicStick /></el-icon>
              Nhận lời khuyên AI
            </el-button>
          </el-form>

          <div v-if="adviceData" class="advice-result">
            <el-divider />
            
            <div class="greeting">
              <h2>{{ adviceData.greeting }}</h2>
            </div>

            <div v-if="adviceData.analysis?.length > 0" class="section">
              <h3>📊 Phân tích tình hình</h3>
              <el-alert
                v-for="(item, index) in adviceData.analysis"
                :key="index"
                type="info"
                :closable="false"
                class="advice-item"
              >
                <div v-html="formatMessage(item)"></div>
              </el-alert>
            </div>

            <div v-if="adviceData.recommendations?.length > 0" class="section">
              <h3>💡 Đề xuất cải thiện</h3>
              <div class="recommendations">
                <div
                  v-for="(item, index) in adviceData.recommendations"
                  :key="index"
                  class="recommendation-item"
                >
                  <el-icon><Check /></el-icon>
                  <span v-html="formatMessage(item)"></span>
                </div>
              </div>
            </div>

            <div v-if="adviceData.actionPlan?.length > 0" class="section">
              <h3>🎯 Kế hoạch hành động</h3>
              <el-timeline>
                <el-timeline-item
                  v-for="week in adviceData.actionPlan"
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

      <!-- TAB 3: AI CHAT -->
      <el-tab-pane label="💬 Chat AI" name="chat">
        <el-card>
          <div class="chat-section">
            <div class="chat-messages" ref="chatMessages">
              <div v-for="(msg, index) in chatHistory" :key="index" :class="['chat-message', msg.type]">
                <div class="message-content">
                  <div v-html="formatMessage(msg.text)"></div>
                  <div class="message-time">{{ formatTime(msg.time) }}</div>
                </div>
              </div>
            </div>

            <div class="chat-input">
              <el-input
                v-model="chatInput"
                placeholder="Hỏi AI về lịch làm việc, quản lý thời gian..."
                @keyup.enter="sendChat"
                :disabled="loading"
              >
                <template #append>
                  <el-button type="primary" @click="sendChat" :loading="loading">
                    <el-icon><Promotion /></el-icon>
                  </el-button>
                </template>
              </el-input>
            </div>

            <div class="quick-prompts">
              <el-button size="small" @click="chatInput = 'Phân tích lịch của tôi'">
                📊 Phân tích lịch
              </el-button>
              <el-button size="small" @click="chatInput = 'Gợi ý quản lý thời gian'">
                ⏰ Quản lý thời gian
              </el-button>
              <el-button size="small" @click="chatInput = 'Tạo lịch tối ưu'">
                📅 Tạo lịch tối ưu
              </el-button>
            </div>
          </div>
        </el-card>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Refresh,
  MagicStick,
  Check,
  Promotion
} from '@element-plus/icons-vue'
import personalAIService from '@/services/personalAI'
import dayjs from 'dayjs'

const activeTab = ref('habits')
const loading = ref(false)

// Data
const habitsData = ref(null)
const adviceData = ref(null)
const chatHistory = ref([
  {
    type: 'ai',
    text: 'Xin chào! Tôi là AI trợ lý cá nhân của bạn. Tôi có thể giúp bạn:\n• Phân tích thói quen làm việc\n• Đưa ra lời khuyên cá nhân\n• Tối ưu hóa lịch trình\n\nBạn cần tôi hỗ trợ gì?',
    time: new Date()
  }
])
const chatInput = ref('')
const chatMessages = ref(null)

// Forms
const adviceForm = ref({
  goal: 'improve_productivity',
  currentStatus: '',
  challenges: ''
})

// Methods
const analyzeHabits = async () => {
  loading.value = true
  try {
    const result = await personalAIService.analyzeHabits()
    if (result.success) {
      habitsData.value = result.data
      ElMessage.success('Phân tích thói quen thành công!')
    } else {
      ElMessage.error(result.message)
    }
  } catch (error) {
    ElMessage.error('Có lỗi xảy ra khi phân tích')
  } finally {
    loading.value = false
  }
}

const getAdvice = async () => {
  if (!adviceForm.value.currentStatus) {
    ElMessage.warning('Vui lòng mô tả tình trạng hiện tại')
    return
  }

  loading.value = true
  try {
    const result = await personalAIService.getPersonalAdvice(adviceForm.value)
    if (result.success) {
      adviceData.value = result.data
      ElMessage.success('Đã nhận lời khuyên từ AI!')
    } else {
      ElMessage.error(result.message)
    }
  } catch (error) {
    ElMessage.error('Có lỗi xảy ra')
  } finally {
    loading.value = false
  }
}

const sendChat = async () => {
  if (!chatInput.value.trim()) return

  const userMessage = chatInput.value.trim()
  chatHistory.value.push({
    type: 'user',
    text: userMessage,
    time: new Date()
  })

  chatInput.value = ''
  scrollToBottom()

  loading.value = true
  try {
    const result = await personalAIService.chat(userMessage)
    if (result.success) {
      chatHistory.value.push({
        type: 'ai',
        text: result.data.message,
        time: new Date()
      })
      scrollToBottom()
    } else {
      ElMessage.error(result.message)
    }
  } catch (error) {
    chatHistory.value.push({
      type: 'ai',
      text: 'Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại sau.',
      time: new Date()
    })
  } finally {
    loading.value = false
  }
}

const scrollToBottom = () => {
  nextTick(() => {
    if (chatMessages.value) {
      chatMessages.value.scrollTop = chatMessages.value.scrollHeight
    }
  })
}

// Helpers
const formatMessage = (text) => {
  return text
    .replace(/\n/g, '<br>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/•/g, '•')
}

const formatTime = (time) => {
  return dayjs(time).format('HH:mm')
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
const getVietnameseDay = (day) => {
  const map = {
    Sunday: "Chủ nhật",
    Monday: "Thứ Hai",
    Tuesday: "Thứ Ba",
    Wednesday: "Thứ Tư",
    Thursday: "Thứ Năm",
    Friday: "Thứ Sáu",
    Saturday: "Thứ Bảy"
  }
  return map[day] || day
}

const getBestDayRate = () => {
  if (!habitsData.value?.dayAnalysis) return 0
  return Math.max(...habitsData.value.dayAnalysis.map(d => parseFloat(d.completion_rate)))
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
.advice-result {
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

.chat-section {
  display: flex;
  flex-direction: column;
  height: 500px;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: #f9fafb;
  border-radius: 8px;
  margin-bottom: 16px;
}

.chat-message {
  display: flex;
  
  &.user {
    justify-content: flex-end;
    
    .message-content {
      background: #2563eb;
      color: white;
      border-radius: 16px 16px 4px 16px;
    }
  }
  
  &.ai {
    justify-content: flex-start;
    
    .message-content {
      background: white;
      border-radius: 16px 16px 16px 4px;
    }
  }
  
  .message-content {
    max-width: 70%;
    padding: 12px 16px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    
    .message-time {
      font-size: 11px;
      color: #9ca3af;
      margin-top: 4px;
    }
  }
}

.chat-input {
  margin-bottom: 12px;
}

.quick-prompts {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
</style>