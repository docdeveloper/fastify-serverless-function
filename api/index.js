import Fastify from "fastify";
import formBody from "@fastify/formbody";
import { db, initDB } from "./db.js";
import usersRoutes from "./routes/users.js";
import postsRoutes from "./routes/posts.js";
import commentsRoutes from "./routes/comments.js";
import oauthRoutes from "./routes/oauth.js";

const app = Fastify({
  logger: true,
});

// Register form body parser for application/x-www-form-urlencoded
await app.register(formBody);

// Track if database is initialized
let dbInitialized = false;

// Helper to ensure database is initialized
async function ensureDB() {
  if (!dbInitialized) {
    await initDB();
    dbInitialized = true;
  }
}

// Middleware to verify Bearer token
const verifyToken = async (request, reply, done) => {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return reply.status(401).send({
      error: "Unauthorized",
      message: "Missing or invalid authorization header",
    });
  }
  const token = authHeader.substring(7);
  await ensureDB();
  await db.read();
  if (!db.data.tokens[token]) {
    return reply
      .status(401)
      .send({ error: "Unauthorized", message: "Invalid token" });
  }
  request.tokenInfo = db.data.tokens[token];
  done();
};

// Root endpoint
app.get("/", async (req, reply) => {
  return reply
    .status(200)
    .type("application/json")
    .send({ message: "Welcome to the API for tech writers workshop" });
});

// Register route modules
await app.register(usersRoutes, { initDB, verifyToken });
await app.register(postsRoutes, { initDB });
await app.register(commentsRoutes, { initDB });
await app.register(oauthRoutes, { initDB, verifyToken });

export default async function handler(req, reply) {
  await app.ready();
  app.server.emit("request", req, reply);
}
