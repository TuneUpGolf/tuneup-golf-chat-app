const jwt = require("jsonwebtoken");
const { config } = require("@config/index");
const { userFind } = require("@services/user.services");

/**
 * Verifies the JWT token included in the socket handshake query.
 * 
 * @param {Object} socket - The socket object.
 * @param {Function} next - The next function to call in the middleware chain.
 * @returns {null} - Returns null.
 * @throws {Error} - Throws an error if authentication fails.
 */

const verifyJWT = async (socket, next) => {
  try {
    const authHeader = socket.handshake.headers?.authorization;
    console.log("/auth/", authHeader);

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next(new Error("Unauthorized: No token provided"));
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, config.secret);
    const { userId } = decoded;

    const userResponse = await userFind({ _id: userId });

    if (!userResponse) {
      return next(new Error("Unauthorized: User not found"));
    }

    socket.userId = userId;
    next();
  } catch (err) {
    console.log("/er/", err);
    return next(new Error("Failed to authenticate token"));
  }
};

module.exports = verifyJWT;
