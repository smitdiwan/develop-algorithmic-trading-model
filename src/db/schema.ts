import { doublePrecision, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const backtestRuns = pgTable("backtest_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  strategy: text("strategy").notNull(),
  params: jsonb("params").notNull(),
  metrics: jsonb("metrics").notNull(),
  equity: jsonb("equity").notNull(),
  benchmark: jsonb("benchmark").notNull(),
  drawdown: jsonb("drawdown").notNull(),
  weekly: jsonb("weekly").notNull(),
  trades: jsonb("trades").notNull(),
  monteCarlo: jsonb("monte_carlo").notNull(),
  candles: jsonb("candles").notNull(),
  createdAt: timestamp("created_at", { withTimezone: false }).defaultNow().notNull(),
});

export const orders = pgTable("orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  symbol: text("symbol").notNull(),
  name: text("name").notNull().default(""),
  side: text("side").notNull(), // LONG | SHORT
  qty: doublePrecision("qty").notNull(),
  price: doublePrecision("price").notNull(),
  stopLoss: doublePrecision("stop_loss"),
  takeProfit: doublePrecision("take_profit"),
  venue: text("venue").notNull(),
  source: text("source").notNull(),
  status: text("status").notNull().default("open"), // open | closed
  exitPrice: doublePrecision("exit_price"),
  pnl: doublePrecision("pnl"),
  createdAt: timestamp("created_at", { withTimezone: false }).defaultNow().notNull(),
  closedAt: timestamp("closed_at", { withTimezone: false }),
});

export const connections = pgTable("connections", {
  id: uuid("id").defaultRandom().primaryKey(),
  venue: text("venue").notNull(),
  apiKey: text("api_key").notNull(),
  secret: text("secret").notNull(),
  status: text("status").notNull().default("connected"),
  createdAt: timestamp("created_at", { withTimezone: false }).defaultNow().notNull(),
});

export type BacktestRunRow = typeof backtestRuns.$inferSelect;
export type NewBacktestRunRow = typeof backtestRuns.$inferInsert;
export type OrderRow = typeof orders.$inferSelect;
export type ConnectionRow = typeof connections.$inferSelect;
