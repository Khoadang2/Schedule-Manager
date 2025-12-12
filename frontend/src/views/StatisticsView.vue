<template>
  <div class="statistics-view">
    <div class="view-header">
      <h1>📊 Thống kê & Báo cáo</h1>
      
      <!-- Date Range Picker -->
      <el-date-picker
        v-model="dateRange"
        type="daterange"
        range-separator="-"
        start-placeholder="Từ ngày"
        end-placeholder="Đến ngày"
        format="DD/MM/YYYY"
        @change="fetchStatistics"
      />
    </div>

    <!-- Overview Cards -->
    <div class="stats-cards" v-loading="loading">
      <el-card class="stat-card">
        <div class="stat-icon calendar">
          <el-icon><Calendar /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.total || 0 }}</div>
          <div class="stat-label">Tổng số lịch</div>
        </div>
      </el-card>

      <el-card class="stat-card">
        <div class="stat-icon check">
          <el-icon><Check /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.completed || 0 }}</div>
          <div class="stat-label">Đã hoàn thành</div>
          <div class="stat-badge success">{{ stats.completion_rate || 0 }}%</div>
        </div>
      </el-card>

      <el-card class="stat-card">
        <div class="stat-icon work">
          <el-icon><Briefcase /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.work_hours || 0 }}h</div>
          <div class="stat-label">Làm việc</div>
        </div>
      </el-card>

      <el-card class="stat-card">
        <div class="stat-icon study">
          <el-icon><Reading /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.study_hours || 0 }}h</div>
          <div class="stat-label">Học tập</div>
        </div>
      </el-card>
    </div>

    <!-- Charts -->
    <el-row :gutter="24">
      <!-- Daily Chart -->
      <el-col :span="16">
        <el-card class="chart-card">
          <template #header>
            <span>Biểu đồ theo ngày</span>
          </template>
          <div ref="dailyChart" style="height: 400px"></div>
        </el-card>
      </el-col>

      <!-- Pie Chart -->
      <el-col :span="8">
        <el-card class="chart-card">
          <template #header>
            <span>Phân chia Làm việc / Học tập</span>
          </template>
          <div ref="pieChart" style="height: 400px"></div>
        </el-card>
      </el-col>
    </el-row>

    <!-- Weekly Comparison -->
    <el-card class="comparison-card">
      <template #header>
        <span>So sánh với tuần trước</span>
      </template>
      <div v-if="comparison" class="comparison-content">
        <div class="comparison-item">
          <span class="label">Tuần này:</span>
          <span class="value">{{ comparison.current_week }} lịch</span>
        </div>
        <div class="comparison-item">
          <span class="label">Tuần trước:</span>
          <span class="value">{{ comparison.last_week }} lịch</span>
        </div>
        <div class="comparison-item">
          <span class="label">Thay đổi:</span>
          <span :class="['value', comparison.trend]">
            {{ comparison.change > 0 ? '+' : '' }}{{ comparison.change }}%
            <el-icon v-if="comparison.trend === 'up'"><ArrowUp /></el-icon>
            <el-icon v-if="comparison.trend === 'down'"><ArrowDown /></el-icon>
          </span>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { 
  Calendar, 
  Check, 
  Briefcase, 
  Reading,
  ArrowUp,
  ArrowDown
} from '@element-plus/icons-vue'
import api from '@/services/api'
import dayjs from 'dayjs'
import * as echarts from 'echarts'

const loading = ref(false)
const dateRange = ref([
  dayjs().subtract(7, 'day').toDate(),
  dayjs().toDate()
])

const stats = ref({
  total: 0,
  completed: 0,
  completion_rate: 0,
  work_hours: 0,
  study_hours: 0
})

const dailyChartData = ref([])
const typeDistribution = ref([])
const comparison = ref(null)

const dailyChart = ref(null)
const pieChart = ref(null)

