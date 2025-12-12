const express = require('express');
const router = express.Router();
const { getConnection, sql } = require('../config/database');
const authMiddleware = require('../middleware/auth.middleware');

router.use(authMiddleware);

// Chat với AI - Endpoint chính cho chatbot
router.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;
    const pool = await getConnection();
    const userId = req.user.user_id;

    // Lấy dữ liệu người dùng để phân tích
    const userStats = await pool.request()
      .input('user_id', sql.Int, userId)
      .query(`
        SELECT 
          COUNT(*) as total_schedules,
          SUM(CASE WHEN is_completed = 1 THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN schedule_type = 'work' THEN duration ELSE 0 END) as work_minutes,
          SUM(CASE WHEN schedule_type = 'study' THEN duration ELSE 0 END) as study_minutes,
          AVG(CAST(is_completed AS FLOAT)) * 100 as completion_rate
        FROM Schedules
        WHERE user_id = @user_id
        AND start_time >= DATEADD(day, -7, GETDATE())
      `);

    const stats = userStats.recordset[0];

    // Phân tích và trả lời
    let response = analyzeMessageAndRespond(message, stats, req.user.hoten);

    // Lưu conversation
    await pool.request()
      .input('user_id', sql.Int, userId)
      .input('suggestion_type', sql.NVarChar, 'chat')
      .input('suggestion_text', sql.NVarChar, `User: ${message}\nAI: ${response}`)
      .query(`
        INSERT INTO AI_Suggestions (user_id, suggestion_type, suggestion_text)
        VALUES (@user_id, @suggestion_type, @suggestion_text)
      `);

    res.json({
      success: true,
      data: {
        message: response,
        stats
      }
    });

  } catch (error) {
    console.error('❌ Lỗi AI chat:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại sau.' 
    });
  }
});

// Phân tích thói quen làm việc/học tập cá nhân
router.get('/analyze-habits', async (req, res) => {
  try {
    const pool = await getConnection();
    const userId = req.user.user_id;

    // 1. Phân tích khung giờ làm việc hiệu quả nhất
    const timeAnalysis = await pool.request()
      .input('user_id', sql.Int, userId)
      .query(`
        SELECT 
          DATEPART(HOUR, start_time) as hour_of_day,
          COUNT(*) as total_schedules,
          SUM(CASE WHEN is_completed = 1 THEN 1 ELSE 0 END) as completed,
          CAST(
            SUM(CASE WHEN is_completed = 1 THEN 1.0 ELSE 0 END) / COUNT(*) * 100 
            AS DECIMAL(5,2)
          ) as completion_rate
        FROM Schedules
        WHERE user_id = @user_id
        AND start_time >= DATEADD(DAY, -30, GETDATE())
        GROUP BY DATEPART(HOUR, start_time)
        ORDER BY completion_rate DESC
      `);

    // 2. Phân tích thời lượng tối ưu
    const durationAnalysis = await pool.request()
      .input('user_id', sql.Int, userId)
      .query(`
        SELECT 
          CASE 
            WHEN duration <= 60 THEN '30-60 phút'
            WHEN duration <= 90 THEN '60-90 phút'
            WHEN duration <= 120 THEN '90-120 phút'
            ELSE 'Trên 120 phút'
          END as duration_range,
          COUNT(*) as total,
          AVG(CAST(is_completed AS FLOAT)) * 100 as avg_completion_rate
        FROM Schedules
        WHERE user_id = @user_id
        AND start_time >= DATEADD(DAY, -30, GETDATE())
        GROUP BY 
          CASE 
            WHEN duration <= 60 THEN '30-60 phút'
            WHEN duration <= 90 THEN '60-90 phút'
            WHEN duration <= 120 THEN '90-120 phút'
            ELSE 'Trên 120 phút'
          END
        ORDER BY avg_completion_rate DESC
      `);

    // 3. Phân tích ngày trong tuần hiệu quả nhất
    const dayAnalysis = await pool.request()
      .input('user_id', sql.Int, userId)
      .query(`
        SELECT 
          DATENAME(WEEKDAY, start_time) as day_name,
          COUNT(*) as total,
          AVG(CAST(is_completed AS FLOAT)) * 100 as completion_rate
        FROM Schedules
        WHERE user_id = @user_id
        AND start_time >= DATEADD(DAY, -30, GETDATE())
        GROUP BY DATENAME(WEEKDAY, start_time), DATEPART(WEEKDAY, start_time)
        ORDER BY DATEPART(WEEKDAY, start_time)
      `);

    // 4. Phân tích độ tải công việc
    const workloadAnalysis = await pool.request()
      .input('user_id', sql.Int, userId)
      .query(`
        SELECT 
          CAST(start_time AS DATE) as date,
          COUNT(*) as daily_schedules,
          SUM(duration) as total_minutes
        FROM Schedules
        WHERE user_id = @user_id
        AND start_time >= DATEADD(DAY, -30, GETDATE())
        GROUP BY CAST(start_time AS DATE)
        ORDER BY total_minutes DESC
      `);

    // Tạo insights
    const insights = generatePersonalInsights({
      timeAnalysis: timeAnalysis.recordset,
      durationAnalysis: durationAnalysis.recordset,
      dayAnalysis: dayAnalysis.recordset,
      workloadAnalysis: workloadAnalysis.recordset,
      userName: req.user.hoten
    });

    res.json({
      success: true,
      data: {
        timeAnalysis: timeAnalysis.recordset,
        durationAnalysis: durationAnalysis.recordset,
        dayAnalysis: dayAnalysis.recordset,
        workloadAnalysis: workloadAnalysis.recordset.slice(0, 10),
        insights
      }
    });

  } catch (error) {
    console.error('❌ Lỗi phân tích thói quen:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi server' 
    });
  }
});

