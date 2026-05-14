const express = require('express');
const router = express.Router();
const productController = require('../../controllers/productController');
const { upload } = require('../../services/cloudinaryService');
const multer = require('multer');
const path = require('path');

const csvUpload = multer({ dest: 'uploads/' });

router.get('/', productController.getAllProducts);
router.get('/basic', productController.getBasicProducts);
router.post('/', upload.single('image'), productController.createProduct);
router.post('/bulk', csvUpload.fields([{ name: 'file', maxCount: 1 }, { name: 'images', maxCount: 100 }]), productController.bulkUploadProducts);
router.put('/:id', upload.single('image'), productController.updateProduct);
router.delete('/:id', productController.deleteProduct);
router.get('/:id/meta-status', productController.getProductMetaStatusController);

module.exports = router;
