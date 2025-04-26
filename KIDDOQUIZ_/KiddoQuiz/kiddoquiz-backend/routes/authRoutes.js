const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { body, validationResult } = require('express-validator');

// Input validation middleware
const validateInputs = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 })
];

// Register new user
router.post('/register', validateInputs, async (req, res) => {
  try {
    // Validate inputs
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    const { email, password } = req.body;
    
    // Check if user exists
    const [users] = await pool.query(
      'SELECT id FROM users WHERE email = ?', 
      [email]
    );
    
    if (users.length > 0) {
      return res.status(409).json({ 
        success: false,
        message: 'Email already registered' 
      });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create user
    const [result] = await pool.query(
      'INSERT INTO users (email, password) VALUES (?, ?)',
      [email, hashedPassword]
    );
    
    // Generate JWT token
    const token = jwt.sign(
      { id: result.insertId }, 
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
      
    // Return success response (excluding password hash)
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: { id: result.insertId, email }
    });
    
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error',
      error: err.message 
    });
  }
});

// Login user
router.post('/login', validateInputs, async (req, res) => {
  try {
    // Validate inputs
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        message: 'Validation failed',
        errors: errors.array() 
      });
    }

    const { email, password } = req.body;
    
    // Find user
    const [users] = await pool.query(
      'SELECT * FROM users WHERE email = ?', 
      [email]
    );
    
    if (users.length === 0) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }
    
    // Verify password
    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }
    
     // Generate JWT token with consistent payload
     const tokenPayload = {
          id: user.id,
          email: user.email,
          iat: Math.floor(Date.now() / 1000)
        };

        const token = jwt.sign(
          tokenPayload,
          process.env.JWT_SECRET,
          { expiresIn: '1h' }
        );
        
        // Return consistent response format
        res.json({
          success: true,
          message: 'Login successful',
          token: token,
          user: {
            id: user.id,
            email: user.email
          }
        });
    // Return user data (excluding password)
    const { password: _, ...userData } = user;
    
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error',
      error: err.message 
    });
  }
});

module.exports = router;
