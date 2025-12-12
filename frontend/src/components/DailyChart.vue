<template>
  <div class="chart-container">
    <Bar :data="chartData" :options="chartOptions" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'
import dayjs from 'dayjs'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const props = defineProps({
  data: {
    type: Array,
    default: () => []
  }
})

const chartData = computed(() => {
  const labels = props.data.map(d => dayjs(d.date).format('DD/MM'))
  const workData = props.data.map(d => Math.round(d.work_minutes / 60))
  const studyData = props.data.map(d => Math.round(d.study_minutes / 60))

  return {
    labels,
    datasets: [
      {
        label: 'Làm việc (giờ)',
        data: workData,
        backgroundColor: '#EF4444',
        borderRadius: 6
      },
      {
        label: 'Học tập (giờ)',
        data: studyData,
        backgroundColor: '#3B82F6',
        borderRadius: 6
      }
    ]
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top'
    },
    tooltip: {
      callbacks: {
        label: (context) => {
          return `${context.dataset.label}: ${context.parsed.y}h`
        }
      }
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        callback: (value) => value + 'h'
      }
    }
  }
}
</script>

<style scoped>
.chart-container {
  height: 300px;
}
</style>