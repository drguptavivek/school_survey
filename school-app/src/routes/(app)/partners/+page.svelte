<script lang="ts">
	import type { PageData } from './$types';
	import { deleteItem, canDeleteItem } from '$lib/client/delete-utils';
	import { goto } from '$app/navigation';

	export let data: PageData;

	let search = data.search ?? '';
	let searchForm: HTMLFormElement | null = null;
	let deletingId: string | null = null;

	const clearSearch = () => {
		search = '';
		searchForm?.reset();
		searchForm?.requestSubmit();
	};

	async function handleDelete(partner: any) {
		if (!canDeleteItem(data.user.role, 'partner')) {
			alert('You do not have permission to delete partners');
			return;
		}

		deletingId = partner.id;

		const result = await deleteItem('partner', partner.id, partner.name);

		if (result.success) {
			// Reload the page
			goto('/partners');
		} else {
			alert(`Error: ${result.error}\n${result.details || ''}`);
			deletingId = null;
		}
	}
</script>

<div class="space-y-4">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<div>
			<p class="text-xs font-semibold uppercase tracking-wide text-sky-700">Partners</p>
			<h1 class="text-2xl font-bold text-slate-900">Manage partners</h1>
			<p class="text-sm text-slate-600">View partner records; add new partners from the add page.</p>
		</div>
		<div class="flex items-center gap-2">
			<form method="GET" action="/partners" class="flex items-center gap-2" bind:this={searchForm}>
				<label class="sr-only" for="partner-search">Search partners</label>
				<input
					id="partner-search"
					type="search"
					name="q"
					placeholder="Search by name, code, email"
					class="w-64 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
					bind:value={search}
					on:input={(event) => {
						const target = event.target as HTMLInputElement;
						search = target.value;
					}}
					aria-label="Search partners by name, code, or email"
				/>
				<button
					class="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-sky-300"
					type="submit"
				>
					Search
				</button>
				<button
					type="button"
					class="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-500 hover:border-slate-300"
					on:click={clearSearch}
				>
					Clear
				</button>
			</form>
			<a
				class="rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-sky-800"
				href="/partners/add"
			>
				Add Partner
			</a>
		</div>
	</div>

	<div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
		<div class="flex items-center justify-between">
			<h2 class="text-lg font-semibold text-slate-900">Partner list</h2>
			<span class="text-xs text-slate-500">Total: {data.partners.length}</span>
		</div>
		<div class="mt-3 overflow-x-auto">
			<table class="min-w-full text-sm">
				<thead class="text-left text-slate-600">
					<tr class="border-b border-slate-200">
						<th class="py-2 pr-3">Name</th>
						<th class="py-2 pr-3">Code</th>
						<th class="py-2 pr-3">Contact</th>
						<th class="py-2 pr-3">Comments</th>
						<th class="py-2 pr-3">Districts</th>
						<th class="py-2 pr-3">Status</th>
						<th class="py-2 pr-3 text-right">Actions</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-200">
					{#each data.partners as partner}
						<tr>
							<td class="py-2 pr-3">
								<div class="font-semibold text-slate-900">{partner.name}</div>
								<div class="text-xs text-slate-500">ID: {partner.id}</div>
							</td>
							<td class="py-2 pr-3 text-slate-700">{partner.code}</td>
							<td class="py-2 pr-3 text-slate-700">
								<div>{partner.contactEmail ?? '—'}</div>
								<div class="text-xs text-slate-500">{partner.contactPhone ?? ''}</div>
							</td>
							<td class="py-2 pr-3 text-slate-700 max-w-xs">
								<div class="line-clamp-2 text-xs text-slate-600">{partner.comments ?? '—'}</div>
							</td>
							<td class="py-2 pr-3 text-slate-700">
								<span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">
									{partner.districtCount}
								</span>
							</td>
							<td class="py-2 pr-3">
								<span
									class={`rounded-full px-3 py-1 text-xs font-semibold ${
										partner.isActive
											? 'bg-emerald-100 text-emerald-700'
											: 'bg-slate-100 text-slate-700'
									}`}
								>
									{partner.isActive ? 'Active' : 'Inactive'}
								</span>
							</td>
							<td class="py-2 pr-3 text-right">
								<div class="flex items-center justify-end gap-2">
									<a
										href={`/partners/${partner.id}/edit`}
										class="text-sky-700 hover:text-sky-900 text-xs font-semibold"
									>
										Edit
									</a>
									{#if canDeleteItem(data.user.role, 'partner')}
										<button
											on:click={() => handleDelete(partner)}
											disabled={deletingId === partner.id}
											class="text-red-600 hover:text-red-900 text-xs font-semibold disabled:opacity-50"
										>
											{deletingId === partner.id ? 'Deleting...' : 'Delete'}
										</button>
									{/if}
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</div>
