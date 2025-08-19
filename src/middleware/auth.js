const jwt = require("jsonwebtoken");
const { config } = require("@config/index");
const { userFind } = require("@services/user.services");

/**
 * Verifies the JWT token included in the request headers.
 * 
 * @param {boolean} isReq - Indicates whether to include the user ID in the request body.
 * @returns {Function} - Middleware function to handle JWT verification.
//  */
const verifyJWT = (isReq = false) => {
  return (req, res, next) => {
    const token = req.headers["authorization"];
    const result = token ? token.substr(token.indexOf(" ") + 1) : false;
    if (!result) {
      return res
        .status(403)
        .send({ status: false, code: 403, message: "Unauthorized !" });
    }
    jwt.verify(result, config.secret, async (err, decoded) => {
      if (err) {
        return res
          .status(500)
          .send({
            status: false,
            code: 500,
            message: "Failed to authenticate token. !",
          });
      }
      const { userId } = decoded;
      const userResponse = await userFind({ _id:userId });

      if (!userResponse) {
        return res.status(403).send({
          status: false,
          code: 403,
          message: "Unauthorized! User not found.",
        });
      }

      const planDate = new Date(userResponse.plan_expired_date).getTime();

      // Subscription check if isReq is true
      if (isReq && (isNaN(planDate) || planDate <= Date.now())) {
        return res.status(403).send({
          status: false,
          code: 403,
          message: "Unauthorized! Subscription expired.",
        });
      }

      req.user = req.user || {};
      req.user.userId = userId;

      next();
    });

  };
};



module.exports = verifyJWT;
