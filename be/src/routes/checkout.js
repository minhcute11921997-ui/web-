const express = require('express');
const router = express.Router();
const checkoutController = require('../controllers/checkoutController');

router.post('/calculate', checkoutController.calculateCheckout);

module.exports = router;
