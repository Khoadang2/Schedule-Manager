<template>
  <div class="sidebar">
    <div class="sidebar-header">
      <h2>📅 Lịch Của Tôi</h2>
    </div>

    <el-menu
      :default-active="activeRoute"
      class="sidebar-menu"
      router
    >
      <el-menu-item index="/schedules">
        <el-icon><Search /></el-icon>
        <span>Tìm kiếm</span>
      </el-menu-item>

      <el-menu-item index="/upcoming">
        <el-icon><Message /></el-icon>
        <span>Hộp thư đến</span>
      </el-menu-item>

      <el-menu-item index="/today">
        <el-icon><Calendar /></el-icon>
        <span>Hôm nay</span>
        <el-badge :value="todayCount" v-if="todayCount > 0" class="badge" />
      </el-menu-item>

      <el-menu-item index="/grid">
        <el-icon><Grid /></el-icon>
        <span>Sắp tới</span>
      </el-menu-item>

      <el-menu-item index="/statistics">
        <el-icon><TrendCharts /></el-icon>
        <span>Thống kê</span>
      </el-menu-item>

      <el-divider />

      <!-- ⭐ AI CÁ NHÂN -->
      <el-menu-item index="/personal-ai" class="ai-menu-item">
        <el-icon><MagicStick /></el-icon>
        <span>🤖 AI Cá nhân</span>
        <el-badge value="NEW" type="danger" class="new-badge" />
      </el-menu-item>

      <el-divider />

      <!-- ⭐ BỘ LỌC & NHÃN -->
      <el-sub-menu index="filters">
        <template #title>
          <el-icon><Filter /></el-icon>
          <span>Bộ lọc & Nhãn</span>
        </template>
        
        <!-- Làm việc -->
        <el-menu-item @click="handleFilterClick('work')">
          <span class="filter-dot" style="background: #ef4444"></span>
          Làm việc
          <el-badge 
            :value="workCount" 
            v-if="workCount > 0" 
            class="filter-badge"
            type="danger"
          />
        </el-menu-item>
        
        <!-- Học tập -->
        <el-menu-item @click="handleFilterClick('study')">
          <span class="filter-dot" style="background: #3b82f6"></span>
          Học tập
          <el-badge 
            :value="studyCount" 
            v-if="studyCount > 0" 
            class="filter-badge"
            type="primary"
          />
        </el-menu-item>
      </el-sub-menu>
    </el-menu>

    <!-- Bottom Actions -->
    <div class="sidebar-footer">
      <el-button type="primary" @click="showAIChat" style="width: 100%">
        <el-icon><ChatDotRound /></el-icon>
        AI Chat nhanh
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { 
  Search, 
  Message, 
  Calendar, 
  Grid,
  TrendCharts,
  Filter,
  ChatDotRound,
  MagicStick
} from '@element-plus/icons-vue'
import { useScheduleStore } from '@/stores/schedule'
import dayjs from 'dayjs'

const route = useRoute()
const router = useRouter()
const scheduleStore = useScheduleStore()

const activeRoute = computed(() => route.path)

// Đếm lịch hôm nay chưa hoàn thành
const todayCount = computed(() => {
  const today = dayjs().format('YYYY-MM-DD')
  return scheduleStore.schedules.filter(s => {
    const scheduleDate = dayjs(s.start_time).format('YYYY-MM-DD')
    return scheduleDate === today && !s.is_completed
  }).length
})

// Đếm lịch làm việc
const workCount = computed(() => {
  return scheduleStore.schedules.filter(s => s.schedule_type === 'work').length
})

// Đếm lịch học tập
const studyCount = computed(() => {
  return scheduleStore.schedules.filter(s => s.schedule_type === 'study').length
})

// ⭐ XỬ LÝ FILTER CLICK
const handleFilterClick = (type) => {
  console.log('🔍 Filter clicked:', type)
  
  // Navigate to schedules view with filter
  router.push({ 
    path: '/schedules', 
    query: { filter: type } 
  })
  
  // Trigger filter in store
  scheduleStore.selectedSubject = null
  scheduleStore.filterType = type
}

// Show AI Chat
const showAIChat = () => {
  window.dispatchEvent(new CustomEvent('show-ai-chat'))
}
</script>

<style scoped lang="scss">
.sidebar {
  width: 280px;
  background: #ffffff;
  border-right: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.sidebar-header {
  padding: 24px 20px;
  border-bottom: 1px solid #e5e7eb;

  h2 {
    font-size: 20px;
    font-weight: 600;
    color: #1f2937;
    margin: 0;
  }
}

.sidebar-menu {
  flex: 1;
  border: none;
  padding: 12px 8px;
  overflow-y: auto;

  .el-menu-item {
    border-radius: 8px;
    margin-bottom: 4px;
    position: relative;

    &:hover {
      background: #f3f4f6;
    }

    &.is-active {
      background: #eff6ff;
      color: #2563eb;
    }
    
    // ⭐ Style cho AI menu
    &.ai-menu-item {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      font-weight: 600;
      
      &:hover {
        background: linear-gradient(135deg, #5568d3 0%, #63408a 100%);
      }
      
      &.is-active {
        background: linear-gradient(135deg, #5568d3 0%, #63408a 100%);
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
      }
    }
  }

  .badge {
    position: absolute;
    right: 12px;
  }
  
  .new-badge {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
  }

  .filter-badge {
    position: absolute;
    right: 12px;
  }
}

.filter-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 8px;
}

.sidebar-footer {
  padding: 16px;
  border-top: 1px solid #e5e7eb;
}

.el-divider {
  margin: 8px 0;
}

// ⭐ Style cho submenu items
:deep(.el-sub-menu__title) {
  border-radius: 8px !important;
  
  &:hover {
    background: #f3f4f6 !important;
  }
}

:deep(.el-menu--inline .el-menu-item) {
  border-radius: 8px;
  margin: 4px 8px;
  padding-left: 48px !important;
  
  &:hover {
    background: #f3f4f6;
  }
}
</style>