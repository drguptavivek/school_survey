import { z } from 'zod';

// Phone: Optional partner phone field, allows +, -, (), and spaces
// Partner phones are optional; when provided, they must have at least 10 digits
const phoneRegex = /^[0-9+()\-\s]{10,20}$/;

const booleanString = z
	.union([z.string(), z.boolean()])
	.transform((value) => {
		if (value === true) return true;
		if (value === false) return false;
		if (typeof value === 'string') {
			const normalized = value.toLowerCase();
			return normalized === 'true' || normalized === 'on' || normalized === '1';
		}
		return false;
	});

const partnerBaseSchema = z.object({
	name: z
		.string()
		.trim()
		.min(2, 'Name is required')
		.max(255, 'Name is too long'),
	contactEmail: z
		.string()
		.trim()
		.email('Invalid email')
		.max(255, 'Email is too long')
		.optional()
		.or(z.literal(''))
		.transform((v) => (v ? v : null)),
	contactPhone: z
		.string()
		.trim()
		.regex(phoneRegex, 'Phone must be 10-20 characters, allowing digits, +, -, (), and spaces')
		.optional()
		.or(z.literal(''))
		.transform((v) => (v ? v : null)),
	comments: z
		.string()
		.trim()
		.max(500, 'Comments too long')
		.optional()
		.or(z.literal(''))
		.transform((v) => (v ? v : null)),
	isActive: booleanString
});

export const partnerCreateSchema = partnerBaseSchema;

export const partnerUpdateSchema = partnerBaseSchema.extend({
	id: z.string().uuid({ message: 'Partner id is required' })
});

export type PartnerCreateInput = z.infer<typeof partnerCreateSchema>;
export type PartnerUpdateInput = z.infer<typeof partnerUpdateSchema>;
