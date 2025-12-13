<script lang="ts">
	import type { PageData } from './$types';

	export let data: PageData;

	let search = data.search ?? '';
	let selectedState = data.state ?? '';
	let searchForm: HTMLFormElement | null = null;

	const clearSearch = () => {
		search = '';
		selectedState = '';
		searchForm?.reset();
		searchForm?.requestSubmit();
	};

	const clearStateFilter = () => {
		selectedState = '';
		searchForm?.reset();
		searchForm?.requestSubmit();
	};
</script>

<div class="space-y-4">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<div>
			<form method="GET" action="/districts" class="flex items-center gap-2" bind:this={searchForm}>
				<label class="sr-only" for="district-search">Search Districts</label>
				<input
					id="district-search"
					type="search"
					name="q"
					placeholder="Search by name, code, state, partner"
					class="w-64 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
					bind:value={search}
					on:input={(event) => {
						const target = event.target as HTMLInputElement;
						search = target.value;
					}}
					aria-label="Search districts by name, code, state, or partner"
				/>
				<select
					name="state"
					class="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
					bind:value={selectedState}
					on:change={(event) => {
						selectedState = (event.target as HTMLSelectElement).value;
						searchForm?.requestSubmit();
					}}
					aria-label="Filter by state"
				>
					<option value="">All States</option>
					{#each data.districts as district}
						<option value={district.state}>{district.state}</option>
					{/each}
				</select>
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
				{#if selectedState}
					<button
						type="button"
						class="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-500 hover:border-slate-300"
						on:click={clearStateFilter}
					>
						Clear State
					</button>
				{/if}
			</form>
		</div>

		<div>
		<a
				class="rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-sky-800"
				href="/districts/add"
			>Add District
		</a>
		</div>
	</div>
	</div>
	<br/>
	
	{#if selectedState}
		<div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm mb-4">
			<div class="flex items-center justify-between">
				<h2 class="text-lg font-semibold text-slate-900">
					Districts in {selectedState}
					<span class="text-xs text-slate-500 ml-2">
						({data.districts.filter(d => d.state === selectedState).length} districts)
					</span>
				</h2>
				<button
					type="button"
					class="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-500 hover:border-slate-300"
					on:click={clearStateFilter}
				>
					View All Districts
				</button>
			</div>
			<div class="mt-3 overflow-x-auto">
				<table class="min-w-full text-sm">
					<thead class="text-left text-slate-600">
						<tr class="border-b border-slate-200">
							<th class="py-2 pr-3">Name</th>
							<th class="py-2 pr-3">Code</th>
							<th class="py-2 pr-3">Partner</th>
							<th class="py-2 pr-3">Schools</th>
							<th class="py-2 pr-3 text-right">Actions</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-200">
						{#each data.districts.filter(d => d.state === selectedState) as district}
							<tr>
								<td class="py-2 pr-3">
									<div class="font-semibold text-slate-900">{district.name}</div>
									<div class="text-xs text-slate-500">ID: {district.id}</div>
								</td>
								<td class="py-2 pr-3 text-slate-700">{district.code}</td>
								<td class="py-2 pr-3 text-slate-700">
									<div class="font-medium">{district.partnerName ?? 'Unassigned'}</div>
									<div class="text-xs text-slate-500">ID: {district.partnerId}</div>
								</td>
								<td class="py-2 pr-3 text-slate-700">
									<span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">
										{district.schoolCount}
									</span>
								</td>
								<td class="py-2 pr-3 text-right">
									<a
										href={`/districts/${district.id}/edit`}
										class="text-sky-700 hover:text-sky-900 text-xs font-semibold"
									>
										Edit
									</a>
								</td>
							</tr>
						{/each}
					</tbody>
			</table>
		</div>
	</div>
	{/if}


	{#if !selectedState}
	<div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
		<div class="flex items-center justify-between">
			<h2 class="text-lg font-semibold text-slate-900">All Districts</h2>
			<span class="text-xs text-slate-500 ml-2">
				({data.districts.length} total)
			</span>
		</div>
		<div class="mt-3 overflow-x-auto">
			<table class="min-w-full text-sm">
				<thead class="text-left text-slate-600">
					<tr class="border-b border-slate-200">
						<th class="py-2 pr-3">Name</th>
						<th class="py-2 pr-3">Code</th>
						<th class="py-2 pr-3">State/UT</th>
						<th class="py-2 pr-3">Partner</th>
						<th class="py-2 pr-3">Schools</th>
						<th class="py-2 pr-3 text-right">Actions</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-200">
					{#each data.districts as district}
						<tr>
							<td class="py-2 pr-3">
								<div class="font-semibold text-slate-900">{district.name}</div>
								<div class="text-xs text-slate-500">ID: {district.id}</div>
							</td>
							<td class="py-2 pr-3 text-slate-700">{district.code}</td>
							<td class="py-2 pr-3 text-slate-700">{district.state ?? '—'}</td>
							<td class="py-2 pr-3 text-slate-700">
								<div class="font-medium">{district.partnerName ?? 'Unassigned'}</div>
								<div class="text-xs text-slate-500">ID: {district.partnerId}</div>
							</td>
							<td class="py-2 pr-3 text-slate-700">
								<span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">
									{district.schoolCount}
								</span>
							</td>
							<td class="py-2 pr-3 text-right">
								<a
									href={`/districts/${district.id}/edit`}
									class="text-sky-700 hover:text-sky-900 text-xs font-semibold"
								>
									Edit
								</a>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
	{/if}
