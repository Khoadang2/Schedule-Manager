const express = require('express');
const router = express.Router();
const { getConnection, sql } = require('../config/database');
const authMiddleware = require('../middleware/auth.middleware');

router.use(authMiddleware);

// AI Chat - Trả lời câu hỏi và gợi ý
router.post('/chat', async (req, res) => {
  try {
    const { message, context } = req.body;
    const pool = await getConnection();

    // Lấy dữ liệu người dùng để phân tích
    const userStats = await pool.request()
      .input('user_id', sql.Int, req.user.user_id)
      .query(`
        SELECT 
          COUNT(*) as total_schedules,
          SUM(CASE WHEN is_completed = 1 THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN schedule_type = 'work' THEN duration ELSE 0 END) as work_minutes,
          SUM(CASE WHEN schedule_type = 'study' THEN duration ELSE 0 END) as study_minutes
        FROM Schedules
        WHERE user_id = @user_id
        AND start_time >= DATEADD(day, -7, GETDATE())
      `);

    const stats = userStats.recordset[0];

    // Logic AI đơn giản dựa trên từ khóa
    let response = '';
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('lịch') || lowerMessage.includes('kế hoạch')) {
      response = generateScheduleAdvice(stats);
    } else if (lowerMessage.includes('hiệu suất') || lowerMessage.includes('năng suất')) {
      response = generateProductivityAdvice(stats);
    } else if (lowerMessage.includes('thời gian') || lowerMessage.includes('quản lý')) {
      response = generateTimeManagementAdvice(stats);
    } else if (lowerMessage.includes('học tập') || lowerMessage.includes('study')) {
      response = generateStudyAdvice(stats);
    } else if (lowerMessage.includes('làm việc') || lowerMessage.includes('work')) {
      response = generateWorkAdvice(stats);
    } else {
      response = `Xin chào ${req.user.hoten}! 👋\n\nTôi có thể giúp bạn:\n- Phân tích lịch làm việc và học tập\n- Đề xuất cách sắp xếp thời gian hiệu quả\n- Gợi ý cải thiện năng suất\n- Tạo kế hoạch học tập/làm việc tối ưu\n\nBạn cần tôi hỗ trợ gì?`;
    }

    // Lưu suggestion vào database
    await pool.request()
      .input('user_id', sql.Int, req.user.user_id)
      .input('suggestion_type', sql.NVarChar, 'chat')
      .input('suggestion_text', sql.NVarChar, response)
      .query(`
        INSERT INTO AI_Suggestions (user_id, suggestion_type, suggestion_text)
        VALUES (@user_id, @suggestion_type, @suggestion_text)
      `);

    res.json({
      success: true,
      data: {
        message: response,
        user_stats: stats
      }
    });

  } catch (error) {
    console.error('❌ Lỗi AI chat:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi server' 
    });
  }
});

// Tạo lịch tối ưu tự động
router.post('/generate-schedule', async (req, res) => {
  try {
    const { preferences, date } = req.body;
    const pool = await getConnection();

    // Phân tích lịch hiện có
    const existingSchedules = await pool.request()
      .input('user_id', sql.Int, req.user.user_id)
      .input('date', sql.Date, date || new Date())
      .query(`
        SELECT * FROM Schedules
        WHERE user_id = @user_id
        AND CAST(start_time AS DATE) = @date
        ORDER BY start_time
      `);

    // Tạo đề xuất lịch dựa trên khoảng trống
    const suggestions = generateOptimalSchedule(existingSchedules.recordset, preferences);

    res.json({
      success: true,
      data: {
        existing_schedules: existingSchedules.recordset,
        suggested_schedules: suggestions,
        message: `Đã tạo ${suggestions.length} đề xuất lịch tối ưu cho bạn!`
      }
    });

  } catch (error) {
    console.error('❌ Lỗi tạo lịch tự động:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi server' 
    });
  }
});

