<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import type { DistrictCreateInput } from '$lib/validation/district';
	import { districtCreateSchema } from '$lib/validation/district';
	import { zodAdapter } from '$lib/forms/zodAdapter';
	import { createForm } from '@tanstack/svelte-form';
	import { onMount } from 'svelte';
	import { z } from 'zod';
	import { writable } from 'svelte/store';

	export let data: PageData;
	export let form: ActionData;

	let isLoadingDistricts = false;

	type DistrictErrors = Partial<
		Record<'name' | 'state' | 'partnerId', string[]>
	>;

	const errors: DistrictErrors | null = form?.errors ?? (data.errors as DistrictErrors | null);
	const values: DistrictCreateInput = (form?.values ?? data.values) as DistrictCreateInput;
	const fieldErrors = writable<DistrictErrors>({});

	const formApi = createForm(() => ({
		defaultValues: values,
		// Client-side validation mirrors the server Zod schema
		validators: {
			onChange: zodAdapter(districtCreateSchema),
			onSubmit: zodAdapter(districtCreateSchema)
		},
		onSubmit: () => {
			// Native submit to hit the server action after client validation succeeds
			formEl?.submit();
		}
	}));

	const Field = formApi.Field;

	let formEl: HTMLFormElement | null = null;
	let existingDistricts: string[] = [];
	let loadingDistricts = false;
	
	const fieldSchemas: Record<keyof DistrictCreateInput, z.ZodTypeAny> = {
		name: districtCreateSchema.shape.name,
		state: districtCreateSchema.shape.state,
		partnerId: districtCreateSchema.shape.partnerId
	};

	const validateFieldValue = (key: keyof DistrictCreateInput, value: unknown) => {
	const result = fieldSchemas[key].safeParse(value);
	const errs = result.success ? [] : result.error.issues.map((err) => err.message);

	formApi.setFieldMeta(key, (prev) => ({
		...prev,
		errors: errs
	}));
	fieldErrors.update((curr) => ({
		...curr,
		[key]: errs
	}));
};

const fetchDistrictsByState = async (state: string) => {
	if (!state) {
		existingDistricts = [];
		return;
	}

	loadingDistricts = true;
	try {
		const response = await fetch(`/districts/add/districts?state=${encodeURIComponent(state)}`);
		if (response.ok) {
			const data = await response.json();
			existingDistricts = data.districts.map((d: any) => d.name);
		} else {
			existingDistricts = [];
		}
	} catch (error) {
		console.error('Error fetching districts:', error);
		existingDistricts = [];
	} finally {
		loadingDistricts = false;
	}
};

	onMount(() => {
		// Rehydrate values/errors from the last action (server response)
		if (values) {
			for (const [key, val] of Object.entries(values)) {
				formApi.setFieldValue(key as keyof DistrictCreateInput, val as never, { dontValidate: true });
			}
		}
		if (errors) {
			for (const [key, val] of Object.entries(errors)) {
				formApi.setFieldMeta(key as keyof DistrictCreateInput, (prev) => ({
					...prev,
					errors: val ?? []
				}));
				fieldErrors.update((curr) => ({
					...curr,
					[key]: val ?? []
				}));
			}
		}
	});
</script>

