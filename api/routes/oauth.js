import { db } from "../db.js";

// Helper to ensure database is initialized
let dbInitialized = false;
async function ensureDB(initDB) {
  if (!dbInitialized) {
    await initDB();
    dbInitialized = true;
  }
}

export default async function oauthRoutes(fastify, options) {
  const { initDB, verifyToken } = options;

  // OAuth token endpoint
  fastify.post("/oauth/token", async (req, reply) => {
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

    await ensureDB(initDB);
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

  // Get users (authenticated)
  fastify.get(
    "/api/v1/users",
    { preHandler: verifyToken },
    async (req, reply) => {
      await ensureDB(initDB);
      await db.read();
      return reply.status(200).send(db.data.users);
    }
  );

  // Create document (authenticated)
  fastify.post(
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
  fastify.get(
    "/api/v1/oauth/token/info",
    { preHandler: verifyToken },
    async (req, reply) => {
      return reply.status(200).send({
        ...req.tokenInfo,
        active: true,
      });
    }
  );
}
