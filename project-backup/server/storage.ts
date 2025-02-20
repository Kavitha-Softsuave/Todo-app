import { db } from "./db";
import { eq, desc } from "drizzle-orm";
import { users, properties, mous, calculatorUsage } from "@shared/schema";
import type { 
  User, InsertUser, 
  Property, InsertProperty, 
  MOU, InsertMOU,
  CalculatorUsage, InsertCalculatorUsage 
} from "@shared/schema";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Calculator usage operations
  trackCalculatorUsage(usage: InsertCalculatorUsage): Promise<CalculatorUsage>;
  getCalculatorUsageByUser(userId: number): Promise<CalculatorUsage[]>;

  // Property operations
  getProperty(id: number): Promise<Property | undefined>;
  getPropertiesByOwner(ownerId: number): Promise<Property[]>;
  createProperty(property: InsertProperty): Promise<Property>;
  updateProperty(id: number, property: Partial<Property>): Promise<Property>;
  deleteProperty(id: number): Promise<void>;
  findPropertyByAddress(address: string): Promise<Property | undefined>;
  getAllProperties(): Promise<Property[]>;

  // MOU operations
  getMou(id: number): Promise<MOU | undefined>;
  getMousByProperty(propertyId: number): Promise<MOU[]>;
  createMou(mou: InsertMOU): Promise<MOU>;
  updateMou(id: number, update: Partial<MOU>): Promise<MOU>;

  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async trackCalculatorUsage(usage: InsertCalculatorUsage): Promise<CalculatorUsage> {
    const [tracked] = await db.insert(calculatorUsage).values({
      ...usage,
      calculationResult: usage.calculationResult || {}, 
      createdAt: new Date(), 
    }).returning();
    return tracked;
  }

  async getCalculatorUsageByUser(userId: number): Promise<CalculatorUsage[]> {
    return await db.select()
      .from(calculatorUsage)
      .where(eq(calculatorUsage.userId, userId))
      .orderBy(desc(calculatorUsage.createdAt));
  }

  async getProperty(id: number): Promise<Property | undefined> {
    const [property] = await db.select().from(properties).where(eq(properties.id, id));
    return property;
  }

  async findPropertyByAddress(address: string): Promise<Property | undefined> {
    const [property] = await db.select().from(properties).where(eq(properties.address, address));
    return property;
  }

  async getPropertiesByOwner(ownerId: number): Promise<Property[]> {
    return await db.select().from(properties).where(eq(properties.ownerId, ownerId));
  }

  async createProperty(property: InsertProperty): Promise<Property> {
    const [newProperty] = await db.insert(properties).values(property).returning();
    return newProperty;
  }

  async updateProperty(id: number, update: Partial<Property>): Promise<Property> {
    const [property] = await db
      .update(properties)
      .set(update)
      .where(eq(properties.id, id))
      .returning();
    if (!property) throw new Error("Property not found");
    return property;
  }

  async deleteProperty(id: number): Promise<void> {
    await db.delete(properties).where(eq(properties.id, id));
  }

  async getMou(id: number): Promise<MOU | undefined> {
    const [mou] = await db.select().from(mous).where(eq(mous.id, id));
    return mou;
  }

  async getMousByProperty(propertyId: number): Promise<MOU[]> {
    return await db.select().from(mous).where(eq(mous.propertyId, propertyId));
  }

  async createMou(mou: InsertMOU): Promise<MOU> {
    const [newMou] = await db.insert(mous).values(mou).returning();
    return newMou;
  }

  async updateMou(id: number, update: Partial<MOU>): Promise<MOU> {
    const [mou] = await db
      .update(mous)
      .set(update)
      .where(eq(mous.id, id))
      .returning();
    if (!mou) throw new Error("MOU not found");
    return mou;
  }

  async getAllProperties(): Promise<Property[]> {
    return await db.select().from(properties);
  }
}

export const storage = new DatabaseStorage();