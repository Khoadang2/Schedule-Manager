<template>
  <div class="register-container">
    <div class="register-box">
      <div class="register-header">
        <h1>ĐĂNG KÝ TÀI KHOẢN</h1>
        <p>Tạo tài khoản mới để bắt đầu</p>
      </div>

      <el-form :model="form" :rules="rules" ref="registerFormRef" class="register-form">
        <el-form-item prop="taikhoan">
          <el-input
            v-model="form.taikhoan"
            placeholder="Tài khoản (tối thiểu 3 ký tự)"
            size="large"
            :prefix-icon="User"
          />
        </el-form-item>

        <el-form-item prop="hoten">
          <el-input
            v-model="form.hoten"
            placeholder="Họ và tên"
            size="large"
            :prefix-icon="User"
          />
        </el-form-item>

        <el-form-item prop="email">
          <el-input
            v-model="form.email"
            placeholder="Email"
            size="large"
            :prefix-icon="Message"
          />
        </el-form-item>

        <el-form-item prop="sodienthoai">
          <el-input
            v-model="form.sodienthoai"
            placeholder="Số điện thoại (nếu cần)"
            size="large"
            :prefix-icon="Phone"
          />
        </el-form-item>

        <el-form-item prop="matkhau">
          <el-input
            v-model="form.matkhau"
            type="password"
            placeholder="Mật khẩu (tối thiểu 6 ký tự)"
            size="large"
            :prefix-icon="Lock"
            show-password
          />
        </el-form-item>

        <el-form-item prop="confirmPassword">
          <el-input
            v-model="form.confirmPassword"
            type="password"
            placeholder="Xác nhận mật khẩu"
            size="large"
            :prefix-icon="Lock"
            show-password
            @keyup.enter="handleRegister"
          />
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            size="large"
            :loading="loading"
            @click="handleRegister"
            style="width: 100%"
          >
            Đăng ký
          </el-button>
        </el-form-item>

        <div class="login-link">
          Đã có tài khoản? 
          <router-link to="/login">Đăng nhập ngay</router-link>
        </div>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User, Lock, Message, Phone } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const registerFormRef = ref()
const loading = ref(false)

const form = reactive({
  taikhoan: '',
  hoten: '',
  email: '',
  sodienthoai: '',
  matkhau: '',
  confirmPassword: ''
})

const validateConfirmPassword = (rule, value, callback) => {
  if (value !== form.matkhau) {
    callback(new Error('Mật khẩu xác nhận không khớp'))
  } else {
    callback()
  }
}

const rules = {
  taikhoan: [
    { required: true, message: 'Vui lòng nhập tài khoản', trigger: 'blur' },
    { min: 3, message: 'Tài khoản phải có ít nhất 3 ký tự', trigger: 'blur' }
  ],
  hoten: [
    { required: true, message: 'Vui lòng nhập họ tên', trigger: 'blur' }
  ],
  email: [
    { required: true, message: 'Vui lòng nhập email', trigger: 'blur' },
    { type: 'email', message: 'Email không hợp lệ', trigger: 'blur' }
  ],
  matkhau: [
    { required: true, message: 'Vui lòng nhập mật khẩu', trigger: 'blur' },
    { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: 'Vui lòng xác nhận mật khẩu', trigger: 'blur' },
    { validator: validateConfirmPassword, trigger: 'blur' }
  ]
}

const handleRegister = async () => {
  if (!registerFormRef.value) return

  await registerFormRef.value.validate(async (valid) => {
    if (valid) {
      loading.value = true
      const result = await authStore.register({
        taikhoan: form.taikhoan,
        hoten: form.hoten,
        email: form.email,
        sodienthoai: form.sodienthoai,
        matkhau: form.matkhau
      })
      loading.value = false

      if (result.success) {
        ElMessage.success(result.message)
        router.push('/login')
      } else {
        ElMessage.error(result.message)
      }
    }
  })
}
</script>

<style scoped lang="scss">
.register-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.register-box {
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  padding: 40px;
  width: 100%;
  max-width: 480px;
}

.register-header {
  text-align: center;
  margin-bottom: 32px;

  h1 {
    font-size: 28px;
    color: #333;
    margin-bottom: 8px;
  }

  p {
    color: #666;
    font-size: 14px;
  }
}

.login-link {
  text-align: center;
  margin-top: 16px;
  color: #666;

  a {
    color: #667eea;
    text-decoration: none;
    font-weight: 500;

    &:hover {
      text-decoration: underline;
    }
  }
}
</style>