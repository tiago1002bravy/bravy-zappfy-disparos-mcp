import axios, { AxiosInstance } from 'axios';

export class ZappfyClient {
  private http: AxiosInstance;

  constructor() {
    const baseURL = process.env.ZAPPFY_API_URL ?? 'http://localhost:3000/api/v1';
    const apiKey = process.env.ZAPPFY_API_KEY;
    if (!apiKey) throw new Error('ZAPPFY_API_KEY env var is required');
    this.http = axios.create({
      baseURL,
      headers: { 'X-Api-Key': apiKey, 'Content-Type': 'application/json' },
      timeout: 30_000,
    });
  }

  async listGroups(instanceName?: string) {
    const { data } = await this.http.get('/groups', { params: { instanceName } });
    return data;
  }

  async syncGroups(instanceName: string, instanceToken: string) {
    const { data } = await this.http.post('/groups/sync', { instanceName, instanceToken });
    return data;
  }

  async listMessages() {
    const { data } = await this.http.get('/messages');
    return data;
  }

  async createMessage(name: string, text?: string, mediaIds: string[] = []) {
    const medias = mediaIds.map((mediaId, order) => ({ mediaId, order }));
    const { data } = await this.http.post('/messages', { name, text, medias });
    return data;
  }

  async listSchedules() {
    const { data } = await this.http.get('/schedules');
    return data;
  }

  async createSchedule(payload: Record<string, unknown>) {
    const { data } = await this.http.post('/schedules', payload);
    return data;
  }

  async cancelSchedule(id: string) {
    const { data } = await this.http.patch(`/schedules/${id}`, { action: 'cancel' });
    return data;
  }

  async createGroupUpdate(payload: Record<string, unknown>) {
    const { data } = await this.http.post('/group-update-schedules', payload);
    return data;
  }

  async cronPreview(expr: string, tz?: string) {
    const { data } = await this.http.get('/cron/preview', { params: { expr, tz } });
    return data;
  }
}
