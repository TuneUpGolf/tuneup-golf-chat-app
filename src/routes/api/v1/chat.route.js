const express = require("express");
const router = express.Router();
const middleware = require('@middleware/validation');
const auth = require('@middleware/auth');
const { chatValidator } = require('@validations/index');
const {
  chatListController,
  clearChatController,
  allImageController,
  newChatGroupListController,
  removeMessage,
  uploadImageController
} = require('@controller/chat.controller');
const { upload } = require('@utils/image-upload.util');
const { handleFileUpload } = require('@middleware/upload.middleware');

module.exports = () => {

  router.post('/list', auth(), middleware(chatValidator.chatList), chatListController);
  router.post('/all-group-list', auth(), middleware(chatValidator.userList), newChatGroupListController);
  router.delete("/delete-message", auth(), middleware(chatValidator.removeMessage), removeMessage)
  router.post('/erase', auth(), middleware(chatValidator.clearChat), clearChatController);
  router.post('/all-images', auth(), middleware(chatValidator.allImages), allImageController);
  router.post('/image', handleFileUpload(upload), auth(), middleware(chatValidator.uploadImage), uploadImageController);   // media, recodings


  return router;
};
