const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');

// Configure S3 client dynamically
const clientConfig = {
    region: process.env.AWS_REGION || 'us-east-1',
};

if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    clientConfig.credentials = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    };
}

const s3Client = new S3Client(clientConfig);

/**
 * Uploads a file to AWS S3.
 * Can handle a file buffer, local file path, or a multer file object.
 * 
 * @param {Object|Buffer|string} file - The file to upload. Can be:
 *   - A Buffer
 *   - A local file path (string)
 *   - A multer file object (with buffer or path)
 * @param {Object} options - Upload options
 * @param {string} [options.key] - The destination key (file path) in S3. If not provided, a unique key is generated.
 * @param {string} [options.contentType] - The MIME type of the file.
 * @param {string} [options.bucket] - S3 bucket override. Defaults to process.env.AWS_S3_BUCKET_NAME.
 * @returns {Promise<Object>} The S3 upload response, including Location (URL) and Key.
 */
const uploadToS3 = async (file, options = {}) => {
    let fileBuffer;
    let contentType = options.contentType;
    let filename = '';

    // 1. Determine file input format
    if (Buffer.isBuffer(file)) {
        fileBuffer = file;
    } else if (typeof file === 'string') {
        // Assume file path
        if (!fs.existsSync(file)) {
            throw new Error(`File path does not exist: ${file}`);
        }
        fileBuffer = fs.readFileSync(file);
        filename = path.basename(file);
    } else if (file && typeof file === 'object') {
        // Multer file object or custom object
        if (file.buffer) {
            fileBuffer = file.buffer;
        } else if (file.path) {
            if (!fs.existsSync(file.path)) {
                throw new Error(`File path from multer object does not exist: ${file.path}`);
            }
            fileBuffer = fs.readFileSync(file.path);
        }
        if (file.mimetype && !contentType) {
            contentType = file.mimetype;
        }
        if (file.originalname) {
            filename = file.originalname;
        }
    }

    if (!fileBuffer) {
        throw new Error('Invalid file input. Expected a buffer, file path, or multer file object.');
    }

    // 2. Determine Bucket name
    const bucketName = options.bucket || process.env.AWS_S3_BUCKET_NAME;
    if (!bucketName) {
        throw new Error('S3 bucket name is not specified (set AWS_S3_BUCKET_NAME in environment variables or pass in options).');
    }

    // 3. Determine S3 key (destination path)
    let s3Key = options.key;
    if (!s3Key) {
        const uniqueId = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = filename ? path.extname(filename) : '';
        s3Key = `uploads/${uniqueId}${ext}`;
    }

    // 4. Set S3 put options
    const uploadParams = {
        Bucket: bucketName,
        Key: s3Key,
        Body: fileBuffer,
    };

    if (contentType) {
        uploadParams.ContentType = contentType;
    }

    // 5. Upload to S3
    const command = new PutObjectCommand(uploadParams);
    await s3Client.send(command);

    // 6. Return response
    // S3 URL structure: https://<bucket>.s3.<region>.amazonaws.com/<key>
    const region = clientConfig.region;
    const s3Url = `https://${bucketName}.s3.${region}.amazonaws.com/${s3Key}`;

    return {
        Location: s3Url,
        Key: s3Key,
        Bucket: bucketName
    };
};

module.exports = {
    uploadToS3,
    s3Client
};
