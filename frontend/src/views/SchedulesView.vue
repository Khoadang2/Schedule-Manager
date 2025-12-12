<template>
  <div class="schedules-view">
    <!-- HEADER -->
    <div class="view-header">
      <h1>📅 Lịch làm việc</h1>

      <div class="header-actions">
        <!-- ⭐ FILTER INDICATOR -->
        <div v-if="activeFilter" class="filter-indicator">
          <el-tag 
            :type="activeFilter === 'work' ? 'danger' : 'primary'"
            closable
            @close="clearFilter"
          >
            {{ activeFilter === 'work' ? '🏢 Làm việc' : '📚 Học tập' }}
          </el-tag>
        </div>

        <el-button-group>
          <el-button @click="scheduleStore.previousWeek()">
            <el-icon><ArrowLeft /></el-icon>
          </el-button>

          <el-button @click="scheduleStore.goToToday()">Hôm nay</el-button>

          <el-button @click="scheduleStore.nextWeek()">
            <el-icon><ArrowRight /></el-icon>
          </el-button>
        </el-button-group>

        <span class="week-range">{{ weekRange }}</span>
      </div>
    </div>

    <!-- CALENDAR -->
    <div class="calendar-container" v-loading="scheduleStore.loading">
      <!-- WEEK HEADER -->
      <div class="calendar-header">
        <div
          v-for="day in weekDays"
          :key="day.date"
          class="day-header"
          :class="{ 'is-today': day.isToday }"
        >
          <div class="day-name">{{ day.dayName }}</div>
          <div class="day-date">{{ day.dayNumber }}</div>
        </div>
      </div>

      <!-- BODY -->
      <div class="calendar-body">
        <div
          v-for="day in weekDays"
          :key="day.date"
          class="day-column"
          :style="{ background: day.color }"
        >
          <div class="day-schedules">
            <!-- ITEMS -->
            <div
              v-for="schedule in getSchedulesForDay(day.date)"
              :key="schedule.schedule_id"
              class="schedule-item"
              :class="{ completed: schedule.is_completed }"
              :style="{ borderLeftColor: schedule.color || '#3b82f6' }"
              @click="editSchedule(schedule)"
            >
              <div class="schedule-time">
                {{ formatTime(schedule.start_time) }} - {{ formatTime(schedule.end_time) }}
              </div>

              <div class="schedule-title">{{ schedule.title }}</div>

              <div class="schedule-meta">
                <el-tag
                  :type="schedule.schedule_type === 'work' ? 'danger' : 'primary'"
                  size="small"
                >
                  {{ schedule.schedule_type === 'work' ? '🏢 Làm việc' : '📚 Học tập' }}
                </el-tag>

                <span v-if="schedule.location" class="location">
                  <el-icon><Location /></el-icon>
                  {{ schedule.location }}
                </span>
              </div>

              <!-- ACTIONS -->
              <div class="schedule-actions">
                <el-button
                  size="small"
                  :type="schedule.is_completed ? 'default' : 'success'"
                  @click.stop="toggleComplete(schedule)"
                >
                  <el-icon><Check /></el-icon>
                </el-button>

                <el-button
                  size="small"
                  type="danger"
                  @click.stop="deleteSchedule(schedule)"
                >
                  <el-icon><Delete /></el-icon>
                </el-button>
              </div>
            </div>

            <!-- EMPTY STATE -->
            <div
              v-if="getSchedulesForDay(day.date).length === 0"
              class="empty-day"
            >
              <el-icon><Calendar /></el-icon>
              <p>Không có lịch</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- EDIT DIALOG -->
    <ScheduleFormDialog
      v-model="showEditDialog"
      :schedule="selectedSchedule"
      @success="handleScheduleUpdated"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from "vue";
import { useRoute } from "vue-router";
import dayjs from "dayjs";
import "dayjs/locale/vi";

import { ElMessage, ElMessageBox } from "element-plus";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Location,
  Check,
  Delete,
} from "@element-plus/icons-vue";

import ScheduleFormDialog from "@/components/ScheduleFormDialog.vue";
import { useScheduleStore } from "@/stores/schedule";

// set locale
dayjs.locale("vi");

const route = useRoute();
const scheduleStore = useScheduleStore();

const showEditDialog = ref(false);
const selectedSchedule = ref(null);

// ⭐ ACTIVE FILTER
const activeFilter = computed(() => scheduleStore.filterType);

// ⭐ WATCH ROUTE QUERY CHANGES
watch(
  () => route.query.filter,
  (newFilter) => {
    console.log('📍 Route filter changed:', newFilter);
    scheduleStore.filterType = newFilter || null;
  },
  { immediate: true }
);

// Clear filter
const clearFilter = () => {
  scheduleStore.filterType = null;
};

// COLORS FOR WEEK DAYS
const dayColors = {
  0: "#FEF3C7",
  1: "#DBEAFE",
  2: "#FCE7F3",
  3: "#D1FAE5",
  4: "#FEE2E2",
  5: "#E0E7FF",
  6: "#FED7AA",
};

// COMPUTE WEEK DISPLAY
const dayNamesVI = ['Chủ Nhật','Thứ Hai','Thứ Ba','Thứ Tư','Thứ Năm','Thứ Sáu','Thứ Bảy'];

