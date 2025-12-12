<template>
  <div class="app-header">
    <div class="header-left">
      <el-input
        v-model="searchQuery"
        placeholder="Tìm kiếm lịch..."
        :prefix-icon="Search"
        clearable
        @input="handleSearch"
        style="width: 300px"
      />
    </div>

    <div class="header-right">
      <!-- Add Schedule Button -->
      <el-button type="primary" @click="showAddDialog = true">
        <el-icon><Plus /></el-icon>
        Thêm lịch
      </el-button>

      <!-- Notifications -->
      <el-badge :value="unreadCount" :hidden="unreadCount === 0" class="notification-badge">
        <el-button circle @click="toggleNotifications">
          <el-icon><Bell /></el-icon>
        </el-button>
      </el-badge>

      <!-- User Dropdown -->
      <el-dropdown @command="handleCommand" class="user-dropdown">
        <div class="user-info-trigger">
          <el-avatar :size="36" :src="avatarUrl">
            {{ userInitials }}
          </el-avatar>
          <div class="user-text">
            <div class="user-name">{{ userName }}</div>
            <div class="user-email">{{ userEmail }}</div>
          </div>
          <el-icon class="dropdown-icon"><ArrowDown /></el-icon>
        </div>
        
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="profile" :icon="User">
              Thông tin cá nhân
            </el-dropdown-item>
            <el-dropdown-item command="change-password" :icon="Lock">
              Đổi mật khẩu
            </el-dropdown-item>
            <el-dropdown-item divided command="logout" :icon="SwitchButton">
              Đăng xuất
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>

    <!-- Add Schedule Dialog -->
    <ScheduleFormDialog
      v-model="showAddDialog"
      @success="handleScheduleAdded"
    />

    <!-- Profile Dialog -->
    <el-dialog
      v-model="showProfileDialog"
      title="Thông tin cá nhân"
      width="600px"
      :close-on-click-modal="false"
    >
      <div class="profile-content">
        <div class="avatar-section">
          <el-avatar :size="100" :src="avatarUrl">
            {{ userInitials }}
          </el-avatar>
          <el-upload
            :action="uploadUrl"
            :headers="uploadHeaders"
            :show-file-list="false"
            :on-success="handleAvatarSuccess"
            :before-upload="beforeAvatarUpload"
            accept="image/*"
          >
            <el-button type="primary" size="small" style="margin-top: 12px">
              <el-icon><Upload /></el-icon>
              Tải ảnh lên
            </el-button>
          </el-upload>
        </div>

        <el-form
          ref="profileFormRef"
          :model="profileForm"
          :rules="profileRules"
          label-position="left"
          label-width="140px"
          class="profile-form"
        >
          <el-form-item label="Tài khoản">
            <el-input v-model="profileForm.taikhoan" disabled />
          </el-form-item>

          <el-form-item label="Họ tên" prop="hoten">
            <el-input v-model="profileForm.hoten" placeholder="Nguyễn Văn A" />
          </el-form-item>

          <el-form-item label="Email" prop="email">
            <el-input v-model="profileForm.email" placeholder="example@email.com" />
          </el-form-item>

          <el-form-item label="Số điện thoại">
            <el-input v-model="profileForm.sodienthoai" placeholder="Nhập số điện thoại" />
          </el-form-item>

          <el-form-item label="Ngày tạo">
            <el-input v-model="profileForm.ngaytao" disabled />
          </el-form-item>
        </el-form>
      </div>

      <template #footer>
        <el-button @click="showProfileDialog = false">Hủy</el-button>
        <el-button type="primary" @click="handleUpdateProfile" :loading="updatingProfile">
          <el-icon><Check /></el-icon>
          Cập nhật
        </el-button>
      </template>
    </el-dialog>

    <!-- Change Password Dialog -->
    <el-dialog
      v-model="showChangePasswordDialog"
      title="Đổi mật khẩu"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="passwordFormRef"
        :model="passwordForm"
        :rules="passwordRules"
        label-position="left"
        label-width="160px"
      >
        <el-form-item label="Mật khẩu hiện tại" prop="currentPassword">
          <el-input
            v-model="passwordForm.currentPassword"
            type="password"
            placeholder="Nhập mật khẩu hiện tại"
            show-password
            clearable
          />
        </el-form-item>

        <el-form-item label="Mật khẩu mới" prop="newPassword">
          <el-input
            v-model="passwordForm.newPassword"
            type="password"
            placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
            show-password
            clearable
          />
        </el-form-item>

        <el-form-item label="Xác nhận mật khẩu" prop="confirmPassword">
          <el-input
            v-model="passwordForm.confirmPassword"
            type="password"
            placeholder="Nhập lại mật khẩu mới"
            show-password
            clearable
            @keyup.enter="handleChangePassword"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showChangePasswordDialog = false">Hủy</el-button>
        <el-button type="primary" @click="handleChangePassword" :loading="changingPassword">
          <el-icon><Lock /></el-icon>
          Đổi mật khẩu
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import { 
  Search, Plus, Bell, User, Lock, SwitchButton,
  ArrowDown, Upload, Check
} from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { useNotificationStore } from '@/stores/notification'
import { useScheduleStore } from '@/stores/schedule'
import ScheduleFormDialog from './ScheduleFormDialog.vue'
import api from '@/services/api'

