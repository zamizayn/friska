const express = require('express');
const router = express.Router();
const offerController = require('../../controllers/offerController');

router.get('/', offerController.getOffers);
router.post('/', offerController.createOffer);
router.put('/:id', offerController.updateOffer);
router.delete('/:id', offerController.deleteOffer);

module.exports = router;
