import { users, requestLogs, type User, type InsertUser, type RequestLog, type InsertRequestLog } from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  logRequest(log: InsertRequestLog): Promise<RequestLog>;
  getRecentRequests(limit?: number): Promise<RequestLog[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private requestLogs: Map<number, RequestLog>;
  private currentUserId: number;
  private currentLogId: number;

  constructor() {
    this.users = new Map();
    this.requestLogs = new Map();
    this.currentUserId = 1;
    this.currentLogId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
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
