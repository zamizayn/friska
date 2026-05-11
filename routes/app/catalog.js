const express = require('express');
const router = express.Router();
const catalogController = require('../../controllers/app/catalogController');

router.get('/:username', catalogController.getPublicCatalog);

module.exports = router;
