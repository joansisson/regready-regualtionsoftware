CREATE TABLE `activity_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`organization_id` integer DEFAULT 1 NOT NULL,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text,
	`metadata` text DEFAULT '{}',
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `app_secrets` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `audit_reports` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`type` text NOT NULL,
	`framework` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`summary` text,
	`findings` text DEFAULT '[]',
	`recommendations` text DEFAULT '[]',
	`generated_by` text NOT NULL,
	`organization_id` integer DEFAULT 1 NOT NULL,
	`generated_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	`file_path` text
);
--> statement-breakpoint
CREATE TABLE `compliance_checks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`framework_id` integer NOT NULL,
	`check_name` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`evidence` text,
	`last_checked` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	FOREIGN KEY (`framework_id`) REFERENCES `compliance_frameworks`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `compliance_frameworks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`display_name` text NOT NULL,
	`description` text,
	`completion_percentage` real DEFAULT 0,
	`status` text DEFAULT 'in-progress' NOT NULL,
	`last_updated` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `document_versions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`policy_id` integer NOT NULL,
	`version` text NOT NULL,
	`content` text NOT NULL,
	`change_notes` text,
	`created_by` text NOT NULL,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	FOREIGN KEY (`policy_id`) REFERENCES `policies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `policies` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`type` text NOT NULL,
	`description` text,
	`content` text,
	`version` text DEFAULT '1.0' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`frameworks` text DEFAULT '[]',
	`created_by` text NOT NULL,
	`approved_by` text,
	`organization_id` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	`approved_at` text
);
--> statement-breakpoint
CREATE TABLE `risk_assessments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`risk_score` integer NOT NULL,
	`risk_level` text NOT NULL,
	`category` text NOT NULL,
	`mitigation_plan` text,
	`status` text DEFAULT 'open' NOT NULL,
	`assigned_to` text,
	`due_date` text,
	`organization_id` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `team_members` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`role` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`avatar` text,
	`joined_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	`last_active` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	`permissions` text DEFAULT '[]',
	`assigned_projects` text DEFAULT '[]'
);
--> statement-breakpoint
CREATE UNIQUE INDEX `team_members_email_unique` ON `team_members` (`email`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`password` text NOT NULL,
	`username` text NOT NULL,
	`company_name` text,
	`organization_id` integer DEFAULT 1 NOT NULL,
	`role` text DEFAULT 'admin' NOT NULL,
	`llm_provider` text DEFAULT 'gemini' NOT NULL,
	`openai_api_key_encrypted` text,
	`openai_api_key_last4` text,
	`openai_api_key_validated_at` text,
	`gemini_api_key_encrypted` text,
	`gemini_api_key_last4` text,
	`gemini_api_key_validated_at` text,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `vendors` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`risk_level` text DEFAULT 'medium' NOT NULL,
	`gdpr_compliant` integer DEFAULT false,
	`soc2_compliant` integer DEFAULT false,
	`ai_act_compliant` integer DEFAULT false,
	`last_assessment` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	`notes` text
);
--> statement-breakpoint
CREATE TABLE `verified_links` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`token` text NOT NULL,
	`organization_id` integer DEFAULT 1 NOT NULL,
	`supplier_name` text NOT NULL,
	`supplier_domain` text,
	`industry` text,
	`company_size` text,
	`badges` text DEFAULT '[]',
	`documents` text DEFAULT '[]',
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	`expires_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `verified_links_token_unique` ON `verified_links` (`token`);--> statement-breakpoint
CREATE TABLE `workspace_settings` (
	`organization_id` integer PRIMARY KEY NOT NULL,
	`selected_frameworks` text DEFAULT '[]',
	`selected_policy_titles` text DEFAULT '[]',
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL
);
