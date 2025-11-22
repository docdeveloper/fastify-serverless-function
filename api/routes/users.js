import { db } from "../db.js";

// Helper to ensure database is initialized
let dbInitialized = false;
async function ensureDB(initDB) {
  if (!dbInitialized) {
    await initDB();
    dbInitialized = true;
  }
}

export default async function usersRoutes(fastify, options) {
  const { initDB } = options;

  // Get all users
  fastify.get("/users", async (req, reply) => {
    await ensureDB(initDB);
    await db.read();
    return reply
      .status(200)
      .send(db.data.users.filter((u) => u.role !== "admin"));
  });

  // Get admin users (protected)
  fastify.get(
    "/users/admin",
    { preHandler: options.verifyToken },
    async (req, reply) => {
      await ensureDB(initDB);
      await db.read();
      const adminUsers = db.data.users.filter((u) => u.role === "admin");
      return reply.status(200).send(adminUsers);
    }
  );

  // Get a specific user
  fastify.get("/users/:userId", async (req, reply) => {
    await ensureDB(initDB);
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
}
