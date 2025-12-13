CREATE SEQUENCE IF NOT EXISTS "school_code_seq" INCREMENT BY 1 MINVALUE 201 START WITH 201;--> statement-breakpoint
ALTER TABLE "schools" ALTER COLUMN "code" SET DEFAULT nextval('school_code_seq');--> statement-breakpoint
ALTER TABLE "schools" ALTER COLUMN "code" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "schools" ADD COLUMN "school_type" "school_type";--> statement-breakpoint
ALTER TABLE "schools" ADD COLUMN "area_type" "area_type";--> statement-breakpoint
ALTER TABLE "schools" ADD COLUMN "gps_latitude" numeric(10, 8);--> statement-breakpoint
ALTER TABLE "schools" ADD COLUMN "gps_longitude" numeric(11, 8);--> statement-breakpoint
ALTER TABLE "schools" ADD COLUMN "has_primary" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "schools" ADD COLUMN "has_middle" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "schools" ADD COLUMN "has_tenth" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "schools" ADD COLUMN "has_12th" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "schools" ADD COLUMN "co_ed_type" varchar(20);--> statement-breakpoint
ALTER TABLE "schools" ADD COLUMN "total_student_strength" integer;--> statement-breakpoint
ALTER TABLE "schools" ADD COLUMN "comments" text;--> statement-breakpoint
ALTER TABLE "schools" ADD CONSTRAINT "schools_code_unique" UNIQUE("code");