// Lời khuyên cá nhân hóa theo mục tiêu
router.post('/personal-advice', async (req, res) => {
  try {
    const pool = await getConnection();
    const userId = req.user.user_id;
    const { goal, currentStatus, challenges } = req.body;

    // Lấy dữ liệu user
    const userData = await pool.request()
      .input('user_id', sql.Int, userId)
      .query(`
        SELECT 
          COUNT(*) as total_schedules,
          AVG(CAST(is_completed AS FLOAT)) * 100 as avg_completion_rate,
          AVG(duration) as avg_duration,
          SUM(CASE WHEN schedule_type = 'work' THEN duration ELSE 0 END) as total_work_minutes,
          SUM(CASE WHEN schedule_type = 'study' THEN duration ELSE 0 END) as total_study_minutes
        FROM Schedules
        WHERE user_id = @user_id
        AND start_time >= DATEADD(DAY, -7, GETDATE())
      `);

    const advice = generatePersonalAdvice({
      goal,
      currentStatus,
      challenges,
      userData: userData.recordset[0],
      userName: req.user.hoten
    });

    // Lưu lời khuyên
    await pool.request()
      .input('user_id', sql.Int, userId)
      .input('suggestion_type', sql.NVarChar, 'personal_advice')
      .input('suggestion_text', sql.NVarChar, JSON.stringify(advice))
      .query(`
        INSERT INTO AI_Suggestions (user_id, suggestion_type, suggestion_text)
        VALUES (@user_id, @suggestion_type, @suggestion_text)
      `);

    res.json({
      success: true,
      data: advice
    });

  } catch (error) {
    console.error('❌ Lỗi tạo lời khuyên:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi server' 
    });
  }
});

