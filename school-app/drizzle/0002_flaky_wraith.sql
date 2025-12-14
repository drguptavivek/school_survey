CREATE SEQUENCE IF NOT EXISTS "school_code_seq" INCREMENT BY 1 MINVALUE 201 START WITH 201;--> statement-breakpoint
ALTER TABLE "schools" ALTER COLUMN "code" SET DEFAULT nextval('school_code_seq');--> statement-breakpoint
ALTER TABLE "schools" ALTER COLUMN "code" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "schools" ADD COLUMN IF NOT EXISTS "school_type" "school_type";--> statement-breakpoint
ALTER TABLE "schools" ADD COLUMN IF NOT EXISTS "area_type" "area_type";--> statement-breakpoint
ALTER TABLE "schools" ADD COLUMN IF NOT EXISTS "gps_latitude" numeric(10, 8);--> statement-breakpoint
ALTER TABLE "schools" ADD COLUMN IF NOT EXISTS "gps_longitude" numeric(11, 8);--> statement-breakpoint
ALTER TABLE "schools" ADD COLUMN IF NOT EXISTS "has_primary" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "schools" ADD COLUMN IF NOT EXISTS "has_middle" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "schools" ADD COLUMN IF NOT EXISTS "has_tenth" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "schools" ADD COLUMN IF NOT EXISTS "has_12th" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "schools" ADD COLUMN IF NOT EXISTS "co_ed_type" varchar(20);--> statement-breakpoint
ALTER TABLE "schools" ADD COLUMN IF NOT EXISTS "total_student_strength" integer;--> statement-breakpoint
ALTER TABLE "schools" ADD COLUMN IF NOT EXISTS "comments" text;--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'schools_code_unique'
	) THEN
		ALTER TABLE "schools" ADD CONSTRAINT "schools_code_unique" UNIQUE("code");
	END IF;
END $$;
