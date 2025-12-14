import { z } from 'zod';

const userCoreSchema = z.object({
	name: z
		.string()
		.trim()
		.min(2, 'Name is required')
		.max(255, 'Name is too long'),
	email: z
		.string()
		.trim()
		.min(1, 'Email is required')
		.max(255, 'Email is too long')
		.email('Please enter a valid email address'),
	phoneNumber: z
		.string()
		.trim()
		.min(10, 'Phone number must be exactly 10 digits')
		.max(10, 'Phone number must be exactly 10 digits')
		.regex(/^\d{10}$/, 'Phone number must contain only digits'),
	role: z
		.enum(['national_admin', 'data_manager', 'partner_manager', 'team_member'], {
			message: 'Please select a valid role'
		}),
	partnerId: z.string().uuid().optional().or(z.literal('')).transform((v) => (v ? v : undefined)),
	active: z
		.enum(['Y', 'N'], {
			message: 'Please select Y or N'
		})
		.default('Y'),
	dateActiveTill: z
		.string()
		.trim()
		.optional()
		.or(z.literal(''))
		.refine(
			(val) => {
				if (!val) return true; // Optional field
				// Validate dd/mm/yyyy format
				const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
				if (!regex.test(val)) return false;
				
				const match = val.match(regex);
				if (!match) return false;
				
				const [, day, month, year] = match;
				const date = new Date(`${year}-${month}-${day}`);
				
				// Check if date is valid
				return !isNaN(date.getTime()) && 
					parseInt(day) === date.getDate() &&
					parseInt(month) === date.getMonth() + 1 &&
					parseInt(year) === date.getFullYear();
			},
			{ message: 'Date must be in dd/mm/yyyy format and be a valid date' }
		),
	yearsOfExperience: z
		.string()
		.trim()
		.optional()
		.or(z.literal(''))
		.refine(
			(val) => {
				if (!val) return true; // Optional field
				const num = parseInt(val, 10);
				return !isNaN(num) && num >= 0 && num <= 99;
			},
			{ message: 'Years of experience must be between 0 and 99' }
		)
});

function requirePartnerForRole(data: { role: string; partnerId?: string }, ctx: z.RefinementCtx) {
	if ((data.role === 'partner_manager' || data.role === 'team_member') && !data.partnerId) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			path: ['partnerId'],
			message: 'Partner is required for this role'
		});
	}
}

export const userCreateSchema = userCoreSchema.superRefine(requirePartnerForRole);

export const userUpdateSchema = userCoreSchema
	.extend({
	id: z.string().uuid({ message: 'User id is required' })
	})
	.superRefine(requirePartnerForRole);

export type UserCreateInput = z.infer<typeof userCreateSchema>;
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;
