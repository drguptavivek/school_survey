<script lang="ts">
	import type { ActionData, PageData } from './$types';

	export let data: PageData;
	export let form: ActionData;

	let search = data.search ?? '';
	let searchForm: HTMLFormElement | null = null;
	let editingId = '';
	let editValues = {
		id: '',
		name: '',
		code: '',
		contactEmail: '',
		contactPhone: '',
		isActive: true
	};

const errors = form?.errors ?? {};
let showEditModal = false;
let showCreateModal = false;
const onKeydown = (event: KeyboardEvent) => {
	if (event.key === 'Escape') {
		showCreateModal = false;
		showEditModal = false;
	}
};

	const setEditPartner = (id: string) => {
		const p = data.partners.find((item) => item.id === id);
		if (!p) return;
		editingId = id;
		editValues = {
			id: p.id,
			name: p.name,
			code: p.code,
			contactEmail: p.contactEmail ?? '',
			contactPhone: p.contactPhone ?? '',
			isActive: p.isActive
		};
		showEditModal = true;
	};

	const clearSearch = () => {
		search = '';
		searchForm?.reset();
		searchForm?.requestSubmit();
	};
</script>

<div class="space-y-4" on:keydown={onKeydown} tabindex="-1">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<div>
			<p class="text-xs font-semibold uppercase tracking-wide text-sky-700">Partners</p>
			<h1 class="text-2xl font-bold text-slate-900">Manage partners</h1>
			<p class="text-sm text-slate-600">Create or edit partner records; mappings handled separately.</p>
		</div>
		<div class="flex items-center gap-2">
			<form method="GET" action="/partners" class="flex items-center gap-2" bind:this={searchForm}>
				<input
					type="search"
					name="q"
					placeholder="Search by name, code, email"
					class="w-64 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
					bind:value={search}
					on:search={(e) => {
						search = (e.target as HTMLInputElement).value;
						if (!search) {
							void clearSearch();
						}
					}}
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
			<button
				type="button"
				class="rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-sky-800"
				on:click={() => (showCreateModal = true)}
			>
				Add Partner
			</button>
		</div>
	</div>

	<div class="grid gap-4 lg:grid-cols-[2fr,1fr]">
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
							<th class="py-2 pr-3">Districts</th>
							<th class="py-2 pr-3">Status</th>
							<th class="py-2 pr-3"></th>
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
									<button
										type="button"
										class="text-sky-700 hover:text-sky-900 text-xs font-semibold"
										on:click={() => setEditPartner(partner.id)}
									>
										Edit
									</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>

		<div class="space-y-3">
		</div>
	</div>
</div>

