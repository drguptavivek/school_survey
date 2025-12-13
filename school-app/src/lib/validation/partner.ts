import { z } from 'zod';

const phoneRegex = /^[0-9+()\-\s]{6,20}$/;

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

export const partnerInputSchema = z.object({
	name: z
		.string()
		.trim()
		.min(2, 'Name is required')
		.max(255, 'Name is too long'),
	code: z
		.string()
		.trim()
		.min(2, 'Code is required')
		.max(50, 'Code is too long')
		.transform((val) => val.toUpperCase()),
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
		.regex(phoneRegex, 'Phone must be 6-20 digits/symbols')
		.optional()
		.or(z.literal(''))
		.transform((v) => (v ? v : null)),
	isActive: booleanString
});

export const partnerWithIdSchema = partnerInputSchema.extend({
	id: z.string().uuid({ message: 'Partner id is required' })
});

export type PartnerInput = z.infer<typeof partnerInputSchema>;
export type PartnerWithId = z.infer<typeof partnerWithIdSchema>;
