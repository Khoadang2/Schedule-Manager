// ==========================================
// FILE: backend/routes/schedule.routes.js
// SQL SERVER VERSION
// ==========================================

const express = require('express');
const router = express.Router();
const { sql, getConnection } = require('../config/database');
const auth = require('../middleware/auth.middleware');

// ✅ Tất cả routes đều cần authentication
router.use(auth);

// ========================================
// 1. GET ALL SCHEDULES (với filter date)
// ========================================
router.get('/', async (req, res) => {
  try {
    const pool = await getConnection();
    const user_id = req.user.user_id;
    const { start, end } = req.query;

    console.log('📅 GET Schedules:', { user_id, start, end });

    let query = `
      SELECT 
        schedule_id,
        user_id,
        title,
        description,
        location,
        start_time,
        end_time,
        schedule_type,
        color,
        priority,
        reminder_time,
        is_completed,
        created_at
      FROM schedules 
      WHERE user_id = @user_id
    `;

    const request = pool.request();
    request.input('user_id', sql.Int, user_id);

    if (start && end) {
      query += ` AND CAST(start_time AS DATE) BETWEEN @start AND @end`;
      request.input('start', sql.Date, start);
      request.input('end', sql.Date, end);
    }

    query += ` ORDER BY start_time ASC`;

    const result = await request.query(query);
    const schedules = result.recordset || [];

    console.log('✅ Found schedules:', schedules.length);

    res.json({
      success: true,
      schedules: schedules
    });

  } catch (error) {
    console.error('❌ Get schedules error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách lịch',
      error: error.message
    });
  }
});

// ========================================
// 2. CREATE SCHEDULE
// ========================================
router.post('/', async (req, res) => {
  try {
    const pool = await getConnection();
    const {
      title,
      description,
      location,
      start_time,
      end_time,
      schedule_type,
      color,
      priority,
      reminder_time
    } = req.body;

    const user_id = req.user.user_id;

    console.log('📝 CREATE Schedule:', { user_id, title, start_time, end_time });

    // Validation
    if (!title || !start_time || !end_time || !schedule_type) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin bắt buộc: title, start_time, end_time, schedule_type'
      });
    }

    // Validate time
    if (new Date(end_time) <= new Date(start_time)) {
      return res.status(400).json({
        success: false,
        message: 'Thời gian kết thúc phải sau thời gian bắt đầu'
      });
    }

    // Insert schedule
    const request = pool.request();
    request.input('user_id', sql.Int, user_id);
    request.input('title', sql.NVarChar, title);
    request.input('description', sql.NVarChar, description || null);
    request.input('location', sql.NVarChar, location || null);
    request.input('start_time', sql.DateTime, start_time);
    request.input('end_time', sql.DateTime, end_time);
    request.input('schedule_type', sql.NVarChar, schedule_type);
    request.input('color', sql.NVarChar, color || '#3B82F6');
    request.input('priority', sql.NVarChar, priority || 'medium');
    request.input('reminder_time', sql.Int, reminder_time || 15);

    const insertQuery = `
      INSERT INTO schedules (
        user_id, 
        title, 
        description, 
        location, 
        start_time, 
        end_time, 
        schedule_type, 
        color, 
        priority, 
        reminder_time,
        is_completed,
        created_at
      ) 
      OUTPUT INSERTED.*
      VALUES (
        @user_id,
        @title,
        @description,
        @location,
        @start_time,
        @end_time,
        @schedule_type,
        @color,
        @priority,
        @reminder_time,
        0,
        GETDATE()
      )
    `;

    const result = await request.query(insertQuery);
    const newSchedule = result.recordset[0];

    console.log('✅ Created schedule:', newSchedule);

    res.status(201).json({
      success: true,
      message: 'Tạo lịch thành công',
      data: newSchedule
    });

  } catch (error) {
    console.error('❌ Create schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi tạo lịch',
      error: error.message
    });
  }
});

