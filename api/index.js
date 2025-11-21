import Fastify from "fastify";
import formBody from "@fastify/formbody";
import { db, initDB } from "./db.js";

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

// Helper to validate user exists
function validateUserExists(userId) {
  const user = db.data.users.find((u) => u.id === userId);
  return user !== undefined;
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

// ========== USERS ENDPOINTS ==========

// Get all users
app.get("/users", async (req, reply) => {
  await ensureDB();
  await db.read();
  return reply
    .status(200)
    .send(db.data.users.filter((u) => u.role !== "admin"));
});

// Get admin users (protected)
app.get("/users/admin", { preHandler: verifyToken }, async (req, reply) => {
  await ensureDB();
  await db.read();
  const adminUsers = db.data.users.filter((u) => u.role === "admin");
  return reply.status(200).send(adminUsers);
});

// Get a specific user
app.get("/users/:userId", async (req, reply) => {
  await ensureDB();
  await db.read();
  const userId = parseInt(req.params.userId);
  const user = db.data.users.find((u) => u.id === userId);

  if (!user) {
    return reply
      .status(404)
      .send({ error: "Not Found", message: "User not found" });
  }

  // Don't expose admin users through this endpoint
  if (user.role === "admin") {
    return reply
      .status(404)
      .send({ error: "Not Found", message: "User not found" });
  }

  return reply.status(200).send(user);
});

// ========== POSTS ENDPOINTS ==========

// Get all posts
app.get("/posts", async (req, reply) => {
  await ensureDB();
  await db.read();
  return reply.status(200).send(db.data.posts);
});

// Get a specific post
app.get("/posts/:postId", async (req, reply) => {
  await ensureDB();
  await db.read();
  const postId = parseInt(req.params.postId);
  const post = db.data.posts.find((p) => p.id === postId);

  if (!post) {
    return reply
      .status(404)
      .send({ error: "Not Found", message: "Post not found" });
  }

  return reply.status(200).send(post);
});

// Create a post
app.post("/posts", async (req, reply) => {
  const { title, body, userId } = req.body;

  if (!title || !body || !userId) {
    return reply.status(400).send({
      error: "Bad Request",
      message: "Missing required fields: title, body, userId",
    });
  }

  await ensureDB();
  await db.read();

  // Validate that the user exists
  if (!validateUserExists(userId)) {
    return reply.status(400).send({
      error: "Bad Request",
      message: "Invalid userId: user does not exist",
    });
  }

  const newPost = {
    id: db.data.counters.postId++,
    title,
    body,
    userId,
  };

  db.data.posts.push(newPost);
  await db.write();
  return reply.status(201).send(newPost);
});

// Update entire post (PUT)
app.put("/posts/:postId", async (req, reply) => {
  const postId = parseInt(req.params.postId);
  const { title, body, userId } = req.body;

  await ensureDB();
  await db.read();
  const postIndex = db.data.posts.findIndex((p) => p.id === postId);

  if (postIndex === -1) {
    return reply
      .status(404)
      .send({ error: "Not Found", message: "Post not found" });
  }

  if (!title || !body || !userId) {
    return reply.status(400).send({
      error: "Bad Request",
      message: "Missing required fields: title, body, userId",
    });
  }

  // Validate that the user exists
  if (!validateUserExists(userId)) {
    return reply.status(400).send({
      error: "Bad Request",
      message: "Invalid userId: user does not exist",
    });
  }

  db.data.posts[postIndex] = {
    id: postId,
    title,
    body,
    userId,
  };

  await db.write();
  return reply.status(200).send(db.data.posts[postIndex]);
});

// Update part of post (PATCH)
app.patch("/posts/:postId", async (req, reply) => {
  const postId = parseInt(req.params.postId);

  await ensureDB();
  await db.read();
  const postIndex = db.data.posts.findIndex((p) => p.id === postId);

  if (postIndex === -1) {
    return reply
      .status(404)
      .send({ error: "Not Found", message: "Post not found" });
  }

  // If userId is being updated, validate it exists
  if (req.body.userId !== undefined && !validateUserExists(req.body.userId)) {
    return reply.status(400).send({
      error: "Bad Request",
      message: "Invalid userId: user does not exist",
    });
  }

  db.data.posts[postIndex] = {
    ...db.data.posts[postIndex],
    ...req.body,
    id: postId, // Ensure ID doesn't change
  };

  await db.write();
  return reply.status(200).send(db.data.posts[postIndex]);
});

// Delete a post
app.delete("/posts/:postId", async (req, reply) => {
  const postId = parseInt(req.params.postId);

  await ensureDB();
  await db.read();
  const postIndex = db.data.posts.findIndex((p) => p.id === postId);

  if (postIndex === -1) {
    return reply
      .status(404)
      .send({ error: "Not Found", message: "Post not found" });
  }

  db.data.posts.splice(postIndex, 1);
  await db.write();
  return reply.status(200).send({ message: "Post deleted successfully" });
});

// ========== COMMENTS ENDPOINTS ==========

// Get comments for a specific post
app.get("/posts/:postId/comments", async (req, reply) => {
  await ensureDB();
  await db.read();
  const postId = parseInt(req.params.postId);
  const postComments = db.data.comments.filter((c) => c.postId === postId);

  return reply.status(200).send(postComments);
});

// ========== OAUTH ENDPOINTS ==========

// OAuth token endpoint
app.post("/oauth/token", async (req, reply) => {
  const contentType = req.headers["content-type"];
  let grantType, clientId, clientSecret, scope;

  // Parse form data
  if (
    contentType &&
    contentType.includes("application/x-www-form-urlencoded")
  ) {
    const body = req.body || {};
    grantType = body.grant_type;
    clientId = body.client_id;
    clientSecret = body.client_secret;
    scope = body.scope;
  }

  if (grantType !== "client_credentials") {
    return reply.status(400).send({
      error: "unsupported_grant_type",
      error_description: "Only client_credentials grant type is supported",
    });
  }

  if (
    clientId !== "workshop_client_12345" ||
    clientSecret !== "secret_abc123xyz789"
  ) {
    return reply.status(401).send({
      error: "invalid_client",
      error_description: "Invalid client credentials",
    });
  }

  await ensureDB();
  await db.read();
  const accessToken = `wks_token_${db.data.counters.token++}_${Date.now()}`;
  const tokenData = {
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: 3600,
    scope: scope || "read:data write:data",
    created_at: Date.now(),
  };

  db.data.tokens[accessToken] = tokenData;
  await db.write();

  return reply.status(200).send(tokenData);
});

// API v1 endpoints (authenticated)

// Get users (authenticated)
app.get("/api/v1/users", { preHandler: verifyToken }, async (req, reply) => {
  await ensureDB();
  await db.read();
  return reply.status(200).send(db.data.users);
});

// Create document (authenticated)
app.post(
  "/api/v1/documents",
  { preHandler: verifyToken },
  async (req, reply) => {
    const { title, content, category } = req.body;

    if (!title || !content) {
      return reply.status(400).send({
        error: "Bad Request",
        message: "Missing required fields: title, content",
      });
    }

    const document = {
      id: Date.now(),
      title,
      content,
      category: category || "general",
      created_at: new Date().toISOString(),
    };

    return reply.status(201).send(document);
  }
);

// Get token info (authenticated)
app.get(
  "/api/v1/oauth/token/info",
  { preHandler: verifyToken },
  async (req, reply) => {
    return reply.status(200).send({
      ...req.tokenInfo,
      active: true,
    });
  }
);

export default async function handler(req, reply) {
  await app.ready();
  app.server.emit("request", req, reply);
}
