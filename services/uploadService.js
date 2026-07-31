const multer = require('multer');
const path = require('path');
const fs = require('fs');

const createUploader = (subDir = 'products') => {
    const storage = multer.diskStorage({
        destination: function (req, file, cb) {
            const dir = `uploads/${subDir}`;
            if (!fs.existsSync(dir)){
                fs.mkdirSync(dir, { recursive: true });
            }
            cb(null, dir);
        },
        filename: function (req, file, cb) {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, uniqueSuffix + '-' + file.originalname.replace(/\s+/g, '-'));
        }
    });
    return multer({ storage });
};

const upload = createUploader('products');

module.exports = {
    upload,
    createUploader
};
