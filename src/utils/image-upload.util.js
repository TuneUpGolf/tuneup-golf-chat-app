
require('dotenv').config();

const multer = require("multer");
const logger = require("@utils/logger.utils");

const fileFilter = (req, file, cb) => {
  cb(null, true);
};

const fileFilterProfile = (req, file, cb) => {
  if (
    file.mimetype === "image/png" ||
    file.mimetype === "image/jpg" ||
    file.mimetype === "image/jpeg"
  ) {
    cb(null, true);
  } else {
    cb(new Error("Please add only image"), false);
  }
};

const FILE_SIZE = parseInt(process.env.FILE_SIZE, 10);

const storage = () => multer.memoryStorage();

const upload = multer({
  limits: { fileSize: FILE_SIZE },
  storage: storage(),
  fileFilter,
}).array("image");

const uploadProfile = multer({
  limits: { fileSize: FILE_SIZE },
  storage: storage(),
  fileFilter: fileFilterProfile,
}).single("image");


module.exports = { upload, uploadProfile };