<div class="max-w-3xl space-y-6">
	<div>
		<p class="text-xs font-semibold uppercase tracking-wide text-sky-700">Districts</p>
		<h1 class="text-2xl font-bold text-slate-900">Add district</h1>
		<p class="text-sm text-slate-600">
			Create a new district record. Code is auto-generated (serial from 101) and cannot be edited.
		</p>
	</div>

	<form
		method="POST"
		class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4"
		bind:this={formEl}
		on:submit|preventDefault={() => formApi.handleSubmit()}
	>
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
			<Field name="state">
				{#snippet children(field)}
					<label class="block text-sm text-slate-700" for="state">
						State/UT
						<select
							id="state"
							name="state"
							required
							value={field.state.value ?? ''}
							on:input={(event) => {
								const stateValue = (event.target as HTMLSelectElement).value;
								field.handleChange(stateValue as any);
								field.setMeta((prev) => ({ ...prev, isTouched: true }));
								validateFieldValue('state', stateValue);
								fetchDistrictsByState(stateValue);
							}}
							on:blur={field.handleBlur}
							class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
							aria-invalid={field.state.meta.errors?.length ? 'true' : 'false'}
							aria-describedby={field.state.meta.errors?.length ? 'state-error' : undefined}
						>
							<option value="">Select State/UT</option>
							{#each data.states as state (state)}
								<option value={state}>{state}</option>
							{/each}
						</select>
						{#if $fieldErrors.state?.length}
							<p class="text-xs text-red-600 mt-1" id="state-error">{$fieldErrors.state[0]}</p>
						{/if}
					</label>
				{/snippet}
			</Field>
			<Field name="name">
				{#snippet children(field)}
					<label class="block text-sm text-slate-700" for="name">
						District Name
						<input
							id="name"
							name="name"
							required
							maxlength="255"
							value={field.state.value ?? ''}
							on:input={(event) => {
								field.handleChange((event.target as HTMLInputElement).value);
								field.setMeta((prev) => ({ ...prev, isTouched: true }));
								validateFieldValue('name', (event.target as HTMLInputElement).value);
							}}
							on:blur={field.handleBlur}
							class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
							aria-invalid={field.state.meta.errors?.length ? 'true' : 'false'}
							aria-describedby={field.state.meta.errors?.length ? 'name-error' : undefined}
						/>
						{#if $fieldErrors.name?.length}
							<p class="text-xs text-red-600 mt-1" id="name-error">{$fieldErrors.name[0]}</p>
						{/if}
					</label>
				{/snippet}
			</Field>
		</div>
		<Field name="partnerId">
			{#snippet children(field)}
				<label class="block text-sm text-slate-700" for="partnerId">
					Partner
					<select
						id="partnerId"
						name="partnerId"
						required
						value={field.state.value ?? ''}
						on:input={(event) => {
							field.handleChange((event.target as HTMLSelectElement).value);
							field.setMeta((prev) => ({ ...prev, isTouched: true }));
							validateFieldValue('partnerId', (event.target as HTMLSelectElement).value);
						}}
						on:blur={field.handleBlur}
						class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
						aria-invalid={field.state.meta.errors?.length ? 'true' : 'false'}
						aria-describedby={field.state.meta.errors?.length ? 'partnerId-error' : undefined}
					>
						<option value="">Select a partner</option>
						{#each data.partners as partner (partner.id)}
							<option value={partner.id}>{partner.name} ({partner.code})</option>
						{/each}
					</select>
					{#if $fieldErrors.partnerId?.length}
						<p class="text-xs text-red-600 mt-1" id="partnerId-error">{$fieldErrors.partnerId[0]}</p>
					{/if}
				</label>
			{/snippet}
		</Field>
		<div class="flex items-center gap-3 pt-2">
			<a
				href="/districts"
				class="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-300"
				tabindex="0"
			>
				Back
			</a>
			<button
				type="submit"
				class="rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-sky-800"
				tabindex="0"
			>
				Save district
			</button>
		</div>
	</form>
	<div id="existingDistcricts" class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
		<p class="text-sm font-semibold text-slate-700 mb-3">
			Existing Districts in Selected State
		</p>
		{#if loadingDistricts}
			<p class="text-sm text-slate-500">Loading districts...</p>
		{:else if existingDistricts.length > 0}
			<button class="rounded-lg outline outline-amber-800  px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm  ">
				{existingDistricts.join(', ')}
			</button>
		{:else}
			<p class="text-sm text-slate-500 italic">No districts found for the selected state.</p>
		{/if}
	</div>
</div>