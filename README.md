# Zappfy Disparos — MCP Server

Servidor MCP que expõe a API pública do Zappfy Disparos pra clientes MCP (Claude Desktop, Claude Code, etc).

## Atualizar (já tem versão antiga rodando?)

```bash
cd /caminho/para/bravy-zappfy-disparos-mcp
git pull
pnpm install
pnpm build
# reinicie o cliente MCP (Claude Desktop / Claude Code)
```

## Tools

### Grupos

- `list_groups`, `get_group`, `sync_groups`
- `create_group` — cria 1 grupo (aplica defaults do tenant automaticamente)
- `update_group` — nome/descrição/foto via mediaId
- `bulk_create_groups` — cria N grupos numerados com template `{N}` (start_number, count). Aceita `also_create_list` e `also_create_shortlink` pra criar lista+shortlink no mesmo passo.
- `bulk_apply_to_groups` — aplica descrição/foto/permissões/admins em N grupos com delays anti-ban.
- `add_group_participants` — adiciona (com promote opcional)
- `promote_group_participants`, `demote_group_participants`, `remove_group_participants`
- `set_group_permissions` — `locked` (só adm edita info) e/ou `announce` (só adm envia mensagem)
- `set_group_picture` — `media_id` | `data_uri` | `image_url`

### Listas de grupos

- `list_group_lists`, `get_group_list`, `create_group_list`, `update_group_list`, `delete_group_list`
- `add_groups_to_list`, `remove_groups_from_list`

### Shortlinks (link público que rotaciona entre grupos)

- `list_shortlinks`, `get_shortlink`, `create_shortlink`, `update_shortlink`, `delete_shortlink`
- `add_groups_to_shortlink`, `remove_shortlink_item`, `reorder_shortlink_items`
- `update_shortlink_item` — status (ACTIVE/FULL/INVALID/DISABLED) ou order
- `refresh_shortlink_invite` — força refresh do invite via Zappfy

### Mídias

- `list_media`, `get_media`, `upload_media`, `delete_media`

### Mensagens (texto, mídia ou **enquete**)

- `list_messages`, `get_message`, `create_message`, `update_message`, `delete_message`
  - **Enquete:** `create_message` aceita `poll_choices: string[]` (≥2) e `poll_selectable_count` (default 1). Quando preenchido, o worker dispara via `zappfy.sendPoll`.
- `preview_message` — preview com spintax + variáveis dinâmicas (1-20 amostras)
- `send_message_now` — dispara imediato
- `message_active_schedules`

### Message shortlinks (encurtador interno + tracking A/B)

- `list_message_shortlinks`, `get_message_shortlink`, `create_message_shortlink`
- `update_message_shortlink`, `delete_message_shortlink`
- `message_shortlink_stats`

### Schedules

- `list_schedules`, `get_schedule`, `schedule_send`, `update_schedule`, `delete_schedule`
- `pause_schedule`, `resume_schedule`, `cancel_schedule`
- `list_executions`, `list_schedule_executions`

### Group update schedules (renomear/atualizar grupos agendado)

- `list_group_update_schedules`, `get_group_update_schedule`
- `schedule_group_update`, `update_group_update_schedule`
- `cancel_group_update_schedule`, `delete_group_update_schedule`
- `run_group_update_now`

### Tenant / API keys / outros

- `get_tenant`, `update_tenant`, `get_tenant_defaults`
- `set_tenant_group_defaults` — define admins/desc/foto/permissões aplicados em todo grupo criado
- `list_api_keys`, `create_api_key`, `delete_api_key`
- `cron_preview`, `calendar_events`

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