// Tạo kế hoạch học tập/làm việc cá nhân
router.post('/create-personal-plan', async (req, res) => {
  try {
    const pool = await getConnection();
    const userId = req.user.user_id;
    const { planType, duration, preferences, goals } = req.body;

    // Phân tích lịch sử
    const history = await pool.request()
      .input('user_id', sql.Int, userId)
      .query(`
        SELECT 
          DATEPART(HOUR, start_time) as preferred_hour,
          AVG(duration) as avg_duration,
          schedule_type
        FROM Schedules
        WHERE user_id = @user_id
        AND is_completed = 1
        AND start_time >= DATEADD(DAY, -30, GETDATE())
        GROUP BY DATEPART(HOUR, start_time), schedule_type
        ORDER BY COUNT(*) DESC
      `);

    const plan = createPersonalizedPlan({
      planType,
      duration,
      preferences,
      goals,
      history: history.recordset,
      userName: req.user.hoten
    });

    res.json({
      success: true,
      data: plan
    });

  } catch (error) {
    console.error('❌ Lỗi tạo kế hoạch:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi server' 
    });
  }
});

// Nhắc nhở thông minh dựa trên thói quen
router.get('/smart-reminders', async (req, res) => {
  try {
    const pool = await getConnection();
    const userId = req.user.user_id;

    // Tìm các pattern trong lịch
    const patterns = await pool.request()
      .input('user_id', sql.Int, userId)
      .query(`
        SELECT 
          title,
          DATEPART(WEEKDAY, start_time) as day_of_week,
          DATEPART(HOUR, start_time) as hour_of_day,
          schedule_type,
          COUNT(*) as frequency
        FROM Schedules
        WHERE user_id = @user_id
        AND start_time >= DATEADD(DAY, -60, GETDATE())
        GROUP BY title, DATEPART(WEEKDAY, start_time), DATEPART(HOUR, start_time), schedule_type
        HAVING COUNT(*) >= 3
        ORDER BY frequency DESC
      `);

    const reminders = generateSmartReminders({
      patterns: patterns.recordset,
      userName: req.user.hoten
    });

    res.json({
      success: true,
      data: reminders
    });

  } catch (error) {
    console.error('❌ Lỗi tạo nhắc nhở:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi server' 
    });
  }
});

// === HELPER FUNCTIONS ===

function analyzeMessageAndRespond(message, stats, userName) {
  const lowerMessage = message.toLowerCase();
  
  // Phân tích lịch làm việc
  if (lowerMessage.includes('lịch') || lowerMessage.includes('phân tích') || lowerMessage.includes('làm việc')) {
    return generateScheduleAnalysis(stats, userName);
  }
  
  // Hiệu suất
  if (lowerMessage.includes('hiệu suất') || lowerMessage.includes('năng suất') || lowerMessage.includes('performance')) {
    return generateProductivityResponse(stats, userName);
  }
  
  // Quản lý thời gian
  if (lowerMessage.includes('thời gian') || lowerMessage.includes('quản lý') || lowerMessage.includes('time')) {
    return generateTimeManagementTips(userName);
  }
  
  // Học tập
  if (lowerMessage.includes('học') || lowerMessage.includes('study') || lowerMessage.includes('ôn thi')) {
    return generateStudyAdvice(stats, userName);
  }
  
  // Tối ưu hóa
  if (lowerMessage.includes('tối ưu') || lowerMessage.includes('cải thiện') || lowerMessage.includes('improve')) {
    return generateOptimizationAdvice(stats, userName);
  }

  // Lời chào
  if (lowerMessage.includes('xin chào') || lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
    return `Xin chào ${userName}! 👋\n\nTôi là AI trợ lý cá nhân của bạn. Tôi có thể giúp bạn:\n\n• 📊 Phân tích lịch làm việc và học tập\n• 💡 Đề xuất cách quản lý thời gian hiệu quả\n• 🎯 Gợi ý cải thiện năng suất\n• 📚 Hướng dẫn học tập hiệu quả\n• ⏰ Tạo lịch trình tối ưu\n\nBạn muốn tôi giúp gì?`;
  }

  // Cảm ơn
  if (lowerMessage.includes('cảm ơn') || lowerMessage.includes('thanks') || lowerMessage.includes('thank')) {
    return `Không có gì! 😊 Tôi luôn sẵn sàng hỗ trợ bạn. Nếu cần gì thêm, cứ hỏi tôi nhé!`;
  }

  // Mặc định
  return `Chào ${userName}! 👋\n\nTôi hiểu bạn đang hỏi về "${message}".\n\nDựa trên dữ liệu của bạn:\n• Tổng lịch tuần này: ${stats.total_schedules}\n• Đã hoàn thành: ${stats.completed}\n• Tỷ lệ hoàn thành: ${stats.completion_rate?.toFixed(1) || 0}%\n• Thời gian làm việc: ${Math.round(stats.work_minutes / 60)}h\n• Thời gian học tập: ${Math.round(stats.study_minutes / 60)}h\n\nBạn có thể hỏi tôi về:\n- Phân tích lịch làm việc\n- Cải thiện hiệu suất\n- Quản lý thời gian\n- Học tập hiệu quả`;
}

