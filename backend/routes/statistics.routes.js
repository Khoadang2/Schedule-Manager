// ==========================================
// FILE: backend/routes/statistics.routes.js
// Thống kê & Báo cáo
// ==========================================

const express = require('express');
const router = express.Router();
const { sql, getConnection } = require('../config/database');
const auth = require('../middleware/auth.middleware');

router.use(auth);

// ========================================
// 1. TỔNG QUAN STATISTICS
// ========================================
router.get('/overview', async (req, res) => {
  try {
    const pool = await getConnection();
    const user_id = req.user.user_id; // ⭐ User hiện tại
    const { start_date, end_date } = req.query;

    console.log('📊 GET Statistics Overview:', { user_id, start_date, end_date });

    const request = pool.request();
    request.input('user_id', sql.Int, user_id);

    // Thêm filter date nếu có
    let dateFilter = '';
    if (start_date && end_date) {
      dateFilter = 'AND CAST(start_time AS DATE) BETWEEN @start_date AND @end_date';
      request.input('start_date', sql.Date, start_date);
      request.input('end_date', sql.Date, end_date);
    } else {
      // ⭐ Mặc định lấy 7 ngày gần nhất
      dateFilter = 'AND start_time >= DATEADD(DAY, -7, GETDATE())';
    }

    // 1. Tổng số lịch CỦA USER NÀY
    const totalQuery = `
      SELECT COUNT(*) as total
      FROM schedules 
      WHERE user_id = @user_id ${dateFilter}
    `;
    const totalResult = await request.query(totalQuery);
    const total = totalResult.recordset[0].total;

    // 2. Số lịch đã hoàn thành
    const request2 = pool.request();
    request2.input('user_id', sql.Int, user_id);
    if (start_date && end_date) {
      request2.input('start_date', sql.Date, start_date);
      request2.input('end_date', sql.Date, end_date);
    }

    const completedQuery = `
      SELECT COUNT(*) as completed
      FROM schedules 
      WHERE user_id = @user_id 
      AND is_completed = 1 ${dateFilter}
    `;
    const completedResult = await request2.query(completedQuery);
    const completed = completedResult.recordset[0].completed;

    // 3. Tổng giờ làm việc
    const request3 = pool.request();
    request3.input('user_id', sql.Int, user_id);
    if (start_date && end_date) {
      request3.input('start_date', sql.Date, start_date);
      request3.input('end_date', sql.Date, end_date);
    }

    const workHoursQuery = `
      SELECT 
        ISNULL(SUM(DATEDIFF(MINUTE, start_time, end_time)), 0) as total_minutes
      FROM schedules 
      WHERE user_id = @user_id 
      AND schedule_type = 'work' ${dateFilter}
    `;
    const workHoursResult = await request3.query(workHoursQuery);
    const work_hours = Math.round(workHoursResult.recordset[0].total_minutes / 60);

    // 4. Tổng giờ học tập
    const request4 = pool.request();
    request4.input('user_id', sql.Int, user_id);
    if (start_date && end_date) {
      request4.input('start_date', sql.Date, start_date);
      request4.input('end_date', sql.Date, end_date);
    }

    const studyHoursQuery = `
      SELECT 
        ISNULL(SUM(DATEDIFF(MINUTE, start_time, end_time)), 0) as total_minutes
      FROM schedules 
      WHERE user_id = @user_id 
      AND schedule_type = 'study' ${dateFilter}
    `;
    const studyHoursResult = await request4.query(studyHoursQuery);
    const study_hours = Math.round(studyHoursResult.recordset[0].total_minutes / 60);

    // Tính completion rate
    const completion_rate = total > 0 ? Math.round((completed / total) * 100) : 0;

    res.json({
      success: true,
      data: {
        total,
        completed,
        completion_rate,
        work_hours,
        study_hours
      }
    });

  } catch (error) {
    console.error('❌ Statistics overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thống kê tổng quan'
    });
  }
});