const authStore = useAuthStore()
const notificationStore = useNotificationStore()
const scheduleStore = useScheduleStore()

const searchQuery = ref('')
const showAddDialog = ref(false)
const showProfileDialog = ref(false)
const showChangePasswordDialog = ref(false)
const updatingProfile = ref(false)
const changingPassword = ref(false)

const profileFormRef = ref()
const passwordFormRef = ref()

const profileForm = reactive({
  taikhoan: '',
  hoten: '',
  email: '',
  sodienthoai: '',
  ngaytao: ''
})

const passwordForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

// Validation rules
const profileRules = {
  hoten: [{ required: true, message: 'Vui lòng nhập họ tên', trigger: 'blur' }],
  email: [
    { required: true, message: 'Vui lòng nhập email', trigger: 'blur' },
    { type: 'email', message: 'Email không đúng định dạng', trigger: 'blur' }
  ]
}

const validateConfirmPassword = (rule, value, callback) => {
  if (value !== passwordForm.newPassword) {
    callback(new Error('Mật khẩu xác nhận không khớp'))
  } else {
    callback()
  }
}

const passwordRules = {
  currentPassword: [{ required: true, message: 'Vui lòng nhập mật khẩu hiện tại', trigger: 'blur' }],
  newPassword: [
    { required: true, message: 'Vui lòng nhập mật khẩu mới', trigger: 'blur' },
    { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: 'Vui lòng xác nhận mật khẩu mới', trigger: 'blur' },
    { validator: validateConfirmPassword, trigger: 'blur' }
  ]
}

// Computed properties
const unreadCount = computed(() => notificationStore.unreadCount)
const userName = computed(() =>  authStore.user?.taikhoan || 'User')
// const userEmail = computed(() => authStore.user?.email || '')

