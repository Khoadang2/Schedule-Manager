const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { getConnection, sql } = require('../config/database');

// Validation middleware
const validateRegister = [
  body('taikhoan').trim().isLength({ min: 3 }).withMessage('Tài khoản phải có ít nhất 3 ký tự'),
  body('matkhau').isLength({ min: 6 }).withMessage('Mật khẩu phải có ít nhất 6 ký tự'),
  body('hoten').trim().notEmpty().withMessage('Họ tên không được để trống'),
  body('email').isEmail().withMessage('Email không hợp lệ')
];

const validateLogin = [
  body('taikhoan').trim().notEmpty().withMessage('Tài khoản không được để trống'),
  body('matkhau').notEmpty().withMessage('Mật khẩu không được để trống')
];

// Đăng ký tài khoản mới
router.post('/register', validateRegister, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Dữ liệu không hợp lệ',
        errors: errors.array() 
      });
    }

    const { taikhoan, matkhau, hoten, email, sodienthoai } = req.body;
    const pool = await getConnection();

    // Kiểm tra tài khoản đã tồn tại
    const checkUser = await pool.request()
      .input('taikhoan', sql.NVarChar, taikhoan)
      .input('email', sql.NVarChar, email)
      .query('SELECT * FROM Users WHERE taikhoan = @taikhoan OR email = @email');

    if (checkUser.recordset.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Tài khoản hoặc email đã tồn tại' 
      });
    }

    // Mã hóa mật khẩu
    const hashedPassword = await bcrypt.hash(matkhau, parseInt(process.env.BCRYPT_ROUNDS) || 10);

    // Thêm user mới
    const result = await pool.request()
      .input('taikhoan', sql.NVarChar, taikhoan)
      .input('matkhau', sql.NVarChar, hashedPassword)
      .input('hoten', sql.NVarChar, hoten)
      .input('email', sql.NVarChar, email)
      .input('sodienthoai', sql.NVarChar, sodienthoai || null)
      .query(`
        INSERT INTO Users (taikhoan, matkhau, hoten, email, sodienthoai)
        OUTPUT INSERTED.*
        VALUES (@taikhoan, @matkhau, @hoten, @email, @sodienthoai)
      `);

    const newUser = result.recordset[0];
    delete newUser.matkhau;

    res.status(201).json({
      success: true,
      message: 'Đăng ký thành công',
      data: newUser
    });

  } catch (error) {
    console.error('❌ Lỗi đăng ký:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi server khi đăng ký' 
    });
  }
});

// Đăng nhập
router.post('/login', validateLogin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Dữ liệu không hợp lệ',
        errors: errors.array() 
      });
    }

    const { taikhoan, matkhau, remember } = req.body;
    const pool = await getConnection();

    // Tìm user
    const result = await pool.request()
      .input('taikhoan', sql.NVarChar, taikhoan)
      .query('SELECT * FROM Users WHERE taikhoan = @taikhoan AND is_active = 1');

    if (result.recordset.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: 'Tài khoản hoặc mật khẩu không đúng' 
      });
    }

    const user = result.recordset[0];

    // Kiểm tra mật khẩu
    const isPasswordValid = await bcrypt.compare(matkhau, user.matkhau);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false, 
        message: 'Tài khoản hoặc mật khẩu không đúng' 
      });
    }

    // Tạo JWT token
    const expiresIn = remember ? '30d' : process.env.JWT_EXPIRES_IN || '7d';
    const token = jwt.sign(
      { user_id: user.user_id, taikhoan: user.taikhoan },
      process.env.JWT_SECRET,
      { expiresIn }
    );

    // Cập nhật last_login và remember_token
    await pool.request()
      .input('user_id', sql.Int, user.user_id)
      .input('remember_token', sql.NVarChar, remember ? token : null)
      .query(`
        UPDATE Users 
        SET last_login = GETDATE(), remember_token = @remember_token
        WHERE user_id = @user_id
      `);

    delete user.matkhau;
    delete user.remember_token;

    res.json({
      success: true,
      message: 'Đăng nhập thành công',
      data: {
        user,
        token,
        expiresIn
      }
    });

  } catch (error) {
    console.error('❌ Lỗi đăng nhập:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi server khi đăng nhập' 
    });
  }
});

