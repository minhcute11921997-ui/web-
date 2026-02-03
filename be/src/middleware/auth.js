const jwt = require('jsonwebtoken');

// Middleware kiểm tra access token
exports.verifyToken = (req, res, next) => {
    try {
        // Lấy token từ header Authorization
        const authHeader = req.headers.authorization;
        
        if (!authHeader) {
            return res.status(401).json({ 
                success: false, 
                message: 'Vui lòng đăng nhập để tiếp tục' 
            });
        }

        // Format: "Bearer <token>"
        const token = authHeader.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ 
                success: false, 
                message: 'Token không hợp lệ' 
            });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('Decoded token:', decoded); 
        // Lưu thông tin user vào req để dùng trong controller
        req.user = decoded;
        
        // Cho phép request tiếp tục
        next();
        
    } catch (error) {
        console.error('Lỗi verify token:', error);
        
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
