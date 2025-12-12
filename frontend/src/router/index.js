// ==========================================
// FILE: src/router/index.js
// Router với Personal AI Route
// ==========================================

import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/LoginView.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/RegisterView.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    name: 'Dashboard',
    component: () => import('@/views/DashboardView.vue'),
    meta: { requiresAuth: true },
    redirect: '/schedules',
    children: [
      {
        path: 'schedules',
        name: 'Schedules',
        component: () => import('@/views/SchedulesView.vue')
      },
       {
      path: 'profile',
      name: 'Profile',
      component: () => import('@/views/ProfileView.vue'),
      meta: { 
        requiresAuth: true,
        title: '👤 Thông tin cá nhân' 
      }
    },
      {
        path: 'today',
        name: 'Today',
        component: () => import('@/views/TodayView.vue')
      },
      {
        path: 'upcoming',
        name: 'Upcoming',
        component: () => import('@/views/UpcomingView.vue')
      },
      {
        path: 'grid',
        name: 'Grid',
        component: () => import('@/views/GridView.vue')
      },
      {
        path: 'statistics',
        name: 'Statistics',
        component: () => import('@/views/StatisticsView.vue')
      },
      // 🆕 THÊM ROUTE MỚI - PERSONAL AI
      {
        path: 'personal-ai',
        name: 'PersonalAI',
        component: () => import('@/views/PersonalAIView.vue'),
        meta: { 
          requiresAuth: true,
          title: '🤖 AI Cá nhân' 
        }
      }
      
    ]
  }
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

// Navigation guard
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)

  if (requiresAuth && !authStore.isAuthenticated) {
    next('/login')
  } else if (!requiresAuth && authStore.isAuthenticated && to.path === '/login') {
    next('/')
  } else {
    next()
  }
})

export default router