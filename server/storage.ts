import Database from "@replit/database";
import { requestLogs, type RequestLog, type InsertRequestLog } from "@shared/schema";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_LOG_ENTRIES = 1000;

export interface IStorage {
  logRequest(log: InsertRequestLog): Promise<RequestLog>;
  getRecentRequests(limit?: number): Promise<RequestLog[]>;
}

export class ReplitDbStorage implements IStorage {
  private db: Database;
  private logPrefix = "log:";

  constructor() {
    this.db = new Database();
  }

  private logKey(timestamp: number): string {
    return `${this.logPrefix}${timestamp}`;
  }

  private timestampFromKey(key: string): number {
    return parseInt(key.replace(this.logPrefix, ""), 10);
  }

  async logRequest(insertLog: InsertRequestLog): Promise<RequestLog> {
    const timestamp = Date.now();
    const key = this.logKey(timestamp);
    const log: RequestLog = {
      id: timestamp,
      parseUrl: insertLog.parseUrl,
      selector: insertLog.selector,
      method: insertLog.method,
      extra: insertLog.extra || null,
      success: insertLog.success,
      responseLength: insertLog.responseLength || null,
      errorMessage: insertLog.errorMessage || null,
      timestamp: new Date(timestamp)
    };

    await this.db.set(key, log);

    this.pruneOldLogs().catch(() => {});

    return log;
  }

  async getRecentRequests(limit: number = 10): Promise<RequestLog[]> {
    try {
      const allKeysResponse = await this.db.list();
      const allKeys = allKeysResponse?.value || [];
      const logKeys = allKeys.filter((key: string) => key.startsWith(this.logPrefix));

      const logs: RequestLog[] = [];
      for (const key of logKeys) {
        try {
          const logData = await this.db.get(key);
          if (logData) {
            logs.push(logData.value);
          }
        } catch (error) {
          // Skip unreadable entries
        }
      }

      return logs
        .sort((a, b) => b.id - a.id)
        .slice(0, limit);
    } catch (error) {
      console.error("Error fetching recent requests:", error);
      return [];
    }
  }

  private async pruneOldLogs(): Promise<void> {
    try {
      const allKeysResponse = await this.db.list();
      const allKeys = allKeysResponse?.value || [];
      const logKeys = allKeys
        .filter((key: string) => key.startsWith(this.logPrefix))
        .sort();

      const cutoff = Date.now() - THIRTY_DAYS_MS;
      const keysToDelete: string[] = [];

      for (const key of logKeys) {
        const ts = this.timestampFromKey(key);
        if (ts < cutoff) {
          keysToDelete.push(key);
        }
      }

      const remaining = logKeys.length - keysToDelete.length;
      if (remaining > MAX_LOG_ENTRIES) {
        const excess = remaining - MAX_LOG_ENTRIES;
        const activeKeys = logKeys.filter(k => !keysToDelete.includes(k));
        const oldestActive = activeKeys.slice(0, excess);
        keysToDelete.push(...oldestActive);
      }

      for (const key of keysToDelete) {
        await this.db.delete(key);
      }
    } catch (error) {
      // Pruning is best-effort, don't break the main flow
    }
  }
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

    if (this.requestLogs.size > MAX_LOG_ENTRIES) {
      const oldest = Array.from(this.requestLogs.keys()).sort((a, b) => a - b);
      const toRemove = oldest.slice(0, this.requestLogs.size - MAX_LOG_ENTRIES);
      for (const key of toRemove) {
        this.requestLogs.delete(key);
      }
    }

    return log;
  }

  async getRecentRequests(limit: number = 10): Promise<RequestLog[]> {
    const cutoff = Date.now() - THIRTY_DAYS_MS;
    const logs = Array.from(this.requestLogs.values())
      .filter(log => log.timestamp.getTime() > cutoff)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
    return logs;
  }
}

export const storage = new ReplitDbStorage();