// ========================================
// 2. BIỂU ĐỒ THEO NGÀY
// ========================================
router.get('/daily-chart', async (req, res) => {
  try {
    const pool = await getConnection();
    const user_id = req.user.user_id; // ⭐ User hiện tại
    const { start_date, end_date } = req.query;

    console.log('📈 GET Daily Chart:', { user_id, start_date, end_date });

    // ⭐ Mặc định lấy 7 ngày gần nhất nếu không có filter
    const defaultStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const defaultEnd = new Date();

    const request = pool.request();
    request.input('user_id', sql.Int, user_id); // ⭐ Bắt buộc có user_id
    request.input('start_date', sql.Date, start_date || defaultStart);
    request.input('end_date', sql.Date, end_date || defaultEnd);

    const query = `
      SELECT 
        CONVERT(VARCHAR, start_time, 23) as date,
        schedule_type,
        COUNT(*) as count,
        SUM(DATEDIFF(MINUTE, start_time, end_time)) / 60.0 as hours
      FROM schedules
      WHERE user_id = @user_id
      AND CAST(start_time AS DATE) BETWEEN @start_date AND @end_date
      GROUP BY CONVERT(VARCHAR, start_time, 23), schedule_type
      ORDER BY date, schedule_type
    `;

    const result = await request.query(query);

    res.json({
      success: true,
      data: result.recordset
    });

  } catch (error) {
    console.error('❌ Daily chart error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy biểu đồ theo ngày'
    });
  }
});

// ========================================
// 3. PHÂN CHIA WORK/STUDY
// ========================================
router.get('/type-distribution', async (req, res) => {
  try {
    const pool = await getConnection();
    const user_id = req.user.user_id; // ⭐ User hiện tại
    const { start_date, end_date } = req.query;

    console.log('📊 GET Type Distribution:', { user_id });

    const request = pool.request();
    request.input('user_id', sql.Int, user_id); // ⭐ Bắt buộc có user_id

    // ⭐ Thêm filter date nếu có
    let dateFilter = '';
    if (start_date && end_date) {
      dateFilter = 'AND CAST(start_time AS DATE) BETWEEN @start_date AND @end_date';
      request.input('start_date', sql.Date, start_date);
      request.input('end_date', sql.Date, end_date);
    } else {
      dateFilter = 'AND start_time >= DATEADD(DAY, -7, GETDATE())';
    }

    const query = `
      SELECT 
        schedule_type,
        COUNT(*) as count,
        SUM(DATEDIFF(MINUTE, start_time, end_time)) / 60.0 as total_hours
      FROM schedules
      WHERE user_id = @user_id ${dateFilter}
      GROUP BY schedule_type
    `;

    const result = await request.query(query);

    const data = result.recordset.map(row => ({
      type: row.schedule_type,
      count: row.count,
      hours: Math.round(row.total_hours * 10) / 10,
      percentage: 0 // Sẽ tính sau
    }));

    // Tính percentage
    const total = data.reduce((sum, item) => sum + item.count, 0);
    data.forEach(item => {
      item.percentage = total > 0 ? Math.round((item.count / total) * 100) : 0;
    });

    res.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('❌ Type distribution error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy phân bố loại lịch'
    });
  }
});

// ========================================
// 4. SO SÁNH VỚI TUẦN TRƯỚC
// ========================================
router.get('/weekly-comparison', async (req, res) => {
  try {
    const pool = await getConnection();
    const user_id = req.user.user_id; // ⭐ User hiện tại

    console.log('📊 GET Weekly Comparison for user:', user_id);

    const request = pool.request();
    request.input('user_id', sql.Int, user_id); // ⭐ Bắt buộc có user_id

    const query = `
      WITH CurrentWeek AS (
        SELECT COUNT(*) as current_count
        FROM schedules
        WHERE user_id = @user_id
        AND start_time >= DATEADD(DAY, -7, GETDATE())
      ),
      LastWeek AS (
        SELECT COUNT(*) as last_count
        FROM schedules
        WHERE user_id = @user_id
        AND start_time >= DATEADD(DAY, -14, GETDATE())
        AND start_time < DATEADD(DAY, -7, GETDATE())
      )
      SELECT 
        ISNULL(c.current_count, 0) as current_week,
        ISNULL(l.last_count, 0) as last_week
      FROM CurrentWeek c, LastWeek l
    `;

    const result = await request.query(query);
    const data = result.recordset[0];

    const change = data.last_week > 0 
      ? Math.round(((data.current_week - data.last_week) / data.last_week) * 100)
      : 0;

    res.json({
      success: true,
      data: {
        current_week: data.current_week,
        last_week: data.last_week,
        change,
        trend: change > 0 ? 'up' : change < 0 ? 'down' : 'stable'
      }
    });

  } catch (error) {
    console.error('❌ Weekly comparison error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi so sánh tuần'
    });
  }
});

module.exports = router;