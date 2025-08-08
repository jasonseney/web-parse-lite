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
      // Get all keys
      const allKeysResponse = await this.db.list();
      const allKeys = allKeysResponse?.value || [];
      const logKeys = allKeys.filter(key => key.startsWith(this.logPrefix));
      
      console.log(`Found ${logKeys.length} log keys:`, logKeys);

      // Fetch all logs
      const logs: RequestLog[] = [];
      for (const key of logKeys) {
        try {
          const logData = await this.db.get(key);
          console.log(`Raw log data for ${key}:`, logData);
          
          if (logData) {
            // Just use the data as-is, convert timestamp to Date object
            const log: RequestLog = {
              id: logData.id,
              parseUrl: logData.parseUrl,
              selector: logData.selector,
              method: logData.method,
              extra: logData.extra,
              success: logData.success,
              responseLength: logData.responseLength,
              errorMessage: logData.errorMessage,
              timestamp: new Date(logData.timestamp)
            };
            logs.push(log);
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