CREATE SEQUENCE IF NOT EXISTS "user_code_seq" INCREMENT BY 1 MINVALUE 1001 START WITH 1001;--> statement-breakpoint
-- Temporarily loosen role column so we can recreate the enum safely
ALTER TABLE "users" ALTER COLUMN "role" SET DATA TYPE text USING "role"::text;--> statement-breakpoint
DO $$
BEGIN
	-- Drop existing user_role type if present (old or partially applied)
	IF EXISTS (
		SELECT 1 FROM pg_type t
		JOIN pg_namespace n ON n.oid = t.typnamespace
		WHERE t.typname = 'user_role' AND n.nspname = 'public'
	) THEN
		DROP TYPE "public"."user_role";
	END IF;
END $$;--> statement-breakpoint
-- Recreate the original role enum values used by the app
CREATE TYPE "public"."user_role" AS ENUM('national_admin', 'data_manager', 'partner_manager', 'team_member');--> statement-breakpoint
-- Map any new-role values back to legacy roles the app uses
UPDATE "users" SET "role" = CASE
	WHEN "role" = 'central_admin' THEN 'national_admin'
	WHEN "role" = 'partner_site_manager' THEN 'partner_manager'
	WHEN "role" = 'optometrist' THEN 'team_member'
	WHEN "role" = 'field_worker' THEN 'team_member'
	WHEN "role" = 'social_worker' THEN 'team_member'
	ELSE "role"
END;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DATA TYPE "public"."user_role" USING "role"::"public"."user_role";--> statement-breakpoint
-- New profile fields
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "code" varchar(50);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone_number" varchar(10);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "date_active_till" date;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "years_of_experience" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "temporary_password" varchar(255);--> statement-breakpoint
-- Populate missing codes and enforce constraints
UPDATE "users" SET "code" = 'U' || nextval('user_code_seq') WHERE "code" IS NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "code" SET DEFAULT nextval('user_code_seq');--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "code" SET NOT NULL;--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'users_code_unique'
	) THEN
		ALTER TABLE "users" ADD CONSTRAINT "users_code_unique" UNIQUE("code");
	END IF;
END $$;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_code_idx" ON "users" USING btree ("code");
