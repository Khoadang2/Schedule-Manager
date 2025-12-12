<template>
  <div class="chart-container">
    <Doughnut :data="chartData" :options="chartOptions" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Doughnut } from 'vue-chartjs'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'

ChartJS.register(ArcElement, Tooltip, Legend)

const props = defineProps({
  data: {
    type: Array,
    default: () => []
  }
})

const chartData = computed(() => {
  const workData = props.data.find(d => d.schedule_type === 'work')
  const studyData = props.data.find(d => d.schedule_type === 'study')

  return {
    labels: ['Làm việc', 'Học tập'],
    datasets: [
      {
        data: [
          workData ? Math.round(workData.total_minutes / 60) : 0,
          studyData ? Math.round(studyData.total_minutes / 60) : 0
        ],
        backgroundColor: ['#EF4444', '#3B82F6'],
        borderWidth: 2,
        borderColor: '#fff'
      }
    ]
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom'
    },
    tooltip: {
      callbacks: {
        label: (context) => {
          const label = context.label || ''
          const value = context.parsed || 0
          return `${label}: ${value}h`
        }
      }
    }
  }
}
</script>

<style scoped>
.chart-container {
  height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>