const express = require('express');
const router = express.Router();
const offerController = require('../../controllers/offerController');
const { createUploader } = require('../../services/uploadService');
const offerUpload = createUploader('offers');

router.get('/', offerController.getOffers);
router.post('/', offerController.createOffer);
router.put('/:id', offerController.updateOffer);
router.delete('/:id', offerController.deleteOffer);
router.post('/broadcast', offerController.broadcastOffer);
router.post('/upload', offerUpload.single('image'), offerController.uploadImage);

module.exports = router;
