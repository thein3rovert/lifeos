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

Uses provider-native `json_schema` format to constrain the response.

- ✅ Strict schema enforcement
- ❌ **Does not work with thinking/reasoning models** (DeepSeek R1/v4-pro,
  OpenAI o1, Claude w/ extended thinking) — they reject forced `tool_choice`
- ❌ Most providers (OpenAI, DeepSeek) require object-root schemas — arrays
  must be wrapped in `{ items: [...] }` (see `schemas/smartboard.js`)

## How to switch

```yaml
# docker-compose.yml
sidecar:
  environment:
    - USE_STRUCTURED_OUTPUT=true   # only for non-thinking models
```

## Why thinking models can't be forced

Thinking models reason internally before producing output:

```
input → [reasoning tokens] → output
```

Forcing `tool_choice` says "your next token MUST be a function call" — but
the model needs to think first. The two requirements conflict, so the
provider rejects the request.

**Workaround:** trust the prompt + parse the output. Modern thinking models
follow JSON format instructions reliably.

## Schema wrapping (when structured output is enabled)

DeepSeek and OpenAI require root schemas to be `type: "object"`, not arrays.
All schemas in `schemas/smartboard.js` are wrapped in `{ items: [...] }`
and unwrapped in `routes/agent.js` before returning to the backend.
