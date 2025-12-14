/**
 * Client-side delete utilities for role-based deletion
 * Enforces delete button visibility and confirms user intent
 */

import type { UserRole } from '$lib/server/guards';

export type DeleteContext = 'partner' | 'district' | 'school' | 'user';

/**
 * Check if current user can delete an item based on their role
 * - national_admin: can delete anything
 * - partner_manager: can delete their own partner's schools and users
 * - data_manager: cannot delete
 * - team_member: cannot delete
 */
export function canDeleteItem(
	userRole: UserRole,
	itemContext: DeleteContext,
	itemPartnerId?: string,
	userPartnerId?: string
): boolean {
	if (userRole === 'national_admin') {
		return true; // Can delete anything
	}

	if (userRole === 'partner_manager') {
		// Partner managers can only delete schools and users in their own partner
		if (itemContext === 'school' || itemContext === 'user') {
			return itemPartnerId === userPartnerId;
		}
	}

	return false;
}

/**
 * Get delete confirmation message based on item type
 */
export function getDeleteConfirmMessage(itemContext: DeleteContext, itemName: string): string {
	const messages: Record<DeleteContext, string> = {
		partner: `Delete partner "${itemName}"? This will mark all associated districts and schools as deleted.`,
		district: `Delete district "${itemName}"? This will mark all associated schools as deleted.`,
		school: `Delete school "${itemName}"? This action cannot be undone.`,
		user: `Delete user "${itemName}"? This action cannot be undone.`
	};

	return messages[itemContext];
}

/**
 * Perform soft delete via API
 */
export async function deleteItem(
	itemType: DeleteContext,
	itemId: string,
	itemName: string
): Promise<{ success: boolean; error?: string; details?: string }> {
	const message = getDeleteConfirmMessage(itemType, itemName);

	if (!confirm(message)) {
		return { success: false, error: 'Cancelled by user' };
	}

	try {
		const response = await fetch(`/${itemType}s/${itemId}/delete`, {
			method: 'DELETE',
			headers: {
				'Content-Type': 'application/json'
			}
		});

		if (response.ok) {
			const result = await response.json();
			return { success: true };
		} else {
			const error = await response.json();
			return {
				success: false,
				error: error.error || 'Delete failed',
				details: error.details
			};
		}
	} catch (err) {
		return {
			success: false,
			error: 'Network error',
			details: String(err)
		};
	}
}
