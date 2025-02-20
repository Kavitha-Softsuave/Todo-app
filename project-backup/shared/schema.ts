import { pgTable, text, serial, integer, decimal, timestamp, boolean, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { Property } from "../../shared/schema";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  userType: text("user_type").notNull(), // 'senior', 'bank', 'builder'
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
});

export const calculatorUsage = pgTable("calculator_usage", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  propertyValue: decimal("property_value").notNull(),
  appreciationRate: decimal("appreciation_rate").notNull(),
  requiredMonthlyAmount: decimal("required_monthly_amount").notNull(),
  payoutAdjustmentType: text("payout_adjustment_type").notNull(),
  annualIncreaseRate: decimal("annual_increase_rate"),
  blockPeriod: integer("block_period"),
  calculationResult: json("calculation_result").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const properties = pgTable("properties", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id").notNull(),
  address: text("address").notNull(),
  value: decimal("value").notNull(),
  mortgageAmount: decimal("mortgage_amount").notNull(),
  monthlyPayment: decimal("monthly_payment").notNull(),
  term: integer("term").notNull(), // in years
  status: text("status").notNull(), // 'draft', 'pending', 'approved', 'rejected'
  bankId: integer("bank_id"), // Selected bank for financing
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const mous = pgTable("mous", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull(),
  seniorId: integer("senior_id").notNull(),
  bankId: integer("bank_id").notNull(),
  builderId: integer("builder_id"),
  status: text("status").notNull(), // 'draft', 'active', 'completed'
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// User schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  userType: true,
  fullName: true,
  email: true,
  phone: true,
});

// Calculator usage schema
export const insertCalculatorUsageSchema = createInsertSchema(calculatorUsage)
  .extend({
    propertyValue: z.number().or(z.string().transform(val => Number(val))),
    appreciationRate: z.number().or(z.string().transform(val => Number(val))),
    requiredMonthlyAmount: z.number().or(z.string().transform(val => Number(val))),
    annualIncreaseRate: z.number().nullable().or(z.string().transform(val => val ? Number(val) : null)),
    blockPeriod: z.number().nullable().or(z.string().transform(val => val ? Number(val) : null)),
    blockIncreaseRate: z.number().nullable().or(z.string().transform(val => val ? Number(val) : null)),
    payoutAdjustmentType: z.enum(['fixed', 'annual_increase', 'block_period']),
    calculationResult: z.record(z.any()).default({}),
  })
  .omit({
    id: true,
    createdAt: true,
  });

// Property schemas
export const insertPropertySchema = createInsertSchema(properties).omit({
  id: true,
  createdAt: true,
});

// MOU schemas
export const insertMouSchema = createInsertSchema(mous).omit({
  id: true,
  createdAt: true,
});

// Export types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertCalculatorUsage = z.infer<typeof insertCalculatorUsageSchema>;
export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type InsertMOU = z.infer<typeof insertMouSchema>;
export type User = typeof users.$inferSelect;
export type CalculatorUsage = typeof calculatorUsage.$inferSelect;
export type Property = typeof properties.$inferSelect;
export type MOU = typeof mous.$inferSelect;