const express = require('express');
const router = express.Router();
const productController = require('../../controllers/productController');
const { upload } = require('../../services/cloudinaryService');

router.get('/', productController.getAllProducts);
router.get('/basic', productController.getBasicProducts);
router.post('/', upload.single('image'), productController.createProduct);
router.put('/:id', upload.single('image'), productController.updateProduct);
router.delete('/:id', productController.deleteProduct);

module.exports = router;
