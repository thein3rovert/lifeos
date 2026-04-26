import { createOpencodeClient } from "@opencode-ai/sdk";
import express from "express";

const app = express();
app.use(express.json());

const PORT = 3002;

let client;

// Logging middleware - log all requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

async function initOpencode() {
  try {
    client = createOpencodeClient({
      baseUrl: "http://127.0.0.1:4097",
    });
    // Health check via raw fetch instead
    const res = await fetch("http://127.0.0.1:4097/global/health");
    const res2 = await fetch("http://127.0.0.1:4097/config");
    const config = await res2.json();
    console.log("Model:", JSON.stringify(config.model, null, 2));

    if (!res.ok) throw new Error("OpenCode not healthy");
    const data = await res.json();
    console.log("Connected to OpenCode, version:", data.version);
  } catch (err) {
    console.error("Failed to connect to OpenCode:", err.message);
    process.exit(1);
  }
}

app.post("/skill/update", async (req, res) => {
  console.log("\n=== NEW REQUEST ===");
  console.log("Time:", new Date().toISOString());
  console.log("Request body:", JSON.stringify(req.body, null, 2));

  const { existingSkill, newNotes } = req.body;

  if (!existingSkill || !newNotes) {
    console.log("ERROR: Missing required fields");
    console.log("  - existingSkill present:", !!existingSkill);
    console.log("  - newNotes present:", !!newNotes);
    return res.status(400).json({ error: "existingSkill and newNotes are required" });
  }

  console.log("Input sizes:");
  console.log("  - existingSkill length:", existingSkill.length, "chars");
  console.log("  - newNotes length:", newNotes.length, "chars");

  let sessionId;

  try {
    console.log("Creating OpenCode session...");
    // Create a new session
    const session = await client.session.create({
      body: { title: "skill-update" },
    });
    sessionId = session.data.id;
    console.log("Session created:", sessionId);

    // Send the prompt
    const prompt = `You are a skills manager. You will be given an existing skill file in markdown format and some new notes/learnings.

Your job is to intelligently update the skill file by incorporating the new notes. Do not just append — rewrite and restructure as needed so the skill file remains clean, useful and well organised.

Return ONLY the updated markdown skill file, nothing else.

--- EXISTING SKILL ---
${existingSkill}

--- NEW NOTES ---
${newNotes}`;

    console.log("Sending prompt to AI...");
    const result = await client.session.prompt({
      path: { id: sessionId },
      body: {
        parts: [{ type: "text", text: prompt }],
      },
    });
    console.log("AI response received");

    // Extract the text response
    const updatedSkill = result.data.parts
      .filter((p) => p.type === "text")
      .map((p) => p.text)
      .join("");

    console.log("Updated skill generated:");
    console.log("  - Length:", updatedSkill.length, "chars");
    console.log("  - Preview:", updatedSkill.substring(0, 100), "...");

    // Clean up session
    await client.session.delete({ path: { id: sessionId } });
    console.log("Session cleaned up");

    console.log("=== SUCCESS ===\n");
    return res.json({ updatedSkill });
  } catch (err) {
    console.error("ERROR updating skill:", err.message);
    console.error("Stack:", err.stack);

    // Try to clean up session on error
    if (sessionId) {
      await client.session.delete({ path: { id: sessionId } }).catch(() => {});
    }

    console.log("=== FAILED ===\n");
    return res.status(500).json({ error: "Failed to update skill" });
  }
});

app.get("/health", (_req, res) => {
  res.json({ healthy: true });
});

await initOpencode();

app.listen(PORT, "127.0.0.1", () => {
  console.log(`Sidecar running on http://127.0.0.1:${PORT}`);
});