// Quên mật khẩu (đơn giản - reset về mật khẩu mặc định)
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const pool = await getConnection();

    const result = await pool.request()
      .input('email', sql.NVarChar, email)
      .query('SELECT * FROM Users WHERE email = @email');

    if (result.recordset.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Email không tồn tại trong hệ thống' 
      });
    }

    // Reset mật khẩu về "123456"
    const newPassword = '123456';
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await pool.request()
      .input('email', sql.NVarChar, email)
      .input('matkhau', sql.NVarChar, hashedPassword)
      .query('UPDATE Users SET matkhau = @matkhau WHERE email = @email');

    res.json({
      success: true,
      message: 'Mật khẩu đã được reset thành công. Mật khẩu mới: 123456'
    });

  } catch (error) {
    console.error('❌ Lỗi quên mật khẩu:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi server' 
    });
  }
});

// Đăng xuất
router.post('/logout', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const pool = await getConnection();
      
      // Xóa remember_token
      await pool.request()
        .input('user_id', sql.Int, decoded.user_id)
        .query('UPDATE Users SET remember_token = NULL WHERE user_id = @user_id');
    }

    res.json({
      success: true,
      message: 'Đăng xuất thành công'
    });

  } catch (error) {
    console.error('❌ Lỗi đăng xuất:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi server' 
    });
  }
});

// Lấy thông tin user hiện tại
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token không hợp lệ' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const pool = await getConnection();

    const result = await pool.request()
      .input('user_id', sql.Int, decoded.user_id)
      .query('SELECT user_id, taikhoan, hoten, email, sodienthoai, avatar, created_at FROM Users WHERE user_id = @user_id');

    if (result.recordset.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'User không tồn tại' 
      });
    }

    res.json({
      success: true,
      data: result.recordset[0]
    });

  } catch (error) {
    console.error('❌ Lỗi lấy thông tin user:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi server' 
    });
  }
});

// Đổi mật khẩu
router.post('/change-password', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token không hợp lệ' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Vui lòng nhập đầy đủ mật khẩu cũ và mật khẩu mới' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'Mật khẩu mới phải có ít nhất 6 ký tự' 
      });
    }

    const pool = await getConnection();

    // Lấy thông tin user
    const userResult = await pool.request()
      .input('user_id', sql.Int, decoded.user_id)
      .query('SELECT * FROM Users WHERE user_id = @user_id');

    if (userResult.recordset.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'User không tồn tại' 
      });
    }

    const user = userResult.recordset[0];

    // Kiểm tra mật khẩu cũ
    const isPasswordValid = await bcrypt.compare(oldPassword, user.matkhau);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false, 
        message: 'Mật khẩu cũ không đúng' 
      });
    }

    // Mã hóa mật khẩu mới
    const hashedPassword = await bcrypt.hash(newPassword, parseInt(process.env.BCRYPT_ROUNDS) || 10);

    // Cập nhật mật khẩu
    await pool.request()
      .input('user_id', sql.Int, decoded.user_id)
      .input('matkhau', sql.NVarChar, hashedPassword)
      .query('UPDATE Users SET matkhau = @matkhau, updated_at = GETDATE() WHERE user_id = @user_id');

    res.json({
      success: true,
      message: 'Đổi mật khẩu thành công'
    });

  } catch (error) {
    console.error('❌ Lỗi đổi mật khẩu:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi server' 
    });
  }
});

// Cập nhật thông tin cá nhân
router.put('/profile', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token không hợp lệ' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { hoten, email, sodienthoai, avatar } = req.body;

    const pool = await getConnection();

    const result = await pool.request()
      .input('user_id', sql.Int, decoded.user_id)
      .input('hoten', sql.NVarChar, hoten)
      .input('email', sql.NVarChar, email)
      .input('sodienthoai', sql.NVarChar, sodienthoai || null)
      .input('avatar', sql.NVarChar, avatar || null)
      .query(`
        UPDATE Users 
        SET hoten = @hoten, 
            email = @email, 
            sodienthoai = @sodienthoai,
            avatar = @avatar,
            updated_at = GETDATE()
        OUTPUT INSERTED.user_id, INSERTED.taikhoan, INSERTED.hoten, 
               INSERTED.email, INSERTED.sodienthoai, INSERTED.avatar, INSERTED.created_at
        WHERE user_id = @user_id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'User không tồn tại' 
      });
    }

    res.json({
      success: true,
      message: 'Cập nhật thông tin thành công',
      data: result.recordset[0]
    });

  } catch (error) {
    console.error('❌ Lỗi cập nhật thông tin:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi server' 
    });
  }
});

module.exports = router;