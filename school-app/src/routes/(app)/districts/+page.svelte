<script lang="ts">
	type District = {
		code: string;
		name: string;
		state: string;
		partnerId?: string;
		status: 'active' | 'inactive';
	};

	let filter = '';
	let showCreate = false;

	let districts: District[] = [
		{ code: 'D01', name: 'Northville', state: 'State A', partnerId: 'p-001', status: 'active' },
		{ code: 'D02', name: 'Riverbend', state: 'State A', partnerId: 'p-001', status: 'active' },
		{ code: 'D03', name: 'Lakeside', state: 'State B', partnerId: 'p-002', status: 'active' }
	];

	const filteredDistricts = () =>
		districts.filter(
			(d) =>
				d.name.toLowerCase().includes(filter.toLowerCase()) ||
				d.code.toLowerCase().includes(filter.toLowerCase()) ||
				d.state.toLowerCase().includes(filter.toLowerCase())
		);

	const addDistrict = (event: SubmitEvent) => {
		event.preventDefault();
		const form = event.target as HTMLFormElement;
		const formData = new FormData(form);

		const code = formData.get('code')?.toString().trim().toUpperCase();
		const name = formData.get('name')?.toString().trim();
		const state = formData.get('state')?.toString().trim();

		if (!code || !name || !state) return;

		districts = [
			...districts,
			{
				code,
				name,
				state,
				status: 'active'
			}
		];

		form.reset();
		showCreate = false;
	};
</script>

<div class="space-y-6">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<div>
			<h1 class="text-2xl font-bold text-slate-900">Districts</h1>
			<p class="text-sm text-slate-600">Manage district records and their active status.</p>
		</div>
		<button
			class="rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-sky-800"
			on:click={() => (showCreate = !showCreate)}
		>
			{showCreate ? 'Cancel' : 'Add District'}
		</button>
	</div>

	<div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
		<div class="flex flex-wrap items-center gap-3">
			<input
				type="search"
				placeholder="Search districts..."
				class="w-full max-w-sm rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
				bind:value={filter}
			/>
			<div class="text-sm text-slate-500">Total: {districts.length}</div>
		</div>

		{#if showCreate}
			<form class="mt-6 grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4" on:submit={addDistrict}>
				<div class="grid gap-3 sm:grid-cols-3">
					<label class="text-sm text-slate-700">
						Code
						<input
							name="code"
							required
							class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-400 focus:ring-2 focus:ring-sky-100 uppercase"
						/>
					</label>
					<label class="text-sm text-slate-700">
						Name
						<input
							name="name"
							required
							class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
						/>
					</label>
					<label class="text-sm text-slate-700">
						State
						<input
							name="state"
							required
							class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
						/>
					</label>
				</div>
				<div class="flex justify-end">
					<button
						type="submit"
						class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-700"
					>
						Save district
					</button>
				</div>
			</form>
		{/if}

		<div class="mt-6 divide-y divide-slate-200 rounded-xl border border-slate-200">
			{#each filteredDistricts() as district}
				<div class="grid gap-3 p-4 sm:grid-cols-[1fr,1fr,1fr,0.8fr] sm:items-center">
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
						<p class="text-xs text-slate-500">{district.partnerId ?? 'Unassigned'}</p>
					</div>
					<div class="flex items-center gap-2">
						<span
							class={`rounded-full px-3 py-1 text-xs font-semibold ${
								district.status === 'active'
									? 'bg-emerald-100 text-emerald-700'
									: 'bg-slate-100 text-slate-700'
							}`}
						>
							{district.status}
						</span>
						<button class="ml-auto text-sky-700 hover:text-sky-900 text-xs font-semibold">Edit</button>
					</div>
				</div>
			{/each}
		</div>
	</div>
</div>
