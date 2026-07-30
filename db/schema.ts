import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const surveyPartSubmissions = sqliteTable("survey_part_submissions", {
  id: text("id").primaryKey(),
  bankId: text("bank_id").notNull(),
  bankName: text("bank_name").notNull(),
  surveySource: text("survey_source").notNull(),
  respondentName: text("respondent_name").notNull(),
  answersJson: text("answers_json").notNull(),
  answeredItems: integer("answered_items").notNull(),
  totalItems: integer("total_items").notNull(),
  completion: integer("completion").notNull(),
  submittedAt: text("submitted_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
