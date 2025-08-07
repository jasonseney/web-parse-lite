import { requestLogs, type RequestLog, type InsertRequestLog } from "@shared/schema";

export interface IStorage {
  logRequest(log: InsertRequestLog): Promise<RequestLog>;
  getRecentRequests(limit?: number): Promise<RequestLog[]>;
}

export class MemStorage implements IStorage {
  private requestLogs: Map<number, RequestLog>;
  private currentLogId: number;

  constructor() {
    this.requestLogs = new Map();
    this.currentLogId = 1;
  }

  async logRequest(insertLog: InsertRequestLog): Promise<RequestLog> {
    const id = this.currentLogId++;
    const log: RequestLog = { 
      ...insertLog, 
      id, 
      timestamp: new Date() 
    };
    this.requestLogs.set(id, log);
    return log;
  }

  async getRecentRequests(limit: number = 10): Promise<RequestLog[]> {
    const logs = Array.from(this.requestLogs.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
    return logs;
  }
}

export const storage = new MemStorage();