function generateScheduleAnalysis(stats, userName) {
  const completionRate = stats.completion_rate || 0;
  const totalHours = (stats.work_minutes + stats.study_minutes) / 60;

  let analysis = `📊 **Phân tích lịch làm việc của ${userName}:**\n\n`;
  analysis += `📈 **Tổng quan tuần này:**\n`;
  analysis += `• Tổng số lịch: ${stats.total_schedules}\n`;
  analysis += `• Đã hoàn thành: ${stats.completed} (${completionRate.toFixed(1)}%)\n`;
  analysis += `• Thời gian làm việc: ${Math.round(stats.work_minutes / 60)} giờ\n`;
  analysis += `• Thời gian học tập: ${Math.round(stats.study_minutes / 60)} giờ\n`;
  analysis += `• Tổng thời gian: ${totalHours.toFixed(1)} giờ\n\n`;

  if (completionRate < 50) {
    analysis += `⚠️ **Nhận xét:**\n`;
    analysis += `Tỷ lệ hoàn thành của bạn còn thấp. Một số lời khuyên:\n`;
    analysis += `• Chia nhỏ công việc thành các task nhỏ hơn\n`;
    analysis += `• Ưu tiên 2-3 việc quan trọng nhất mỗi ngày\n`;
    analysis += `• Giảm số lượng lịch, tập trung vào chất lượng\n`;
    analysis += `• Đặt deadline thực tế hơn`;
  } else if (completionRate >= 80) {
    analysis += `🎉 **Xuất sắc!**\n`;
    analysis += `Bạn đang làm việc rất hiệu quả! Tỷ lệ hoàn thành ${completionRate.toFixed(1)}% là rất tốt.\n\n`;
    analysis += `💡 **Gợi ý để duy trì:**\n`;
    analysis += `• Tiếp tục giữ nhịp độ hiện tại\n`;
    analysis += `• Có thể thử thách bản thân với mục tiêu cao hơn\n`;
    analysis += `• Chia sẻ kinh nghiệm với người khác`;
  } else {
    analysis += `✅ **Tốt lắm!**\n`;
    analysis += `Bạn đang tiến bộ với tỷ lệ ${completionRate.toFixed(1)}%.\n\n`;
    analysis += `🎯 **Để đạt 90%+:**\n`;
    analysis += `• Bắt đầu ngày với công việc khó nhất\n`;
    analysis += `• Loại bỏ các yếu tố gây phân tâm\n`;
    analysis += `• Review lại cuối ngày xem đã làm được gì`;
  }

  return analysis;
}