const uploadUrl = computed(() => {
  return `${api.defaults.baseURL}/user/avatar`
})
const uploadHeaders = computed(() => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`
}))

const avatarUrl = computed(() => {
  if (authStore.user?.avatar) {
    // ✅ Loại bỏ /api khỏi baseURL để lấy avatar
    const baseUrl = api.defaults.baseURL.replace('/api', '')
    return `${baseUrl}${authStore.user.avatar}`
  }
  return ''
})

const userInitials = computed(() => {
  if (authStore.user?.hoten) {
    const names = authStore.user.hoten.split(' ')
    return names.map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }
  return authStore.user?.taikhoan?.slice(0, 2).toUpperCase() || 'U'
})

// Methods
const handleSearch = (value) => {
  scheduleStore.fetchSchedules({ search: value })
}

const toggleNotifications = () => {
  window.dispatchEvent(new CustomEvent('toggle-notifications'))
}

const handleScheduleAdded = () => {
  showAddDialog.value = false
  scheduleStore.fetchWeekSchedules()
}

const loadProfileData = async () => {
  try {
    const response = await api.get('/user/profile')
    if (response.data.success) {
      const user = response.data.data
      profileForm.taikhoan = user.taikhoan || ''
      profileForm.hoten = user.hoten || ''
      profileForm.email = user.email || ''
      profileForm.sodienthoai = user.phone || ''
      if (user.created_at) {
        profileForm.ngaytao = new Date(user.created_at).toLocaleString('vi-VN')
      }
    }
  } catch (error) {
    ElMessage.error('Không thể tải thông tin người dùng')
  }
}

const handleUpdateProfile = async () => {
  if (!profileFormRef.value) return

  await profileFormRef.value.validate(async (valid) => {
    if (!valid) return

    updatingProfile.value = true
    try {
      const response = await api.put('/user/profile', {
        hoten: profileForm.hoten,
        email: profileForm.email,
        phone: profileForm.sodienthoai
      })

      if (response.data.success) {
        authStore.user = { ...authStore.user, ...response.data.data }
        ElMessage.success('Cập nhật thông tin thành công')
        showProfileDialog.value = false
      }
    } catch (error) {
      ElMessage.error(error.response?.data?.message || 'Cập nhật thất bại')
    } finally {
      updatingProfile.value = false
    }
  })
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

const handleAvatarSuccess = async (response) => {
  console.log('✅ Upload success response:', response)
  
  if (response.success) {
    // ✅ Cập nhật avatar trong store
    authStore.user.avatar = response.data.avatar
    ElMessage.success('Tải ảnh đại diện thành công')
    
    // Reload profile để đồng bộ
    await loadProfileData()
  } else {
    ElMessage.error(response.message || 'Upload failed')
  }
}

const handleAvatarError = (error) => {
  console.error('❌ Upload error:', error)
  ElMessage.error('Lỗi khi tải ảnh đại diện')
}

const handleChangePassword = async () => {
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
        ElMessage.success('Đổi mật khẩu thành công!')
        showChangePasswordDialog.value = false
        passwordForm.currentPassword = ''
        passwordForm.newPassword = ''
        passwordForm.confirmPassword = ''
        passwordFormRef.value?.resetFields()
      }
    } catch (error) {
      ElMessage.error(error.response?.data?.message || 'Đổi mật khẩu thất bại')
    } finally {
      changingPassword.value = false
    }
  })
}

const handleCommand = async (command) => {
  switch (command) {
    case 'profile':
      await loadProfileData()
      showProfileDialog.value = true
      break
    case 'change-password':
      showChangePasswordDialog.value = true
      break
    case 'logout':
      await handleLogout()
      break
  }
}

const handleLogout = async () => {
  try {
    await ElMessageBox.confirm('Bạn có chắc chắn muốn đăng xuất?', 'Xác nhận', {
      confirmButtonText: 'Đăng xuất',
      cancelButtonText: 'Hủy',
      type: 'warning'
    })
    await authStore.logout()
  } catch {
    // User cancelled
  }
}
</script>

<style scoped lang="scss">
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background: white;
  border-bottom: 1px solid #e5e7eb;
  height: 64px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.notification-badge {
  cursor: pointer;
}

.user-dropdown {
  cursor: pointer;
}

.user-info-trigger {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 4px 12px 4px 4px;
  border-radius: 8px;
  transition: background-color 0.2s;

  &:hover {
    background-color: #f3f4f6;
  }

  .user-text {
    display: flex;
    flex-direction: column;
    align-items: flex-start;

    .user-name {
      font-weight: 600;
      color: #1f2937;
      font-size: 14px;
      line-height: 1.2;
    }

    .user-email {
      font-size: 12px;
      color: #6b7280;
      line-height: 1.2;
    }
  }

  .dropdown-icon {
    color: #9ca3af;
    font-size: 14px;
  }
}

.profile-content {
  display: flex;
  flex-direction: column;
  gap: 24px;

  .avatar-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20px 0;
    border-bottom: 1px solid #e5e7eb;
  }

  .profile-form {
    padding: 0 20px;
  }
}
</style>