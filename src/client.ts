import axios, { AxiosInstance } from 'axios';
import * as fs from 'node:fs';
import * as path from 'node:path';

export class ZappfyClient {
  private http: AxiosInstance;

  constructor() {
    const baseURL = process.env.ZAPPFY_API_URL ?? 'http://localhost:3000/api/v1';
    const apiKey = process.env.ZAPPFY_API_KEY;
    if (!apiKey) throw new Error('ZAPPFY_API_KEY env var is required');
    this.http = axios.create({
      baseURL,
      headers: { 'X-Api-Key': apiKey, 'Content-Type': 'application/json' },
      timeout: 60_000,
    });
  }

  // ---------- Tenant ----------
  async getTenant() {
    const { data } = await this.http.get('/tenant');
    return data;
  }
  async getTenantDefaults() {
    const { data } = await this.http.get('/tenant/defaults');
    return data;
  }
  async updateTenant(payload: Record<string, unknown>) {
    const { data } = await this.http.patch('/tenant', payload);
    return data;
  }

  // ---------- API Keys ----------
  async listApiKeys() {
    const { data } = await this.http.get('/api-keys');
    return data;
  }
  async createApiKey(name: string) {
    const { data } = await this.http.post('/api-keys', { name });
    return data;
  }
  async deleteApiKey(id: string) {
    const { data } = await this.http.delete(`/api-keys/${id}`);
    return data;
  }

