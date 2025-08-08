
import Database from "@replit/database";
import { requestLogs, type RequestLog, type InsertRequestLog } from "@shared/schema";

export interface IStorage {
  logRequest(log: InsertRequestLog): Promise<RequestLog>;
  getRecentRequests(limit?: number): Promise<RequestLog[]>;
}

export class ReplitDbStorage implements IStorage {
  private db: Database;
  private logPrefix = "request_log:";
  private counterKey = "log_counter";

  constructor() {
    this.db = new Database();
  }

  private async getNextId(): Promise<number> {
    const currentCounter = await this.db.get(this.counterKey);
    const nextId = currentCounter ? currentCounter + 1 : 1;
    await this.db.set(this.counterKey, nextId);
    return nextId;
  }

  private logKey(id: number): string {
    return `${this.logPrefix}${id}`;
  }

  async logRequest(insertLog: InsertRequestLog): Promise<RequestLog> {
    const id = await this.getNextId();
    const log: RequestLog = { 
      id,
      parseUrl: insertLog.parseUrl,
      selector: insertLog.selector,
      method: insertLog.method,
      extra: insertLog.extra || null,
      success: insertLog.success,
      responseLength: insertLog.responseLength || null,
      errorMessage: insertLog.errorMessage || null,
      timestamp: new Date() 
    };
    
    await this.db.set(this.logKey(id), log);
    return log;
  }

  async getRecentRequests(limit: number = 10): Promise<RequestLog[]> {
    try {
      // Get all keys and filter for log keys
      const allKeys = await this.db.list();
      const logKeys = allKeys.filter(key => 
        typeof key === 'string' && key.startsWith(this.logPrefix)
      );
      
      if (logKeys.length === 0) {
        console.log('No request logs found');
        return [];
      }

      // Fetch all logs
      const logs: RequestLog[] = [];
      for (const key of logKeys) {
        try {
          const log = await this.db.get(key);
          if (log && typeof log === 'object' && 'id' in log && 'timestamp' in log) {
            // Ensure timestamp is a Date object
            const logWithDate: RequestLog = {
              ...log as RequestLog,
              timestamp: new Date(log.timestamp)
            };
            logs.push(logWithDate);
          }
        } catch (error) {
          console.error(`Failed to fetch log for key ${key}:`, error);
          // Continue processing other keys
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
