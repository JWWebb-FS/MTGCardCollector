import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const feedbackTable = pgTable("feedback", {
  id: serial("id").primaryKey(),
  message: text("message").notNull(),
  rating: integer("rating"),
  page: text("page"),
  submittedAt: timestamp("submitted_at").notNull().defaultNow(),
});

export type Feedback = typeof feedbackTable.$inferSelect;
