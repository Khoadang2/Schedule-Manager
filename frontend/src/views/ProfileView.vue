<template>
  <div class="profile-view">
    <el-card class="profile-card" v-loading="loading">
      <template #header>
        <div class="card-header">
          <h2>👤 Thông tin cá nhân</h2>
        </div>
      </template>

      <div class="profile-content">
        <!-- Avatar Section -->
        <div class="avatar-section">
          <el-avatar 
            :size="120" 
            :src="avatarUrl"
            class="avatar"
          >
            {{ userInitials }}
          </el-avatar>
          
          <div class="avatar-actions">
            <el-upload
              :action="uploadUrl"
              :headers="uploadHeaders"
              :show-file-list="false"
              :on-success="handleAvatarSuccess"
              :on-error="handleAvatarError"
              :before-upload="beforeAvatarUpload"
              accept="image/*"
            >
              <el-button size="small" type="primary">
                <el-icon><Upload /></el-icon>
                Tải ảnh lên
              </el-button>
            </el-upload>
            
            <el-button 
              size="small" 
              type="danger" 
              @click="deleteAvatar"
              v-if="profile.avatar"
            >
              <el-icon><Delete /></el-icon>
              Xóa ảnh
            </el-button>
          </div>
        </div>

        <!-- Profile Form -->
        <el-form
          :model="profile"
          :rules="rules"
          ref="profileForm"
          label-width="120px"
          class="profile-form"
        >
          <el-form-item label="Tài khoản">
            <el-input v-model="profile.taikhoan" disabled />
          </el-form-item>

          <el-form-item label="Họ tên" prop="hoten">
            <el-input 
              v-model="profile.hoten" 
              placeholder="Nhập họ tên"
              :disabled="!editing"
            />
          </el-form-item>

          <el-form-item label="Email" prop="email">
            <el-input 
              v-model="profile.email" 
              placeholder="Nhập email"
              :disabled="!editing"
            />
          </el-form-item>

          <el-form-item label="Số điện thoại" prop="phone">
            <el-input 
              v-model="profile.phone" 
              placeholder="Nhập số điện thoại"
              :disabled="!editing"
            />
          </el-form-item>

          <el-form-item label="Giới thiệu" prop="bio">
            <el-input 
              v-model="profile.bio" 
              type="textarea"
              :rows="3"
              placeholder="Giới thiệu về bạn..."
              :disabled="!editing"
            />
          </el-form-item>

          <el-form-item label="Ngày tạo">
            <el-input 
              :value="formatDate(profile.created_at)" 
              disabled 
            />
          </el-form-item>

          <el-form-item>
            <div class="form-actions">
              <el-button 
                v-if="!editing" 
                type="primary" 
                @click="editing = true"
              >
                <el-icon><Edit /></el-icon>
                Chỉnh sửa
              </el-button>
              
              <template v-else>
                <el-button 
                  type="primary" 
                  @click="saveProfile"
                  :loading="saving"
                >
                  <el-icon><Check /></el-icon>
                  Lưu thay đổi
                </el-button>
                
                <el-button @click="cancelEdit">
                  <el-icon><Close /></el-icon>
                  Hủy
                </el-button>
              </template>
            </div>
          </el-form-item>
        </el-form>
      </div>
    </el-card>

    <!-- Change Password Card -->
    <el-card class="password-card">
      <template #header>
        <h3>🔐 Đổi mật khẩu</h3>
      </template>

      <el-form
        :model="passwordForm"
        :rules="passwordRules"
        ref="passwordFormRef"
        label-width="140px"
      >
        <el-form-item label="Mật khẩu hiện tại" prop="currentPassword">
          <el-input 
            v-model="passwordForm.currentPassword" 
            type="password"
            placeholder="Nhập mật khẩu hiện tại"
            show-password
          />
        </el-form-item>

        <el-form-item label="Mật khẩu mới" prop="newPassword">
          <el-input 
            v-model="passwordForm.newPassword" 
            type="password"
            placeholder="Nhập mật khẩu mới"
            show-password
          />
        </el-form-item>

        <el-form-item label="Xác nhận mật khẩu" prop="confirmPassword">
          <el-input 
            v-model="passwordForm.confirmPassword" 
            type="password"
            placeholder="Nhập lại mật khẩu mới"
            show-password
          />
        </el-form-item>

        <el-form-item>
          <el-button 
            type="primary" 
            @click="changePassword"
            :loading="changingPassword"
          >
            <el-icon><Lock /></el-icon>
            Đổi mật khẩu
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  Upload, 
  Delete, 
  Edit, 
  Check, 
  Close, 
  Lock 
} from '@element-plus/icons-vue'
import api from '@/services/api'
import dayjs from 'dayjs'

const loading = ref(false)
const saving = ref(false)
const editing = ref(false)
const changingPassword = ref(false)

const profileForm = ref(null)
const passwordFormRef = ref(null)

const profile = reactive({
  user_id: null,
  taikhoan: '',
  hoten: '',
  email: '',
  phone: '',
  avatar: null,
  bio: '',
  created_at: null
})

const originalProfile = ref({})

const passwordForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

// Validation Rules
const rules = {
  hoten: [
    { required: true, message: 'Vui lòng nhập họ tên', trigger: 'blur' }
  ],
  email: [
    { required: true, message: 'Vui lòng nhập email', trigger: 'blur' },
    { type: 'email', message: 'Email không hợp lệ', trigger: 'blur' }
  ]
}