// Phân tích hiệu suất và đưa ra gợi ý
router.get('/analyze-performance', async (req, res) => {
  try {
    const pool = await getConnection();

    // Lấy dữ liệu 30 ngày gần nhất
    const stats = await pool.request()
      .input('user_id', sql.Int, req.user.user_id)
      .query(`
        SELECT 
          CAST(start_time AS DATE) as date,
          COUNT(*) as total,
          SUM(CASE WHEN is_completed = 1 THEN 1 ELSE 0 END) as completed,
          SUM(duration) as total_minutes,
          schedule_type
        FROM Schedules
        WHERE user_id = @user_id
        AND start_time >= DATEADD(day, -30, GETDATE())
        GROUP BY CAST(start_time AS DATE), schedule_type
        ORDER BY date DESC
      `);

    const analysis = analyzePerformance(stats.recordset);

    // Lưu phân tích
    await pool.request()
      .input('user_id', sql.Int, req.user.user_id)
      .input('suggestion_type', sql.NVarChar, 'performance')
      .input('suggestion_text', sql.NVarChar, JSON.stringify(analysis))
      .query(`
        INSERT INTO AI_Suggestions (user_id, suggestion_type, suggestion_text)
        VALUES (@user_id, @suggestion_type, @suggestion_text)
      `);

    res.json({
      success: true,
      data: analysis
    });

  } catch (error) {
    console.error('❌ Lỗi phân tích hiệu suất:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi server' 
    });
  }
});

// Lấy lịch sử gợi ý AI
router.get('/suggestions', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const pool = await getConnection();

    const result = await pool.request()
      .input('user_id', sql.Int, req.user.user_id)
      .input('limit', sql.Int, parseInt(limit))
      .query(`
        SELECT TOP(@limit) *
        FROM AI_Suggestions
        WHERE user_id = @user_id
        ORDER BY created_at DESC
      `);

    res.json({
      success: true,
      data: result.recordset
    });

  } catch (error) {
    console.error('❌ Lỗi lấy gợi ý:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi server' 
    });
  }
});

// ==================== HELPER FUNCTIONS ====================

function generateScheduleAdvice(stats) {
  const completionRate = stats.total_schedules > 0 
    ? (stats.completed / stats.total_schedules * 100).toFixed(1) 
    : 0;

  let advice = `📊 **Phân tích lịch làm việc 7 ngày qua:**\n\n`;
  advice += `• Tổng số lịch: ${stats.total_schedules}\n`;
  advice += `• Đã hoàn thành: ${stats.completed} (${completionRate}%)\n`;
  advice += `• Thời gian làm việc: ${Math.round(stats.work_minutes / 60)} giờ\n`;
  advice += `• Thời gian học tập: ${Math.round(stats.study_minutes / 60)} giờ\n\n`;

  if (completionRate < 50) {
    advice += `⚠️ **Gợi ý:** Tỷ lệ hoàn thành còn thấp. Hãy thử:\n`;
    advice += `- Chia nhỏ công việc thành các task nhỏ hơn\n`;
    advice += `- Ưu tiên các công việc quan trọng nhất\n`;
    advice += `- Giảm số lượng lịch trong ngày\n`;
  } else if (completionRate >= 80) {
    advice += `🎉 **Tuyệt vời!** Bạn đang làm việc rất hiệu quả!\n`;
    advice += `Tiếp tục duy trì và có thể thử thách bản thân với các mục tiêu cao hơn.`;
  } else {
    advice += `✅ **Tốt!** Bạn đang tiến bộ. Một vài điểm cải thiện:\n`;
    advice += `- Tập trung vào chất lượng hơn là số lượng\n`;
    advice += `- Đảm bảo thời gian nghỉ ngơi hợp lý\n`;
  }

  return advice;
}

function generateProductivityAdvice(stats) {
  const totalHours = (stats.work_minutes + stats.study_minutes) / 60;
  const avgHoursPerDay = totalHours / 7;

  let advice = `💡 **Phân tích năng suất:**\n\n`;
  advice += `• Trung bình mỗi ngày: ${avgHoursPerDay.toFixed(1)} giờ\n`;
  advice += `• Tỷ lệ Làm việc/Học tập: ${Math.round(stats.work_minutes / 60)}h / ${Math.round(stats.study_minutes / 60)}h\n\n`;

  if (avgHoursPerDay < 4) {
    advice += `📈 Bạn có thể tăng thêm thời gian làm việc/học tập để đạt hiệu quả tốt hơn.\n\n`;
  } else if (avgHoursPerDay > 10) {
    advice += `⚠️ Bạn đang làm việc quá nhiều! Hãy chú ý đến sức khỏe và cân bằng cuộc sống.\n\n`;
  }

  advice += `**Gợi ý cải thiện:**\n`;
  advice += `• Áp dụng kỹ thuật Pomodoro (25 phút tập trung + 5 phút nghỉ)\n`;
  advice += `• Tập trung vào 2-3 nhiệm vụ quan trọng nhất mỗi ngày\n`;
  advice += `• Tránh đa nhiệm, tập trung vào 1 việc tại 1 thời điểm\n`;
  advice += `• Đặt deadline rõ ràng cho từng công việc`;

  return advice;
}

