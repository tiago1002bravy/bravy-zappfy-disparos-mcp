#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { ZappfyClient } from './client';

const client = new ZappfyClient();

const server = new Server(
  { name: 'zappfy-disparos', version: '0.1.0' },
  { capabilities: { tools: {} } },
);

const tools = [
  {
    name: 'list_groups',
    description: 'Lista grupos sincronizados (cache local). Para sincronizar com WhatsApp, use sync_groups.',
    inputSchema: {
      type: 'object',
      properties: { instance_name: { type: 'string' } },
    },
  },
  {
    name: 'sync_groups',
    description: 'Sincroniza grupos do WhatsApp via Uazapi. Recebe nome+token da instância.',
    inputSchema: {
      type: 'object',
      required: ['instance_name', 'instance_token'],
      properties: {
        instance_name: { type: 'string' },
        instance_token: { type: 'string' },
      },
    },
  },
  {
    name: 'list_messages',
    description: 'Lista templates de mensagem cadastrados.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'create_message',
    description: 'Cria template de mensagem. media_ids vem do upload prévio.',
    inputSchema: {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string' },
        text: { type: 'string' },
        media_ids: { type: 'array', items: { type: 'string' } },
      },
    },
  },
  {
    name: 'list_schedules',
    description: 'Lista agendamentos.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'schedule_send',
    description:
      'Cria agendamento de disparo. type=ONCE usa só start_at. DAILY/WEEKLY usam time (HH:MM) e weekdays (0-6, opcional). CUSTOM_CRON usa cron string.',
    inputSchema: {
      type: 'object',
      required: ['message_id', 'instance_name', 'instance_token', 'group_remote_ids', 'type', 'start_at'],
      properties: {
        message_id: { type: 'string' },
        instance_name: { type: 'string' },
        instance_token: { type: 'string' },
        group_remote_ids: { type: 'array', items: { type: 'string' } },
        type: { type: 'string', enum: ['ONCE', 'DAILY', 'WEEKLY', 'CUSTOM_CRON'] },
        start_at: { type: 'string', description: 'ISO 8601 datetime' },
        time: { type: 'string', description: '"HH:MM" para DAILY/WEEKLY' },
        weekdays: { type: 'array', items: { type: 'integer' } },
        cron: { type: 'string' },
        timezone: { type: 'string', default: 'America/Sao_Paulo' },
        end_at: { type: 'string' },
      },
    },
  },
  {
    name: 'cancel_schedule',
    description: 'Cancela um agendamento ativo.',
    inputSchema: {
      type: 'object',
      required: ['schedule_id'],
      properties: { schedule_id: { type: 'string' } },
    },
  },
  {
    name: 'schedule_group_update',
    description:
      'Agenda atualização de NAME/DESCRIPTION/PICTURE de um grupo no WhatsApp. PICTURE precisa de new_picture_media_id.',
    inputSchema: {
      type: 'object',
      required: ['instance_name', 'instance_token', 'group_remote_id', 'target', 'type', 'start_at'],
      properties: {
        instance_name: { type: 'string' },
        instance_token: { type: 'string' },
        group_remote_id: { type: 'string' },
        target: { type: 'string', enum: ['NAME', 'DESCRIPTION', 'PICTURE'] },
        new_name: { type: 'string' },
        new_description: { type: 'string' },
        new_picture_media_id: { type: 'string' },
        type: { type: 'string', enum: ['ONCE', 'DAILY', 'WEEKLY', 'CUSTOM_CRON'] },
        start_at: { type: 'string' },
        time: { type: 'string' },
        weekdays: { type: 'array', items: { type: 'integer' } },
        cron: { type: 'string' },
        timezone: { type: 'string' },
      },
    },
  },
  {
    name: 'cron_preview',
    description: 'Mostra próximas 5 ocorrências de uma expressão cron.',
    inputSchema: {
      type: 'object',
      required: ['expr'],
      properties: {
        expr: { type: 'string' },
        tz: { type: 'string' },
      },
    },
  },
];

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args = {} } = req.params;
  const a = args as Record<string, unknown>;

  const result = await (async () => {
    switch (name) {
      case 'list_groups':
        return client.listGroups(a.instance_name as string | undefined);
      case 'sync_groups':
        return client.syncGroups(a.instance_name as string, a.instance_token as string);
      case 'list_messages':
        return client.listMessages();
      case 'create_message':
        return client.createMessage(
          a.name as string,
          a.text as string | undefined,
          (a.media_ids as string[] | undefined) ?? [],
        );
      case 'list_schedules':
        return client.listSchedules();
      case 'schedule_send':
        return client.createSchedule({
          messageId: a.message_id,
          instanceName: a.instance_name,
          instanceToken: a.instance_token,
          groupRemoteIds: a.group_remote_ids,
          type: a.type,
          startAt: a.start_at,
          endAt: a.end_at,
          time: a.time,
          weekdays: a.weekdays,
          cron: a.cron,
          timezone: a.timezone,
        });
      case 'cancel_schedule':
        return client.cancelSchedule(a.schedule_id as string);
      case 'schedule_group_update':
        return client.createGroupUpdate({
          instanceName: a.instance_name,
          instanceToken: a.instance_token,
          groupRemoteId: a.group_remote_id,
          target: a.target,
          newName: a.new_name,
          newDescription: a.new_description,
          newPictureMediaId: a.new_picture_media_id,
          type: a.type,
          startAt: a.start_at,
          time: a.time,
          weekdays: a.weekdays,
          cron: a.cron,
          timezone: a.timezone,
        });
      case 'cron_preview':
        return client.cronPreview(a.expr as string, a.tz as string | undefined);
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  })();

  return {
    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
  };
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('MCP fatal:', err);
  process.exit(1);
});