const passwordRules = {
  currentPassword: [
    { required: true, message: 'Vui lòng nhập mật khẩu hiện tại', trigger: 'blur' }
  ],
  newPassword: [
    { required: true, message: 'Vui lòng nhập mật khẩu mới', trigger: 'blur' },
    { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: 'Vui lòng xác nhận mật khẩu', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value !== passwordForm.newPassword) {
          callback(new Error('Mật khẩu xác nhận không khớp'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}

// Computed
const uploadUrl = computed(() => {
  return `${api.defaults.baseURL}/user/avatar`
})

const uploadHeaders = computed(() => {
  return {
    Authorization: `Bearer ${localStorage.getItem('token')}`
  }
})

const avatarUrl = computed(() => {
  if (profile.avatar) {
    return `${api.defaults.baseURL.replace('/api', '')}${profile.avatar}`
  }
  return ''
})

const userInitials = computed(() => {
  if (profile.hoten) {
    const names = profile.hoten.split(' ')
    return names.map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }
  return profile.taikhoan?.slice(0, 2).toUpperCase() || 'U'
})

// Methods
const fetchProfile = async () => {
  loading.value = true
  try {
    const response = await api.get('/user/profile')
    
    if (response.data.success) {
      Object.assign(profile, response.data.data)
      originalProfile.value = { ...response.data.data }
      console.log('✅ Profile loaded:', profile)
    }
  } catch (error) {
    console.error('❌ Fetch profile error:', error)
    ElMessage.error('Không thể tải thông tin người dùng')
  } finally {
    loading.value = false
  }
}

const saveProfile = async () => {
  if (!profileForm.value) return

  await profileForm.value.validate(async (valid) => {
    if (!valid) return

    saving.value = true
    try {
      const response = await api.put('/user/profile', {
        hoten: profile.hoten,
        email: profile.email,
        phone: profile.phone,
        bio: profile.bio
      })

      if (response.data.success) {
        Object.assign(profile, response.data.data)
        originalProfile.value = { ...response.data.data }
        editing.value = false
        ElMessage.success('Cập nhật thông tin thành công')
      }
    } catch (error) {
      console.error('❌ Save profile error:', error)
      ElMessage.error(error.response?.data?.message || 'Lỗi khi cập nhật thông tin')
    } finally {
      saving.value = false
    }
  })
}

const cancelEdit = () => {
  Object.assign(profile, originalProfile.value)
  editing.value = false
}

const beforeAvatarUpload = (file) => {
  const isImage = file.type.startsWith('image/')
  const isLt5M = file.size / 1024 / 1024 < 5

  if (!isImage) {
    ElMessage.error('Chỉ chấp nhận file ảnh!')
    return false
  }
  if (!isLt5M) {
    ElMessage.error('Kích thước ảnh không được vượt quá 5MB!')
    return false
  }
  return true
}

const handleAvatarSuccess = (response) => {
  if (response.success) {
    profile.avatar = response.data.avatar
    ElMessage.success('Tải ảnh đại diện thành công')
  }
}

const handleAvatarError = (error) => {
  console.error('❌ Upload avatar error:', error)
  ElMessage.error('Lỗi khi tải ảnh đại diện')
}

const deleteAvatar = async () => {
  try {
    await ElMessageBox.confirm(
      'Bạn có chắc muốn xóa ảnh đại diện?',
      'Xác nhận',
      { type: 'warning' }
    )

    const response = await api.delete('/user/avatar')
    
    if (response.data.success) {
      profile.avatar = null
      ElMessage.success('Đã xóa ảnh đại diện')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('❌ Delete avatar error:', error)
      ElMessage.error('Lỗi khi xóa ảnh đại diện')
    }
  }
}

const changePassword = async () => {
  if (!passwordFormRef.value) return

  await passwordFormRef.value.validate(async (valid) => {
    if (!valid) return

    changingPassword.value = true
    try {
      const response = await api.put('/user/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      })

      if (response.data.success) {
        ElMessage.success('Đổi mật khẩu thành công')
        
        // Reset form
        passwordForm.currentPassword = ''
        passwordForm.newPassword = ''
        passwordForm.confirmPassword = ''
        passwordFormRef.value.resetFields()
      }
    } catch (error) {
      console.error('❌ Change password error:', error)
      ElMessage.error(error.response?.data?.message || 'Lỗi khi đổi mật khẩu')
    } finally {
      changingPassword.value = false
    }
  })
}

const formatDate = (date) => {
  return date ? dayjs(date).format('DD/MM/YYYY HH:mm') : ''
}

onMounted(() => {
  fetchProfile()
})
</script>

<style scoped lang="scss">
.profile-view {
  max-width: 900px;
  margin: 0 auto;
}

.profile-card,
.password-card {
  margin-bottom: 24px;
}

.card-header {
  h2, h3 {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
    color: #1f2937;
  }
}

.profile-content {
  display: flex;
  gap: 48px;
}

.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;

  .avatar {
    border: 4px solid #e5e7eb;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .avatar-actions {
    display: flex;
    gap: 8px;
  }
}

.profile-form {
  flex: 1;
}

.form-actions {
  display: flex;
  gap: 12px;
}
</style>