// ========================================
// 3. UPDATE SCHEDULE
// ========================================
router.put('/:id', async (req, res) => {
  try {
    const pool = await getConnection();
    const { id } = req.params;
    const user_id = req.user.user_id;
    const updateData = req.body;

    console.log('✏️ UPDATE Schedule:', { id, user_id, updateData });

    // Validate time nếu có
    if (updateData.start_time && updateData.end_time) {
      if (new Date(updateData.end_time) <= new Date(updateData.start_time)) {
        return res.status(400).json({
          success: false,
          message: 'Thời gian kết thúc phải sau thời gian bắt đầu'
        });
      }
    }

    // Check ownership
    const checkRequest = pool.request();
    checkRequest.input('schedule_id', sql.Int, id);
    checkRequest.input('user_id', sql.Int, user_id);

    const checkResult = await checkRequest.query(
      'SELECT schedule_id FROM schedules WHERE schedule_id = @schedule_id AND user_id = @user_id'
    );

    if (checkResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy lịch hoặc bạn không có quyền'
      });
    }

    // Build update query
    const allowedFields = {
      'title': sql.NVarChar,
      'description': sql.NVarChar,
      'location': sql.NVarChar,
      'start_time': sql.DateTime,
      'end_time': sql.DateTime,
      'schedule_type': sql.NVarChar,
      'color': sql.NVarChar,
      'priority': sql.NVarChar,
      'reminder_time': sql.Int
    };

    const updates = [];
    const updateRequest = pool.request();

    Object.keys(updateData).forEach(key => {
      if (allowedFields[key]) {
        updates.push(`${key} = @${key}`);
        updateRequest.input(key, allowedFields[key], updateData[key]);
      }
    });

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Không có dữ liệu để cập nhật'
      });
    }

    updateRequest.input('schedule_id', sql.Int, id);
    updateRequest.input('user_id', sql.Int, user_id);

    const updateQuery = `
      UPDATE schedules 
      SET ${updates.join(', ')} 
      OUTPUT INSERTED.*
      WHERE schedule_id = @schedule_id AND user_id = @user_id
    `;

    const result = await updateRequest.query(updateQuery);
    const updated = result.recordset[0];

    console.log('✅ Updated schedule:', updated);

    res.json({
      success: true,
      message: 'Cập nhật lịch thành công',
      data: updated
    });

  } catch (error) {
    console.error('❌ Update schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật lịch',
      error: error.message
    });
  }
});

// ========================================
// 4. TOGGLE COMPLETE
// ========================================
router.put('/:id/complete', async (req, res) => {
  try {
    const pool = await getConnection();
    const { id } = req.params;
    const { is_completed } = req.body;
    const user_id = req.user.user_id;

    console.log('✔️ TOGGLE Complete:', { id, is_completed });

    const request = pool.request();
    request.input('is_completed', sql.Bit, is_completed ? 1 : 0);
    request.input('schedule_id', sql.Int, id);
    request.input('user_id', sql.Int, user_id);

    const result = await request.query(
      'UPDATE schedules SET is_completed = @is_completed WHERE schedule_id = @schedule_id AND user_id = @user_id'
    );

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy lịch'
      });
    }

    console.log('✅ Toggle complete success');

    res.json({
      success: true,
      message: 'Đã cập nhật trạng thái'
    });

  } catch (error) {
    console.error('❌ Toggle complete error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật trạng thái'
    });
  }
});

// ========================================
// 5. DELETE SCHEDULE
// ========================================
router.delete('/:id', async (req, res) => {
  try {
    const pool = await getConnection();
    const { id } = req.params;
    const user_id = req.user.user_id;

    console.log('🗑️ DELETE Schedule:', { id, user_id });

    const request = pool.request();
    request.input('schedule_id', sql.Int, id);
    request.input('user_id', sql.Int, user_id);

    const result = await request.query(
      'DELETE FROM schedules WHERE schedule_id = @schedule_id AND user_id = @user_id'
    );

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy lịch hoặc bạn không có quyền xóa'
      });
    }

    console.log('✅ Delete success');

    res.json({
      success: true,
      message: 'Đã xóa lịch thành công'
    });

  } catch (error) {
    console.error('❌ Delete schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa lịch'
    });
  }
});

// ========================================
// 6. SEARCH SCHEDULES
// ========================================
router.get('/search', async (req, res) => {
  try {
    const pool = await getConnection();
    const user_id = req.user.user_id;
    const { keyword } = req.query;

    console.log('🔍 SEARCH Schedules:', { keyword });

    const request = pool.request();
    request.input('user_id', sql.Int, user_id);
    request.input('keyword', sql.NVarChar, `%${keyword}%`);

    const result = await request.query(`
      SELECT * FROM schedules 
      WHERE user_id = @user_id 
      AND (title LIKE @keyword OR description LIKE @keyword)
      ORDER BY start_time DESC
    `);

    res.json({
      success: true,
      schedules: result.recordset || []
    });

  } catch (error) {
    console.error('❌ Search error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tìm kiếm'
    });
  }
});

module.exports = router;