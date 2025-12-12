
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { sql, getConnection } = require('../config/database');
const auth = require('../middleware/auth.middleware');

// ⭐ MULTER CONFIG - Upload Avatar
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '..', 'uploads', 'avatars');
    
    // Tạo thư mục nếu chưa có
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
      console.log('✅ Created uploads/avatars directory');
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = 'avatar-' + req.user.user_id + '-' + uniqueSuffix + path.extname(file.originalname);
    console.log('📸 Saving file as:', filename);
    cb(null, filename);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận file ảnh (jpeg, jpg, png, gif)'));
    }
  }
});

// Tất cả routes cần auth
router.use(auth);

// ========================================
// 1. GET PROFILE
// ========================================
router.get('/profile', async (req, res) => {
  try {
    const pool = await getConnection();
    const user_id = req.user.user_id;

    console.log('👤 GET Profile for user:', user_id);

    const request = pool.request();
    request.input('user_id', sql.Int, user_id);

    const result = await request.query(`
      SELECT 
        user_id,
        taikhoan,
        hoten,
        email,
        phone,
        avatar,
        bio,
        created_at
      FROM users
      WHERE user_id = @user_id
    `);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    const user = result.recordset[0];

    res.json({
      success: true,
      data: user
    });

  } catch (error) {
    console.error('❌ Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thông tin người dùng'
    });
  }
});

// ========================================
// 2. UPDATE PROFILE
// ========================================
router.put('/profile', async (req, res) => {
  try {
    const pool = await getConnection();
    const user_id = req.user.user_id;
    const { hoten, email, phone, bio } = req.body;

    console.log('✏️ UPDATE Profile:', { user_id, hoten, email });

    // Check email uniqueness (nếu thay đổi)
    if (email) {
      const checkRequest = pool.request();
      checkRequest.input('email', sql.NVarChar, email);
      checkRequest.input('user_id', sql.Int, user_id);

      const existing = await checkRequest.query(`
        SELECT user_id FROM users 
        WHERE email = @email AND user_id != @user_id
      `);

      if (existing.recordset.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Email đã được sử dụng bởi người dùng khác'
        });
      }
    }

    // Update user
    const updateRequest = pool.request();
    updateRequest.input('user_id', sql.Int, user_id);
    updateRequest.input('hoten', sql.NVarChar, hoten);
    updateRequest.input('email', sql.NVarChar, email);
    updateRequest.input('phone', sql.NVarChar, phone || null);
    updateRequest.input('bio', sql.NVarChar, bio || null);

    await updateRequest.query(`
      UPDATE users 
      SET 
        hoten = @hoten,
        email = @email,
        phone = @phone,
        bio = @bio
      WHERE user_id = @user_id
    `);

    // Get updated user
    const getRequest = pool.request();
    getRequest.input('user_id', sql.Int, user_id);

    const result = await getRequest.query(`
      SELECT 
        user_id, taikhoan, hoten, email, phone, avatar, bio, created_at
      FROM users
      WHERE user_id = @user_id
    `);

    console.log('✅ Profile updated successfully');

    res.json({
      success: true,
      message: 'Cập nhật thông tin thành công',
      data: result.recordset[0]
    });

  } catch (error) {
    console.error('❌ Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật thông tin'
    });
  }
});

