const AWS = require('aws-sdk');
const fs = require('fs');
const { config } = require('@config/index');

// DigitalOcean credentials & bucket config from your config file
const ID = config.do_spaces.key;
const SECRET = config.do_spaces.secret;
const BUCKET_NAME = config.do_spaces.bucket;
const FILE_PATH = config.do_spaces.filePath;

// DigitalOcean Spaces endpoint
const spacesEndpoint = new AWS.Endpoint('nyc3.digitaloceanspaces.com');

// S3 client configured for DigitalOcean
const s3 = new AWS.S3({
    endpoint: spacesEndpoint,
    accessKeyId: ID,
    secretAccessKey: SECRET,
    region: 'nyc3',
});

module.exports = {
    s3,

    fileUpload: (fileName) => {
        try {
            if (!fileName) return null;

            return new Promise((resolve, reject) => {
                const filePath = `${process.env.PWD}/resources/attachments/${fileName}`;
                const fileContent = fs.readFileSync(filePath);

                const params = {
                    Bucket: BUCKET_NAME,
                    Key: `${FILE_PATH}${fileName}`,
                    Body: fileContent,
                    ACL: 'public-read',
                    ContentType: 'application/octet-stream', // Optional: Detect MIME type dynamically if needed
                };

                s3.upload(params, (err, data) => {
                    if (err) return reject(err);

                    // Clean up local file
                    fs.unlink(filePath, (unlinkErr) => {
                        if (unlinkErr) return reject(unlinkErr);

                        // Return public URL explicitly
                        const publicUrl = `https://${BUCKET_NAME}.${spacesEndpoint.host}/${params.Key}`;
                        resolve({ location: publicUrl });
                    });
                });
            });
        } catch (error) {
            return Promise.reject(error);
        }
    }
    ,

    /* DOWNLOAD FILE FROM DIGITALOCEAN SPACES */
    fileDownloding: (fileKey) => {
        try {
            if (fileKey != null) {
                return new Promise((resolve, reject) => {
                    const options = {
                        Bucket: BUCKET_NAME,
                        Key: `${FILE_PATH}${fileKey}`,
                    };
                    s3.getObject(options, (err, data) => {
                        if (err) return reject(err);
                        const base64 = Buffer.from(data.Body).toString("base64");
                        resolve(base64);
                    });
                });
            }
        } catch (error) {
            return error;
        }
        return null;
    },

    // /* DELETE FILES FROM DIGITALOCEAN SPACES */
    deleteMultipleImages: (imagesKeys) => {
        try {
            return new Promise((resolve, reject) => {
                const paramsArray = imagesKeys.map(key => ({
                    Key: `${FILE_PATH}${key}`
                }));
                const params = {
                    Bucket: BUCKET_NAME,
                    Delete: {
                        Objects: paramsArray,
                        Quiet: false,
                    },
                };
                s3.deleteObjects(params, (err, data) => {
                    if (err) return reject(err);
                    resolve(data);
                });
            });
        } catch (error) {
            return error;
        }
    }
};
