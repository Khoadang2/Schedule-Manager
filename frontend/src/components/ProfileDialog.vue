<template>
  <el-dialog
    v-model="visible"
    title="Thông tin cá nhân"
    width="600px"
    :close-on-click-modal="false"
  >
    <div class="profile-container">
      <div class="avatar-section">
        <el-avatar :size="100" :src="avatarPreview || authStore.user?.avatar">
          {{ userInitial }}
        </el-avatar>
        
        <el-upload
          class="avatar-uploader"
          :show-file-list="false"
          :before-upload="handleAvatarChange"
          accept="image/*"
        >
          <el-button type="primary" size="small" class="upload-btn">
            <el-icon><Plus /></el-icon>
            Tải ảnh lên
          </el-button>
        </el-upload>
      </div>

      <el-form
        :model="form"
        :rules="rules"
        ref="formRef"
        label-position="top"
        class="profile-form"
      >
        <el-form-item label="Tài khoản">
          <el-input v-model="authStore.user?.taikhoan" disabled />
        </el-form-item>

        <el-form-item label="Họ tên" prop="hoten">
          <el-input v-model="form.hoten" placeholder="Nhập họ và tên" />
        </el-form-item>

        <el-form-item label="Email" prop="email">
          <el-input v-model="form.email" placeholder="Nhập email" type="email" />
        </el-form-item>

        <el-form-item label="Số điện thoại">
          <el-input v-model="form.sodienthoai" placeholder="Nhập số điện thoại" />
        </el-form-item>

        <el-form-item label="Giới thiệu">
          <el-input
            v-model="form.bio"
            type="textarea"
            :rows="4"
            placeholder="Giới thiệu về bạn..."
          />
        </el-form-item>

        <el-form-item label="Ngày tạo">
          <el-input :value="formatDate(authStore.user?.created_at)" disabled />
        </el-form-item>
      </el-form>
    </div>

    <template #footer>
      <el-button @click="handleClose">Hủy</el-button>
      <el-button type="primary" @click="handleSave" :loading="saving">
        Chỉnh sửa
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, reactive, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import api from '@/services/api'
import dayjs from 'dayjs'

const props = defineProps({
  modelValue: Boolean
})

const emit = defineEmits(['update:modelValue', 'success'])

const authStore = useAuthStore()
const formRef = ref()
const saving = ref(false)
const avatarPreview = ref(null)
const avatarFile = ref(null)

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const form = reactive({
  hoten: '',
  email: '',
  sodienthoai: '',
  bio: ''
})

const rules = {
  hoten: [
    { required: true, message: 'Vui lòng nhập họ tên', trigger: 'blur' }
  ],
  email: [
    { required: true, message: 'Vui lòng nhập email', trigger: 'blur' },
    { type: 'email', message: 'Email không hợp lệ', trigger: 'blur' }
  ]
}

const userInitial = computed(() => {
  return authStore.user?.hoten?.charAt(0).toUpperCase() || 'U'
})

watch(() => authStore.user, (newUser) => {
  if (newUser) {
    form.hoten = newUser.hoten
    form.email = newUser.email
    form.sodienthoai = newUser.sodienthoai || ''
    form.bio = newUser.bio || ''
  }
}, { immediate: true })

const handleAvatarChange = (file) => {
  // Validate file type
  const isImage = file.type.startsWith('image/')
  if (!isImage) {
    ElMessage.error('Chỉ được upload file ảnh!')
    return false
  }

  // Validate file size (max 2MB)
  const isLt2M = file.size / 1024 / 1024 < 2
  if (!isLt2M) {
    ElMessage.error('Kích thước ảnh không được vượt quá 2MB!')
    return false
  }

  // Preview
  const reader = new FileReader()
  reader.onload = (e) => {
    avatarPreview.value = e.target.result
  }
  reader.readAsDataURL(file)

  avatarFile.value = file

  return false // Prevent auto upload
}

const formatDate = (date) => {
  return date ? dayjs(date).format('DD/MM/YYYY HH:mm') : ''
}

const handleSave = async () => {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (valid) {
      saving.value = true
      try {
        // Upload avatar nếu có
        let avatarUrl = authStore.user?.avatar
        if (avatarFile.value) {
          const formData = new FormData()
          formData.append('avatar', avatarFile.value)

          // Chuyển sang base64 để lưu vào database
          avatarUrl = avatarPreview.value
        }

        // Update profile
        const response = await api.put('/auth/profile', {
          hoten: form.hoten,
          email: form.email,
          sodienthoai: form.sodienthoai,
          avatar: avatarUrl
        })

        if (response.data.success) {
          // Update store
          authStore.user = response.data.data
          ElMessage.success('Cập nhật thông tin thành công!')
          emit('success')
          handleClose()
        }
      } catch (error) {
        ElMessage.error(error.response?.data?.message || 'Cập nhật thất bại')
      } finally {
        saving.value = false
      }
    }
  })
}

const handleClose = () => {
  visible.value = false
  avatarPreview.value = null
  avatarFile.value = null
  formRef.value?.resetFields()
}
</script>

<style scoped lang="scss">
.profile-container {
  padding: 20px 0;
}

.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid #e5e7eb;

  .el-avatar {
    border: 4px solid #f3f4f6;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .upload-btn {
    display: flex;
    align-items: center;
    gap: 6px;
  }
}

.profile-form {
  .el-form-item {
    margin-bottom: 20px;
  }
}
</style>