// ========================================
// 3. UPLOAD AVATAR
// ========================================
router.post('/avatar', upload.single('avatar'), async (req, res) => {
  try {
    console.log('📸 Upload request received');
    console.log('User:', req.user);
    console.log('File:', req.file);
    
    if (!req.file) {
      console.log('❌ No file uploaded');
      return res.status(400).json({
        success: false,
        message: 'Vui lòng chọn file ảnh'
      });
    }

    const pool = await getConnection();
    const user_id = req.user.user_id;
    const avatarPath = `/uploads/avatars/${req.file.filename}`;

    console.log('📸 Upload Avatar:', { user_id, file: req.file.filename });

    // Get old avatar to delete
    const getRequest = pool.request();
    getRequest.input('user_id', sql.Int, user_id);

    const oldUser = await getRequest.query(`
      SELECT avatar FROM users WHERE user_id = @user_id
    `);
    

    // Update avatar
    const updateRequest = pool.request();
    updateRequest.input('user_id', sql.Int, user_id);
    updateRequest.input('avatar', sql.NVarChar, avatarPath);

    await updateRequest.query(`
      UPDATE users 
      SET avatar = @avatar 
      WHERE user_id = @user_id
    `);

    // Delete old avatar file
    if (oldUser.recordset[0]?.avatar) {
      const oldPath = path.join(__dirname, '..', oldUser.recordset[0].avatar);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    console.log('✅ Avatar uploaded successfully');

    res.json({
      success: true,
      message: 'Tải ảnh đại diện thành công',
      data: {
        avatar: avatarPath
      }
    });

  } catch (error) {
    console.error('❌ Upload avatar error:', error);
    
    // Delete uploaded file if error
    if (req.file) {
      const filePath = path.join(__dirname, '..', 'uploads', 'avatars', req.file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    res.status(500).json({
      success: false,
      message: 'Lỗi khi tải ảnh đại diện'
    });
  }
});

// ========================================
// 4. CHANGE PASSWORD
// ========================================
router.put('/change-password', async (req, res) => {
  try {
    const pool = await getConnection();
    const user_id = req.user.user_id;
    const { currentPassword, newPassword } = req.body;

    console.log('🔐 Change Password for user:', user_id);

    // Validation
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập đầy đủ thông tin'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu mới phải có ít nhất 6 ký tự'
      });
    }

    // Get current user
    const getRequest = pool.request();
    getRequest.input('user_id', sql.Int, user_id);

    const result = await getRequest.query(`
      SELECT matkhau FROM users WHERE user_id = @user_id
    `);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    // Verify current password
    const user = result.recordset[0];
    const validPassword = await bcrypt.compare(currentPassword, user.matkhau);

    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: 'Mật khẩu hiện tại không đúng'
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    const updateRequest = pool.request();
    updateRequest.input('user_id', sql.Int, user_id);
    updateRequest.input('matkhau', sql.NVarChar, hashedPassword);

    await updateRequest.query(`
      UPDATE users 
      SET matkhau = @matkhau 
      WHERE user_id = @user_id
    `);

    console.log('✅ Password changed successfully');

    res.json({
      success: true,
      message: 'Đổi mật khẩu thành công'
    });

  } catch (error) {
    console.error('❌ Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi đổi mật khẩu'
    });
  }
});

// ========================================
// 5. DELETE AVATAR
// ========================================
router.delete('/avatar', async (req, res) => {
  try {
    const pool = await getConnection();
    const user_id = req.user.user_id;

    console.log('🗑️ Delete Avatar for user:', user_id);

    // Get current avatar
    const getRequest = pool.request();
    getRequest.input('user_id', sql.Int, user_id);

    const result = await getRequest.query(`
      SELECT avatar FROM users WHERE user_id = @user_id
    `);

    const oldAvatar = result.recordset[0]?.avatar;

    // Update to null
    const updateRequest = pool.request();
    updateRequest.input('user_id', sql.Int, user_id);

    await updateRequest.query(`
      UPDATE users 
      SET avatar = NULL 
      WHERE user_id = @user_id
    `);

    // Delete file
    if (oldAvatar) {
      const filePath = path.join(__dirname, '..', oldAvatar);
      if (fs.existsSync(filePath)) {                        
        fs.unlinkSync(filePath);
      }
    }

    res.json({
      success: true,
      message: 'Đã xóa ảnh đại diện'
    });

  } catch (error) {
    console.error('❌ Delete avatar error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa ảnh đại diện'
    });
  }
});

module.exports = router;