import { createOpencodeClient } from "@opencode-ai/sdk";
import express from "express";

const app = express();
app.use(express.json());

const PORT = 3001;

let client;

async function initOpencode() {
  try {
    client = createOpencodeClient({
      baseUrl: "http://127.0.0.1:4097",
    });
    // Health check via raw fetch instead
    const res = await fetch("http://127.0.0.1:4097/global/health");
    if (!res.ok) throw new Error("OpenCode not healthy");
    const data = await res.json();
    console.log("Connected to OpenCode, version:", data.version);
  } catch (err) {
    console.error("Failed to connect to OpenCode:", err.message);
    process.exit(1);
  }
}

app.post("/skill/update", async (req, res) => {
  const { existingSkill, newNotes } = req.body;

  if (!existingSkill || !newNotes) {
    return res.status(400).json({ error: "existingSkill and newNotes are required" });
  }

  let sessionId;

  try {
    // Create a new session
    const session = await client.session.create({
      body: { title: "skill-update" },
    });
    sessionId = session.data.id;

    // Send the prompt
    const prompt = `You are a skills manager. You will be given an existing skill file in markdown format and some new notes/learnings.

Your job is to intelligently update the skill file by incorporating the new notes. Do not just append — rewrite and restructure as needed so the skill file remains clean, useful and well organised.

Return ONLY the updated markdown skill file, nothing else.

--- EXISTING SKILL ---
${existingSkill}

--- NEW NOTES ---
${newNotes}`;

    const result = await client.session.prompt({
      path: { id: sessionId },
      body: {
        parts: [{ type: "text", text: prompt }],
      },
    });

    // Extract the text response
    const updatedSkill = result.data.parts
      .filter((p) => p.type === "text")
      .map((p) => p.text)
      .join("");

    // Clean up session
    await client.session.delete({ path: { id: sessionId } });

    return res.json({ updatedSkill });
  } catch (err) {
    console.error("Error updating skill:", err.message);

    // Try to clean up session on error
    if (sessionId) {
      await client.session.delete({ path: { id: sessionId } }).catch(() => {});
    }

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
