DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'area_type' AND n.nspname = 'public') THEN
		CREATE TYPE "public"."area_type" AS ENUM('rural', 'urban');
	END IF;
END$$;
--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'barrier' AND n.nspname = 'public') THEN
		CREATE TYPE "public"."barrier" AS ENUM('lack_of_awareness', 'no_time', 'can_manage', 'unable_to_afford', 'parental_disapproval', 'dont_like_glasses', 'no_one_to_accompany', 'glasses_broken');
	END IF;
END$$;
--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'checkup_time' AND n.nspname = 'public') THEN
		CREATE TYPE "public"."checkup_time" AS ENUM('less_than_1_year', '1_to_2_years', 'more_than_2_years');
	END IF;
END$$;
--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'consent' AND n.nspname = 'public') THEN
		CREATE TYPE "public"."consent" AS ENUM('yes', 'refused', 'absent');
	END IF;
END$$;
--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'frame_integrity' AND n.nspname = 'public') THEN
		CREATE TYPE "public"."frame_integrity" AS ENUM('not_broken', 'broken_taped_glued');
	END IF;
END$$;
--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'glasses_quality' AND n.nspname = 'public') THEN
		CREATE TYPE "public"."glasses_quality" AS ENUM('free', 'paid');
	END IF;
END$$;
--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'refraction_place' AND n.nspname = 'public') THEN
		CREATE TYPE "public"."refraction_place" AS ENUM('government', 'private_ngo');
	END IF;
END$$;
--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'school_type' AND n.nspname = 'public') THEN
		CREATE TYPE "public"."school_type" AS ENUM('government', 'private', 'aided', 'other');
	END IF;
END$$;
--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'scratches' AND n.nspname = 'public') THEN
		CREATE TYPE "public"."scratches" AS ENUM('none', 'superficial_few', 'deep_multiple');
	END IF;
END$$;
--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'sex' AND n.nspname = 'public') THEN
		CREATE TYPE "public"."sex" AS ENUM('male', 'female');
	END IF;
END$$;
--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'user_role' AND n.nspname = 'public') THEN
		CREATE TYPE "public"."user_role" AS ENUM('national_admin', 'data_manager', 'partner_manager', 'team_member');
	END IF;
END$$;
--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'vision_cause' AND n.nspname = 'public') THEN
		CREATE TYPE "public"."vision_cause" AS ENUM('uncorrected_refractive_error', 'cataract', 'corneal_opacity', 'posterior_segment_diseases', 'phthisis', 'globe_abnormalities', 'other');
	END IF;
END$$;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"action" varchar(100) NOT NULL,
	"entity_type" varchar(100) NOT NULL,
	"entity_id" uuid,
	"changes" text,
	"ip_address" varchar(45),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "districts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(50) NOT NULL,
	"partner_id" uuid NOT NULL,
	"state" varchar(100),
	"region" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "districts_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "partners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(50) NOT NULL,
	"contact_email" varchar(255),
	"contact_phone" varchar(50),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	CONSTRAINT "partners_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "schools" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(100),
	"district_id" uuid NOT NULL,
	"partner_id" uuid NOT NULL,
	"address" text,
	"principal_name" varchar(255),
	"contact_phone" varchar(50),
	"is_selected_for_survey" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"has_survey_data" boolean DEFAULT false NOT NULL,
	"selected_at" timestamp,
	"selected_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"uploaded_by" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" varchar(255) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" varchar(45),
	"user_agent" text,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "survey_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"survey_unique_id" varchar(255) NOT NULL,
	"survey_date" date NOT NULL,
	"district_id" uuid NOT NULL,
	"area_type" "area_type" NOT NULL,
	"school_id" uuid NOT NULL,
	"school_type" "school_type" NOT NULL,
	"class" integer NOT NULL,
	"section" varchar(10) NOT NULL,
	"roll_no" varchar(20) NOT NULL,
	"student_name" varchar(255) NOT NULL,
	"sex" "sex" NOT NULL,
	"age" integer NOT NULL,
	"consent" "consent" NOT NULL,
	"uses_distance_glasses" boolean NOT NULL,
	"unaided_va_right_eye" varchar(50),
	"unaided_va_left_eye" varchar(50),
	"presenting_va_right_eye" varchar(50) NOT NULL,
	"presenting_va_left_eye" varchar(50) NOT NULL,
	"referred_for_refraction" boolean NOT NULL,
	"spherical_power_right" numeric(5, 2),
	"spherical_power_left" numeric(5, 2),
	"cylindrical_power_right" numeric(5, 2),
	"cylindrical_power_left" numeric(5, 2),
	"axis_right" integer,
	"axis_left" integer,
	"bcva_right_eye" varchar(50),
	"bcva_left_eye" varchar(50),
	"cause_right_eye" "vision_cause",
	"cause_right_eye_other" varchar(255),
	"cause_left_eye" "vision_cause",
	"cause_left_eye_other" varchar(255),
	"barrier_1" "barrier",
	"barrier_2" "barrier",
	"time_since_last_checkup" "checkup_time",
	"place_of_last_refraction" "refraction_place",
	"cost_of_glasses" "glasses_quality",
	"uses_spectacle_regularly" boolean,
	"spectacle_alignment_centering" boolean,
	"spectacle_scratches" "scratches",
	"spectacle_frame_integrity" "frame_integrity",
	"spectacles_prescribed" boolean NOT NULL,
	"referred_to_ophthalmologist" boolean NOT NULL,
	"partner_id" uuid NOT NULL,
	"submitted_by" uuid NOT NULL,
	"submitted_at" timestamp DEFAULT now() NOT NULL,
	"team_edit_deadline" timestamp NOT NULL,
	"partner_edit_deadline" timestamp NOT NULL,
	"last_edited_by" uuid,
	"last_edited_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "survey_responses_survey_unique_id_unique" UNIQUE("survey_unique_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"role" "user_role" NOT NULL,
	"partner_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"last_login_at" timestamp,
	"created_by" uuid,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "audit_logs_user_id_idx" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_entity_idx" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "districts_code_idx" ON "districts" USING btree ("code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "districts_partner_id_idx" ON "districts" USING btree ("partner_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "districts_state_idx" ON "districts" USING btree ("state");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "partners_code_idx" ON "partners" USING btree ("code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "schools_district_id_idx" ON "schools" USING btree ("district_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "schools_partner_id_idx" ON "schools" USING btree ("partner_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "schools_is_selected_idx" ON "schools" USING btree ("is_selected_for_survey");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "schools_code_idx" ON "schools" USING btree ("code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sessions_token_idx" ON "sessions" USING btree ("token");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sessions_expires_at_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "survey_responses_school_id_idx" ON "survey_responses" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "survey_responses_partner_id_idx" ON "survey_responses" USING btree ("partner_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "survey_responses_district_id_idx" ON "survey_responses" USING btree ("district_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "survey_responses_submitted_by_idx" ON "survey_responses" USING btree ("submitted_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "survey_responses_submitted_at_idx" ON "survey_responses" USING btree ("submitted_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "survey_responses_unique_id_idx" ON "survey_responses" USING btree ("survey_unique_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_partner_id_idx" ON "users" USING btree ("partner_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_role_idx" ON "users" USING btree ("role");--> statement-breakpoint
