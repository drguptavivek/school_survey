import { z } from 'zod';

const schoolBaseSchema = z.object({
	name: z
		.string()
		.trim()
		.min(2, 'School name is required')
		.max(255, 'School name is too long'),
	districtId: z
		.string()
		.min(1, 'District is required')
		.uuid({ message: 'Please select a valid district' }),
	partnerId: z
		.string()
		.min(1, 'Partner is required')
		.uuid({ message: 'Please select a valid partner' }),
	address: z
		.string()
		.trim()
		.max(500, 'Address is too long')
		.optional()
		.or(z.literal('')),
	principalName: z
		.string()
		.trim()
		.max(255, 'Principal name is too long')
		.optional()
		.or(z.literal('')),
	contactPhone: z
		.string()
		.trim()
		.max(50, 'Contact phone is too long')
		.optional()
		.or(z.literal(''))
		.refine(
			(val) => {
				if (!val) return true; // Optional field
				// Allow phone numbers with digits, +, -, (), and spaces
				// Must have at least 10 digits
				const digitsOnly = val.replace(/\D/g, '');
				return digitsOnly.length >= 10;
			},
			{ message: 'Phone number must have at least 10 digits' }
		),
	schoolType: z
		.enum(['govt', 'private', 'aided', 'other'], {
			errorMap: () => ({ message: 'Please select a valid school type' })
		})
		.optional(),
	areaType: z
		.enum(['rural', 'urban'], {
			errorMap: () => ({ message: 'Please select rural or urban' })
		})
		.optional(),
	gpsLatitude: z
		.string()
		.trim()
		.optional()
		.or(z.literal(''))
		.refine(
			(val) => {
				if (!val) return true;
				const num = parseFloat(val);
				return !isNaN(num) && num >= -90 && num <= 90;
			},
			{ message: 'Latitude must be between -90 and 90' }
		),
	gpsLongitude: z
		.string()
		.trim()
		.optional()
		.or(z.literal(''))
		.refine(
			(val) => {
				if (!val) return true;
				const num = parseFloat(val);
				return !isNaN(num) && num >= -180 && num <= 180;
			},
			{ message: 'Longitude must be between -180 and 180' }
		),
	hasPrimary: z.boolean().optional().default(false),
	hasMiddle: z.boolean().optional().default(false),
	hasTenth: z.boolean().optional().default(false),
	has12th: z.boolean().optional().default(false),
	coEdType: z
		.enum(['boys', 'girls', 'coed'], {
			errorMap: () => ({ message: 'Please select boys, girls, or coed' })
		})
		.optional(),
	totalStudentStrength: z
		.string()
		.trim()
		.optional()
		.or(z.literal(''))
		.refine(
			(val) => {
				if (!val) return true;
				const num = parseInt(val, 10);
				return !isNaN(num) && num >= 0;
			},
			{ message: 'Student strength must be a positive number' }
		),
	comments: z
		.string()
		.trim()
		.max(1000, 'Comments are too long')
		.optional()
		.or(z.literal(''))
});

export const schoolCreateSchema = schoolBaseSchema;

export const schoolUpdateSchema = schoolBaseSchema.extend({
	id: z.string().uuid({ message: 'School id is required' })
});

export type SchoolCreateInput = z.infer<typeof schoolCreateSchema>;
export type SchoolUpdateInput = z.infer<typeof schoolUpdateSchema>;
