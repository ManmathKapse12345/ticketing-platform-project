// BullMQ connection options. Queue and Worker each open their own Redis
// connection from these; nothing connects until one of them is created.
const redisConnection = {
  url: process.env.REDIS_URL || "redis://localhost:6379",
  // Required by BullMQ workers: their blocking commands must wait for Redis to
  // come back rather than fail after ioredis' default 20 retries.
  maxRetriesPerRequest: null,
};

module.exports = redisConnection;
