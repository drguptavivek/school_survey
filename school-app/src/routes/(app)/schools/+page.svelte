<script lang="ts">
	import type { PageData } from './$types';

	export let data: PageData;

	let search = data.search ?? '';
	let selectedDistrict = data.district ?? '';
	let selectedState = data.state ?? '';
	let searchForm: HTMLFormElement | null = null;

	const clearSearch = () => {
		search = '';
		selectedDistrict = '';
		selectedState = '';
		searchForm?.reset();
		searchForm?.requestSubmit();
	};

	const clearFilters = () => {
		selectedDistrict = '';
		selectedState = '';
		searchForm?.reset();
		searchForm?.requestSubmit();
	};
</script>

<div class="space-y-4">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<div>
			<form method="GET" action="/schools" class="flex items-center gap-2" bind:this={searchForm}>
				<label class="sr-only" for="school-search">Search schools</label>
				<input
					id="school-search"
					type="search"
					name="q"
					placeholder="Search by name, code, district, state"
					class="w-64 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
					bind:value={search}
					on:input={(event) => {
						const target = event.target as HTMLInputElement;
						search = target.value;
					}}
					aria-label="Search schools by name, code, district, or state"
				/>
				<select
					name="state"
					class="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
					bind:value={selectedState}
					on:change={(event) => {
						selectedState = (event.target as HTMLSelectElement).value;
						selectedDistrict = '';
						searchForm?.requestSubmit();
					}}
					aria-label="Filter by state"
				>
					<option value="">All States</option>
					{#each data.states as state (state)}
						<option value={state}>{state}</option>
					{/each}
				</select>
				<select
					name="district"
					class="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
					bind:value={selectedDistrict}
					on:change={(event) => {
						selectedDistrict = (event.target as HTMLSelectElement).value;
						searchForm?.requestSubmit();
					}}
					aria-label="Filter by district"
				>
					<option value="">All Districts</option>
					{#each data.districts as district (district.id)}
						{#if !selectedState || district.state === selectedState}
							<option value={district.id}>{district.name} ({district.state})</option>
						{/if}
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
			</form>
		</div>
		<div>
			<a
				class="rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-sky-800"
				href="/schools/add"
			>
				Add School
			</a>
		</div>
	</div>

	<!-- Schools Table -->
	<div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
		<div class="flex items-center justify-between mb-4">
			<h2 class="text-lg font-semibold text-slate-900">
				{#if selectedDistrict}
					Schools in Selected District
				{:else if selectedState}
					Schools in {selectedState}
				{:else}
					All Schools
				{/if}
				<span class="text-xs text-slate-500 ml-2">
					({data.schools.length} total)
				</span>
			</h2>
			{#if selectedDistrict || selectedState}
				<button
					type="button"
					class="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-500 hover:border-slate-300"
					on:click={clearFilters}
				>
					View All Schools
				</button>
			{/if}
		</div>

		{#if data.schools.length > 0}
			<div class="overflow-x-auto">
				<table class="min-w-full text-sm">
					<thead class="text-left text-slate-600">
						<tr class="border-b border-slate-200">
							<th class="py-2 pr-3">Name</th>
							<th class="py-2 pr-3">Code</th>
							<th class="py-2 pr-3">District</th>
							<th class="py-2 pr-3">State</th>
							<th class="py-2 pr-3">Partner</th>
							<th class="py-2 pr-3">Survey Status</th>
							<th class="py-2 pr-3 text-right">Actions</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-200">
						{#each data.schools as school (school.id)}
							<tr>
								<td class="py-2 pr-3">
									<div class="font-semibold text-slate-900">{school.name}</div>
								</td>
								<td class="py-2 pr-3 text-slate-700 font-mono">{school.code}</td>
								<td class="py-2 pr-3 text-slate-700">{school.districtName ?? '—'}</td>
								<td class="py-2 pr-3 text-slate-700">{school.districtState ?? '—'}</td>
								<td class="py-2 pr-3 text-slate-700">{school.partnerName ?? 'Unassigned'}</td>
								<td class="py-2 pr-3">
									<div class="flex items-center gap-2">
										{#if school.isSelectedForSurvey}
											<span class="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
												Selected
											</span>
										{:else}
											<span class="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
												Not Selected
											</span>
										{/if}
										{#if school.hasSurveyData}
											<span class="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">
												Has Data
											</span>
										{/if}
									</div>
								</td>
								<td class="py-2 pr-3 text-right">
									<a
										href={`/schools/${school.id}/edit`}
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
		{:else}
			<div class="text-center py-8">
				<p class="text-slate-600">No schools found. <a href="/schools/add" class="text-sky-700 font-semibold hover:text-sky-900">Add one now.</a></p>
			</div>
		{/if}
	</div>
</div>
