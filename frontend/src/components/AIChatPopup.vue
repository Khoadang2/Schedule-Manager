<template>
  <el-dialog
    v-model="visible"
    title="🤖 AI Trợ lý thông minh"
    width="600px"
    :close-on-click-modal="false"
  >
    <div class="chat-container">
      <div class="chat-messages" ref="messagesRef">
        <div
          v-for="(msg, index) in messages"
          :key="index"
          :class="['message', msg.type]"
        >
          <div v-if="msg.type === 'ai'" class="message-avatar">
            <el-avatar :size="32">🤖</el-avatar>
          </div>
          <div class="message-content">
            <div class="message-text" v-html="formatMessage(msg.text)"></div>
            <div class="message-time">{{ formatTime(msg.time) }}</div>
          </div>
          <div v-if="msg.type === 'user'" class="message-avatar">
            <el-avatar :size="32">{{ userInitial }}</el-avatar>
          </div>
        </div>

        <div v-if="loading" class="message ai">
          <div class="message-avatar">
            <el-avatar :size="32">🤖</el-avatar>
          </div>
          <div class="message-content">
            <el-skeleton :rows="2" animated />
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="quick-actions" v-if="messages.length === 0">
        <el-button
          v-for="action in quickActions"
          :key="action.text"
          size="small"
          @click="sendMessage(action.message)"
        >
          {{ action.text }}
        </el-button>
      </div>

      <!-- Input -->
      <div class="chat-input">
        <el-input
          v-model="inputMessage"
          placeholder="Nhập câu hỏi của bạn..."
          @keyup.enter="handleSend"
          :disabled="loading"
        >
          <template #append>
            <el-button
              type="primary"
              :loading="loading"
              @click="handleSend"
              :disabled="!inputMessage.trim()"
            >
              <el-icon><Promotion /></el-icon>
            </el-button>
          </template>
        </el-input>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import { Promotion } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import api from '@/services/api'
import dayjs from 'dayjs'

const authStore = useAuthStore()
const visible = ref(false)
const messages = ref([])
const inputMessage = ref('')
const loading = ref(false)
const messagesRef = ref(null)

const userInitial = computed(() => {
  return authStore.user?.hoten?.charAt(0).toUpperCase() || 'U'
})

const quickActions = [
  { text: '📅 Phân tích lịch của tôi', message: 'Phân tích lịch làm việc và học tập của tôi' },
  { text: '💡 Gợi ý quản lý thời gian', message: 'Cho tôi gợi ý về quản lý thời gian hiệu quả' },
  { text: '📊 Đánh giá hiệu suất', message: 'Đánh giá hiệu suất làm việc của tôi' },
  { text: '🎯 Tạo lịch tối ưu', message: 'Giúp tôi tạo lịch làm việc tối ưu' }
]

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

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesRef.value) {
      messagesRef.value.scrollTop = messagesRef.value.scrollHeight
    }
  })
}

const sendMessage = async (message) => {
  const text = message || inputMessage.value.trim()
  if (!text) return

  // Add user message
  messages.value.push({
    type: 'user',
    text,
    time: new Date()
  })

  inputMessage.value = ''
  scrollToBottom()

  // Send to API
  loading.value = true
  try {
    const response = await api.post('/personal-ai/chat', {
      message: text
    })

    if (response.data.success) {
      messages.value.push({
        type: 'ai',
        text: response.data.data.message,
        time: new Date()
      })
      scrollToBottom()
    }
  } catch (error) {
    console.error('AI Chat Error:', error)
    messages.value.push({
      type: 'ai',
      text: 'Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại sau.',
      time: new Date()
    })
  } finally {
    loading.value = false
  }
}

const handleSend = () => {
  sendMessage()
}

const showChat = () => {
  visible.value = true
  if (messages.value.length === 0) {
    messages.value.push({
      type: 'ai',
      text: `Xin chào ${authStore.user?.hoten}! 👋\n\nTôi là AI trợ lý của bạn. Tôi có thể giúp bạn:\n• Phân tích lịch làm việc và học tập\n• Đề xuất cách sắp xếp thời gian hiệu quả\n• Gợi ý cải thiện năng suất\n• Tạo kế hoạch học tập/làm việc tối ưu\n\nBạn cần tôi hỗ trợ gì?`,
      time: new Date()
    })
  }
}

onMounted(() => {
  window.addEventListener('show-ai-chat', showChat)
})

onUnmounted(() => {
  window.removeEventListener('show-ai-chat', showChat)
})
</script>

<style scoped lang="scss">
.chat-container {
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
}

.message {
  display: flex;
  gap: 12px;
  animation: fadeIn 0.3s;

  &.user {
    flex-direction: row-reverse;

    .message-content {
      background: #2563eb;
      color: white;
      border-radius: 16px 16px 4px 16px;
    }

    .message-time {
      text-align: right;
      color: rgba(255, 255, 255, 0.8);
    }
  }

  &.ai {
    .message-content {
      background: #f3f4f6;
      color: #1f2937;
      border-radius: 16px 16px 16px 4px;
    }
  }

  .message-avatar {
    flex-shrink: 0;
  }

  .message-content {
    max-width: 70%;
    padding: 12px 16px;

    .message-text {
      margin-bottom: 4px;
      line-height: 1.6;
      word-wrap: break-word;
    }

    .message-time {
      font-size: 11px;
      color: #6b7280;
    }
  }
}

.quick-actions {
  padding: 16px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  border-top: 1px solid #e5e7eb;
}

.chat-input {
  padding: 16px;
  border-top: 1px solid #e5e7eb;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>