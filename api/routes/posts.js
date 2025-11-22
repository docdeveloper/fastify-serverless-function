import { db } from "../db.js";

// Helper to ensure database is initialized
let dbInitialized = false;
async function ensureDB(initDB) {
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

export default async function postsRoutes(fastify, options) {
  const { initDB } = options;

  // Get all posts
  fastify.get("/posts", async (req, reply) => {
    await ensureDB(initDB);
    await db.read();
    return reply.status(200).send(db.data.posts);
  });

  // Get a specific post
  fastify.get("/posts/:postId", async (req, reply) => {
    await ensureDB(initDB);
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
  fastify.post("/posts", async (req, reply) => {
    const { title, body, userId } = req.body;

    if (!title || !body || !userId) {
      return reply.status(400).send({
        error: "Bad Request",
        message: "Missing required fields: title, body, userId",
      });
    }

    await ensureDB(initDB);
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
  fastify.put("/posts/:postId", async (req, reply) => {
    const postId = parseInt(req.params.postId);
    const { title, body, userId } = req.body;

    await ensureDB(initDB);
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
  fastify.patch("/posts/:postId", async (req, reply) => {
    const postId = parseInt(req.params.postId);

    await ensureDB(initDB);
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
  fastify.delete("/posts/:postId", async (req, reply) => {
    const postId = parseInt(req.params.postId);

    await ensureDB(initDB);
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

  // Get comments for a specific post
  fastify.get("/posts/:postId/comments", async (req, reply) => {
    await ensureDB(initDB);
    await db.read();
    const postId = parseInt(req.params.postId);
    const postComments = db.data.comments.filter((c) => c.postId === postId);

    return reply.status(200).send(postComments);
  });
}
