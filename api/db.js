import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";
import { join } from "path";
import { existsSync } from "fs";

// Use /tmp directory for serverless environments (Vercel, AWS Lambda, etc.)
// Data persists across requests within the same function instance
const dbPath = join("/tmp", "db.json");

const adapter = new JSONFile(dbPath);
const defaultData = {
  users: [
    { id: 1, name: "John Doe", email: "john@example.com", role: "user" },
    { id: 2, name: "Jane Smith", email: "jane@example.com", role: "user" },
    { id: 3, name: "Admin User", email: "admin@example.com", role: "admin" },
  ],
  posts: [
    { id: 1, title: "First Post", body: "This is the first post", userId: 1 },
    { id: 2, title: "Second Post", body: "This is the second post", userId: 2 },
  ],
  comments: [
    {
      id: 1,
      postId: 1,
      name: "Commenter 1",
      email: "comment1@example.com",
      body: "Great post!",
    },
    {
      id: 2,
      postId: 1,
      name: "Commenter 2",
      email: "comment2@example.com",
      body: "Thanks for sharing!",
    },
    {
      id: 3,
      postId: 2,
      name: "Commenter 3",
      email: "comment3@example.com",
      body: "Interesting read.",
    },
  ],
  tokens: {},
  counters: {
    postId: 3,
    token: 1,
  },
};

const db = new Low(adapter, defaultData);

// Initialize database
async function initDB() {
  await db.read();
  // Initialize with default data if file doesn't exist
  db.data ||= defaultData;
  await db.write();
}

export { db, initDB };
