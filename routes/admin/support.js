const express = require('express');
const router = express.Router();
const supportController = require('../../controllers/supportController');

router.get('/', supportController.getSupportRequests);
router.post('/:id/reply', supportController.replyToSupportRequest);
router.get('/media/:mediaId', supportController.getMediaProxy);

module.exports = router;
