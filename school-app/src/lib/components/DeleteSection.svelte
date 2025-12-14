<script lang="ts">
	import { deleteItem, canDeleteItem, type DeleteContext } from '$lib/client/delete-utils';
	import { goto } from '$app/navigation';
	import type { UserRole } from '$lib/server/guards';

	export let userRole: UserRole;
	export let itemId: string;
	export let itemName: string;
	export let itemContext: DeleteContext;
	export let itemPartnerId: string | undefined;
	export let userPartnerId: string | undefined;
	export let redirectTo: string = '/';

	let isDeleting = false;

	$: canDelete = canDeleteItem(userRole, itemContext, itemPartnerId, userPartnerId);

	async function handleDelete() {
		if (!canDeleteItem(userRole, itemContext, itemPartnerId, userPartnerId)) {
			alert('You do not have permission to delete this item');
			return;
		}

		isDeleting = true;

		const result = await deleteItem(itemContext, itemId, itemName);

		if (result.success) {
			goto(redirectTo);
		} else {
			alert(`Error: ${result.error}\n${result.details || ''}`);
			isDeleting = false;
		}
	}
</script>

{#if canDeleteItem(userRole, itemContext, itemPartnerId, userPartnerId)}
	<div class="rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm">
		<h3 class="text-lg font-semibold text-red-900">Danger Zone</h3>
		<p class="mt-2 text-sm text-red-700">Delete this {itemContext}. This action cannot be undone.</p>
		<button
			on:click={handleDelete}
			disabled={isDeleting}
			class="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
		>
			{isDeleting ? 'Deleting...' : `Delete ${itemContext}`}
		</button>
	</div>
{/if}