// Fetch statistics
const fetchStatistics = async () => {
  loading.value = true
  try {
    const [start, end] = dateRange.value
    const params = {
      start_date: dayjs(start).format('YYYY-MM-DD'),
      end_date: dayjs(end).format('YYYY-MM-DD')
    }

    console.log('📊 Fetching statistics with params:', params)

    // 1. Overview
    const overviewRes = await api.get('/statistics/overview', { params })
    if (overviewRes.data.success) {
      stats.value = overviewRes.data.data
      console.log('✅ Overview data:', stats.value)
    }

    // 2. Daily Chart
    const chartRes = await api.get('/statistics/daily-chart', { params })
    if (chartRes.data.success) {
      dailyChartData.value = chartRes.data.data
      console.log('✅ Daily chart data:', dailyChartData.value)
      await nextTick()
      renderDailyChart()
    }

    // 3. Type Distribution - ALSO pass params
    const typeRes = await api.get('/statistics/type-distribution', { params })
    if (typeRes.data.success) {
      typeDistribution.value = typeRes.data.data
      console.log('✅ Type distribution:', typeDistribution.value)
      await nextTick()
      renderPieChart()
    }

    // 4. Weekly Comparison - Không cần params, luôn so sánh 2 tuần gần nhất
    const compRes = await api.get('/statistics/weekly-comparison')
    if (compRes.data.success) {
      comparison.value = compRes.data.data
      console.log('✅ Weekly comparison:', comparison.value)
    }

  } catch (error) {
    console.error('❌ Fetch statistics error:', error)
    ElMessage.error('Lỗi khi tải thống kê')
  } finally {
    loading.value = false
  }
}

// Render Daily Chart
const renderDailyChart = () => {
  if (!dailyChart.value) return

  const chart = echarts.init(dailyChart.value)

  // Process data
  const dates = [...new Set(dailyChartData.value.map(d => d.date))].sort()
  const workData = dates.map(date => {
    const item = dailyChartData.value.find(d => d.date === date && d.schedule_type === 'work')
    return item ? item.hours : 0
  })
  const studyData = dates.map(date => {
    const item = dailyChartData.value.find(d => d.date === date && d.schedule_type === 'study')
    return item ? item.hours : 0
  })

  const option = {
    tooltip: {
      trigger: 'axis'
    },
    legend: {
      data: ['Làm việc (giờ)', 'Học tập (giờ)']
    },
    xAxis: {
      type: 'category',
      data: dates.map(d => dayjs(d).format('DD/MM'))
    },
    yAxis: {
      type: 'value',
      name: 'Giờ'
    },
    series: [
      {
        name: 'Làm việc (giờ)',
        type: 'bar',
        data: workData,
        itemStyle: { color: '#ef4444' }
      },
      {
        name: 'Học tập (giờ)',
        type: 'bar',
        data: studyData,
        itemStyle: { color: '#3b82f6' }
      }
    ]
  }

  chart.setOption(option)
}

// Render Pie Chart
const renderPieChart = () => {
  if (!pieChart.value) return

  const chart = echarts.init(pieChart.value)

  const data = typeDistribution.value.map(item => ({
    name: item.type === 'work' ? 'Làm việc' : 'Học tập',
    value: item.hours
  }))

  const option = {
    tooltip: {
      trigger: 'item'
    },
    legend: {
      orient: 'vertical',
      left: 'left'
    },
    series: [
      {
        type: 'pie',
        radius: '60%',
        data: data,
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }
    ]
  }

  chart.setOption(option)
}

onMounted(() => {
  fetchStatistics()
})
</script>

<style scoped lang="scss">
.statistics-view {
  max-width: 1400px;
  margin: 0 auto;
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;

  h1 {
    font-size: 28px;
    font-weight: 700;
    color: #1f2937;
    margin: 0;
  }
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 24px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;

  .stat-icon {
    width: 60px;
    height: 60px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;

    &.calendar {
      background: #dbeafe;
      color: #3b82f6;
    }

    &.check {
      background: #d1fae5;
      color: #10b981;
    }

    &.work {
      background: #fee2e2;
      color: #ef4444;
    }

    &.study {
      background: #e0e7ff;
      color: #6366f1;
    }
  }

  .stat-content {
    flex: 1;

    .stat-value {
      font-size: 32px;
      font-weight: 700;
      color: #1f2937;
    }

    .stat-label {
      font-size: 14px;
      color: #6b7280;
      margin-top: 4px;
    }

    .stat-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 12px;
      margin-top: 8px;

      &.success {
        background: #d1fae5;
        color: #059669;
      }
    }
  }
}

.chart-card {
  margin-bottom: 24px;
}

.comparison-card {
  .comparison-content {
    display: flex;
    gap: 48px;

    .comparison-item {
      display: flex;
      flex-direction: column;
      gap: 8px;

      .label {
        font-size: 14px;
        color: #6b7280;
      }

      .value {
        font-size: 24px;
        font-weight: 600;

        &.up {
          color: #10b981;
        }

        &.down {
          color: #ef4444;
        }
      }
    }
  }
}
</style>