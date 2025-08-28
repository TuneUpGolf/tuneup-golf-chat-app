require("module-alias/register");
const express = require("express");
const socketIO = require("socket.io");
const app = express();
const bodyParser = require("body-parser");
const cors = require("cors");
const redisAdapter = require('@socket.io/redis-adapter');
const { config } = require("@config/index");
const sockets = require("@root/src/helper/socket");
const router = express.Router();
const { logger } = require("@utils/index");
const { Redis } = require("ioredis");
const helmet = require("helmet");

app.use(helmet());
// Hide the X-Powered-By header
app.disable('x-powered-by');
app.get("/", (req, res) => {
  res.send("App started...");
});

const allowedOrigins = [

  "https://localhost:*",
  "https://127.0.0.1:*",
];
app.use(cors({ allowedOrigins }));

// Body-parser middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// API routes
app.use("/chat-app/api/v1", require("@routes/api/v1")(router));


//For uncaughtException handling
process.on('uncaughtException', (error) => {
  logger.error(`[uncaughtException] [Error]=> ${error}`);
});
process.on('unhandledRejection', (reason, promise) => {
  console.log(/reason/, reason);

  logger.error(`[unhandledRejection] [Error]=> reason: ${JSON.stringify(reason)}, ${JSON.stringify(promise)}`);
});

// Start server and setup Socket.IO
const server = app.listen(config.port, () => logger.info(`Listening on Port: ${config.port}`));

const pubClient = new Redis({
  host: config.redisHost,
  port: config.redisPort,
  maxRetriesPerRequest: null,
  enableReadyCheck: false
});
const subClient = pubClient.duplicate();
const io = socketIO(server, {
  cors: { origin: "*" },
  pingInterval: 2000, // Interval in milliseconds to send ping packets to clients
  pingTimeout: 1000, // Time in milliseconds to consider a connection closed if no ping from client
  adapter: redisAdapter.createAdapter(pubClient, subClient)
});
sockets(io);
global.globalSocket = io;