  // ---------- Media ----------
  async listMedia() {
    const { data } = await this.http.get('/media');
    return data;
  }
  async getMedia(id: string) {
    const { data } = await this.http.get(`/media/${id}`);
    return data;
  }
  async uploadMedia(opts: { fileBase64?: string; filePath?: string; filename: string; mime: string }) {
    let buf: Buffer;
    if (opts.fileBase64) {
      buf = Buffer.from(opts.fileBase64.replace(/^data:[^;]+;base64,/, ''), 'base64');
    } else if (opts.filePath) {
      buf = fs.readFileSync(path.resolve(opts.filePath));
    } else {
      throw new Error('fileBase64 OR filePath required');
    }
    const fd = new FormData();
    const ab = new ArrayBuffer(buf.length);
    new Uint8Array(ab).set(buf);
    const blob = new Blob([ab], { type: opts.mime });
    fd.append('file', blob, opts.filename);
    const { data } = await this.http.post('/media', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  }
  async deleteMedia(id: string) {
    const { data } = await this.http.delete(`/media/${id}`);
    return data;
  }

  // ---------- Groups ----------
  async listGroups(instanceName?: string) {
    const { data } = await this.http.get('/groups', { params: { instanceName } });
    return data;
  }
  async getGroup(id: string) {
    const { data } = await this.http.get(`/groups/${id}`);
    return data;
  }
  async syncGroups(instanceName?: string, instanceToken?: string) {
    const { data } = await this.http.post('/groups/sync', { instanceName, instanceToken });
    return data;
  }
  async createGroup(payload: {
    name: string;
    participants: string[];
    instanceName?: string;
    instanceToken?: string;
  }) {
    const { data } = await this.http.post('/groups', payload);
    return data;
  }
  async updateGroup(id: string, payload: {
    instanceToken: string;
    name?: string;
    description?: string;
    pictureMediaId?: string;
  }) {
    const { data } = await this.http.patch(`/groups/${id}`, payload);
    return data;
  }
  async addGroupParticipants(id: string, payload: {
    instanceToken: string;
    participants: string[];
    asAdmin?: boolean;
  }) {
    const { data } = await this.http.post(`/groups/${id}/participants`, payload);
    return data;
  }

  // ---------- Group Lists (segmentação) ----------
  async listGroupLists() {
    const { data } = await this.http.get('/group-lists');
    return data;
  }
  async getGroupList(id: string) {
    const { data } = await this.http.get(`/group-lists/${id}`);
    return data;
  }
  async createGroupList(payload: { name: string; color?: string; description?: string }) {
    const { data } = await this.http.post('/group-lists', payload);
    return data;
  }
  async updateGroupList(id: string, payload: Record<string, unknown>) {
    const { data } = await this.http.patch(`/group-lists/${id}`, payload);
    return data;
  }
  async deleteGroupList(id: string) {
    const { data } = await this.http.delete(`/group-lists/${id}`);
    return data;
  }
  async addGroupsToList(id: string, groupIds: string[]) {
    const { data } = await this.http.post(`/group-lists/${id}/groups`, { groupIds });
    return data;
  }
  async removeGroupsFromList(id: string, groupIds: string[]) {
    const { data } = await this.http.delete(`/group-lists/${id}/groups`, { data: { groupIds } });
    return data;
  }

  // ---------- Messages ----------
  async listMessages() {
    const { data } = await this.http.get('/messages');
    return data;
  }
  async getMessage(id: string) {
    const { data } = await this.http.get(`/messages/${id}`);
    return data;
  }
  async createMessage(payload: {
    name: string;
    text?: string;
    mentionAll?: boolean;
    mediaIds?: string[];
    pollChoices?: string[];
    pollSelectableCount?: number;
  }) {
    const medias = (payload.mediaIds ?? []).map((mediaId, order) => ({ mediaId, order }));
    const { data } = await this.http.post('/messages', {
      name: payload.name,
      text: payload.text,
      mentionAll: payload.mentionAll,
      medias,
      pollChoices: payload.pollChoices,
      pollSelectableCount: payload.pollSelectableCount,
    });
    return data;
  }
  async updateMessage(id: string, payload: {
    name?: string;
    text?: string;
    mentionAll?: boolean;
    mediaIds?: string[];
    pollChoices?: string[];
    pollSelectableCount?: number;
  }) {
    const body: Record<string, unknown> = { ...payload };
    if (payload.mediaIds !== undefined) {
      body.medias = payload.mediaIds.map((mediaId, order) => ({ mediaId, order }));
      delete body.mediaIds;
    }
    const { data } = await this.http.patch(`/messages/${id}`, body);
    return data;
  }
  async deleteMessage(id: string) {
    const { data } = await this.http.delete(`/messages/${id}`);
    return data;
  }
  async messageActiveSchedules(id: string) {
    const { data } = await this.http.get(`/messages/${id}/active-schedules`);
    return data;
  }
  async sendMessageNow(id: string, payload: {
    instanceName?: string;
    instanceToken?: string;
    groupRemoteIds?: string[];
    groupListIds?: string[];
  }) {
    const { data } = await this.http.post(`/messages/${id}/send-now`, payload);
    return data;
  }

  // ---------- Schedules ----------
  async listSchedules() {
    const { data } = await this.http.get('/schedules');
    return data;
  }
  async getSchedule(id: string) {
    const { data } = await this.http.get(`/schedules/${id}`);
    return data;
  }
  async createSchedule(payload: Record<string, unknown>) {
    const { data } = await this.http.post('/schedules', payload);
    return data;
  }
  async updateSchedule(id: string, payload: Record<string, unknown>) {
    const { data } = await this.http.patch(`/schedules/${id}`, payload);
    return data;
  }
  async pauseSchedule(id: string) {
    return this.updateSchedule(id, { action: 'pause' });
  }
  async resumeSchedule(id: string) {
    return this.updateSchedule(id, { action: 'resume' });
  }
  async cancelSchedule(id: string) {
    return this.updateSchedule(id, { action: 'cancel' });
  }
  async deleteSchedule(id: string) {
    const { data } = await this.http.delete(`/schedules/${id}`);
    return data;
  }
  async listScheduleExecutions(id: string) {
    const { data } = await this.http.get(`/schedules/${id}/executions`);
    return data;
  }

  // ---------- Group Update Schedules ----------
  async listGroupUpdateSchedules() {
    const { data } = await this.http.get('/group-update-schedules');
    return data;
  }
  async getGroupUpdateSchedule(id: string) {
    const { data } = await this.http.get(`/group-update-schedules/${id}`);
    return data;
  }
  async createGroupUpdate(payload: Record<string, unknown>) {
    const { data } = await this.http.post('/group-update-schedules', payload);
    return data;
  }
  async updateGroupUpdateSchedule(id: string, payload: Record<string, unknown>) {
    const { data } = await this.http.patch(`/group-update-schedules/${id}`, payload);
    return data;
  }
  async cancelGroupUpdate(id: string) {
    return this.updateGroupUpdateSchedule(id, { action: 'cancel' });
  }
  async deleteGroupUpdateSchedule(id: string) {
    const { data } = await this.http.delete(`/group-update-schedules/${id}`);
    return data;
  }
  async runGroupUpdateNow(payload: Record<string, unknown>) {
    const { data } = await this.http.post('/group-update-schedules/run-now', payload);
    return data;
  }

  // ---------- Shortlinks ----------
  async listShortlinks() {
    const { data } = await this.http.get('/shortlinks');
    return data;
  }
  async getShortlink(id: string) {
    const { data } = await this.http.get(`/shortlinks/${id}`);
    return data;
  }
  async createShortlink(payload: {
    slug: string;
    groupIds: string[];
    notes?: string;
    strategy?: 'SEQUENTIAL' | 'ROUND_ROBIN' | 'RANDOM';
    hardCap?: number;
    initialClickBudget?: number;
    capacitySource?: 'UAZAPI' | 'CLICK_COUNT';
    autoCreate?: boolean;
    autoCreateInstance?: string;
    autoCreateTemplate?: string;
  }) {
    const { data } = await this.http.post('/shortlinks', payload);
    return data;
  }
  async updateShortlink(id: string, payload: Record<string, unknown>) {
    const { data } = await this.http.patch(`/shortlinks/${id}`, payload);
    return data;
  }
  async deleteShortlink(id: string) {
    const { data } = await this.http.delete(`/shortlinks/${id}`);
    return data;
  }
  async addGroupsToShortlink(id: string, groupIds: string[]) {
    const { data } = await this.http.post(`/shortlinks/${id}/items`, { groupIds });
    return data;
  }
  async removeShortlinkItem(id: string, itemId: string) {
    const { data } = await this.http.delete(`/shortlinks/${id}/items/${itemId}`);
    return data;
  }
  async reorderShortlinkItems(id: string, itemIds: string[]) {
    const { data } = await this.http.post(`/shortlinks/${id}/items/reorder`, { itemIds });
    return data;
  }
  async updateShortlinkItem(
    id: string,
    itemId: string,
    payload: { order?: number; status?: 'ACTIVE' | 'FULL' | 'INVALID' | 'DISABLED' },
  ) {
    const { data } = await this.http.patch(`/shortlinks/${id}/items/${itemId}`, payload);
    return data;
  }
  async refreshShortlinkInvite(id: string, itemId: string) {
    const { data } = await this.http.post(`/shortlinks/${id}/items/${itemId}/refresh`);
    return data;
  }

  // ---------- Calendar ----------
  async calendarEvents(params: { from?: string; to?: string }) {
    const { data } = await this.http.get('/calendar/events', { params });
    return data;
  }

  // ---------- Executions ----------
  async listExecutions(params: { scheduleId?: string; status?: string; from?: string; to?: string }) {
    const { data } = await this.http.get('/executions', { params });
    return data;
  }

  // ---------- Cron ----------
  async cronPreview(expr: string, tz?: string) {
    const { data } = await this.http.get('/cron/preview', { params: { expr, tz } });
    return data;
  }
}