function generateProductivityResponse(stats, userName) {
  const completionRate = stats.completion_rate || 0;
  
  let response = `💪 **Phân tích năng suất của ${userName}:**\n\n`;
  response += `📊 **Chỉ số hiện tại:**\n`;
  response += `• Điểm năng suất: ${completionRate.toFixed(1)}/100\n`;
  response += `• Thời gian làm việc: ${Math.round(stats.work_minutes / 60)}h\n`;
  response += `• Thời gian học tập: ${Math.round(stats.study_minutes / 60)}h\n\n`;

  response += `🚀 **5 cách tăng năng suất:**\n\n`;
  response += `1️⃣ **Pomodoro Technique**\n`;
  response += `   • 25 phút tập trung + 5 phút nghỉ\n`;
  response += `   • Sau 4 pomodoro nghỉ 15-30 phút\n\n`;

  response += `2️⃣ **Nguyên tắc 80/20**\n`;
  response += `   • 20% công việc tạo ra 80% kết quả\n`;
  response += `   • Tập trung vào việc quan trọng nhất\n\n`;

  response += `3️⃣ **Deep Work**\n`;
  response += `   • 2-4 giờ tập trung không bị gián đoạn\n`;
  response += `   • Tắt thông báo, điện thoại ở xa\n\n`;

  response += `4️⃣ **Time Blocking**\n`;
  response += `   • Chia ngày thành các khối thời gian cố định\n`;
  response += `   • Mỗi khối làm 1 việc cụ thể\n\n`;

  response += `5️⃣ **2-Minute Rule**\n`;
  response += `   • Việc < 2 phút thì làm ngay\n`;
  response += `   • Tránh tích tụ việc nhỏ`;

  return response;
}

function generateTimeManagementTips(userName) {
  return `⏰ **Quản lý thời gian hiệu quả cho ${userName}:**\n\n` +
    `📋 **Ma trận Eisenhower:**\n` +
    `1. Khẩn cấp + Quan trọng → Làm ngay\n` +
    `2. Quan trọng + Không khẩn cấp → Lên lịch\n` +
    `3. Khẩn cấp + Không quan trọng → Ủy thác\n` +
    `4. Không quan trọng + Không khẩn cấp → Loại bỏ\n\n` +
    `🎯 **Lập kế hoạch ngày:**\n` +
    `• Tối hôm trước: Viết 3 việc quan trọng nhất\n` +
    `• Sáng sớm: Review và bắt đầu việc khó nhất\n` +
    `• Cuối ngày: Đánh giá và lên kế hoạch ngày mai\n\n` +
    `⚡ **Time Blocking mẫu:**\n` +
    `• 6-9h: Deep work (việc đòi hỏi tập trung cao)\n` +
    `• 9-12h: Meetings & collaboration\n` +
    `• 13-16h: Administrative tasks\n` +
    `• 16-18h: Learning & improvement\n` +
    `• 18h+: Personal time\n\n` +
    `💡 **Tips thêm:**\n` +
    `• Học cách nói "Không" với việc không quan trọng\n` +
    `• Batch similar tasks (nhóm việc giống nhau)\n` +
    `• Dành 10-15% thời gian cho việc không lên kế hoạch`;
}

function generateStudyAdvice(stats, userName) {
  const studyHours = stats.study_minutes / 60;
  
  return `📚 **Học tập hiệu quả cho ${userName}:**\n\n` +
    `📊 Bạn đã học ${studyHours.toFixed(1)} giờ tuần này.\n\n` +
    `🎓 **4 phương pháp học tập khoa học:**\n\n` +
    `1️⃣ **Active Recall (Nhớ lại chủ động)**\n` +
    `   • Tự kiểm tra thay vì đọc lại\n` +
    `   • Viết ra những gì nhớ được\n` +
    `   • Giải thích cho người khác\n\n` +
    `2️⃣ **Spaced Repetition (Ôn tập ngắt quãng)**\n` +
    `   • Ôn lại sau: 1 ngày → 3 ngày → 1 tuần → 1 tháng\n` +
    `   • Dùng flashcards hoặc Anki\n\n` +
    `3️⃣ **Feynman Technique**\n` +
    `   • Bước 1: Học concept\n` +
    `   • Bước 2: Giải thích như dạy trẻ con\n` +
    `   • Bước 3: Tìm chỗ không hiểu và học lại\n` +
    `   • Bước 4: Đơn giản hóa và dùng ví dụ\n\n` +
    `4️⃣ **Mind Mapping**\n` +
    `   • Vẽ sơ đồ tư duy kết nối kiến thức\n` +
    `   • Dùng màu sắc, hình ảnh\n\n` +
    `⏰ **Lịch học tối ưu:**\n` +
    `• Sáng (6-9h): Môn khó, cần tập trung cao\n` +
    `• Chiều (14-17h): Ôn tập, làm bài tập\n` +
    `• Tối (19-21h): Đọc tài liệu, tổng kết\n` +
    `• Nghỉ 10-15 phút sau mỗi 50 phút học`;
}

