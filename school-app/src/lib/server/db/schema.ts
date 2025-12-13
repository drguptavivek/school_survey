import {
	pgTable,
	uuid,
	varchar,
	integer,
	boolean,
	timestamp,
	date,
	decimal,
	text,
	foreignKey,
	uniqueIndex,
	index,
	pgEnum
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', [
	'national_admin',
	'data_manager',
	'partner_manager',
	'team_member'
]);

export const areaTypeEnum = pgEnum('area_type', ['rural', 'urban']);
export const schoolTypeEnum = pgEnum('school_type', ['government', 'private', 'aided', 'other']);
export const sexEnum = pgEnum('sex', ['male', 'female']);
export const consentEnum = pgEnum('consent', ['yes', 'refused', 'absent']);
export const barrierEnum = pgEnum('barrier', [
	'lack_of_awareness',
	'no_time',
	'can_manage',
	'unable_to_afford',
	'parental_disapproval',
	'dont_like_glasses',
	'no_one_to_accompany',
	'glasses_broken'
]);
export const visionCauseEnum = pgEnum('vision_cause', [
	'uncorrected_refractive_error',
	'cataract',
	'corneal_opacity',
	'posterior_segment_diseases',
	'phthisis',
	'globe_abnormalities',
	'other'
]);
export const checkupTimeEnum = pgEnum('checkup_time', [
	'less_than_1_year',
	'1_to_2_years',
	'more_than_2_years'
]);
export const refractionPlaceEnum = pgEnum('refraction_place', ['government', 'private_ngo']);
export const glassesEqualityEnum = pgEnum('glasses_quality', ['free', 'paid']);
export const scratchesEnum = pgEnum('scratches', ['none', 'superficial_few', 'deep_multiple']);
export const frameIntegrityEnum = pgEnum('frame_integrity', ['not_broken', 'broken_taped_glued']);

// Users table
export const users = pgTable(
	'users',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		email: varchar('email', { length: 255 }).notNull().unique(),
		passwordHash: varchar('password_hash', { length: 255 }).notNull(),
		name: varchar('name', { length: 255 }).notNull(),
		role: userRoleEnum('role').notNull(),
		partnerId: uuid('partner_id'),
		isActive: boolean('is_active').default(true).notNull(),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at').defaultNow().notNull(),
		lastLoginAt: timestamp('last_login_at'),
		createdBy: uuid('created_by')
	},
	(table) => ({
		emailIdx: uniqueIndex('users_email_idx').on(table.email),
		partnerIdx: index('users_partner_id_idx').on(table.partnerId),
		roleIdx: index('users_role_idx').on(table.role)
	})
);

// Sessions table
export const sessions = pgTable(
	'sessions',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: uuid('user_id').notNull(),
		token: varchar('token', { length: 255 }).notNull().unique(),
		expiresAt: timestamp('expires_at').notNull(),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		ipAddress: varchar('ip_address', { length: 45 }),
		userAgent: text('user_agent')
	},
	(table) => ({
		userIdx: index('sessions_user_id_idx').on(table.userId),
		tokenIdx: index('sessions_token_idx').on(table.token),
		expiresIdx: index('sessions_expires_at_idx').on(table.expiresAt)
	})
);

// Partners table
export const partners = pgTable(
	'partners',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		name: varchar('name', { length: 255 }).notNull(),
		code: varchar('code', { length: 50 }).notNull().unique(),
		contactEmail: varchar('contact_email', { length: 255 }),
		contactPhone: varchar('contact_phone', { length: 50 }),
		isActive: boolean('is_active').default(true).notNull(),
		comments: text('comments'),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at').defaultNow().notNull(),
		createdBy: uuid('created_by')
	},
	(table) => ({
		codeIdx: uniqueIndex('partners_code_idx').on(table.code)
	})
);

// Districts table
export const districts = pgTable(
	'districts',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		name: varchar('name', { length: 255 }).notNull(),
		code: varchar('code', { length: 50 }).notNull().unique(),
		partnerId: uuid('partner_id').notNull(),
		state: varchar('state', { length: 100 }),
		region: varchar('region', { length: 100 }),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at').defaultNow().notNull()
	},
	(table) => ({
		codeIdx: uniqueIndex('districts_code_idx').on(table.code),
		partnerIdx: index('districts_partner_id_idx').on(table.partnerId),
		stateIdx: index('districts_state_idx').on(table.state)
	})
);