function generateTimeManagementAdvice(stats) {
  return `⏰ **Quản lý thời gian hiệu quả:**\n\n` +
    `**Nguyên tắc 80/20 (Pareto):**\n` +
    `20% công việc tạo ra 80% kết quả. Hãy tập trung vào những việc quan trọng nhất!\n\n` +
    `**Ma trận Eisenhower:**\n` +
    `• Khẩn cấp + Quan trọng: Làm ngay\n` +
    `• Không khẩn cấp + Quan trọng: Lên lịch\n` +
    `• Khẩn cấp + Không quan trọng: Ủy thác\n` +
    `• Không khẩn cấp + Không quan trọng: Loại bỏ\n\n` +
    `**Time Blocking:**\n` +
    `• 6-9h: Deep work (công việc đòi hỏi tập trung cao)\n` +
    `• 9-12h: Meetings & collaboration\n` +
    `• 13-16h: Administrative tasks\n` +
    `• 16-18h: Learning & improvement`;
}

function generateStudyAdvice(stats) {
  const studyHours = stats.study_minutes / 60;
  
  return `📚 **Tối ưu hóa học tập:**\n\n` +
    `Bạn đã học ${studyHours.toFixed(1)} giờ trong tuần qua.\n\n` +
    `**Kỹ thuật học hiệu quả:**\n` +
    `• **Active Recall:** Tự kiểm tra kiến thức thay vì đọc lại\n` +
    `• **Spaced Repetition:** Ôn tập theo khoảng thời gian tăng dần\n` +
    `• **Feynman Technique:** Giải thích như đang dạy người khác\n` +
    `• **Mind Mapping:** Vẽ sơ đồ tư duy để kết nối kiến thức\n\n` +
    `**Lịch học tối ưu:**\n` +
    `• Sáng sớm (6-9h): Môn khó, đòi hỏi tập trung cao\n` +
    `• Buổi chiều: Ôn tập, làm bài tập\n` +
    `• Tối: Đọc tài liệu, tổng kết kiến thức\n` +
    `• Nghỉ 10-15 phút sau mỗi 50-60 phút học`;
}

function generateWorkAdvice(stats) {
  const workHours = stats.work_minutes / 60;
  
  return `💼 **Tối ưu hóa công việc:**\n\n` +
    `Bạn đã làm việc ${workHours.toFixed(1)} giờ trong tuần qua.\n\n` +
    `**Nguyên tắc làm việc hiệu quả:**\n` +
    `• **Eat the Frog:** Làm việc khó nhất đầu tiên\n` +
    `• **2-Minute Rule:** Việc < 2 phút thì làm ngay\n` +
    `• **Batch Similar Tasks:** Nhóm công việc tương tự lại\n` +
    `• **Time Blocking:** Chặn thời gian cụ thể cho từng việc\n\n` +
    `**Tránh phân tâm:**\n` +
    `• Tắt thông báo không cần thiết\n` +
    `• Sử dụng chế độ focus/DND\n` +
    `• Chặn website gây mất tập trung\n` +
    `• Làm việc ở nơi yên tĩnh`;
}

