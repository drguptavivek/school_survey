import { z } from 'zod';
import { INDIAN_STATES_UTS } from '$lib/data/indian-states';

const districtBaseSchema = z.object({
	name: z
		.string()
		.trim()
		.min(2, 'District name is required')
		.max(255, 'District name is too long'),
	state: z
		.enum(INDIAN_STATES_UTS)
		.catch(INDIAN_STATES_UTS[0]),
	partnerId: z
		.string()
		.uuid({ message: 'Please select a valid partner' })
		.refine((val) => val !== '', { message: 'Partner is required' })
});

export const districtCreateSchema = districtBaseSchema;

export const districtUpdateSchema = districtBaseSchema.extend({
	id: z.string().uuid({ message: 'District id is required' })
});

export type DistrictCreateInput = z.infer<typeof districtCreateSchema>;
export type DistrictUpdateInput = z.infer<typeof districtUpdateSchema>;