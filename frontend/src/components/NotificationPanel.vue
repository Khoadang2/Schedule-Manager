<template>
  <el-drawer
    v-model="visible"
    title="🔔 Thông báo"
    direction="rtl"
    size="400px"
  >
    <div class="notification-panel">
      <!-- Header Actions -->
      <div class="panel-actions">
        <el-button size="small" @click="markAllAsRead" :disabled="unreadCount === 0">
          Đánh dấu tất cả đã đọc
        </el-button>
      </div>

      <!-- Notifications List -->
      <div class="notifications-list" v-loading="notificationStore.loading">
        <div
          v-for="notification in notifications"
          :key="notification.notification_id"
          :class="['notification-item', { 'unread': !notification.is_read }]"
          @click="handleNotificationClick(notification)"
        >
          <div class="notification-icon" :class="notification.notification_type">
            <el-icon>
              <Bell v-if="notification.notification_type === 'reminder'" />
              <InfoFilled v-else-if="notification.notification_type === 'info'" />
              <WarningFilled v-else />
            </el-icon>
          </div>

          <div class="notification-content">
            <div class="notification-title">{{ notification.title }}</div>
            <div class="notification-message">{{ notification.message }}</div>
            <div class="notification-time">
              {{ formatTime(notification.created_at) }}
            </div>
          </div>

          <el-button
            circle
            size="small"
            @click.stop="deleteNotification(notification.notification_id)"
          >
            <el-icon><Close /></el-icon>
          </el-button>
        </div>

        <!-- Empty State -->
        <el-empty
          v-if="notifications.length === 0"
          description="Không có thông báo nào"
          :image-size="100"
        />
      </div>
    </div>
  </el-drawer>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { 
  Bell, 
  InfoFilled, 
  WarningFilled, 
  Close 
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useNotificationStore } from '@/stores/notification'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/vi'

dayjs.extend(relativeTime)
dayjs.locale('vi')

const notificationStore = useNotificationStore()
const visible = ref(false)

const notifications = computed(() => notificationStore.notifications)
const unreadCount = computed(() => notificationStore.unreadCount)

const formatTime = (time) => {
  return dayjs(time).fromNow()
}

const togglePanel = () => {
  visible.value = !visible.value
  if (visible.value) {
    notificationStore.fetchNotifications()
  }
}

const handleNotificationClick = async (notification) => {
  if (!notification.is_read) {
    await notificationStore.markAsRead(notification.notification_id)
  }
}

const markAllAsRead = async () => {
  const result = await notificationStore.markAllAsRead()
  if (result.success) {
    ElMessage.success('Đã đánh dấu tất cả đã đọc')
  }
}

const deleteNotification = async (id) => {
  const result = await notificationStore.deleteNotification(id)
  if (result.success) {
    ElMessage.success('Đã xóa thông báo')
  }
}

onMounted(() => {
  window.addEventListener('toggle-notifications', togglePanel)
  notificationStore.fetchNotifications()
})

onUnmounted(() => {
  window.removeEventListener('toggle-notifications', togglePanel)
})
</script>

<style scoped lang="scss">
.notification-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.panel-actions {
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
}

.notifications-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.notification-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 12px;
  cursor: pointer;
  transition: all 0.2s;
  background: white;
  border: 1px solid #e5e7eb;

  &:hover {
    background: #f9fafb;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }

  &.unread {
    background: #eff6ff;
    border-color: #3b82f6;

    .notification-title {
      font-weight: 600;
    }
  }

  .notification-icon {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    &.reminder {
      background: #fef3c7;
      color: #f59e0b;
    }

    &.info {
      background: #dbeafe;
      color: #3b82f6;
    }

    &.warning {
      background: #fee2e2;
      color: #ef4444;
    }

    .el-icon {
      font-size: 20px;
    }
  }

  .notification-content {
    flex: 1;

    .notification-title {
      font-size: 14px;
      color: #1f2937;
      margin-bottom: 4px;
    }

    .notification-message {
      font-size: 13px;
      color: #6b7280;
      margin-bottom: 8px;
      line-height: 1.5;
    }

    .notification-time {
      font-size: 12px;
      color: #9ca3af;
    }
  }
}
</style>