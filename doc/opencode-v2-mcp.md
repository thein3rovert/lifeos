# OpenCode V2 MCP Setup

LifeOS exposes its file tools to OpenCode V2 over MCP Streamable HTTP.

## LifeOS configuration

Set a bearer token and the directories that MCP tools may read:

```dotenv
MCP_API_KEY=replace-with-a-secret
MCP_ALLOWED_DIRS=/absolute/path/to/meetings,/absolute/path/to/journal
```

The OpenCode V2 endpoint is the exact URL `/mcp`, for example:

```text
http://localhost:7060/mcp
```

The older `/mcp/sse` and `/message` routes remain available for legacy SSE
clients. New OpenCode V2 configurations should use `/mcp`.

## OpenCode V2 configuration

LifeOS uses bearer-token authentication rather than OAuth. Disable OAuth and
source the token from the environment instead of placing it in the config:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "servers": {
      "lifeos-files": {
        "type": "remote",
        "url": "http://localhost:7060/mcp",
        "oauth": false,
        "headers": {
          "Authorization": "Bearer {env:MCP_API_KEY}"
        }
      }
    }
  }
}
```

Then verify the connection:

```bash
opencode mcp list
```

OpenCode performs the MCP `initialize` handshake and reuses the returned
`Mcp-Session-Id` for later requests. LifeOS rejects requests with an unknown or
missing session ID after initialization.
