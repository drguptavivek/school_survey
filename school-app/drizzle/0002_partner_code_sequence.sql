-- Auto-generate partner codes via sequence starting at 11
CREATE SEQUENCE IF NOT EXISTS "partner_code_seq"
    INCREMENT BY 1
    MINVALUE 11
    START WITH 11
    OWNED BY "partners"."code";

-- Ensure sequence starts after any existing numeric codes, with a floor of 10 (next is 11)
SELECT setval(
    'partner_code_seq',
    GREATEST(
        11,
        COALESCE((SELECT MAX(code::bigint) FROM "partners" WHERE code ~ '^[0-9]+$'), 11)
    )
);

-- Set default to use the sequence
ALTER TABLE "partners" ALTER COLUMN "code" SET DEFAULT nextval('partner_code_seq');