{#if showCreateModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-8">
		<div class="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
			<div class="flex items-start justify-between">
				<div>
					<h2 class="text-lg font-semibold text-slate-900">Add partner</h2>
					<p class="text-xs text-slate-500">Create a partner; you can map districts later.</p>
				</div>
				<button
					type="button"
					class="text-slate-500 hover:text-slate-700"
					on:click={() => (showCreateModal = false)}
					aria-label="Close"
				>
					✕
				</button>
			</div>

			<form method="POST" action="?/create" class="mt-4 space-y-3">
				<label class="block text-sm text-slate-700">
					Name
					<input
						name="name"
						required
						class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
					/>
					{#if errors.name}
						<p class="text-xs text-red-600 mt-1">{errors.name[0]}</p>
					{/if}
				</label>
				<label class="block text-sm text-slate-700">
					Code
					<input
						name="code"
						required
						class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-400 focus:ring-2 focus:ring-sky-100 uppercase"
					/>
					{#if errors.code}
						<p class="text-xs text-red-600 mt-1">{errors.code[0]}</p>
					{/if}
				</label>
				<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
					<label class="block text-sm text-slate-700">
						Contact email
						<input
							type="email"
							name="contactEmail"
							class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
						/>
						{#if errors.contactEmail}
							<p class="text-xs text-red-600 mt-1">{errors.contactEmail[0]}</p>
						{/if}
					</label>
					<label class="block text-sm text-slate-700">
						Contact phone
						<input
							name="contactPhone"
							class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
						/>
						{#if errors.contactPhone}
							<p class="text-xs text-red-600 mt-1">{errors.contactPhone[0]}</p>
						{/if}
					</label>
				</div>
				<label class="flex items-center gap-2 text-sm text-slate-700">
					<input type="checkbox" name="isActive" checked class="rounded border-slate-300" />
					Active
				</label>
				<div class="flex items-center justify-end gap-2 pt-2">
					<button
						type="button"
						class="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-300"
						on:click={() => (showCreateModal = false)}
					>
						Cancel
					</button>
					<button
						type="submit"
						class="rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-sky-800"
					>
						Save partner
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

{#if showEditModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-8">
		<div class="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
			<div class="flex items-start justify-between">
				<div>
					<h2 class="text-lg font-semibold text-slate-900">Edit partner</h2>
					<p class="text-xs text-slate-500">Select a partner, adjust details, and save.</p>
				</div>
				<button
					type="button"
					class="text-slate-500 hover:text-slate-700"
					on:click={() => (showEditModal = false)}
					aria-label="Close"
				>
					✕
				</button>
			</div>

			<form method="POST" action="?/update" class="mt-4 space-y-3">
				<input type="hidden" name="id" value={editValues.id} />
				<label class="block text-sm text-slate-700">
					Name
					<input
						name="name"
						required
						value={editValues.name}
						on:input={(e) => (editValues.name = (e.target as HTMLInputElement).value)}
						class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
					/>
					{#if errors.name}
						<p class="text-xs text-red-600 mt-1">{errors.name[0]}</p>
					{/if}
				</label>
				<label class="block text-sm text-slate-700">
					Code
					<input
						name="code"
						required
						value={editValues.code}
						on:input={(e) => (editValues.code = (e.target as HTMLInputElement).value)}
						class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-400 focus:ring-2 focus:ring-sky-100 uppercase"
					/>
					{#if errors.code}
						<p class="text-xs text-red-600 mt-1">{errors.code[0]}</p>
					{/if}
				</label>
				<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
					<label class="block text-sm text-slate-700">
						Contact email
						<input
							type="email"
							name="contactEmail"
							value={editValues.contactEmail}
							on:input={(e) => (editValues.contactEmail = (e.target as HTMLInputElement).value)}
							class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
						/>
						{#if errors.contactEmail}
							<p class="text-xs text-red-600 mt-1">{errors.contactEmail[0]}</p>
						{/if}
					</label>
					<label class="block text-sm text-slate-700">
						Contact phone
						<input
							name="contactPhone"
							value={editValues.contactPhone}
							on:input={(e) => (editValues.contactPhone = (e.target as HTMLInputElement).value)}
							class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
						/>
						{#if errors.contactPhone}
							<p class="text-xs text-red-600 mt-1">{errors.contactPhone[0]}</p>
						{/if}
					</label>
				</div>
				<label class="flex items-center gap-2 text-sm text-slate-700">
					<input
						type="checkbox"
						name="isActive"
						checked={editValues.isActive}
						on:change={(e) => (editValues.isActive = (e.target as HTMLInputElement).checked)}
						class="rounded border-slate-300"
					/>
					Active
				</label>
				<div class="flex items-center justify-end gap-2 pt-2">
					<button
						type="button"
						class="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-300"
						on:click={() => (showEditModal = false)}
					>
						Cancel
					</button>
					<button
						type="submit"
						class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-700 disabled:opacity-60"
						disabled={!editingId}
					>
						Save changes
					</button>
				</div>
				{#if !editingId}
					<p class="text-xs text-slate-500">Select a partner row to load it into the edit form.</p>
				{/if}
			</form>
		</div>
	</div>
{/if}
