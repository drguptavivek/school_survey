ALTER TABLE "users" ALTER COLUMN "role" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."user_role";--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('national_admin', 'data_manager', 'partner_manager', 'team_member');--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DATA TYPE "public"."user_role" USING "role"::"public"."user_role";--> statement-breakpoint
ALTER TABLE "districts" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "partners" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "schools" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "deleted_at" timestamp;