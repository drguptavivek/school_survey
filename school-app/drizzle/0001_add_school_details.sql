-- Migration: Add school details fields
-- Description: Adds comprehensive school information fields including type, location, GPS, classes, co-ed status, student strength, and comments

-- Create school_code_seq sequence first
CREATE SEQUENCE IF NOT EXISTS "school_code_seq"
    INCREMENT BY 1
    MINVALUE 201
    START WITH 201;

-- Alter schools table to make code NOT NULL with default
ALTER TABLE schools ALTER COLUMN code SET NOT NULL;
ALTER TABLE schools ALTER COLUMN code SET DEFAULT nextval('school_code_seq');

-- Add new columns to schools table
ALTER TABLE schools ADD COLUMN school_type school_type;
ALTER TABLE schools ADD COLUMN area_type area_type;
ALTER TABLE schools ADD COLUMN gps_latitude decimal(10, 8);
ALTER TABLE schools ADD COLUMN gps_longitude decimal(11, 8);
ALTER TABLE schools ADD COLUMN has_primary boolean DEFAULT false NOT NULL;
ALTER TABLE schools ADD COLUMN has_middle boolean DEFAULT false NOT NULL;
ALTER TABLE schools ADD COLUMN has_tenth boolean DEFAULT false NOT NULL;
ALTER TABLE schools ADD COLUMN has_12th boolean DEFAULT false NOT NULL;
ALTER TABLE schools ADD COLUMN co_ed_type varchar(20);
ALTER TABLE schools ADD COLUMN total_student_strength integer;
ALTER TABLE schools ADD COLUMN comments text;

-- Create index for school_type for faster filtering
CREATE INDEX schools_school_type_idx ON schools(school_type);

-- Create index for area_type for faster filtering
CREATE INDEX schools_area_type_idx ON schools(area_type);

-- Create index for co_ed_type for faster filtering
CREATE INDEX schools_co_ed_type_idx ON schools(co_ed_type);

-- Create composite index for classes for filtering schools by available classes
CREATE INDEX schools_classes_idx ON schools(has_primary, has_middle, has_tenth, has_12th);