// Schools table
export const schools = pgTable(
	'schools',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		name: varchar('name', { length: 255 }).notNull(),
		code: varchar('code', { length: 100 }),
		districtId: uuid('district_id').notNull(),
		partnerId: uuid('partner_id').notNull(),
		address: text('address'),
		principalName: varchar('principal_name', { length: 255 }),
		contactPhone: varchar('contact_phone', { length: 50 }),
		isSelectedForSurvey: boolean('is_selected_for_survey').default(false).notNull(),
		isActive: boolean('is_active').default(true).notNull(),
		hasSurveyData: boolean('has_survey_data').default(false).notNull(),
		selectedAt: timestamp('selected_at'),
		selectedBy: uuid('selected_by'),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at').defaultNow().notNull(),
		uploadedBy: uuid('uploaded_by')
	},
	(table) => ({
		districtIdx: index('schools_district_id_idx').on(table.districtId),
		partnerIdx: index('schools_partner_id_idx').on(table.partnerId),
		selectedIdx: index('schools_is_selected_idx').on(table.isSelectedForSurvey),
		codeIdx: index('schools_code_idx').on(table.code)
	})
);

// Survey Responses table
export const surveyResponses = pgTable(
	'survey_responses',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		surveyUniqueId: varchar('survey_unique_id', { length: 255 }).notNull().unique(),

		// Section A: Basic Details
		surveyDate: date('survey_date').notNull(),
		districtId: uuid('district_id').notNull(),
		areaType: areaTypeEnum('area_type').notNull(),
		schoolId: uuid('school_id').notNull(),
		schoolType: schoolTypeEnum('school_type').notNull(),
		class: integer('class').notNull(),
		section: varchar('section', { length: 10 }).notNull(),
		rollNo: varchar('roll_no', { length: 20 }).notNull(),
		studentName: varchar('student_name', { length: 255 }).notNull(),
		sex: sexEnum('sex').notNull(),
		age: integer('age').notNull(),
		consent: consentEnum('consent').notNull(),

		// Section B: Distance Vision
		usesDistanceGlasses: boolean('uses_distance_glasses').notNull(),
		unaided_va_right_eye: varchar('unaided_va_right_eye', { length: 50 }),
		unaided_va_left_eye: varchar('unaided_va_left_eye', { length: 50 }),
		presenting_va_right_eye: varchar('presenting_va_right_eye', { length: 50 }).notNull(),
		presenting_va_left_eye: varchar('presenting_va_left_eye', { length: 50 }).notNull(),
		referredForRefraction: boolean('referred_for_refraction').notNull(),

		// Section C: Refraction Details
		sphericalPowerRight: decimal('spherical_power_right', { precision: 5, scale: 2 }),
		sphericalPowerLeft: decimal('spherical_power_left', { precision: 5, scale: 2 }),
		cylindricalPowerRight: decimal('cylindrical_power_right', { precision: 5, scale: 2 }),
		cylindricalPowerLeft: decimal('cylindrical_power_left', { precision: 5, scale: 2 }),
		axisRight: integer('axis_right'),
		axisLeft: integer('axis_left'),
		bcvaRightEye: varchar('bcva_right_eye', { length: 50 }),
		bcvaLeftEye: varchar('bcva_left_eye', { length: 50 }),

		// Section D: Main Cause
		causeRightEye: visionCauseEnum('cause_right_eye'),
		causeRightEyeOther: varchar('cause_right_eye_other', { length: 255 }),
		causeLeftEye: visionCauseEnum('cause_left_eye'),
		causeLeftEyeOther: varchar('cause_left_eye_other', { length: 255 }),

		// Section E: Barriers (up to 2)
		barrier1: barrierEnum('barrier_1'),
		barrier2: barrierEnum('barrier_2'),

		// Section F: Follow-up Details (conditional)
		timeSinceLastCheckup: checkupTimeEnum('time_since_last_checkup'),
		placeOfLastRefraction: refractionPlaceEnum('place_of_last_refraction'),
		costOfGlasses: glassesEqualityEnum('cost_of_glasses'),
		usesSpectacleRegularly: boolean('uses_spectacle_regularly'),
		spectacleAlignmentCentering: boolean('spectacle_alignment_centering'),
		spectacleScratches: scratchesEnum('spectacle_scratches'),
		spectacleFrameIntegrity: frameIntegrityEnum('spectacle_frame_integrity'),

		// Section G: Advice
		spectaclesPrescribed: boolean('spectacles_prescribed').notNull(),
		referredToOphthalmologist: boolean('referred_to_ophthalmologist').notNull(),

		// Metadata & Audit
		partnerId: uuid('partner_id').notNull(),
		submittedBy: uuid('submitted_by').notNull(),
		submittedAt: timestamp('submitted_at').defaultNow().notNull(),
		teamEditDeadline: timestamp('team_edit_deadline').notNull(),
		partnerEditDeadline: timestamp('partner_edit_deadline').notNull(),
		lastEditedBy: uuid('last_edited_by'),
		lastEditedAt: timestamp('last_edited_at'),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at').defaultNow().notNull()
	},
	(table) => ({
		schoolIdx: index('survey_responses_school_id_idx').on(table.schoolId),
		partnerIdx: index('survey_responses_partner_id_idx').on(table.partnerId),
		districtIdx: index('survey_responses_district_id_idx').on(table.districtId),
		submittedByIdx: index('survey_responses_submitted_by_idx').on(table.submittedBy),
		submittedAtIdx: index('survey_responses_submitted_at_idx').on(table.submittedAt),
		uniqueIdx: uniqueIndex('survey_responses_unique_id_idx').on(table.surveyUniqueId)
	})
);