function generateOptimizationAdvice(stats, userName) {
  return `🎯 **Tối ưu hóa hiệu suất cho ${userName}:**\n\n` +
    `💪 **Năng lượng & Sức khỏe:**\n` +
    `• Ngủ đủ 7-8 tiếng/đêm\n` +
    `• Tập thể dục 30 phút/ngày\n` +
    `• Ăn uống lành mạnh, đủ nước\n` +
    `• Nghỉ giải lao đều đặn\n\n` +
    `🧠 **Tối ưu não bộ:**\n` +
    `• Thiền 10 phút mỗi sáng\n` +
    `• Tắt multi-tasking, làm 1 việc/lúc\n` +
    `• Deep work vào lúc năng lượng cao nhất\n` +
    `• Tránh decision fatigue (quyết định nhiều)\n\n` +
    `📱 **Công nghệ:**\n` +
    `• Tắt thông báo không cần thiết\n` +
    `• Dùng app chặn website gây phân tâm\n` +
    `• Bật chế độ Focus/Do Not Disturb\n` +
    `• Xa điện thoại khi làm việc quan trọng\n\n` +
    `🎯 **Thói quen tốt:**\n` +
    `• Dậy sớm cùng giờ mỗi ngày\n` +
    `• Tập thể dục buổi sáng\n` +
    `• Review công việc cuối ngày\n` +
    `• Đọc sách 30 phút trước khi ngủ`;
}

function generatePersonalInsights(data) {
  const { timeAnalysis, durationAnalysis, dayAnalysis, workloadAnalysis, userName } = data;
  const insights = [];

  // Khung giờ vàng
  if (timeAnalysis.length > 0) {
    const bestTime = timeAnalysis[0];
    insights.push({
      type: 'best_time',
      title: '⭐ Khung giờ vàng của bạn',
      message: `${userName} ơi, bạn làm việc hiệu quả nhất vào khoảng ${bestTime.hour_of_day}:00 với tỷ lệ hoàn thành ${bestTime.completion_rate}%. Hãy ưu tiên sắp xếp các công việc quan trọng vào khung giờ này!`
    });
  }

  // Thời lượng tối ưu
  if (durationAnalysis.length > 0) {
    const bestDuration = durationAnalysis[0];
    insights.push({
      type: 'optimal_duration',
      title: '⏱️ Thời lượng làm việc lý tưởng',
      message: `Bạn có xu hướng hoàn thành tốt nhất các công việc trong khoảng ${bestDuration.duration_range}. Hãy chia nhỏ các task lớn theo thời lượng này!`
    });
  }

  // Ngày làm việc hiệu quả
  if (dayAnalysis.length > 0) {
    const sortedDays = [...dayAnalysis].sort((a, b) => b.completion_rate - a.completion_rate);
    const bestDay = sortedDays[0];
    insights.push({
      type: 'productive_day',
      title: '📅 Ngày làm việc năng suất nhất',
      message: `${bestDay.day_name} là ngày bạn làm việc năng suất nhất với tỷ lệ hoàn thành ${bestDay.completion_rate.toFixed(1)}%. Hãy tận dụng ngày này cho các deadline quan trọng!`
    });
  }

  // Cảnh báo quá tải
  if (workloadAnalysis.length > 0) {
    const avgMinutes = workloadAnalysis.reduce((sum, day) => sum + day.total_minutes, 0) / workloadAnalysis.length;
    const overloadDays = workloadAnalysis.filter(day => day.total_minutes > avgMinutes * 1.5);
    
    if (overloadDays.length > 0) {
      insights.push({
        type: 'workload_warning',
        title: '⚠️ Cảnh báo quá tải',
        message: `Bạn có ${overloadDays.length} ngày với khối lượng công việc vượt trung bình 50%. Hãy chú ý cân bằng và nghỉ ngơi hợp lý!`
      });
    }
  }

  // Gợi ý cải thiện
  insights.push({
    type: 'improvement',
    title: '💡 Gợi ý cải thiện',
    message: `Dựa trên phân tích, bạn nên: 1) Tập trung công việc quan trọng vào khung giờ vàng, 2) Chia nhỏ task theo thời lượng tối ưu, 3) Đặt deadline vào ngày năng suất nhất, 4) Tránh lên lịch quá nhiều trong một ngày.`
  });

  return insights;
}

