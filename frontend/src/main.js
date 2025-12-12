import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

// ⭐ Import API service
import api, { testConnection } from './services/api'

// ⭐ Import dayjs
import dayjs from 'dayjs'
import 'dayjs/locale/vi'
import relativeTime from 'dayjs/plugin/relativeTime'
import weekday from 'dayjs/plugin/weekday'

// Setup dayjs
dayjs.locale('vi')
dayjs.extend(relativeTime)
dayjs.extend(weekday)

// Create app
const app = createApp(App)
const pinia = createPinia()

// Register Element Plus Icons
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

// ⭐ Make api available globally
app.config.globalProperties.$api = api
window.$api = api

// ⭐ Test backend connection on startup
testConnection().then(connected => {
  if (connected) {
    console.log('✅ Backend connection OK')
  } else {
    console.error('❌ Cannot connect to backend. Please check:')
    console.error('1. Backend server is running on port 3000')
    console.error('2. VUE_APP_API_URL in .env is correct')
    console.error('3. CORS is configured properly')
  }
})

// Use plugins
app.use(pinia)
app.use(router)
app.use(ElementPlus)

// Mount app
app.mount('#app')

console.log('✅ Frontend app mounted')
console.log('📍 API URL:', process.env.VUE_APP_API_URL)