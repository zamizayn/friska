const express = require('express');
const router = express.Router();
const tenantController = require('../../controllers/tenantController');

// Basic listing and detail
router.get('/', tenantController.getAllTenants);
router.get('/me', tenantController.getMyTenant);

// CRUD
router.post('/', tenantController.createTenant); // Note: Used in onboarding without token
router.put('/:id', tenantController.updateTenant);
router.delete('/:id', tenantController.deleteTenant);

// Operations
router.get('/me/settings', tenantController.getSettings);
router.put('/me/settings', tenantController.updateSettings);
router.post('/:id/enable-webhooks', tenantController.enableWebhooks);

module.exports = router;
