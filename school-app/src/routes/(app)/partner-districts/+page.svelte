<script lang="ts">
	type Partner = { id: string; name: string };
	type District = { code: string; name: string; state: string; partnerId?: string };

	let partners: Partner[] = [
		{ id: 'p-001', name: 'VisionCare Foundation' },
		{ id: 'p-002', name: 'SightFirst Initiative' },
		{ id: 'p-003', name: 'ClearSight Alliance' }
	];

	let districts: District[] = [
		{ code: 'D01', name: 'Northville', state: 'State A', partnerId: 'p-001' },
		{ code: 'D02', name: 'Riverbend', state: 'State A', partnerId: 'p-001' },
		{ code: 'D03', name: 'Lakeside', state: 'State B', partnerId: 'p-002' },
		{ code: 'D04', name: 'Hillcrest', state: 'State B', partnerId: undefined }
	];

	let selectedDistrict = districts[0]?.code ?? '';
	let selectedPartner = districts[0]?.partnerId ?? '';

	const getPartnerName = (partnerId?: string) => partners.find((p) => p.id === partnerId)?.name ?? 'Unassigned';

	const assignMapping = (event: SubmitEvent) => {
		event.preventDefault();
		if (!selectedDistrict) return;

		districts = districts.map((d) =>
			d.code === selectedDistrict
				? {
						...d,
						partnerId: selectedPartner || undefined
				  }
				: d
		);
	};
</script>

<div class="space-y-6">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<div>
			<h1 class="text-2xl font-bold text-slate-900">Partner ↔ District Mapping</h1>
			<p class="text-sm text-slate-600">Map each district to exactly one partner per the business rule.</p>
		</div>
	</div>

	<div class="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
		<div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
			<h2 class="text-lg font-semibold text-slate-900">Existing mappings</h2>
			<p class="text-sm text-slate-600">One district → one partner; partners can own multiple districts.</p>

			<div class="mt-4 divide-y divide-slate-200 rounded-xl border border-slate-200">
				{#each districts as district}
					<div class="grid gap-3 p-4 sm:grid-cols-[1fr,1fr,1fr] sm:items-center">
						<div>
							<p class="text-sm font-semibold text-slate-900">{district.name}</p>
							<p class="text-xs text-slate-500">Code: {district.code}</p>
						</div>
						<div class="text-sm text-slate-700">
							<p class="font-medium">{district.state}</p>
							<p class="text-xs text-slate-500">State</p>
						</div>
						<div class="text-sm text-slate-700">
							<p class="font-medium">Partner</p>
							<p class="text-xs text-slate-500">{getPartnerName(district.partnerId)}</p>
						</div>
					</div>
				{/each}
			</div>
		</div>

		<div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
			<h2 class="text-lg font-semibold text-slate-900">Update mapping</h2>
			<p class="text-sm text-slate-600">Assign or change a district’s partner. Keep 1:1 mapping enforced.</p>

			<form class="mt-4 space-y-4" on:submit={assignMapping}>
				<label class="block text-sm text-slate-700">
					District
					<select
						class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
						bind:value={selectedDistrict}
						required
					>
						<option value="" disabled>Select district</option>
						{#each districts as district}
							<option value={district.code}>
								{district.code} — {district.name}
							</option>
						{/each}
					</select>
				</label>

				<label class="block text-sm text-slate-700">
					Partner
					<select
						class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
						bind:value={selectedPartner}
					>
						<option value="">Unassigned</option>
						{#each partners as partner}
							<option value={partner.id}>
								{partner.name}
							</option>
						{/each}
					</select>
				</label>

				<button
					type="submit"
					class="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-700"
				>
					Save mapping
				</button>
			</form>
		</div>
	</div>
</div>
