// Lấy tất cả sản phẩm (có phân trang + tìm kiếm nâng cao)
exports.getAllProducts = async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 10, 
            search = '', 
            category_id = '',
            min_price = '',
            max_price = '',
            brand = '',
            sort_by = 'created_at',  // created_at, price, name
            order = 'DESC'            // ASC hoặc DESC
        } = req.query;
        
        const offset = (page - 1) * limit;
        
        let query = 'SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE 1=1';
        let params = [];
        
        // Tìm kiếm theo tên hoặc brand
        if (search) {
            query += ' AND (p.name LIKE ? OR p.brand LIKE ? OR p.description LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        
        // Lọc theo category (hỗ trợ nhiều category: category_id=1,2,3)
        if (category_id) {
            const categoryIds = category_id.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
            if (categoryIds.length > 0) {
                query += ` AND p.category_id IN (${categoryIds.map(() => '?').join(',')})`;
                params.push(...categoryIds);
            }
        }
        
        // Lọc theo khoảng giá
        if (min_price) {
            query += ' AND p.price >= ?';
            params.push(parseFloat(min_price));
        }
        if (max_price) {
            query += ' AND p.price <= ?';
            params.push(parseFloat(max_price));
        }
        
        // Lọc theo brand (hỗ trợ nhiều brand: brand=Intel,AMD)
        if (brand) {
            const brands = brand.split(',').map(b => b.trim());
            if (brands.length > 0) {
                query += ` AND p.brand IN (${brands.map(() => '?').join(',')})`;
                params.push(...brands);
            }
        }
        
        // Sắp xếp
        const validSortBy = ['created_at', 'price', 'name', 'stock'];
        const validOrder = ['ASC', 'DESC'];
        
        const sortColumn = validSortBy.includes(sort_by) ? sort_by : 'created_at';
        const sortOrder = validOrder.includes(order.toUpperCase()) ? order.toUpperCase() : 'DESC';
        
        query += ` ORDER BY p.${sortColumn} ${sortOrder}`;
        
        // Phân trang
        query += ' LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));
        
        const [products] = await db.query(query, params);
        
        // Đếm tổng số sản phẩm (với điều kiện lọc)
        let countQuery = 'SELECT COUNT(*) as count FROM products p WHERE 1=1';
        let countParams = [];
        
        if (search) {
            countQuery += ' AND (p.name LIKE ? OR p.brand LIKE ? OR p.description LIKE ?)';
            countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        
        if (category_id) {
            const categoryIds = category_id.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
            if (categoryIds.length > 0) {
                countQuery += ` AND p.category_id IN (${categoryIds.map(() => '?').join(',')})`;
                countParams.push(...categoryIds);
            }
        }
        
        if (min_price) {
            countQuery += ' AND p.price >= ?';
            countParams.push(parseFloat(min_price));
        }
        if (max_price) {
            countQuery += ' AND p.price <= ?';
            countParams.push(parseFloat(max_price));
        }
        
        if (brand) {
            const brands = brand.split(',').map(b => b.trim());
            if (brands.length > 0) {
                countQuery += ` AND p.brand IN (${brands.map(() => '?').join(',')})`;
                countParams.push(...brands);
            }
        }
        
        const [total] = await db.query(countQuery, countParams);
        
        res.json({
            success: true,
            data: products,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: total[0].count,
                totalPages: Math.ceil(total[0].count / limit)
            },
            filters: {
                search,
                category_id,
                min_price,
                max_price,
                brand,
                sort_by: sortColumn,
                order: sortOrder
            }
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi server', 
            error: error.message 
        });
    }
};
