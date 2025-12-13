<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import type { PartnerCreateInput } from '$lib/validation/partner';
	import { partnerCreateSchema } from '$lib/validation/partner';
	import { zodAdapter } from '$lib/forms/zodAdapter';
	import { createForm } from '@tanstack/svelte-form';
	import { onMount } from 'svelte';
	import { z } from 'zod';
	import { writable } from 'svelte/store';

	export let data: PageData;
	export let form: ActionData;

	type PartnerErrors = Partial<
		Record<'name' | 'contactEmail' | 'contactPhone' | 'comments' | 'isActive', string[]>
	>;

	const errors: PartnerErrors | null = form?.errors ?? (data.errors as PartnerErrors | null);
	const values: PartnerCreateInput = (form?.values ?? data.values) as PartnerCreateInput;
	const fieldErrors = writable<PartnerErrors>({});

	const phonePattern = '[0-9+()\\-\\s]{6,20}';

	const formApi = createForm(() => ({
		defaultValues: values,
		// Client-side validation mirrors the server Zod schema
		validators: {
			onChange: zodAdapter(partnerCreateSchema),
			onSubmit: zodAdapter(partnerCreateSchema)
		},
		onSubmit: () => {
			// Native submit to hit the server action after client validation succeeds
			formEl?.submit();
		}
	}));

	const Field = formApi.Field;

	let formEl: HTMLFormElement | null = null;
	const fieldSchemas: Record<keyof PartnerCreateInput, z.ZodTypeAny> = {
		name: partnerCreateSchema.shape.name,
		contactEmail: partnerCreateSchema.shape.contactEmail,
		contactPhone: partnerCreateSchema.shape.contactPhone,
		comments: partnerCreateSchema.shape.comments,
		isActive: partnerCreateSchema.shape.isActive
	};

const validateFieldValue = (key: keyof PartnerCreateInput, value: unknown) => {
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
		// Rehydrate values/errors from the last action (server response)
		if (values) {
			for (const [key, val] of Object.entries(values)) {
				formApi.setFieldValue(key as keyof PartnerCreateInput, val as never, { dontValidate: true });
			}
		}
		if (errors) {
			for (const [key, val] of Object.entries(errors)) {
				formApi.setFieldMeta(key as keyof PartnerCreateInput, (prev) => ({
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
		<p class="text-xs font-semibold uppercase tracking-wide text-sky-700">Partners</p>
		<h1 class="text-2xl font-bold text-slate-900">Add partner</h1>
		<p class="text-sm text-slate-600">
			Create a new partner record. Code is auto-generated (serial from 11) and cannot be edited.
		</p>
	</div>

	<form
		method="POST"
		class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4"
		bind:this={formEl}
		on:submit|preventDefault={() => formApi.handleSubmit()}
	>
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
			<Field name="name">
				{#snippet children(field)}
					<label class="block text-sm text-slate-700" for="name">
						Name
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

		<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
			<Field name="contactEmail">
				{#snippet children(field)}
					<label class="block text-sm text-slate-700" for="contactEmail">
						Contact email
						<input
							id="contactEmail"
							type="email"
							name="contactEmail"
							maxlength="255"
							value={field.state.value ?? ''}
							on:input={(event) => {
								field.handleChange((event.target as HTMLInputElement).value);
								field.setMeta((prev) => ({ ...prev, isTouched: true }));
								validateFieldValue('contactEmail', (event.target as HTMLInputElement).value);
							}}
							on:blur={field.handleBlur}
							class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
							aria-invalid={field.state.meta.errors?.length ? 'true' : 'false'}
							aria-describedby={field.state.meta.errors?.length ? 'contactEmail-error' : undefined}
						/>
						{#if $fieldErrors.contactEmail?.length}
							<p class="text-xs text-red-600 mt-1" id="contactEmail-error">
								{$fieldErrors.contactEmail[0]}
							</p>
						{/if}
					</label>
				{/snippet}
			</Field>
			<Field name="contactPhone">
				{#snippet children(field)}
					<label class="block text-sm text-slate-700" for="contactPhone">
						Contact phone
						<input
							id="contactPhone"
							name="contactPhone"
							pattern={phonePattern}
							title="6-20 characters; digits, spaces, + ( ) -"
							maxlength="50"
							value={field.state.value ?? ''}
							on:input={(event) => {
								field.handleChange((event.target as HTMLInputElement).value);
								field.setMeta((prev) => ({ ...prev, isTouched: true }));
								validateFieldValue('contactPhone', (event.target as HTMLInputElement).value);
							}}
							on:blur={field.handleBlur}
							class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
							aria-invalid={field.state.meta.errors?.length ? 'true' : 'false'}
							aria-describedby={field.state.meta.errors?.length ? 'contactPhone-error' : undefined}
						/>
						{#if $fieldErrors.contactPhone?.length}
							<p class="text-xs text-red-600 mt-1" id="contactPhone-error">
								{$fieldErrors.contactPhone[0]}
							</p>
						{/if}
					</label>
				{/snippet}
			</Field>

			<Field name="comments">
				{#snippet children(field)}
					<label class="block text-sm text-slate-700" for="comments">
						Comments
						<textarea
							id="comments"
							name="comments"
							rows="3"
							maxlength="500"
							value={field.state.value ?? ''}
							on:input={(event) => {
								field.handleChange((event.target as HTMLTextAreaElement).value);
								field.setMeta((prev) => ({ ...prev, isTouched: true }));
								validateFieldValue('comments', (event.target as HTMLTextAreaElement).value);
							}}
							on:blur={field.handleBlur}
							class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
							aria-invalid={field.state.meta.errors?.length ? 'true' : 'false'}
							aria-describedby={field.state.meta.errors?.length ? 'comments-error' : undefined}
						></textarea>
						{#if $fieldErrors.comments?.length}
							<p class="text-xs text-red-600 mt-1" id="comments-error">{$fieldErrors.comments[0]}</p>
						{/if}
					</label>
				{/snippet}
			</Field>
		</div>

		<Field name="isActive">
			{#snippet children(field)}
				<label class="flex items-center gap-2 text-sm text-slate-700" for="isActive">
					<input
						id="isActive"
						type="checkbox"
						name="isActive"
						checked={Boolean(field.state.value)}
						on:change={(event) => {
							field.handleChange((event.target as HTMLInputElement).checked);
							field.setMeta((prev) => ({ ...prev, isTouched: true }));
							validateFieldValue('isActive', (event.target as HTMLInputElement).checked);
						}}
						class="rounded border-slate-300"
						tabindex="0"
					/>
					Active
				</label>
			{/snippet}
		</Field>

		<div class="flex items-center gap-3 pt-2">
			<a
				href="/partners"
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
				Save partner
			</button>
		</div>
	</form>
</div>