function generateOptimalSchedule(existingSchedules, preferences = {}) {
  const suggestions = [];
  const workStart = 8; // 8:00
  const workEnd = 18; // 18:00

  // Tìm khoảng trống
  const busyTimes = existingSchedules.map(s => ({
    start: new Date(s.start_time).getHours(),
    end: new Date(s.end_time).getHours()
  }));

  // Gợi ý các khoảng thời gian trống
  for (let hour = workStart; hour < workEnd; hour++) {
    const isBusy = busyTimes.some(bt => hour >= bt.start && hour < bt.end);
    
    if (!isBusy && suggestions.length < 3) {
      suggestions.push({
        title: `Thời gian rảnh ${hour}:00 - ${hour + 2}:00`,
        start_hour: hour,
        end_hour: hour + 2,
        suggestion: hour < 12 
          ? 'Thời gian tốt cho công việc đòi hỏi tập trung cao' 
          : 'Thích hợp cho họp, làm việc nhóm, hoặc học tập'
      });
    }
  }

  return suggestions;
}

function analyzePerformance(stats) {
  // Tính toán các metrics
  const totalDays = [...new Set(stats.map(s => s.date))].length;
  const totalSchedules = stats.reduce((sum, s) => sum + s.total, 0);
  const totalCompleted = stats.reduce((sum, s) => sum + s.completed, 0);
  const completionRate = totalSchedules > 0 ? (totalCompleted / totalSchedules * 100).toFixed(1) : 0;

  // Phân tích xu hướng
  const workStats = stats.filter(s => s.schedule_type === 'work');
  const studyStats = stats.filter(s => s.schedule_type === 'study');

  return {
    summary: {
      total_days: totalDays,
      total_schedules: totalSchedules,
      total_completed: totalCompleted,
      completion_rate: parseFloat(completionRate)
    },
    work_analysis: {
      total_schedules: workStats.reduce((sum, s) => sum + s.total, 0),
      total_hours: Math.round(workStats.reduce((sum, s) => sum + s.total_minutes, 0) / 60),
      avg_per_day: (workStats.reduce((sum, s) => sum + s.total_minutes, 0) / 60 / totalDays).toFixed(1)
    },
    study_analysis: {
      total_schedules: studyStats.reduce((sum, s) => sum + s.total, 0),
      total_hours: Math.round(studyStats.reduce((sum, s) => sum + s.total_minutes, 0) / 60),
      avg_per_day: (studyStats.reduce((sum, s) => sum + s.total_minutes, 0) / 60 / totalDays).toFixed(1)
    },
    insights: generateInsights(completionRate, totalSchedules, totalDays),
    recommendations: generateRecommendations(completionRate, workStats, studyStats)
  };
}

function generateInsights(completionRate, totalSchedules, totalDays) {
  const insights = [];

  if (completionRate >= 80) {
    insights.push('🎉 Bạn có tỷ lệ hoàn thành rất cao! Tiếp tục duy trì.');
  } else if (completionRate >= 60) {
    insights.push('✅ Hiệu suất tốt, nhưng vẫn có thể cải thiện thêm.');
  } else {
    insights.push('⚠️ Tỷ lệ hoàn thành còn thấp, cần xem xét lại cách lên kế hoạch.');
  }

  const avgPerDay = totalSchedules / totalDays;
  if (avgPerDay > 10) {
    insights.push('📊 Bạn đang lên lịch khá nhiều mỗi ngày. Cân nhắc giảm bớt để tăng chất lượng.');
  } else if (avgPerDay < 3) {
    insights.push('📈 Bạn có thể tăng thêm các hoạt động để tối ưu thời gian.');
  }

  return insights;
}

function generateRecommendations(completionRate, workStats, studyStats) {
  const recommendations = [];

  if (completionRate < 70) {
    recommendations.push('Giảm số lượng task mỗi ngày xuống 5-7 task');
    recommendations.push('Ưu tiên các công việc quan trọng nhất (MIT - Most Important Tasks)');
  }

  const workHours = workStats.reduce((sum, s) => sum + s.total_minutes, 0) / 60;
  const studyHours = studyStats.reduce((sum, s) => sum + s.total_minutes, 0) / 60;

  if (workHours > studyHours * 3) {
    recommendations.push('Cân bằng thời gian làm việc và học tập tốt hơn');
  }

  recommendations.push('Áp dụng kỹ thuật Pomodoro cho công việc đòi hỏi tập trung cao');
  recommendations.push('Dành 30-60 phút mỗi ngày cho việc lên kế hoạch');

  return recommendations;
}

module.exports = router;