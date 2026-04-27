#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { ZappfyClient } from './client';

const client = new ZappfyClient();

const server = new Server(
  { name: 'zappfy-disparos', version: '0.2.0' },
  { capabilities: { tools: {} } },
);

const SCHEDULE_TYPE_ENUM = { type: 'string', enum: ['ONCE', 'DAILY', 'WEEKLY', 'CUSTOM_CRON'] } as const;

const tools = [
  // ============ TENANT ============
  {
    name: 'get_tenant',
    description: 'Retorna dados do tenant (workspace) atual.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_tenant_defaults',
    description: 'Retorna defaults do tenant (instância padrão, participantes default).',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'update_tenant',
    description:
      'Atualiza dados do tenant: nome, timezone, instância padrão, participantes default, webhook de falha.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        timezone: { type: 'string' },
        defaultInstanceName: { type: ['string', 'null'] },
        defaultInstanceToken: { type: ['string', 'null'] },
        defaultParticipants: { type: 'array', items: { type: 'string' } },
        failureWebhookUrl: { type: ['string', 'null'] },
      },
    },
  },

  // ============ API KEYS ============
  {
    name: 'list_api_keys',
    description: 'Lista API keys do tenant.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'create_api_key',
    description: 'Cria nova API key. Retorna o token em texto plano só uma vez.',
    inputSchema: {
      type: 'object',
      required: ['name'],
      properties: { name: { type: 'string' } },
    },
  },
  {
    name: 'delete_api_key',
    description: 'Remove API key.',
    inputSchema: {
      type: 'object',
      required: ['id'],
      properties: { id: { type: 'string' } },
    },
  },

  // ============ MEDIA ============
  {
    name: 'list_media',
    description: 'Lista assets de mídia do tenant.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_media',
    description: 'Retorna metadados de uma mídia.',
    inputSchema: {
      type: 'object',
      required: ['id'],
      properties: { id: { type: 'string' } },
    },
  },
  {
    name: 'upload_media',
    description:
      'Faz upload de mídia (imagem, vídeo, áudio, documento). Use file_path (caminho local) OU file_base64 (data URI ou base64 puro).',
    inputSchema: {
      type: 'object',
      required: ['filename', 'mime'],
      properties: {
        file_path: { type: 'string', description: 'Caminho absoluto do arquivo no servidor' },
        file_base64: { type: 'string', description: 'Conteúdo em base64' },
        filename: { type: 'string' },
        mime: { type: 'string', description: 'ex: image/png, video/mp4, audio/mpeg, application/pdf' },
      },
    },
  },
  {
    name: 'delete_media',
    description: 'Remove asset de mídia.',
    inputSchema: {
      type: 'object',
      required: ['id'],
      properties: { id: { type: 'string' } },
    },
  },

  // ============ GROUPS ============
  {
    name: 'list_groups',
    description: 'Lista grupos sincronizados (cache local).',
    inputSchema: {
      type: 'object',
      properties: { instance_name: { type: 'string' } },
    },
  },
  {
    name: 'get_group',
    description: 'Retorna um grupo pelo ID local.',
    inputSchema: {
      type: 'object',
      required: ['id'],
      properties: { id: { type: 'string' } },
    },
  },
  {
    name: 'sync_groups',
    description:
      'Sincroniza grupos do WhatsApp via Uazapi pra dentro do banco. Usa defaults do tenant se não passar instância.',
    inputSchema: {
      type: 'object',
      properties: {
        instance_name: { type: 'string' },
        instance_token: { type: 'string' },
      },
    },
  },
  {
    name: 'create_group',
    description:
      'Cria grupo via Uazapi com participantes iniciais. Por padrão promove TODOS os participantes da criação a admin.',
    inputSchema: {
      type: 'object',
      required: ['name', 'participants'],
      properties: {
        name: { type: 'string' },
        participants: { type: 'array', items: { type: 'string' }, description: 'Telefones em formato internacional sem +' },
        instance_name: { type: 'string' },
        instance_token: { type: 'string' },
      },
    },
  },
  {
    name: 'update_group',
    description:
      'Atualiza nome/descrição/foto de um grupo no WhatsApp imediatamente. Pra agendar, use schedule_group_update.',
    inputSchema: {
      type: 'object',
      required: ['id', 'instance_token'],
      properties: {
        id: { type: 'string' },
        instance_token: { type: 'string' },
        name: { type: 'string' },
        description: { type: 'string' },
        picture_media_id: { type: 'string' },
      },
    },
  },
  {
    name: 'add_group_participants',
    description:
      'Adiciona participantes a um grupo. Por padrão (as_admin: true) promove os adicionados a admin.',
    inputSchema: {
      type: 'object',
      required: ['id', 'instance_token', 'participants'],
      properties: {
        id: { type: 'string' },
        instance_token: { type: 'string' },
        participants: { type: 'array', items: { type: 'string' } },
        as_admin: { type: 'boolean', default: true },
      },
    },
  },

  // ============ GROUP LISTS (segmentação) ============
  {
    name: 'list_group_lists',
    description: 'Lista segmentações (group lists) do tenant.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_group_list',
    description: 'Retorna uma segmentação com seus membros.',
    inputSchema: {
      type: 'object',
      required: ['id'],
      properties: { id: { type: 'string' } },
    },
  },
  {
    name: 'create_group_list',
    description: 'Cria uma nova segmentação (lista nomeada de grupos pra disparo em massa).',
    inputSchema: {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string' },
        color: { type: 'string', description: 'Hex color, ex: #3b82f6' },
        description: { type: 'string' },
      },
    },
  },
  {
    name: 'update_group_list',
    description: 'Atualiza nome/cor/descrição da segmentação.',
    inputSchema: {
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        color: { type: 'string' },
        description: { type: 'string' },
      },
    },
  },
  {
    name: 'delete_group_list',
    description: 'Remove uma segmentação.',
    inputSchema: {
      type: 'object',
      required: ['id'],
      properties: { id: { type: 'string' } },
    },
  },
  {
    name: 'add_groups_to_list',
    description: 'Adiciona um ou mais grupos a uma segmentação.',
    inputSchema: {
      type: 'object',
      required: ['id', 'group_ids'],
      properties: {
        id: { type: 'string' },
        group_ids: { type: 'array', items: { type: 'string' } },
      },
    },
  },
  {
    name: 'remove_groups_from_list',
    description: 'Remove um ou mais grupos de uma segmentação.',
    inputSchema: {
      type: 'object',
      required: ['id', 'group_ids'],
      properties: {
        id: { type: 'string' },
        group_ids: { type: 'array', items: { type: 'string' } },
      },
    },
  },

  // ============ MESSAGES ============
  {
    name: 'list_messages',
    description: 'Lista templates de mensagem.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_message',
    description: 'Retorna uma mensagem pelo ID.',
    inputSchema: {
      type: 'object',
      required: ['id'],
      properties: { id: { type: 'string' } },
    },
  },
  {
    name: 'create_message',
    description:
      'Cria template de mensagem. Pode ter texto, mídias (media_ids), enquete (poll_choices) ou combinação. mention_all default true.',
    inputSchema: {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string' },
        text: { type: 'string' },
        mention_all: { type: 'boolean', default: true },
        media_ids: { type: 'array', items: { type: 'string' } },
        poll_choices: {
          type: 'array',
          items: { type: 'string' },
          description: 'Se preenchido (min 2), a mensagem vira enquete. text = pergunta',
        },
        poll_selectable_count: { type: 'integer', minimum: 1, default: 1 },
      },
    },
  },
  {
    name: 'update_message',
    description: 'Atualiza template de mensagem.',
    inputSchema: {
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        text: { type: 'string' },
        mention_all: { type: 'boolean' },
        media_ids: { type: 'array', items: { type: 'string' } },
        poll_choices: { type: 'array', items: { type: 'string' } },
        poll_selectable_count: { type: 'integer', minimum: 1 },
      },
    },
  },
  {
    name: 'delete_message',
    description: 'Remove template de mensagem.',
    inputSchema: {
      type: 'object',
      required: ['id'],
      properties: { id: { type: 'string' } },
    },
  },
  {
    name: 'message_active_schedules',
    description: 'Lista schedules ativos/pausados de uma mensagem.',
    inputSchema: {
      type: 'object',
      required: ['id'],
      properties: { id: { type: 'string' } },
    },
  },
  {
    name: 'send_message_now',
    description:
      'Dispara mensagem imediatamente (cria schedule ONCE com startAt=agora). Pode usar group_remote_ids E/OU group_list_ids.',
    inputSchema: {
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'string', description: 'ID da mensagem' },
        instance_name: { type: 'string' },
        instance_token: { type: 'string' },
        group_remote_ids: { type: 'array', items: { type: 'string' } },
        group_list_ids: { type: 'array', items: { type: 'string' } },
      },
    },
  },

  // ============ SCHEDULES ============
  {
    name: 'list_schedules',
    description: 'Lista todos os agendamentos do tenant.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_schedule',
    description: 'Retorna um schedule pelo ID.',
    inputSchema: {
      type: 'object',
      required: ['id'],
      properties: { id: { type: 'string' } },
    },
  },
  {
    name: 'schedule_send',
    description:
      'Cria agendamento de disparo. ONCE usa start_at. DAILY/WEEKLY usam time (HH:MM) e weekdays (0-6). CUSTOM_CRON usa cron string. Aceita group_remote_ids E/OU group_list_ids.',
    inputSchema: {
      type: 'object',
      required: ['message_id', 'type', 'start_at'],
      properties: {
        message_id: { type: 'string' },
        instance_name: { type: 'string' },
        instance_token: { type: 'string' },
        group_remote_ids: { type: 'array', items: { type: 'string' } },
        group_list_ids: { type: 'array', items: { type: 'string' } },
        type: SCHEDULE_TYPE_ENUM,
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
    name: 'update_schedule',
    description:
      'Reagenda/edita um schedule. Aceita os mesmos campos de schedule_send (start_at, type, group_remote_ids, etc).',
    inputSchema: {
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'string' },
        message_id: { type: 'string' },
        instance_name: { type: 'string' },
        instance_token: { type: 'string' },
        group_remote_ids: { type: 'array', items: { type: 'string' } },
        group_list_ids: { type: 'array', items: { type: 'string' } },
        type: SCHEDULE_TYPE_ENUM,
        start_at: { type: 'string' },
        time: { type: 'string' },
        weekdays: { type: 'array', items: { type: 'integer' } },
        cron: { type: 'string' },
        timezone: { type: 'string' },
        end_at: { type: ['string', 'null'] },
      },
    },
  },
  {
    name: 'pause_schedule',
    description: 'Pausa um schedule recorrente.',
    inputSchema: {
      type: 'object',
      required: ['id'],
      properties: { id: { type: 'string' } },
    },
  },
  {
    name: 'resume_schedule',
    description: 'Resume um schedule pausado.',
    inputSchema: {
      type: 'object',
      required: ['id'],
      properties: { id: { type: 'string' } },
    },
  },
  {
    name: 'cancel_schedule',
    description: 'Cancela um agendamento (status -> CANCELED).',
    inputSchema: {
      type: 'object',
      required: ['id'],
      properties: { id: { type: 'string' } },
    },
  },
  {
    name: 'delete_schedule',
    description: 'Apaga um schedule (e suas execuções).',
    inputSchema: {
      type: 'object',
      required: ['id'],
      properties: { id: { type: 'string' } },
    },
  },
  {
    name: 'list_schedule_executions',
    description: 'Lista execuções (envios efetivos) de um schedule.',
    inputSchema: {
      type: 'object',
      required: ['id'],
      properties: { id: { type: 'string' } },
    },
  },

  // ============ GROUP UPDATE SCHEDULES ============
  {
    name: 'list_group_update_schedules',
    description: 'Lista agendamentos de atualização de grupo (nome/desc/foto).',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_group_update_schedule',
    description: 'Retorna um group-update-schedule pelo ID.',
    inputSchema: {
      type: 'object',
      required: ['id'],
      properties: { id: { type: 'string' } },
    },
  },
  {
    name: 'schedule_group_update',
    description:
      'Agenda atualização de NAME/DESCRIPTION/PICTURE de um grupo. PICTURE precisa de new_picture_media_id (suba antes via upload_media).',
    inputSchema: {
      type: 'object',
      required: ['group_remote_id', 'target', 'type', 'start_at'],
      properties: {
        instance_name: { type: 'string' },
        instance_token: { type: 'string' },
        group_remote_id: { type: 'string' },
        target: { type: 'string', enum: ['NAME', 'DESCRIPTION', 'PICTURE'] },
        new_name: { type: 'string' },
        new_description: { type: 'string' },
        new_picture_media_id: { type: 'string' },
        type: SCHEDULE_TYPE_ENUM,
        start_at: { type: 'string' },
        time: { type: 'string' },
        weekdays: { type: 'array', items: { type: 'integer' } },
        cron: { type: 'string' },
        timezone: { type: 'string' },
      },
    },
  },
  {
    name: 'update_group_update_schedule',
    description: 'Edita um group-update-schedule (mesmos campos do create).',
    inputSchema: {
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'string' },
        new_name: { type: 'string' },
        new_description: { type: 'string' },
        new_picture_media_id: { type: 'string' },
        start_at: { type: 'string' },
        time: { type: 'string' },
        weekdays: { type: 'array', items: { type: 'integer' } },
        cron: { type: 'string' },
        type: SCHEDULE_TYPE_ENUM,
      },
    },
  },
  {
    name: 'cancel_group_update_schedule',
    description: 'Cancela um group-update-schedule.',
    inputSchema: {
      type: 'object',
      required: ['id'],
      properties: { id: { type: 'string' } },
    },
  },
  {
    name: 'delete_group_update_schedule',
    description: 'Apaga um group-update-schedule.',
    inputSchema: {
      type: 'object',
      required: ['id'],
      properties: { id: { type: 'string' } },
    },
  },
  {
    name: 'run_group_update_now',
    description: 'Executa agora um update de grupo sem agendar (one-shot imediato).',
    inputSchema: {
      type: 'object',
      required: ['group_remote_id', 'target'],
      properties: {
        instance_name: { type: 'string' },
        instance_token: { type: 'string' },
        group_remote_id: { type: 'string' },
        target: { type: 'string', enum: ['NAME', 'DESCRIPTION', 'PICTURE'] },
        new_name: { type: 'string' },
        new_description: { type: 'string' },
        new_picture_media_id: { type: 'string' },
      },
    },
  },

  // ============ SHORTLINKS ============
  {
    name: 'list_shortlinks',
    description: 'Lista shortlinks de convite de grupos.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_shortlink',
    description: 'Retorna um shortlink pelo ID.',
    inputSchema: {
      type: 'object',
      required: ['id'],
      properties: { id: { type: 'string' } },
    },
  },
  {
    name: 'create_shortlink',
    description:
      'Cria shortlink fixo pra invite de um grupo (URL pública /g/:slug que sempre redireciona pro convite atual, com refresh on-demand TTL 10min).',
    inputSchema: {
      type: 'object',
      required: ['slug', 'group_remote_id'],
      properties: {
        slug: { type: 'string', description: 'ex: clientes-vip' },
        group_remote_id: { type: 'string' },
        instance_name: { type: 'string' },
        instance_token: { type: 'string' },
      },
    },
  },
  {
    name: 'update_shortlink',
    description: 'Atualiza slug ou grupo de destino do shortlink.',
    inputSchema: {
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'string' },
        slug: { type: 'string' },
        groupRemoteId: { type: 'string' },
      },
    },
  },
  {
    name: 'delete_shortlink',
    description: 'Remove shortlink.',
    inputSchema: {
      type: 'object',
      required: ['id'],
      properties: { id: { type: 'string' } },
    },
  },
  {
    name: 'refresh_shortlink',
    description: 'Força refresh do invite link cacheado (chama Uazapi /group/info).',
    inputSchema: {
      type: 'object',
      required: ['id'],
      properties: { id: { type: 'string' } },
    },
  },

  // ============ CALENDAR ============
  {
    name: 'calendar_events',
    description:
      'Lista eventos do calendário (schedules + group updates) num intervalo. Retorna array com tipo, hora, schedule_id.',
    inputSchema: {
      type: 'object',
      properties: {
        from: { type: 'string', description: 'ISO 8601' },
        to: { type: 'string', description: 'ISO 8601' },
      },
    },
  },

  // ============ EXECUTIONS ============
  {
    name: 'list_executions',
    description:
      'Lista execuções (envios efetivos) com filtros opcionais por schedule, status (SUCCESS/FAILED), e janela de tempo.',
    inputSchema: {
      type: 'object',
      properties: {
        schedule_id: { type: 'string' },
        status: { type: 'string', enum: ['SUCCESS', 'FAILED'] },
        from: { type: 'string' },
        to: { type: 'string' },
      },
    },
  },

  // ============ CRON ============
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
  const a = args as Record<string, any>;

  const result = await (async () => {
    switch (name) {
      // tenant
      case 'get_tenant': return client.getTenant();
      case 'get_tenant_defaults': return client.getTenantDefaults();
      case 'update_tenant': return client.updateTenant(a);

      // api keys
      case 'list_api_keys': return client.listApiKeys();
      case 'create_api_key': return client.createApiKey(a.name);
      case 'delete_api_key': return client.deleteApiKey(a.id);

      // media
      case 'list_media': return client.listMedia();
      case 'get_media': return client.getMedia(a.id);
      case 'upload_media':
        return client.uploadMedia({
          fileBase64: a.file_base64,
          filePath: a.file_path,
          filename: a.filename,
          mime: a.mime,
        });
      case 'delete_media': return client.deleteMedia(a.id);

      // groups
      case 'list_groups': return client.listGroups(a.instance_name);
      case 'get_group': return client.getGroup(a.id);
      case 'sync_groups': return client.syncGroups(a.instance_name, a.instance_token);
      case 'create_group':
        return client.createGroup({
          name: a.name,
          participants: a.participants,
          instanceName: a.instance_name,
          instanceToken: a.instance_token,
        });
      case 'update_group':
        return client.updateGroup(a.id, {
          instanceToken: a.instance_token,
          name: a.name,
          description: a.description,
          pictureMediaId: a.picture_media_id,
        });
      case 'add_group_participants':
        return client.addGroupParticipants(a.id, {
          instanceToken: a.instance_token,
          participants: a.participants,
          asAdmin: a.as_admin,
        });

      // group lists
      case 'list_group_lists': return client.listGroupLists();
      case 'get_group_list': return client.getGroupList(a.id);
      case 'create_group_list':
        return client.createGroupList({ name: a.name, color: a.color, description: a.description });
      case 'update_group_list': return client.updateGroupList(a.id, a);
      case 'delete_group_list': return client.deleteGroupList(a.id);
      case 'add_groups_to_list': return client.addGroupsToList(a.id, a.group_ids);
      case 'remove_groups_from_list': return client.removeGroupsFromList(a.id, a.group_ids);

      // messages
      case 'list_messages': return client.listMessages();
      case 'get_message': return client.getMessage(a.id);
      case 'create_message':
        return client.createMessage({
          name: a.name,
          text: a.text,
          mentionAll: a.mention_all,
          mediaIds: a.media_ids,
          pollChoices: a.poll_choices,
          pollSelectableCount: a.poll_selectable_count,
        });
      case 'update_message':
        return client.updateMessage(a.id, {
          name: a.name,
          text: a.text,
          mentionAll: a.mention_all,
          mediaIds: a.media_ids,
          pollChoices: a.poll_choices,
          pollSelectableCount: a.poll_selectable_count,
        });
      case 'delete_message': return client.deleteMessage(a.id);
      case 'message_active_schedules': return client.messageActiveSchedules(a.id);
      case 'send_message_now':
        return client.sendMessageNow(a.id, {
          instanceName: a.instance_name,
          instanceToken: a.instance_token,
          groupRemoteIds: a.group_remote_ids,
          groupListIds: a.group_list_ids,
        });

      // schedules
      case 'list_schedules': return client.listSchedules();
      case 'get_schedule': return client.getSchedule(a.id);
      case 'schedule_send':
        return client.createSchedule({
          messageId: a.message_id,
          instanceName: a.instance_name,
          instanceToken: a.instance_token,
          groupRemoteIds: a.group_remote_ids,
          groupListIds: a.group_list_ids,
          type: a.type,
          startAt: a.start_at,
          endAt: a.end_at,
          time: a.time,
          weekdays: a.weekdays,
          cron: a.cron,
          timezone: a.timezone,
        });
      case 'update_schedule':
        return client.updateSchedule(a.id, {
          messageId: a.message_id,
          instanceName: a.instance_name,
          instanceToken: a.instance_token,
          groupRemoteIds: a.group_remote_ids,
          groupListIds: a.group_list_ids,
          type: a.type,
          startAt: a.start_at,
          endAt: a.end_at,
          time: a.time,
          weekdays: a.weekdays,
          cron: a.cron,
          timezone: a.timezone,
        });
      case 'pause_schedule': return client.pauseSchedule(a.id);
      case 'resume_schedule': return client.resumeSchedule(a.id);
      case 'cancel_schedule': return client.cancelSchedule(a.id ?? a.schedule_id);
      case 'delete_schedule': return client.deleteSchedule(a.id);
      case 'list_schedule_executions': return client.listScheduleExecutions(a.id);

      // group update schedules
      case 'list_group_update_schedules': return client.listGroupUpdateSchedules();
      case 'get_group_update_schedule': return client.getGroupUpdateSchedule(a.id);
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
      case 'update_group_update_schedule':
        return client.updateGroupUpdateSchedule(a.id, {
          newName: a.new_name,
          newDescription: a.new_description,
          newPictureMediaId: a.new_picture_media_id,
          startAt: a.start_at,
          time: a.time,
          weekdays: a.weekdays,
          cron: a.cron,
          type: a.type,
        });
      case 'cancel_group_update_schedule': return client.cancelGroupUpdate(a.id);
      case 'delete_group_update_schedule': return client.deleteGroupUpdateSchedule(a.id);
      case 'run_group_update_now':
        return client.runGroupUpdateNow({
          instanceName: a.instance_name,
          instanceToken: a.instance_token,
          groupRemoteId: a.group_remote_id,
          target: a.target,
          newName: a.new_name,
          newDescription: a.new_description,
          newPictureMediaId: a.new_picture_media_id,
        });

      // shortlinks
      case 'list_shortlinks': return client.listShortlinks();
      case 'get_shortlink': return client.getShortlink(a.id);
      case 'create_shortlink':
        return client.createShortlink({
          slug: a.slug,
          groupRemoteId: a.group_remote_id,
          instanceName: a.instance_name,
          instanceToken: a.instance_token,
        });
      case 'update_shortlink': return client.updateShortlink(a.id, a);
      case 'delete_shortlink': return client.deleteShortlink(a.id);
      case 'refresh_shortlink': return client.refreshShortlink(a.id);

      // calendar
      case 'calendar_events': return client.calendarEvents({ from: a.from, to: a.to });

      // executions
      case 'list_executions':
        return client.listExecutions({
          scheduleId: a.schedule_id,
          status: a.status,
          from: a.from,
          to: a.to,
        });

      // cron
      case 'cron_preview': return client.cronPreview(a.expr, a.tz);

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