function generatePersonalAdvice(data) {
  const { goal, currentStatus, challenges, userData, userName } = data;
  
  const advice = {
    greeting: `Xin chào ${userName}!`,
    analysis: [],
    recommendations: [],
    actionPlan: []
  };

  // Phân tích hiện trạng
  if (userData.avg_completion_rate < 60) {
    advice.analysis.push('📊 Tỷ lệ hoàn thành công việc của bạn hiện tại còn thấp. Điều này có thể do bạn đang lên lịch quá nhiều hoặc mục tiêu chưa thực tế.');
  } else if (userData.avg_completion_rate >= 80) {
    advice.analysis.push('🎉 Tuyệt vời! Bạn đang duy trì tỷ lệ hoàn thành rất tốt. Hãy tiếp tục phát huy!');
  }

  // Đề xuất dựa trên mục tiêu
  if (goal === 'improve_productivity') {
    advice.recommendations.push(
      '🎯 Áp dụng nguyên tắc 80/20: Tập trung vào 20% công việc tạo ra 80% kết quả',
      '⏰ Sử dụng kỹ thuật Pomodoro: 25 phút tập trung + 5 phút nghỉ',
      '📝 Lập to-do list mỗi tối cho ngày hôm sau',
      '🚫 Loại bỏ các yếu tố gây phân tâm trong giờ làm việc'
    );
  } else if (goal === 'work_life_balance') {
    advice.recommendations.push(
      '⚖️ Đặt giới hạn rõ ràng giữa giờ làm việc và thời gian cá nhân',
      '🧘 Dành ít nhất 30 phút mỗi ngày cho hoạt động thư giãn',
      '👨‍👩‍👧‍👦 Ưu tiên thời gian cho gia đình và bạn bè',
      '💤 Đảm bảo 7-8 tiếng ngủ mỗi đêm'
    );
  } else if (goal === 'study_better') {
    advice.recommendations.push(
      '📚 Áp dụng phương pháp Active Recall: Tự kiểm tra thay vì đọc lại',
      '🔄 Spaced Repetition: Ôn tập theo khoảng thời gian tăng dần',
      '🗺️ Tạo mind map để kết nối kiến thức',
      '👥 Học nhóm để trao đổi và củng cố kiến thức'
    );
  }

  // Kế hoạch hành động cụ thể
  advice.actionPlan = [
    {
      week: 1,
      focus: 'Thiết lập thói quen',
      tasks: [
        'Xác định 3 mục tiêu ưu tiên hàng đầu',
        'Lập lịch cố định cho các công việc quan trọng',
        'Theo dõi thời gian thực tế vs ước tính'
      ]
    },
    {
      week: 2,
      focus: 'Tối ưu hóa',
      tasks: [
        'Điều chỉnh lịch dựa trên dữ liệu tuần 1',
        'Áp dụng các kỹ thuật tăng năng suất',
        'Giảm thiểu công việc không cần thiết'
      ]
    },
    {
      week: 3-4,
      focus: 'Duy trì và cải thiện',
      tasks: [
        'Rà soát và đánh giá tiến độ',
        'Điều chỉnh mục tiêu nếu cần',
        'Xây dựng thói quen lâu dài'
      ]
    }
  ];

  return advice;
}

