<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import type { PartnerInput } from '$lib/validation/partner';

	export let data: PageData;
	export let form: ActionData;

	type PartnerErrors = Partial<
		Record<'name' | 'code' | 'contactEmail' | 'contactPhone' | 'isActive', string[]>
	>;

	const errors: PartnerErrors | null = form?.errors ?? (data.errors as PartnerErrors | null);
	const values: PartnerInput = form?.values ?? data.values;

	const phonePattern = '[0-9+()\\-\\s]{6,20}';
</script>

<div class="max-w-3xl space-y-6">
	<div>
		<p class="text-xs font-semibold uppercase tracking-wide text-sky-700">Partners</p>
		<h1 class="text-2xl font-bold text-slate-900">Add partner</h1>
		<p class="text-sm text-slate-600">Create a new partner record. All fields except contact details are required.</p>
	</div>

	<form method="POST" class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
			<label class="block text-sm text-slate-700">
				Name
				<input
					name="name"
					required
					maxlength="255"
					value={values.name}
					class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
				/>
				{#if errors?.name}
					<p class="text-xs text-red-600 mt-1">{errors.name[0]}</p>
				{/if}
			</label>

			<label class="block text-sm text-slate-700">
				Code
				<input
					name="code"
					required
					maxlength="50"
					value={values.code}
					class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-400 focus:ring-2 focus:ring-sky-100 uppercase"
				/>
				{#if errors?.code}
					<p class="text-xs text-red-600 mt-1">{errors.code[0]}</p>
				{/if}
			</label>
		</div>

		<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
			<label class="block text-sm text-slate-700">
				Contact email
				<input
					type="email"
					name="contactEmail"
					maxlength="255"
					value={values.contactEmail ?? ''}
					class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
				/>
				{#if errors?.contactEmail}
					<p class="text-xs text-red-600 mt-1">{errors.contactEmail[0]}</p>
				{/if}
			</label>
				<label class="block text-sm text-slate-700">
					Contact phone
					<input
						name="contactPhone"
						pattern={phonePattern}
						title="6-20 characters; digits, spaces, + ( ) -"
						maxlength="50"
						value={values.contactPhone ?? ''}
					class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
				/>
				{#if errors?.contactPhone}
					<p class="text-xs text-red-600 mt-1">{errors.contactPhone[0]}</p>
				{/if}
			</label>
		</div>

		<label class="flex items-center gap-2 text-sm text-slate-700">
			<input
				type="checkbox"
				name="isActive"
				checked={values.isActive}
				class="rounded border-slate-300"
			/>
			Active
		</label>

		<div class="flex items-center gap-3 pt-2">
			<a
				href="/partners"
				class="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-300"
			>
				Back
			</a>
			<button
				type="submit"
				class="rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-sky-800"
			>
				Save partner
			</button>
		</div>
	</form>
</div>
