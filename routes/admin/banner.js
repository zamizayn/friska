const express = require('express');
const router = express.Router();
const bannerController = require('../../controllers/bannerController');
const { createUploader } = require('../../services/uploadService');
const bannerUpload = createUploader('banners');

router.get('/', bannerController.getBanners);
router.post('/', bannerController.createBanner);
router.put('/:id', bannerController.updateBanner);
router.delete('/:id', bannerController.deleteBanner);
router.post('/upload', bannerUpload.single('image'), bannerController.uploadImage);

module.exports = router;