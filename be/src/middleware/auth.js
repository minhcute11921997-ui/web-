const jwt = require('jsonwebtoken');

// Middleware kiểm tra access token
exports.verifyToken = (req, res, next) => {
    try {
        console.log('=== Verify Token ===');
        console.log('Authorization header:', req.headers.authorization);
        
        // Lấy token từ header Authorization
        const authHeader = req.headers.authorization;
        
        if (!authHeader) {
            console.log('No auth header');
            return res.status(401).json({ 
                success: false, 
                message: 'Vui lòng đăng nhập để tiếp tục' 
            });
        }

        
        const token = authHeader.split(' ')[1];
        console.log('Token:', token ? `${token.substring(0, 20)}...` : 'undefined');
        
        if (!token) {
            console.log('Token not found');
            return res.status(401).json({ 
                success: false, 
                message: 'Token không hợp lệ' 
            });
        }

        // Verify token
        console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'defined' : 'UNDEFINED!');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('Decoded token:', decoded); 
        
        req.user = decoded;
        
        // Cho phép request tiếp tục
        next();
        
    } catch (error) {
        console.error('=== Lỗi verify token ===');
        console.error('Error:', error.message);
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                success: false, 
                message: 'Token hết hạn, vui lòng refresh token' 
            });
        }
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ 
                success: false, 
                message: 'Token không hợp lệ' 
            });
        }
        
        return res.status(500).json({ 
            success: false, 
            message: 'Lỗi xác thực', 
            error: error.message 
        });
    }
};

// Middleware kiểm tra role admin
exports.verifyAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ 
            success: false, 
            message: 'Chỉ admin mới có quyền truy cập' 
        });
    }
    next();
};
