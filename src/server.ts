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
      'Sincroniza grupos do WhatsApp via Zappfy pra dentro do banco. Usa defaults do tenant se não passar instância.',
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
      'Cria grupo via Zappfy com participantes iniciais. Por padrão promove TODOS os participantes da criação a admin.',
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
  {
    name: 'promote_group_participants',
    description: 'Promove participantes a admin do grupo.',
    inputSchema: {
      type: 'object',
      required: ['id', 'instance_token', 'participants'],
      properties: {
        id: { type: 'string' },
        instance_token: { type: 'string' },
        participants: { type: 'array', items: { type: 'string' } },
      },
    },
  },
  {
    name: 'demote_group_participants',
    description: 'Remove status de admin de participantes do grupo.',
    inputSchema: {
      type: 'object',
      required: ['id', 'instance_token', 'participants'],
      properties: {
        id: { type: 'string' },
        instance_token: { type: 'string' },
        participants: { type: 'array', items: { type: 'string' } },
      },
    },
  },
  {
    name: 'remove_group_participants',
    description: 'Remove participantes do grupo.',
    inputSchema: {
      type: 'object',
      required: ['id', 'instance_token', 'participants'],
      properties: {
        id: { type: 'string' },
        instance_token: { type: 'string' },
        participants: { type: 'array', items: { type: 'string' } },
      },
    },
  },
  {
    name: 'set_group_permissions',
    description:
      'Define permissoes do grupo. locked=true: so adm edita info. announce=true: so adm envia mensagem.',
    inputSchema: {
      type: 'object',
      required: ['id', 'instance_token'],
      properties: {
        id: { type: 'string' },
        instance_token: { type: 'string' },
        locked: { type: 'boolean' },
        announce: { type: 'boolean' },
      },
    },
  },
  {
    name: 'set_group_picture',
    description:
      'Atualiza foto do grupo. Aceita media_id (asset interno) OU data_uri (data:image/jpeg;base64,...) OU image_url (URL publica).',
    inputSchema: {
      type: 'object',
      required: ['id', 'instance_token'],
      properties: {
        id: { type: 'string' },
        instance_token: { type: 'string' },
        media_id: { type: 'string' },
        data_uri: { type: 'string' },
        image_url: { type: 'string' },
      },
    },
  },
  {
    name: 'bulk_create_groups',
    description:
      'Cria N grupos numerados sequencialmente (ex: name_template "🎁 #{N}", start_number=5, count=10 cria #5..#14). Aplica defaults do tenant (admins/desc/foto/permissoes) em cada grupo. Opcionalmente cria uma lista de grupos e/ou um shortlink ja com todos. Delays anti-ban entre grupos (default 8s).',
    inputSchema: {
      type: 'object',
      required: ['name_template', 'start_number', 'count'],
      properties: {
        name_template: {
          type: 'string',
          description: 'Template com {N} substituido pelo numero. Ex: "🎁 AULAO HOJE 20H! #{N}"',
        },
        start_number: { type: 'integer', minimum: 0 },
        count: { type: 'integer', minimum: 1, maximum: 50 },
        instance_name: { type: 'string' },
        instance_token: { type: 'string' },
        initial_participants: { type: 'array', items: { type: 'string' } },
        apply_defaults: { type: 'boolean', default: true },
        delay_ms: { type: 'integer', minimum: 1000, maximum: 60000 },
        also_create_list: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string' },
            color: { type: 'string', description: 'Hex color' },
          },
        },
        also_create_shortlink: {
          type: 'object',
          required: ['slug'],
          properties: {
            slug: { type: 'string' },
            notes: { type: 'string' },
            strategy: { type: 'string', enum: ['SEQUENTIAL', 'ROUND_ROBIN', 'RANDOM'] },
            hard_cap: { type: 'integer' },
            initial_click_budget: { type: 'integer' },
          },
        },
      },
    },
  },
  {
    name: 'bulk_apply_to_groups',
    description:
      'Aplica config (descricao/foto/permissoes/admins) em N grupos com delays anti-ban. Picture aceita media_id, data_uri ou url.',
    inputSchema: {
      type: 'object',
      required: ['instance_token', 'group_ids'],
      properties: {
        instance_token: { type: 'string' },
        group_ids: { type: 'array', items: { type: 'string' }, minItems: 1 },
        description: { type: 'string' },
        picture_media_id: { type: 'string' },
        picture_data_uri: { type: 'string' },
        picture_url: { type: 'string' },
        locked: { type: 'boolean' },
        announce: { type: 'boolean' },
        add_admins: { type: 'array', items: { type: 'string' } },
        delay_ms: { type: 'integer', minimum: 1000, maximum: 60000 },
      },
    },
  },
  {
    name: 'set_tenant_group_defaults',
    description:
      'Define defaults aplicados em todo grupo criado (front/api/mcp): admins, descricao, foto (media_id), locked, announce.',
    inputSchema: {
      type: 'object',
      properties: {
        default_group_admins: { type: 'array', items: { type: 'string' } },
        default_group_description: { type: 'string' },
        default_group_picture_media_id: { type: 'string' },
        default_group_locked: { type: 'boolean' },
        default_group_announce: { type: 'boolean' },
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
      'Cria shortlink (URL pública /g/:slug) que rotaciona entre N grupos. Quando um grupo lota (participantsCount >= hardCap), pula automaticamente pro próximo. Suporta auto-create (cria grupo novo via Zappfy quando todos lotam). Estratégias: SEQUENTIAL (enche um, vai pro próximo), ROUND_ROBIN (distribui), RANDOM.',
    inputSchema: {
      type: 'object',
      required: ['slug', 'group_ids'],
      properties: {
        slug: { type: 'string', description: 'ex: clientes-vip' },
        group_ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'IDs internos dos grupos (do banco, não remoteId)',
        },
        notes: { type: 'string' },
        strategy: { type: 'string', enum: ['SEQUENTIAL', 'ROUND_ROBIN', 'RANDOM'] },
        hard_cap: { type: 'number', description: 'Limite real do grupo (default 900, max 1024)' },
        initial_click_budget: {
          type: 'number',
          description: 'Cliques antes do 1º recheck via Zappfy (default 800)',
        },
        capacity_source: { type: 'string', enum: ['ZAPPFY', 'CLICK_COUNT'] },
        auto_create: { type: 'boolean' },
        auto_create_instance: { type: 'string' },
        auto_create_template: { type: 'string', description: 'ex: "Grupo {N}"' },
      },
    },
  },
  {
    name: 'update_shortlink',
    description: 'Atualiza configuração do shortlink (slug, strategy, caps, auto-create, ativo, etc).',
    inputSchema: {
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'string' },
        slug: { type: 'string' },
        notes: { type: 'string' },
        active: { type: 'boolean' },
        strategy: { type: 'string', enum: ['SEQUENTIAL', 'ROUND_ROBIN', 'RANDOM'] },
        hard_cap: { type: 'number' },
        initial_click_budget: { type: 'number' },
        capacity_source: { type: 'string', enum: ['ZAPPFY', 'CLICK_COUNT'] },
        auto_create: { type: 'boolean' },
        auto_create_instance: { type: 'string' },
        auto_create_template: { type: 'string' },
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
    name: 'add_groups_to_shortlink',
    description: 'Adiciona N grupos ao pool de rotação do shortlink (sem duplicar).',
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
    name: 'remove_shortlink_item',
    description: 'Remove um grupo específico (item) do shortlink.',
    inputSchema: {
      type: 'object',
      required: ['id', 'item_id'],
      properties: {
        id: { type: 'string' },
        item_id: { type: 'string' },
      },
    },
  },
  {
    name: 'reorder_shortlink_items',
    description: 'Reordena os items do shortlink (afeta strategy SEQUENTIAL).',
    inputSchema: {
      type: 'object',
      required: ['id', 'item_ids'],
      properties: {
        id: { type: 'string' },
        item_ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Nova ordem completa dos itemIds',
        },
      },
    },
  },
  {
    name: 'update_shortlink_item',
    description: 'Atualiza status (ACTIVE/FULL/INVALID/DISABLED) ou order de um item específico.',
    inputSchema: {
      type: 'object',
      required: ['id', 'item_id'],
      properties: {
        id: { type: 'string' },
        item_id: { type: 'string' },
        order: { type: 'number' },
        status: { type: 'string', enum: ['ACTIVE', 'FULL', 'INVALID', 'DISABLED'] },
      },
    },
  },
  {
    name: 'refresh_shortlink_invite',
    description: 'Força refresh do invite de um item específico via Zappfy /group/info.',
    inputSchema: {
      type: 'object',
      required: ['id', 'item_id'],
      properties: {
        id: { type: 'string' },
        item_id: { type: 'string' },
      },
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
      case 'promote_group_participants':
        return client.groupParticipantsAction(a.id, 'promote', {
          instanceToken: a.instance_token,
          participants: a.participants,
        });
      case 'demote_group_participants':
        return client.groupParticipantsAction(a.id, 'demote', {
          instanceToken: a.instance_token,
          participants: a.participants,
        });
      case 'remove_group_participants':
        return client.groupParticipantsAction(a.id, 'remove', {
          instanceToken: a.instance_token,
          participants: a.participants,
        });
      case 'set_group_permissions':
        return client.setGroupPermissions(a.id, {
          instanceToken: a.instance_token,
          locked: a.locked,
          announce: a.announce,
        });
      case 'set_group_picture':
        return client.setGroupPicture(a.id, {
          instanceToken: a.instance_token,
          mediaId: a.media_id,
          dataUri: a.data_uri,
          imageUrl: a.image_url,
        });
      case 'bulk_create_groups':
        return client.bulkCreateGroups({
          nameTemplate: a.name_template,
          startNumber: a.start_number,
          count: a.count,
          instanceName: a.instance_name,
          instanceToken: a.instance_token,
          initialParticipants: a.initial_participants,
          applyDefaults: a.apply_defaults,
          delayMs: a.delay_ms,
          alsoCreateList: a.also_create_list,
          alsoCreateShortlink: a.also_create_shortlink
            ? {
                slug: a.also_create_shortlink.slug,
                notes: a.also_create_shortlink.notes,
                strategy: a.also_create_shortlink.strategy,
                hardCap: a.also_create_shortlink.hard_cap,
                initialClickBudget: a.also_create_shortlink.initial_click_budget,
              }
            : undefined,
        });
      case 'bulk_apply_to_groups':
        return client.bulkApplyToGroups({
          instanceToken: a.instance_token,
          groupIds: a.group_ids,
          description: a.description,
          pictureMediaId: a.picture_media_id,
          pictureDataUri: a.picture_data_uri,
          pictureUrl: a.picture_url,
          locked: a.locked,
          announce: a.announce,
          addAdmins: a.add_admins,
          delayMs: a.delay_ms,
        });
      case 'set_tenant_group_defaults':
        return client.updateTenantGroupDefaults({
          defaultGroupAdmins: a.default_group_admins,
          defaultGroupDescription: a.default_group_description,
          defaultGroupPictureMediaId: a.default_group_picture_media_id,
          defaultGroupLocked: a.default_group_locked,
          defaultGroupAnnounce: a.default_group_announce,
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
          groupIds: a.group_ids,
          notes: a.notes,
          strategy: a.strategy,
          hardCap: a.hard_cap,
          initialClickBudget: a.initial_click_budget,
          capacitySource: a.capacity_source,
          autoCreate: a.auto_create,
          autoCreateInstance: a.auto_create_instance,
          autoCreateTemplate: a.auto_create_template,
        });
      case 'update_shortlink':
        return client.updateShortlink(a.id, {
          slug: a.slug,
          notes: a.notes,
          active: a.active,
          strategy: a.strategy,
          hardCap: a.hard_cap,
          initialClickBudget: a.initial_click_budget,
          capacitySource: a.capacity_source,
          autoCreate: a.auto_create,
          autoCreateInstance: a.auto_create_instance,
          autoCreateTemplate: a.auto_create_template,
        });
      case 'delete_shortlink': return client.deleteShortlink(a.id);
      case 'add_groups_to_shortlink':
        return client.addGroupsToShortlink(a.id, a.group_ids);
      case 'remove_shortlink_item':
        return client.removeShortlinkItem(a.id, a.item_id);
      case 'reorder_shortlink_items':
        return client.reorderShortlinkItems(a.id, a.item_ids);
      case 'update_shortlink_item':
        return client.updateShortlinkItem(a.id, a.item_id, {
          order: a.order,
          status: a.status,
        });
      case 'refresh_shortlink_invite':
        return client.refreshShortlinkInvite(a.id, a.item_id);

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
