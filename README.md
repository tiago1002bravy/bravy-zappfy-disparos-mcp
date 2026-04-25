# Zappfy Disparos — MCP Server

Servidor MCP que expõe a API pública do Zappfy Disparos pra clientes MCP (Claude Desktop, Claude Code, etc).

## Tools

- `list_groups`, `sync_groups`
- `list_messages`, `create_message`
- `list_schedules`, `schedule_send`, `cancel_schedule`
- `schedule_group_update`
- `cron_preview`

## Configurar no Claude Desktop

`~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "zappfy-disparos": {
      "command": "node",
      "args": ["/caminho/para/bravy-zappfy-disparos-mcp/dist/server.js"],
      "env": {
        "ZAPPFY_API_URL": "https://api.disparos.bravy.com.br/api/v1",
        "ZAPPFY_API_KEY": "zd_..."
      }
    }
  }
}
```

Crie a API Key em `/settings` no frontend.

## Subir em dev

```bash
pnpm install
pnpm build
ZAPPFY_API_URL=http://localhost:3000/api/v1 ZAPPFY_API_KEY=zd_... node dist/server.js
```