// Audit Logs table
export const auditLogs = pgTable(
	'audit_logs',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: uuid('user_id'),
		action: varchar('action', { length: 100 }).notNull(),
		entityType: varchar('entity_type', { length: 100 }).notNull(),
		entityId: uuid('entity_id'),
		changes: text('changes'),
		ipAddress: varchar('ip_address', { length: 45 }),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(table) => ({
		userIdx: index('audit_logs_user_id_idx').on(table.userId),
		entityIdx: index('audit_logs_entity_idx').on(table.entityType, table.entityId),
		createdIdx: index('audit_logs_created_at_idx').on(table.createdAt)
	})
);

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
	sessions: many(sessions),
	createdPartners: many(partners, { relationName: 'createdBy' }),
	selectedSchools: many(schools, { relationName: 'selectedBy' }),
	uploadedSchools: many(schools, { relationName: 'uploadedBy' }),
	submittedSurveys: many(surveyResponses, { relationName: 'submittedBy' }),
	editedSurveys: many(surveyResponses, { relationName: 'lastEditedBy' }),
	auditLogs: many(auditLogs)
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
	user: one(users, {
		fields: [sessions.userId],
		references: [users.id]
	})
}));

export const partnersRelations = relations(partners, ({ many, one }) => ({
	districts: many(districts),
	schools: many(schools),
	surveys: many(surveyResponses),
	creator: one(users, {
		fields: [partners.createdBy],
		references: [users.id],
		relationName: 'createdBy'
	})
}));

export const districtsRelations = relations(districts, ({ many, one }) => ({
	partner: one(partners, {
		fields: [districts.partnerId],
		references: [partners.id]
	}),
	schools: many(schools),
	surveys: many(surveyResponses)
}));

export const schoolsRelations = relations(schools, ({ many, one }) => ({
	district: one(districts, {
		fields: [schools.districtId],
		references: [districts.id]
	}),
	partner: one(partners, {
		fields: [schools.partnerId],
		references: [partners.id]
	}),
	selector: one(users, {
		fields: [schools.selectedBy],
		references: [users.id],
		relationName: 'selectedBy'
	}),
	uploader: one(users, {
		fields: [schools.uploadedBy],
		references: [users.id],
		relationName: 'uploadedBy'
	}),
	surveys: many(surveyResponses)
}));

export const surveyResponsesRelations = relations(surveyResponses, ({ one }) => ({
	school: one(schools, {
		fields: [surveyResponses.schoolId],
		references: [schools.id]
	}),
	partner: one(partners, {
		fields: [surveyResponses.partnerId],
		references: [partners.id]
	}),
	district: one(districts, {
		fields: [surveyResponses.districtId],
		references: [districts.id]
	}),
	submittedByUser: one(users, {
		fields: [surveyResponses.submittedBy],
		references: [users.id],
		relationName: 'submittedBy'
	}),
	lastEditedByUser: one(users, {
		fields: [surveyResponses.lastEditedBy],
		references: [users.id],
		relationName: 'lastEditedBy'
	})
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
	user: one(users, {
		fields: [auditLogs.userId],
		references: [users.id]
	})
}));
