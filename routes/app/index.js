const express = require('express');
const router = express.Router();
const catalogRoutes = require('./catalog');

router.use('/catalog', catalogRoutes);

module.exports = router;