function createPersonalizedPlan(data) {
  const { planType, duration, preferences, goals, history, userName } = data;
  
  // Phân tích thói quen từ lịch sử
  const workHours = history.filter(h => h.schedule_type === 'work');
  const studyHours = history.filter(h => h.schedule_type === 'study');
  
  const preferredWorkHour = workHours.length > 0 ? workHours[0].preferred_hour : 9;
  const preferredStudyHour = studyHours.length > 0 ? studyHours[0].preferred_hour : 19;

  const plan = {
    title: `Kế hoạch ${planType === 'study' ? 'Học tập' : 'Làm việc'} cá nhân của ${userName}`,
    duration: duration,
    schedule: []
  };

  // Tạo lịch theo tuần
  const days = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
  
  days.forEach((day, index) => {
    const daySchedule = {
      day,
      sessions: []
    };

    if (index < 5) { // Weekdays
      if (planType === 'study') {
        daySchedule.sessions.push(
          {
            time: `${preferredStudyHour}:00 - ${preferredStudyHour + 2}:00`,
            activity: 'Học lý thuyết / Xem bài giảng',
            note: 'Tập trung vào các khái niệm khó'
          },
          {
            time: `${preferredStudyHour + 2}:30 - ${preferredStudyHour + 3}:30`,
            activity: 'Làm bài tập thực hành',
            note: 'Áp dụng kiến thức đã học'
          }
        );
      } else {
        daySchedule.sessions.push(
          {
            time: `${preferredWorkHour}:00 - ${preferredWorkHour + 2}:00`,
            activity: 'Deep Work - Công việc quan trọng nhất',
            note: 'Tắt thông báo, tập trung 100%'
          },
          {
            time: `${preferredWorkHour + 2}:30 - ${preferredWorkHour + 4}:30`,
            activity: 'Họp, email, công việc phụ',
            note: 'Xử lý các task không cần tập trung cao'
          }
        );
      }
    } else { // Weekend
      daySchedule.sessions.push(
        {
          time: '09:00 - 12:00',
          activity: index === 5 ? 'Project cá nhân / Review tuần' : 'Nghỉ ngơi / Hoạt động cá nhân',
          note: index === 5 ? 'Tổng kết và lên kế hoạch tuần sau' : 'Tái tạo năng lượng'
        }
      );
    }

    plan.schedule.push(daySchedule);
  });

  plan.tips = [
    '💪 Bắt đầu ngày với công việc khó nhất (Eat the Frog)',
    '⏰ Đặt timer cho mỗi session để duy trì focus',
    '📝 Review cuối ngày: Đã làm được gì, còn thiếu gì',
    '🎯 Linh hoạt điều chỉnh nếu cần, nhưng giữ nguyên thói quen'
  ];

  return plan;
}

function generateSmartReminders(data) {
  const { patterns, userName } = data;
  const reminders = [];

  patterns.forEach(pattern => {
    if (pattern.frequency >= 3) {
      const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
      reminders.push({
        activity: pattern.title,
        suggestion: `Bạn thường có "${pattern.title}" vào ${days[pattern.day_of_week - 1]} lúc ${pattern.hour_of_day}:00. Bạn có muốn tự động tạo lịch cho hoạt động này không?`,
        frequency: pattern.frequency,
        pattern: {
          day_of_week: pattern.day_of_week,
          hour_of_day: pattern.hour_of_day,
          type: pattern.schedule_type
        }
      });
    }
  });

  return {
    message: `${userName} ơi, tôi nhận thấy một số hoạt động định kỳ của bạn. Hãy để tôi giúp bạn tự động hóa chúng!`,
    reminders: reminders.slice(0, 5)
  };
}

module.exports = router;