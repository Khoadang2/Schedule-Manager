const express = require('express');
const router = express.Router();
const { getConnection, sql } = require('../config/database');
const authMiddleware = require('../middleware/auth.middleware');

router.use(authMiddleware);

// Lấy danh sách thông báo
router.get('/', async (req, res) => {
  try {
    const { is_read, limit = 50 } = req.query;
    const pool = await getConnection();

    let query = `
      SELECT 
        n.*,
        s.title as schedule_title,
        s.start_time as schedule_start_time
      FROM Notifications n
      LEFT JOIN Schedules s ON n.schedule_id = s.schedule_id
      WHERE n.user_id = @user_id
    `;

    const request = pool.request().input('user_id', sql.Int, req.user.user_id);

    if (is_read !== undefined) {
      query += ' AND n.is_read = @is_read';
      request.input('is_read', sql.Bit, is_read === 'true' ? 1 : 0);
    }

    query += ' ORDER BY n.created_at DESC';
    query += ' OFFSET 0 ROWS FETCH NEXT @limit ROWS ONLY';
    request.input('limit', sql.Int, parseInt(limit));

    const result = await request.query(query);

    // Đếm số thông báo chưa đọc
    const unreadResult = await pool.request()
      .input('user_id', sql.Int, req.user.user_id)
      .query('SELECT COUNT(*) as unread_count FROM Notifications WHERE user_id = @user_id AND is_read = 0');

    res.json({
      success: true,
      data: result.recordset,
      unread_count: unreadResult.recordset[0].unread_count
    });

  } catch (error) {
    console.error('❌ Lỗi lấy thông báo:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi server' 
    });
  }
});

// Đánh dấu đã đọc
router.patch('/:id/read', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('notification_id', sql.Int, req.params.id)
      .input('user_id', sql.Int, req.user.user_id)
      .query(`
        UPDATE Notifications 
        SET is_read = 1
        WHERE notification_id = @notification_id AND user_id = @user_id
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Thông báo không tồn tại' 
      });
    }

    res.json({
      success: true,
      message: 'Đã đánh dấu đã đọc'
    });

  } catch (error) {
    console.error('❌ Lỗi đánh dấu đã đọc:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi server' 
    });
  }
});

// Đánh dấu tất cả đã đọc
router.patch('/read-all', async (req, res) => {
  try {
    const pool = await getConnection();
    await pool.request()
      .input('user_id', sql.Int, req.user.user_id)
      .query('UPDATE Notifications SET is_read = 1 WHERE user_id = @user_id AND is_read = 0');

    res.json({
      success: true,
      message: 'Đã đánh dấu tất cả đã đọc'
    });

  } catch (error) {
    console.error('❌ Lỗi đánh dấu tất cả:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi server' 
    });
  }
});

// Xóa thông báo
router.delete('/:id', async (req, res) => {
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input('notification_id', sql.Int, req.params.id)
      .input('user_id', sql.Int, req.user.user_id)
      .query('DELETE FROM Notifications WHERE notification_id = @notification_id AND user_id = @user_id');

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Thông báo không tồn tại' 
      });
    }

    res.json({
      success: true,
      message: 'Xóa thông báo thành công'
    });

  } catch (error) {
    console.error('❌ Lỗi xóa thông báo:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi server' 
    });
  }
});

// Tạo thông báo nhắc nhở cho lịch sắp tới
router.post('/create-reminders', async (req, res) => {
  try {
    const pool = await getConnection();
    
    // Lấy các lịch sắp tới trong 24h và chưa có thông báo
    const schedules = await pool.request()
      .input('user_id', sql.Int, req.user.user_id)
      .query(`
        SELECT s.* 
        FROM Schedules s
        WHERE s.user_id = @user_id 
        AND s.start_time BETWEEN GETDATE() AND DATEADD(hour, 24, GETDATE())
        AND s.is_completed = 0
        AND NOT EXISTS (
          SELECT 1 FROM Notifications n 
          WHERE n.schedule_id = s.schedule_id 
          AND n.notification_type = 'reminder'
          AND n.created_at > DATEADD(hour, -24, GETDATE())
        )
      `);

    // Tạo thông báo cho mỗi lịch
    for (const schedule of schedules.recordset) {
      const startTime = new Date(schedule.start_time);
      const timeStr = startTime.toLocaleString('vi-VN');
      
      await pool.request()
        .input('user_id', sql.Int, req.user.user_id)
        .input('schedule_id', sql.Int, schedule.schedule_id)
        .input('title', sql.NVarChar, `Nhắc nhở: ${schedule.title}`)
        .input('message', sql.NVarChar, `Bạn có lịch "${schedule.title}" vào lúc ${timeStr}`)
        .input('notification_type', sql.NVarChar, 'reminder')
        .query(`
          INSERT INTO Notifications (user_id, schedule_id, title, message, notification_type)
          VALUES (@user_id, @schedule_id, @title, @message, @notification_type)
        `);
    }

    res.json({
      success: true,
      message: `Đã tạo ${schedules.recordset.length} thông báo nhắc nhở`
    });

  } catch (error) {
    console.error('❌ Lỗi tạo thông báo:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi server' 
    });
  }
});

module.exports = router;