const weekDays = computed(() => {
  const start = scheduleStore.currentWeekStart;
  const days = [];

  for (let i = 0; i < 7; i++) {
    const date = start.add(i, "day");
    const today = dayjs().format("YYYY-MM-DD");
    const dayOfWeek = date.day(); // 0 - 6

    days.push({
      date: date.format("YYYY-MM-DD"),
      dayName: dayNamesVI[dayOfWeek],
      dayNumber: date.format("DD/MM"),
      isToday: today === date.format("YYYY-MM-DD"),
      color: dayColors[dayOfWeek],
    });
  }

  return days;
});

const weekRange = computed(() => {
  const start = scheduleStore.currentWeekStart;
  const end = start.add(6, "day");
  return `${start.format("DD/MM")} - ${end.format("DD/MM/YYYY")}`;
});

// ⭐ GET SCHEDULES BY DAY (with filter)
const getSchedulesForDay = (date) => {
  let schedules = scheduleStore.schedules.filter(
    (s) => dayjs(s.start_time).format("YYYY-MM-DD") === date
  );

  // Apply filter
  if (activeFilter.value) {
    schedules = schedules.filter(s => s.schedule_type === activeFilter.value);
  }

  return schedules.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
};

// FORMAT TIME
const formatTime = (t) => dayjs(t).format("HH:mm");

// OPEN EDIT
const editSchedule = (schedule) => {
  selectedSchedule.value = { ...schedule };
  showEditDialog.value = true;
};

// TOGGLE COMPLETE
const toggleComplete = async (schedule) => {
  const result = await scheduleStore.toggleComplete(
    schedule.schedule_id,
    !schedule.is_completed
  );

  if (result.success) {
    ElMessage.success(
      schedule.is_completed
        ? "Đã đánh dấu chưa hoàn thành"
        : "Đã đánh dấu hoàn thành"
    );
  }
};

// DELETE
const deleteSchedule = async (schedule) => {
  try {
    await ElMessageBox.confirm(
      `Bạn có chắc muốn xóa lịch "${schedule.title}"?`,
      "Xác nhận",
      { type: "warning" }
    );

    const result = await scheduleStore.deleteSchedule(schedule.schedule_id);

    if (result.success) {
      ElMessage.success(result.message);
    }
  } catch {
    // cancelled
  }
};

// AFTER SAVE
const handleScheduleUpdated = () => {
  selectedSchedule.value = null;
  showEditDialog.value = false;
  scheduleStore.fetchWeekSchedules();
};

onMounted(() => {
  // Load schedules
  scheduleStore.fetchWeekSchedules();
});
</script>

<style scoped lang="scss">
.schedules-view {
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* HEADER */
.view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;

  h1 {
    font-size: 24px;
    font-weight: 600;
    margin: 0;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .filter-indicator {
    .el-tag {
      font-size: 14px;
      padding: 8px 16px;
    }
  }

  .week-range {
    font-size: 13px;
    color: #6b7280;
  }
}

/* CALENDAR */
.calendar-container {
  flex: 1;
  background: white;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid #e5e7eb;
}

/* Week Days */
.calendar-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  border-bottom: 2px solid #e5e7eb;

  .day-header {
    padding: 14px;
    border-right: 1px solid #e5e7eb;
    text-align: center;

    &:last-child {
      border-right: none;
    }

    .day-name {
      font-size: 12px;
      color: #6b7280;
      text-transform: uppercase;
      margin-bottom: 4px;
    }

    .day-date {
      font-size: 14px;
      font-weight: 600;
    }

    &.is-today {
      background: #eaf1ff;

      .day-date {
        background: #2563eb;
        color: white;
        display: inline-flex;
        border-radius: 50%;
        width: 28px;
        height: 28px;
        align-items: center;
        justify-content: center;
      }
    }
  }
}

/* BODY */
.calendar-body {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
}

.day-column {
  border-right: 1px solid #e5e7eb;

  &:last-child {
    border-right: none;
  }
}

.day-schedules {
  padding: 12px;
}

/* ITEM */
.schedule-item {
  background: white;
  border-radius: 8px;
  padding: 10px;
  margin-bottom: 8px;
  border-left: 4px solid #3b82f6;
  cursor: pointer;
  position: relative;
  transition: 0.2s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);

    .schedule-actions {
      opacity: 1;
    }
  }

  &.completed {
    opacity: 0.55;

    .schedule-title {
      text-decoration: line-through;
    }
  }

  .schedule-time {
    font-size: 12px;
    color: #6b7280;
    margin-bottom: 4px;
  }

  .schedule-title {
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 6px;
  }

  .schedule-meta {
    display: flex;
    align-items: center;
    gap: 8px;

    .location {
      font-size: 12px;
      color: #6b7280;
      display: flex;
      align-items: center;
      gap: 4px;
    }
  }

  .schedule-actions {
    position: absolute;
    top: 6px;
    right: 6px;
    display: flex;
    gap: 4px;
    opacity: 0;
    transition: 0.2s;
  }
}

/* EMPTY */
.empty-day {
  color: #9ca3af;
  text-align: center;
  padding-top: 30px;

  .el-icon {
    font-size: 40px;
  }

  p {
    font-size: 13px;
  }
}
</style>