CREATE TABLE `survey_submissions` (
	`bank_id` text PRIMARY KEY NOT NULL,
	`bank_name` text NOT NULL,
	`respondent_name` text NOT NULL,
	`answers_json` text NOT NULL,
	`answered_items` integer NOT NULL,
	`total_items` integer NOT NULL,
	`completion` integer NOT NULL,
	`submitted_at` text NOT NULL,
	`updated_at` text NOT NULL
);
