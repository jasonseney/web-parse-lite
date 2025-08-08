import Database from "@replit/database";
import { requestLogs, type RequestLog, type InsertRequestLog } from "@shared/schema";

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

  async logRequest(insertLog: InsertRequestLog): Promise<RequestLog> {
    const timestamp = Date.now();
    const key = this.logKey(timestamp);
    const log: RequestLog = { 
      id: timestamp, // Use timestamp as ID for simplicity
      parseUrl: insertLog.parseUrl,
      selector: insertLog.selector,
      method: insertLog.method,
      extra: insertLog.extra || null,
      success: insertLog.success,
      responseLength: insertLog.responseLength || null,
      errorMessage: insertLog.errorMessage || null,
      timestamp: new Date(timestamp)
    };

    console.log(`Storing log with key: ${key}`, log);
    await this.db.set(key, log);
    console.log(`Successfully stored log with key: ${key}`);
    return log;
  }

  async getRecentRequests(limit: number = 10): Promise<RequestLog[]> {
    try {
      // Get all keys from the database
      const allKeysResponse = await this.db.list();
      console.log('Raw keys response:', allKeysResponse);

      if (!allKeysResponse) {
        console.log('No keys found in database');
        return [];
      }

      // Handle the response format - it could be a string or an object with value array
      let allKeys: string[] = [];
      if (typeof allKeysResponse === 'string') {
        allKeys = allKeysResponse.split('\n').filter(key => key.trim() !== '');
      } else if (allKeysResponse && typeof allKeysResponse === 'object' && 'value' in allKeysResponse) {
        // Handle the object format: { ok: true, value: [...] }
        allKeys = Array.isArray(allKeysResponse.value) ? allKeysResponse.value : [];
      } else {
        console.log('Unexpected keys response format:', allKeysResponse);
        return [];
      }

      // Filter for log keys
      const logKeys = allKeys.filter(key => key.startsWith(this.logPrefix));

      if (logKeys.length === 0) {
        console.log('No log keys found. Available keys:', allKeys);
        return [];
      }

      console.log(`Found ${logKeys.length} log keys:`, logKeys);

      // Fetch all logs
      const logs: RequestLog[] = [];
      for (const key of logKeys) {
        try {
          const log = await this.db.get(key);
          if (log && typeof log === 'object' && 'id' in log && 'timestamp' in log) {
            logs.push({
              ...log as RequestLog,
              timestamp: new Date(log.timestamp)
            });
          }
        } catch (error) {
          console.error(`Failed to fetch log for key ${key}:`, error);
        }
      }

      // Sort by timestamp (newest first) and limit results
      return logs
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, limit);
    } catch (error) {
      console.error('Error fetching recent requests:', error);
      return [];
    }
  }
}

// For backwards compatibility and easy switching between storage implementations
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

// Use Replit database by default, fallback to memory storage for development
export const storage = new ReplitDbStorage();