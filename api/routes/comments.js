import { db } from "../db.js";

// Helper to ensure database is initialized
let dbInitialized = false;
async function ensureDB(initDB) {
  if (!dbInitialized) {
    await initDB();
    dbInitialized = true;
  }
}

// Helper to validate post exists
function validatePostExists(postId) {
  const post = db.data.posts.find((p) => p.id === postId);
  return post !== undefined;
}

export default async function commentsRoutes(fastify, options) {
  const { initDB } = options;

  // Get comments for a specific post
  fastify.get("/posts/:postId/comments", async (req, reply) => {
    await ensureDB(initDB);
    await db.read();
    const postId = parseInt(req.params.postId);
    const postComments = db.data.comments.filter((c) => c.postId === postId);

    return reply.status(200).send(postComments);
  });

  // Get all comments
  fastify.get("/comments", async (req, reply) => {
    await ensureDB(initDB);
    await db.read();
    return reply.status(200).send(db.data.comments);
  });

  // Get a specific comment
  fastify.get("/comments/:commentId", async (req, reply) => {
    await ensureDB(initDB);
    await db.read();
    const commentId = parseInt(req.params.commentId);
    const comment = db.data.comments.find((c) => c.id === commentId);

    if (!comment) {
      return reply
        .status(404)
        .send({ error: "Not Found", message: "Comment not found" });
    }

    return reply.status(200).send(comment);
  });

  // Create a comment
  fastify.post("/comments", async (req, reply) => {
    const { postId, name, email, body } = req.body;

    if (!postId || !name || !email || !body) {
      return reply.status(400).send({
        error: "Bad Request",
        message: "Missing required fields: postId, name, email, body",
      });
    }

    await ensureDB(initDB);
    await db.read();

    // Validate that the post exists
    if (!validatePostExists(postId)) {
      return reply.status(400).send({
        error: "Bad Request",
        message: "Invalid postId: post does not exist",
      });
    }

    // Initialize counter if not exists
    if (!db.data.counters.commentId) {
      db.data.counters.commentId =
        Math.max(...db.data.comments.map((c) => c.id), 0) + 1;
    }

    const newComment = {
      id: db.data.counters.commentId++,
      postId,
      name,
      email,
      body,
    };

    db.data.comments.push(newComment);
    await db.write();
    return reply.status(201).send(newComment);
  });

  // Update entire comment (PUT)
  fastify.put("/comments/:commentId", async (req, reply) => {
    const commentId = parseInt(req.params.commentId);
    const { postId, name, email, body } = req.body;

    await ensureDB(initDB);
    await db.read();
    const commentIndex = db.data.comments.findIndex((c) => c.id === commentId);

    if (commentIndex === -1) {
      return reply
        .status(404)
        .send({ error: "Not Found", message: "Comment not found" });
    }

    if (!postId || !name || !email || !body) {
      return reply.status(400).send({
        error: "Bad Request",
        message: "Missing required fields: postId, name, email, body",
      });
    }

    // Validate that the post exists
    if (!validatePostExists(postId)) {
      return reply.status(400).send({
        error: "Bad Request",
        message: "Invalid postId: post does not exist",
      });
    }

    db.data.comments[commentIndex] = {
      id: commentId,
      postId,
      name,
      email,
      body,
    };

    await db.write();
    return reply.status(200).send(db.data.comments[commentIndex]);
  });

  // Update part of comment (PATCH)
  fastify.patch("/comments/:commentId", async (req, reply) => {
    const commentId = parseInt(req.params.commentId);

    await ensureDB(initDB);
    await db.read();
    const commentIndex = db.data.comments.findIndex((c) => c.id === commentId);

    if (commentIndex === -1) {
      return reply
        .status(404)
        .send({ error: "Not Found", message: "Comment not found" });
    }

    // If postId is being updated, validate it exists
    if (req.body.postId !== undefined && !validatePostExists(req.body.postId)) {
      return reply.status(400).send({
        error: "Bad Request",
        message: "Invalid postId: post does not exist",
      });
    }

    db.data.comments[commentIndex] = {
      ...db.data.comments[commentIndex],
      ...req.body,
      id: commentId, // Ensure ID doesn't change
    };

    await db.write();
    return reply.status(200).send(db.data.comments[commentIndex]);
  });

  // Delete a comment
  fastify.delete("/comments/:commentId", async (req, reply) => {
    const commentId = parseInt(req.params.commentId);

    await ensureDB(initDB);
    await db.read();
    const commentIndex = db.data.comments.findIndex((c) => c.id === commentId);

    if (commentIndex === -1) {
      return reply
        .status(404)
        .send({ error: "Not Found", message: "Comment not found" });
    }

    db.data.comments.splice(commentIndex, 1);
    await db.write();
    return reply.status(200).send({ message: "Comment deleted successfully" });
  });
}
