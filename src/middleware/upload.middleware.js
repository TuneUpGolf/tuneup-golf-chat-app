const {  failure } = require("@utils/response");

exports.handleFileUpload = (uploadImage) => (req, res, next) => {
    uploadImage(req, res, (err) => {
      if (err) {
        return failure(
            res,
            422,
            err.message || "Multer Error"
          );
          
      }
      return next();
    });
  };