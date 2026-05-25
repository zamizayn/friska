const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/auth');

// 1. Unprotected Routes (Auth, Onboarding)
const authRoutes = require('./auth');
const tenantRoutes = require('./tenant');
const branchRoutes = require('./branch');

router.use('/', authRoutes);

// Special case: Tenant and Branch creation are allowed without tokens for onboarding
// We handle this by mounting specific paths before the general authenticateToken middleware
router.post('/tenants', require('../../controllers/tenantController').createTenant);
router.get('/tenants/:id/registration-status', require('../../controllers/tenantController').getRegistrationStatus);
router.post('/branches', require('../../controllers/branchController').createBranch);
router.get('/global-configs', require('../../controllers/globalConfigController').getConfigs);

// 2. Protected Routes (Apply Auth Middleware)
router.use(authenticateToken);

// Mount resource routes
router.use('/products', require('./product'));
router.use('/categories', require('./category'));
router.use('/orders', require('./order'));
router.use('/customers', require('./customer'));
router.use('/tenants', tenantRoutes); // The rest of tenant routes are protected
router.use('/branches', branchRoutes); // The rest of branch routes are protected
router.use('/support-requests', require('./support'));
router.use('/analytics', require('./analytics'));
router.get('/product-sales', require('../../controllers/analyticsController').getProductSales);
router.use('/notifications', require('./notification'));
router.use('/fcm', require('./fcm'));
router.use('/offers', require('./offer'));
router.put('/global-configs', require('../../controllers/globalConfigController').updateConfigs);

// Delivery boy management
router.use('/', require('./delivery'));

module.exports = router;
