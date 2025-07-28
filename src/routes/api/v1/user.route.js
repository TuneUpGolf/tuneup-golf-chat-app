const express = require("express");
const router = express.Router();
const middleware = require('@middleware/validation');
const auth = require('@middleware/auth');
const { userValidator } = require('@validations/index');
const {
  createUserController,
  updateUserController,
  profileUserController,
  getUserJwtController,
  deleteUserController,
} = require('@controller/user.controller');

module.exports = () => {

  router.post('/create', middleware(userValidator.createUser), createUserController);
  router.patch('/update', auth(), middleware(userValidator.updateUser), updateUserController);
  router.post('/get-profile', middleware(userValidator.getUser), profileUserController);
  router.post('/token', getUserJwtController);
  router.post('/delete', auth(), middleware(userValidator.deleteUser), deleteUserController);
  return router;
};
