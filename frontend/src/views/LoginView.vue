<template>
  <div class="login-container">
    <div class="login-background">
      <div class="shape shape-1"></div>
      <div class="shape shape-2"></div>
      <div class="shape shape-3"></div>
    </div>

    <div class="login-content">
      <div class="login-box">
        <div class="login-header">
          <div class="logo">
            <div class="logo-icon"></div>
            <h1>SCHEDULE</h1>
          </div>
          <p class="tagline">Quản lý thời gian thông minh</p>
        </div>

        <el-form :model="form" :rules="rules" ref="loginFormRef" class="login-form">
          <el-form-item prop="taikhoan">
            <el-input
              v-model="form.taikhoan"
              placeholder="Tài khoản"
              size="large"
              :prefix-icon="User"
              clearable
            />
          </el-form-item>

          <el-form-item prop="matkhau">
            <el-input
              v-model="form.matkhau"
              type="password"
              placeholder="Mật khẩu"
              size="large"
              :prefix-icon="Lock"
              show-password
              @keyup.enter="handleLogin"
            />
          </el-form-item>

          <el-form-item>
            <div class="form-options">
              <el-checkbox v-model="form.remember">Ghi nhớ đăng nhập</el-checkbox>
              <el-button link type="primary" @click="showForgotPassword = true">
                Quên mật khẩu?
              </el-button>
            </div>
          </el-form-item>

          <el-form-item>
            <el-button
              type="primary"
              size="large"
              :loading="loading"
              @click="handleLogin"
              class="login-button"
            >
              <span v-if="!loading">Đăng nhập</span>
              <span v-else>Đang đăng nhập...</span>
            </el-button>
          </el-form-item>

          <div class="register-link">
            Chưa có tài khoản? 
            <router-link to="/register">
              <strong>Đăng ký ngay</strong>
            </router-link>
          </div>

          <div class="features">
            <div class="feature-item">
              <el-icon><Calendar /></el-icon>
              <span>Quản lý lịch</span>
            </div>
            <div class="feature-item">
              <el-icon><TrendCharts /></el-icon>
              <span>Thống kê</span>
            </div>
            <div class="feature-item">
              <el-icon><ChatDotRound /></el-icon>
              <span>AI Trợ lý</span>
            </div>
          </div>
        </el-form>
      </div>
    </div>

    <!-- Forgot Password Dialog -->
    <el-dialog v-model="showForgotPassword" title="Quên mật khẩu" width="90%" :style="{ maxWidth: '450px' }">
      <el-form :model="forgotForm" ref="forgotFormRef">
        <el-form-item label="Email" prop="email">
          <el-input v-model="forgotForm.email" placeholder="Nhập email đã đăng ký" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showForgotPassword = false">Hủy</el-button>
        <el-button type="primary" @click="handleForgotPassword" :loading="forgotLoading">
          Gửi yêu cầu
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User, Lock, Calendar, TrendCharts, ChatDotRound } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const loginFormRef = ref()
const forgotFormRef = ref()
const loading = ref(false)
const forgotLoading = ref(false)
const showForgotPassword = ref(false)

const form = reactive({
  taikhoan: '',
  matkhau: '',
  remember: false
})

const forgotForm = reactive({
  email: ''
})

const rules = {
  taikhoan: [
    { required: true, message: 'Vui lòng nhập tài khoản', trigger: 'blur' }
  ],
  matkhau: [
    { required: true, message: 'Vui lòng nhập mật khẩu', trigger: 'blur' }
  ]
}

const handleLogin = async () => {
  if (!loginFormRef.value) return

  await loginFormRef.value.validate(async (valid) => {
    if (valid) {
      loading.value = true
      const result = await authStore.login(form)
      loading.value = false

      if (result.success) {
        ElMessage.success('Đăng nhập thành công! Chào mừng bạn trở lại 👋')
        setTimeout(() => {
          router.push('/')
        }, 500)
      } else {
        ElMessage.error(result.message)
      }
    }
  })
}

const handleForgotPassword = async () => {
  if (!forgotForm.email) {
    ElMessage.warning('Vui lòng nhập email')
    return
  }

  forgotLoading.value = true
  const result = await authStore.forgotPassword(forgotForm.email)
  forgotLoading.value = false

  if (result.success) {
    ElMessage.success(result.message)
    showForgotPassword.value = false
    forgotForm.email = ''
  } else {
    ElMessage.error(result.message)
  }
}
</script>

<style scoped lang="scss">
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

  @media (max-width: 768px) {
    padding: 0;
  }
}

.login-background {
  position: absolute;
  width: 100%;
  height: 100%;
  overflow: hidden;

  .shape {
    position: absolute;
    border-radius: 50%;
    filter: blur(60px);
    opacity: 0.5;
    animation: float 20s infinite ease-in-out;
  }

  .shape-1 {
    width: 400px;
    height: 400px;
    background: rgba(255, 255, 255, 0.1);
    top: -100px;
    left: -100px;
    animation-delay: 0s;
  }

  .shape-2 {
    width: 500px;
    height: 500px;
    background: rgba(255, 255, 255, 0.08);
    bottom: -150px;
    right: -150px;
    animation-delay: 5s;
  }

  .shape-3 {
    width: 300px;
    height: 300px;
    background: rgba(255, 255, 255, 0.06);
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    animation-delay: 10s;
  }
}

@keyframes float {
  0%, 100% {
    transform: translate(0, 0) rotate(0deg);
  }
  33% {
    transform: translate(30px, -50px) rotate(120deg);
  }
  66% {
    transform: translate(-20px, 20px) rotate(240deg);
  }
}

.login-content {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 450px;

  @media (max-width: 768px) {
    max-width: 100%;
  }
}

.login-box {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  padding: 48px 40px;
  animation: slideUp 0.6s ease-out;

  @media (max-width: 768px) {
    border-radius: 0;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 32px 24px;
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.login-header {
  text-align: center;
  margin-bottom: 40px;

  .logo {
    margin-bottom: 12px;

    .logo-icon {
      font-size: 56px;
      margin-bottom: 12px;
      animation: bounce 2s infinite;
    }

    h1 {
      font-size: 32px;
      font-weight: 800;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin: 0;
    }
  }

  .tagline {
    color: #6b7280;
    font-size: 15px;
    margin: 0;
  }
}

@keyframes bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

.login-form {
  .el-form-item {
    margin-bottom: 24px;
  }

  :deep(.el-input__inner) {
    height: 48px;
    font-size: 15px;
  }
}

.form-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}

.login-button {
  width: 100%;
  height: 50px;
  font-size: 16px;
  font-weight: 600;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  transition: all 0.3s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
  }

  &:active {
    transform: translateY(0);
  }
}

.register-link {
  text-align: center;
  margin-top: 24px;
  color: #6b7280;
  font-size: 15px;

  a {
    color: #667eea;
    text-decoration: none;
    margin-left: 4px;

    strong {
      font-weight: 600;
    }

    &:hover {
      color: #764ba2;
      text-decoration: underline;
    }
  }
}

.features {
  display: flex;
  justify-content: space-around;
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid #e5e7eb;

  .feature-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    color: #6b7280;
    font-size: 13px;

    .el-icon {
      font-size: 24px;
      color: #667eea;
    }
  }

  @media (max-width: 768px) {
    gap: 16px;

    .feature-item {
      font-size: 12px;

      .el-icon {
        font-size: 20px;
      }
    }
  }
}
</style>