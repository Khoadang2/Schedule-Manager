<template>
  <el-dialog
    v-model="visible"
    :title="isEdit ? 'Chỉnh sửa lịch' : 'Thêm lịch mới'"
    width="600px"
    @close="handleClose"
  >
    <el-form
      :model="form"
      :rules="rules"
      ref="formRef"
      label-position="top"
    >
      <el-form-item label="Tiêu đề" prop="title">
        <el-input 
          v-model="form.title" 
          placeholder="Nhập tiêu đề..."
          clearable
        />
      </el-form-item>

      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="Loại" prop="schedule_type">
            <el-select v-model="form.schedule_type" style="width: 100%">
              <el-option label="🏢 Làm việc" value="work" />
              <el-option label="📚 Học tập" value="study" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="Ưu tiên" prop="priority">
            <el-select v-model="form.priority" style="width: 100%">
              <el-option label="Thấp" value="low" />
              <el-option label="Trung bình" value="medium" />
              <el-option label="Cao" value="high" />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="Thời gian bắt đầu" prop="start_time">
            <el-date-picker
              v-model="form.start_time"
              type="datetime"
              placeholder="Chọn thời gian"
              style="width: 100%"
              format="DD/MM/YYYY HH:mm"
              value-format="YYYY-MM-DDTHH:mm:ss"
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="Thời gian kết thúc" prop="end_time">
            <el-date-picker
              v-model="form.end_time"
              type="datetime"
              placeholder="Chọn thời gian"
              style="width: 100%"
              format="DD/MM/YYYY HH:mm"
              value-format="YYYY-MM-DDTHH:mm:ss"
            />
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="Địa điểm" prop="location">
        <el-input 
          v-model="form.location" 
          placeholder="Nhập địa điểm..."
          clearable
          :prefix-icon="Location"
        />
      </el-form-item>

      <el-form-item label="Mô tả" prop="description">
        <el-input
          v-model="form.description"
          type="textarea"
          :rows="3"
          placeholder="Nhập mô tả..."
        />
      </el-form-item>

      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="Màu sắc">
            <el-color-picker v-model="form.color" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="Nhắc trước (phút)">
            <el-input-number 
              v-model="form.reminder_time" 
              :min="0" 
              :max="120"
              style="width: 100%"
            />
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>

    <template #footer>
      <el-button @click="handleClose">Hủy</el-button>
      <el-button type="primary" @click="handleSubmit" :loading="loading">
        {{ isEdit ? 'Cập nhật' : 'Tạo mới' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, watch, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Location } from '@element-plus/icons-vue'
import { useScheduleStore } from '@/stores/schedule'
import dayjs from 'dayjs'

const props = defineProps({
  modelValue: Boolean,
  schedule: Object
})

const emit = defineEmits(['update:modelValue', 'success'])

const scheduleStore = useScheduleStore()
const formRef = ref()
const loading = ref(false)

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const isEdit = computed(() => !!props.schedule)

const defaultForm = {
  title: '',
  description: '',
  location: '',
  start_time: dayjs().format('YYYY-MM-DDTHH:mm:ss'),
  end_time: dayjs().add(1, 'hour').format('YYYY-MM-DDTHH:mm:ss'),
  schedule_type: 'work',
  color: '#3B82F6',
  priority: 'medium',
  reminder_time: 15
}

const form = reactive({ ...defaultForm })

const rules = {
  title: [
    { required: true, message: 'Vui lòng nhập tiêu đề', trigger: 'blur' }
  ],
  schedule_type: [
    { required: true, message: 'Vui lòng chọn loại', trigger: 'change' }
  ],
  start_time: [
    { required: true, message: 'Vui lòng chọn thời gian bắt đầu', trigger: 'change' }
  ],
  end_time: [
    { required: true, message: 'Vui lòng chọn thời gian kết thúc', trigger: 'change' }
  ]
}

watch(() => props.schedule, (newVal) => {
  if (newVal) {
    Object.assign(form, {
      ...newVal,
      start_time: dayjs(newVal.start_time).format('YYYY-MM-DDTHH:mm:ss'),
      end_time: dayjs(newVal.end_time).format('YYYY-MM-DDTHH:mm:ss')
    })
  } else {
    Object.assign(form, defaultForm)
  }
}, { immediate: true })

const handleSubmit = async () => {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (valid) {
      // Validate time
      if (new Date(form.end_time) <= new Date(form.start_time)) {
        ElMessage.warning('Thời gian kết thúc phải sau thời gian bắt đầu')
        return
      }

      loading.value = true
      let result

      if (isEdit.value) {
        result = await scheduleStore.updateSchedule(props.schedule.schedule_id, form)
      } else {
        result = await scheduleStore.createSchedule(form)
      }

      loading.value = false

      if (result.success) {
        ElMessage.success(result.message)
        emit('success')
        handleClose()
      } else {
        ElMessage.error(result.message)
      }
    }
  })
}

const handleClose = () => {
  visible.value = false
  formRef.value?.resetFields()
  Object.assign(form, defaultForm)
}
</script>

<style scoped lang="scss">
.el-form-item {
  margin-bottom: 20px;
}
</style>