<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import type { DistrictUpdateInput } from '$lib/validation/district';
	import { districtUpdateSchema } from '$lib/validation/district';
	import { zodAdapter } from '$lib/forms/zodAdapter';
	import { createForm } from '@tanstack/svelte-form';
	import { onMount } from 'svelte';
	import { z } from 'zod';
	import { writable } from 'svelte/store';

	export let data: PageData;
	export let form: ActionData;

	type DistrictErrors = Partial<
		Record<'id' | 'name' | 'state' | 'partnerId', string[]>
	>;

	const errors: DistrictErrors | null = form?.errors ?? (data.errors as DistrictErrors | null);
	const values: DistrictUpdateInput & { id?: string } = (form?.values ?? data.values) as DistrictUpdateInput & {
		id?: string;
	};
	const fieldErrors = writable<DistrictErrors>({});

	const formApi = createForm(() => ({
		defaultValues: values,
		validators: {
			onChange: zodAdapter(districtUpdateSchema),
			onSubmit: zodAdapter(districtUpdateSchema)
		},
		onSubmit: () => {
			formEl?.submit();
		}
	}));

	const Field = formApi.Field;

	let formEl: HTMLFormElement | null = null;
	const fieldSchemas: Record<keyof DistrictUpdateInput, z.ZodTypeAny> = {
		name: districtUpdateSchema.shape.name,
		state: districtUpdateSchema.shape.state,
		partnerId: districtUpdateSchema.shape.partnerId,
		id: districtUpdateSchema.shape.id
	};

const validateFieldValue = (key: keyof DistrictUpdateInput, value: unknown) => {
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

	onMount(() => {
		if (values) {
			for (const [key, val] of Object.entries(values)) {
				formApi.setFieldValue(key as keyof DistrictUpdateInput, val as never, { dontValidate: true });
			}
		}
		if (errors) {
			for (const [key, val] of Object.entries(errors)) {
				formApi.setFieldMeta(key as keyof DistrictUpdateInput, (prev) => ({
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
		<h1 class="text-2xl font-bold text-slate-900">Edit district</h1>
		<p class="text-sm text-slate-600">Update district details. Code is auto-generated and read-only.</p>
	</div>

	<form
		method="POST"
		class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4"
		bind:this={formEl}
		on:submit|preventDefault={() => formApi.handleSubmit()}
	>
		<input type="hidden" name="id" value={values.id} />

		<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
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
			<div>
				<label class="block text-sm text-slate-700" for="code">
					Code (read-only)
					<input
						id="code"
						name="code-display"
						value={data.code}
						readonly
						disabled
						class="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
					/>
				</label>
			</div>
		</div>

		<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
			<Field name="state">
				{#snippet children(field)}
					<label class="block text-sm text-slate-700" for="state">
						State/UT
						<input
							id="state"
							name="state"
							required
							maxlength="100"
							value={field.state.value ?? ''}
							on:input={(event) => {
								field.handleChange((event.target as HTMLInputElement).value);
								field.setMeta((prev) => ({ ...prev, isTouched: true }));
								validateFieldValue('state', (event.target as HTMLInputElement).value);
							}}
							on:blur={field.handleBlur}
							class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
							aria-invalid={field.state.meta.errors?.length ? 'true' : 'false'}
							aria-describedby={field.state.meta.errors?.length ? 'state-error' : undefined}
						/>
						{#if $fieldErrors.state?.length}
							<p class="text-xs text-red-600 mt-1" id="state-error">{$fieldErrors.state[0]}</p>
						{/if}
					</label>
				{/snippet}
			</Field>

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
		</div>

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
				class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-700"
				tabindex="0"
			>
				Save changes
			</button>
		</div>
	</form>
</div>