<template>
  <div class="dashboard-container">
    <!-- Sidebar -->
    <AppSidebar />

    <!-- Main Content -->
    <div class="main-content">
      <!-- Header -->
      <AppHeader />

      <!-- Content Area -->
      <div class="content-area">
        <router-view />
      </div>
    </div>

    <!-- AI Chat Popup -->
    <AIChatPopup />

    <!-- Notification Panel -->
    <NotificationPanel />
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import AppSidebar from '@/components/AppSidebar.vue'
import AppHeader from '@/components/AppHeader.vue'
import AIChatPopup from '@/components/AIChatPopup.vue'
import NotificationPanel from '@/components/NotificationPanel.vue'
import { useScheduleStore } from '@/stores/schedule'
import { useNotificationStore } from '@/stores/notification'

const scheduleStore = useScheduleStore()
const notificationStore = useNotificationStore()

onMounted(async () => {
  await scheduleStore.fetchWeekSchedules()
  await notificationStore.fetchNotifications()
  
  // Create reminders every 5 minutes
  setInterval(() => {
    notificationStore.createReminders()
  }, 5 * 60 * 1000)
})
</script>

<style scoped lang="scss">
.dashboard-container {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.content-area {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  background: #f5f7fa;
}
</style>