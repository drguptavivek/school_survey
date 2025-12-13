import type { z } from 'zod';

/**
 * Lightweight adapter to use Zod schemas with TanStack Form standard schema validator.
 * Returns a standard schema object expected by TanStack.
 */
export const zodAdapter = <T extends z.ZodTypeAny>(schema: T) => {
	return {
		'~standard': {
			version: 1 as const,
			vendor: 'zod',
			validate: (value: unknown) => {
				const result = schema.safeParse(value);
				if (result.success) {
					return { value: result.data };
				}
				return {
					issues: result.error.issues.map((issue) => ({
						message: issue.message,
						path: issue.path
					}))
				};
			}
		}
	};
};
