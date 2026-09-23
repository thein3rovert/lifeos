# Structured Output

The sidecar supports two modes for getting JSON responses from AI models.

## Modes

### Prompt-only (default)

Relies on prompt instructions ("Return valid JSON only") + backend's
`cleanJSONResponse` parser to extract JSON from the model's text output.

- ✅ Works with **any model** (thinking or not)
- ✅ No schema constraints
- ⚠️  Slightly less reliable — depends on model following instructions

### Structured Output (`USE_STRUCTURED_OUTPUT=true`)

OpenCode V2's `session.prompt` contract does not expose a response-format or
JSON-schema field. The sidecar therefore keeps this flag for compatibility but
falls back to prompt-only JSON parsing and logs the limitation.

- ❌ No schema enforcement is available through the V2 session API
- ✅ Works with thinking/reasoning models because no forced tool call is used

## How to switch

```yaml
# docker-compose.yml
sidecar:
  environment:
    - USE_STRUCTURED_OUTPUT=true   # accepted, but V2 still uses prompt-only mode
```

## V2 limitation

The V1 SDK accepted a `format: { type: "json_schema", ... }` prompt option.
`@opencode/client@2.0.15` accepts text and attachments but no format field.
LifeOS continues to request JSON in the prompt and parse the returned text.

The schemas remain in `schemas/smartboard.js` for a future V2 API that supports
schema-constrained session prompts.
