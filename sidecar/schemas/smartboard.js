// JSON schemas for smartboard panel structured output
// Used with OpenCode SDK's format: { type: "json_schema", schema: {...} }

export const thingsToRememberSchema = {
  type: "array",
  items: {
    type: "object",
    properties: {
      id: { type: "string", description: "Item ID (empty string if new, reuse existing ID if same item)" },
      title: { type: "string", description: "Short concise title (max 40 chars)" },
      text: { type: "string", description: "Full description with context and details (max 200 chars)" },
      category: {
        type: "string",
        enum: ["urgent", "important", "not-important"],
        description: "Priority category: urgent (time-sensitive), important (high priority), not-important (nice to know)"
      },
      source: { type: "string", description: "Source filename where found" },
      date: { type: "string", description: "Date in YYYY-MM-DD format" }
    },
    required: ["id", "title", "text", "category", "source", "date"]
  }
}

export const suggestionsSchema = {
  type: "array",
  items: {
    type: "object",
    properties: {
      id: { type: "string", description: "Item ID (empty string if new, reuse existing ID if same item)" },
      title: { type: "string", description: "Short title (max 40 chars)" },
      suggestion: { type: "string", description: "Full actionable suggestion (max 150 chars)" },
      reasoning: { type: "string", description: "Why this matters and what pattern was observed (max 200 chars)" }
    },
    required: ["id", "title", "suggestion", "reasoning"]
  }
}

export const achievementsSchema = {
  type: "array",
  items: {
    type: "object",
    properties: {
      id: { type: "string", description: "Item ID (empty string if new, reuse existing ID if same item)" },
      title: { type: "string", description: "Short title (max 40 chars)" },
      achievement: { type: "string", description: "Full achievement description (max 200 chars)" },
      date: { type: "string", description: "Date in YYYY-MM-DD format" },
      source: { type: "string", description: "Source filename" }
    },
    required: ["id", "title", "achievement", "date", "source"]
  }
}

export const blockersSchema = {
  type: "array",
  items: {
    type: "object",
    properties: {
      id: { type: "string", description: "Item ID (empty string if new, reuse existing ID if same item)" },
      title: { type: "string", description: "Short title (max 40 chars)" },
      blocker: { type: "string", description: "Full blocker description (max 150 chars)" },
      context: { type: "string", description: "Additional details or who/what is involved (max 200 chars)" },
      date: { type: "string", description: "Date in YYYY-MM-DD format" },
      source: { type: "string", description: "Source filename" }
    },
    required: ["id", "title", "blocker", "context", "date", "source"]
  }
}

// Map panel type to schema
export const schemas = {
  "things-to-remember": thingsToRememberSchema,
  "suggestions": suggestionsSchema,
  "achievements": achievementsSchema,
  "blockers": blockersSchema
}
