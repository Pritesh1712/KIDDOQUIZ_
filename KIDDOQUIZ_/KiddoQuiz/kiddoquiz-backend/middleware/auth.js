
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const crypto = require('crypto');

module.exports = async (req, res, next) => {
  try {
    console.log("🔍 Checking authentication...");

    // 1. Extract token from multiple sources
    const token = req.header('Authorization')?.replace('Bearer ', '') || 
                 req.cookies?.token || 
                 req.body?.token;
    
    console.log("🔍 Extracted Token:", token ? `${token.substring(0, 10)}...` : 'None');

    if (!token) {
      console.warn("⚠️ No token provided!");
      return res.status(401).json({ 
        success: false,
        message: 'Authentication required' 
      });
    }

    // 2. Verify token with additional checks
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("✅ Token Verified:", { 
      id: decoded.id, 
      fingerprint: decoded.fp ? `${decoded.fp.substring(0, 5)}...` : 'None' 
    });

    // 3. Session consistency check
    const clientFingerprint = req.headers['x-client-fingerprint'] || 
                            crypto.createHash('sha256')
                                  .update(req.ip + req.headers['user-agent'])
                                  .digest('hex');

    if (decoded.fp && decoded.fp !== clientFingerprint) {
      console.warn(`⚠️ Session conflict! Token FP: ${decoded.fp.substring(0, 5)}..., Current FP: ${clientFingerprint.substring(0, 5)}...`);
      return res.status(401).json({
        success: false,
        message: 'Session conflict detected. Please log in again from this tab.'
      });
    }

    // 4. Fetch user with additional session validation
    const [users] = await pool.query(
      `SELECT id, email FROM users WHERE id = ?`,
      [decoded.id]
    );

    if (users.length === 0) {
      console.warn("⚠️ User not found or token expired in DB");
      return res.status(401).json({ 
        success: false,
        message: 'Session expired. Please log in again.' 
      });
    }

    // 5. Attach enhanced user context
    req.user = {
      ...users[0],
      sessionFingerprint: clientFingerprint
    };
    
    console.log("✅ User Authenticated:", { 
      id: req.user.id, 
      email: req.user.email 
    });
    
    next();
  } catch (err) {
    console.error('❌ Authentication error:', err.name, err.message);
    
    const message = err.name === 'TokenExpiredError' 
      ? 'Session expired. Please log in again.'
      : 'Invalid token. Please authenticate again.';
    
    res.status(401).json({ 
      success: false,
      message 
    });
  }
};
