<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import type { SchoolCreateInput } from '$lib/validation/school';
	import { schoolCreateSchema } from '$lib/validation/school';
	import { zodAdapter } from '$lib/forms/zodAdapter';
	import { createForm } from '@tanstack/svelte-form';
	import { onMount } from 'svelte';
	import { z } from 'zod';
	import { writable } from 'svelte/store';

	export let data: PageData;
	export let form: ActionData;

	type SchoolErrors = Partial<
		Record<'name' | 'districtId' | 'partnerId' | 'address' | 'principalName' | 'contactPhone' | 'schoolType' | 'areaType' | 'gpsLatitude' | 'gpsLongitude' | 'hasPrimary' | 'hasMiddle' | 'hasTenth' | 'has12th' | 'coEdType' | 'totalStudentStrength' | 'comments', string[]>
	>;

	const errors: SchoolErrors | null = form?.errors ?? (data.errors as SchoolErrors | null);
	const values: SchoolCreateInput = (form?.values ?? data.values) as SchoolCreateInput;
	const fieldErrors = writable<SchoolErrors>({});

	const formApi = createForm(() => ({
		defaultValues: values,
		validators: {
			onChange: zodAdapter(schoolCreateSchema),
			onSubmit: zodAdapter(schoolCreateSchema)
		},
		onSubmit: () => {
			formEl?.submit();
		}
	}));

	const Field = formApi.Field;

	let formEl: HTMLFormElement | null = null;
	let selectedPartner = values.partnerId ?? '';

	const fieldSchemas: Record<'name' | 'districtId' | 'partnerId' | 'address' | 'principalName' | 'contactPhone' | 'schoolType' | 'areaType' | 'gpsLatitude' | 'gpsLongitude' | 'hasPrimary' | 'hasMiddle' | 'hasTenth' | 'has12th' | 'coEdType' | 'totalStudentStrength' | 'comments', z.ZodTypeAny> = {
		name: schoolCreateSchema.shape.name,
		districtId: schoolCreateSchema.shape.districtId,
		partnerId: schoolCreateSchema.shape.partnerId,
		address: schoolCreateSchema.shape.address,
		principalName: schoolCreateSchema.shape.principalName,
		contactPhone: schoolCreateSchema.shape.contactPhone,
		schoolType: schoolCreateSchema.shape.schoolType,
		areaType: schoolCreateSchema.shape.areaType,
		gpsLatitude: schoolCreateSchema.shape.gpsLatitude,
		gpsLongitude: schoolCreateSchema.shape.gpsLongitude,
		hasPrimary: schoolCreateSchema.shape.hasPrimary,
		hasMiddle: schoolCreateSchema.shape.hasMiddle,
		hasTenth: schoolCreateSchema.shape.hasTenth,
		has12th: schoolCreateSchema.shape.has12th,
		coEdType: schoolCreateSchema.shape.coEdType,
		totalStudentStrength: schoolCreateSchema.shape.totalStudentStrength,
		comments: schoolCreateSchema.shape.comments
	};

	const validateFieldValue = (key: 'name' | 'districtId' | 'partnerId' | 'address' | 'principalName' | 'contactPhone' | 'schoolType' | 'areaType' | 'gpsLatitude' | 'gpsLongitude' | 'hasPrimary' | 'hasMiddle' | 'hasTenth' | 'has12th' | 'coEdType' | 'totalStudentStrength' | 'comments', value: unknown) => {
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

	// Auto-populate partner when district is selected
	const handleDistrictChange = (districtId: string) => {
		const selected = data.districts.find((d) => d.id === districtId);
		if (selected) {
			selectedPartner = selected.partnerId;
			formApi.setFieldValue('partnerId', selected.partnerId, { dontValidate: true });
		}
	};

	onMount(() => {
		if (values) {
			for (const [key, val] of Object.entries(values)) {
				formApi.setFieldValue(key as keyof SchoolCreateInput, val as never, { dontValidate: true });
			}
		}
		if (errors) {
			for (const [key, val] of Object.entries(errors)) {
				formApi.setFieldMeta(key as keyof SchoolCreateInput, (prev) => ({
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

<div class="max-w-4xl space-y-6">
	<div>
		<p class="text-xs font-semibold uppercase tracking-wide text-sky-700">Schools</p>
		<h1 class="text-2xl font-bold text-slate-900">Edit school</h1>
		<p class="text-sm text-slate-600">
			Update school details. Code and ID cannot be changed.
		</p>
	</div>

	<div class="rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
			<div>
				<p class="text-xs text-slate-500 font-semibold">School Code</p>
				<p class="text-lg font-mono font-semibold text-slate-900 mt-1">{data.school.code}</p>
			</div>
			<div>
				<p class="text-xs text-slate-500 font-semibold">School ID</p>
				<p class="text-xs font-mono text-slate-600 mt-1">{data.school.id}</p>
			</div>
		</div>
	</div>

	<form
		method="POST"
		class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6"
		bind:this={formEl}
		on:submit|preventDefault={() => formApi.handleSubmit()}
	>
		<input type="hidden" name="id" value={data.school.id} />

		<!-- Basic Information Section -->
		<div class="border-b border-slate-200 pb-6">
			<h3 class="text-sm font-semibold text-slate-700 mb-4">Basic Information</h3>
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				<Field name="districtId">
					{#snippet children(field)}
						<label class="block text-sm text-slate-700" for="districtId">
							District
							<select
								id="districtId"
								name="districtId"
								required
								value={field.state.value ?? ''}
								on:input={(event) => {
									const districtId = (event.target as HTMLSelectElement).value;
									field.handleChange(districtId);
									field.setMeta((prev) => ({ ...prev, isTouched: true }));
									validateFieldValue('districtId', districtId);
									handleDistrictChange(districtId);
								}}
								on:blur={field.handleBlur}
								class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
								aria-invalid={field.state.meta.errors?.length ? 'true' : 'false'}
								aria-describedby={field.state.meta.errors?.length ? 'districtId-error' : undefined}
							>
								<option value="">Select District</option>
								{#each data.districts as district (district.id)}
									<option value={district.id}>{district.name} ({district.state})</option>
								{/each}
							</select>
							{#if $fieldErrors.districtId?.length}
								<p class="text-xs text-red-600 mt-1" id="districtId-error">{$fieldErrors.districtId[0]}</p>
							{/if}
						</label>
					{/snippet}
				</Field>
				<Field name="name">
					{#snippet children(field)}
						<label class="block text-sm text-slate-700" for="name">
							School Name
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
					<label class="block text-sm text-slate-700 mt-4" for="partnerId">
						Partner (Auto-populated from district)
						<input
							id="partnerId"
							name="partnerId"
							type="hidden"
							value={selectedPartner}
						/>
						<div class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-slate-50 text-slate-700">
							{#if selectedPartner}
								{data.districts.find((d) => d.partnerId === selectedPartner)?.partnerName || 'Loading...'}
							{:else}
								<span class="text-slate-500">Select a district first</span>
							{/if}
						</div>
					</label>
				{/snippet}
			</Field>
		</div>

		<!-- School Type and Location Section -->
		<div class="border-b border-slate-200 pb-6">
			<h3 class="text-sm font-semibold text-slate-700 mb-4">School Type & Location</h3>
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				<Field name="schoolType">
					{#snippet children(field)}
						<label class="block text-sm text-slate-700" for="schoolType">
							School Type
							<select
								id="schoolType"
								name="schoolType"
								value={field.state.value ?? ''}
								on:input={(event) => {
									field.handleChange((event.target as HTMLSelectElement).value);
									field.setMeta((prev) => ({ ...prev, isTouched: true }));
									validateFieldValue('schoolType', (event.target as HTMLSelectElement).value);
								}}
								on:blur={field.handleBlur}
								class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
								aria-invalid={field.state.meta.errors?.length ? 'true' : 'false'}
								aria-describedby={field.state.meta.errors?.length ? 'schoolType-error' : undefined}
							>
								<option value="">Select School Type</option>
								<option value="govt">Government</option>
								<option value="private">Private</option>
								<option value="aided">Aided</option>
								<option value="other">Other</option>
							</select>
							{#if $fieldErrors.schoolType?.length}
								<p class="text-xs text-red-600 mt-1" id="schoolType-error">{$fieldErrors.schoolType[0]}</p>
							{/if}
						</label>
					{/snippet}
				</Field>
				<Field name="areaType">
					{#snippet children(field)}
						<label class="block text-sm text-slate-700" for="areaType">
							Area Type
							<select
								id="areaType"
								name="areaType"
								value={field.state.value ?? ''}
								on:input={(event) => {
									field.handleChange((event.target as HTMLSelectElement).value);
									field.setMeta((prev) => ({ ...prev, isTouched: true }));
									validateFieldValue('areaType', (event.target as HTMLSelectElement).value);
								}}
								on:blur={field.handleBlur}
								class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
								aria-invalid={field.state.meta.errors?.length ? 'true' : 'false'}
								aria-describedby={field.state.meta.errors?.length ? 'areaType-error' : undefined}
							>
								<option value="">Select Area Type</option>
								<option value="rural">Rural</option>
								<option value="urban">Urban</option>
							</select>
							{#if $fieldErrors.areaType?.length}
								<p class="text-xs text-red-600 mt-1" id="areaType-error">{$fieldErrors.areaType[0]}</p>
							{/if}
						</label>
					{/snippet}
				</Field>
			</div>
		</div>

		<!-- Contact & Address Section -->
		<div class="border-b border-slate-200 pb-6">
			<h3 class="text-sm font-semibold text-slate-700 mb-4">Contact Information</h3>
			<Field name="address">
				{#snippet children(field)}
					<label class="block text-sm text-slate-700" for="address">
						Address
						<textarea
							id="address"
							name="address"
							maxlength="500"
							value={field.state.value ?? ''}
							on:input={(event) => {
								field.handleChange((event.target as HTMLTextAreaElement).value);
								field.setMeta((prev) => ({ ...prev, isTouched: true }));
								validateFieldValue('address', (event.target as HTMLTextAreaElement).value);
							}}
							on:blur={field.handleBlur}
							class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
							rows="2"
							aria-invalid={field.state.meta.errors?.length ? 'true' : 'false'}
							aria-describedby={field.state.meta.errors?.length ? 'address-error' : undefined}
						></textarea>
						{#if $fieldErrors.address?.length}
							<p class="text-xs text-red-600 mt-1" id="address-error">{$fieldErrors.address[0]}</p>
						{/if}
					</label>
				{/snippet}
			</Field>

			<div class="grid grid-cols-1 gap-4 md:grid-cols-2 mt-4">
				<Field name="principalName">
					{#snippet children(field)}
						<label class="block text-sm text-slate-700" for="principalName">
							Principal Name
							<input
								id="principalName"
								name="principalName"
								maxlength="255"
								value={field.state.value ?? ''}
								on:input={(event) => {
									field.handleChange((event.target as HTMLInputElement).value);
									field.setMeta((prev) => ({ ...prev, isTouched: true }));
									validateFieldValue('principalName', (event.target as HTMLInputElement).value);
								}}
								on:blur={field.handleBlur}
								class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
								aria-invalid={field.state.meta.errors?.length ? 'true' : 'false'}
								aria-describedby={field.state.meta.errors?.length ? 'principalName-error' : undefined}
							/>
							{#if $fieldErrors.principalName?.length}
								<p class="text-xs text-red-600 mt-1" id="principalName-error">{$fieldErrors.principalName[0]}</p>
							{/if}
						</label>
					{/snippet}
				</Field>
				<Field name="contactPhone">
					{#snippet children(field)}
						<label class="block text-sm text-slate-700" for="contactPhone">
							Contact Phone
							<input
								id="contactPhone"
								name="contactPhone"
								type="tel"
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
								<p class="text-xs text-red-600 mt-1" id="contactPhone-error">{$fieldErrors.contactPhone[0]}</p>
							{/if}
						</label>
					{/snippet}
				</Field>
			</div>
		</div>

		<!-- GPS Coordinates Section -->
		<div class="border-b border-slate-200 pb-6">
			<h3 class="text-sm font-semibold text-slate-700 mb-4">GPS Coordinates</h3>
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				<Field name="gpsLatitude">
					{#snippet children(field)}
						<label class="block text-sm text-slate-700" for="gpsLatitude">
							Latitude (-90 to 90)
							<input
								id="gpsLatitude"
								name="gpsLatitude"
								type="text"
								placeholder="e.g., 28.7041"
								value={field.state.value ?? ''}
								on:input={(event) => {
									field.handleChange((event.target as HTMLInputElement).value);
									field.setMeta((prev) => ({ ...prev, isTouched: true }));
									validateFieldValue('gpsLatitude', (event.target as HTMLInputElement).value);
								}}
								on:blur={field.handleBlur}
								class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
								aria-invalid={field.state.meta.errors?.length ? 'true' : 'false'}
								aria-describedby={field.state.meta.errors?.length ? 'gpsLatitude-error' : undefined}
							/>
							{#if $fieldErrors.gpsLatitude?.length}
								<p class="text-xs text-red-600 mt-1" id="gpsLatitude-error">{$fieldErrors.gpsLatitude[0]}</p>
							{/if}
						</label>
					{/snippet}
				</Field>
				<Field name="gpsLongitude">
					{#snippet children(field)}
						<label class="block text-sm text-slate-700" for="gpsLongitude">
							Longitude (-180 to 180)
							<input
								id="gpsLongitude"
								name="gpsLongitude"
								type="text"
								placeholder="e.g., 77.1025"
								value={field.state.value ?? ''}
								on:input={(event) => {
									field.handleChange((event.target as HTMLInputElement).value);
									field.setMeta((prev) => ({ ...prev, isTouched: true }));
									validateFieldValue('gpsLongitude', (event.target as HTMLInputElement).value);
								}}
								on:blur={field.handleBlur}
								class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
								aria-invalid={field.state.meta.errors?.length ? 'true' : 'false'}
								aria-describedby={field.state.meta.errors?.length ? 'gpsLongitude-error' : undefined}
							/>
							{#if $fieldErrors.gpsLongitude?.length}
								<p class="text-xs text-red-600 mt-1" id="gpsLongitude-error">{$fieldErrors.gpsLongitude[0]}</p>
							{/if}
						</label>
					{/snippet}
				</Field>
			</div>
		</div>

		<!-- School Structure Section -->
		<div class="border-b border-slate-200 pb-6">
			<h3 class="text-sm font-semibold text-slate-700 mb-4">School Structure & Details</h3>

			<div class="mb-4">
				<p class="text-sm text-slate-700 font-medium mb-3">Classes Available</p>
				<div class="grid grid-cols-2 gap-3 md:grid-cols-4">
					<Field name="hasPrimary">
						{#snippet children(field)}
							<label class="flex items-center text-sm text-slate-700">
								<input
									name="hasPrimary"
									type="checkbox"
									checked={field.state.value ?? false}
									on:change={(event) => {
										field.handleChange((event.target as HTMLInputElement).checked);
										validateFieldValue('hasPrimary', (event.target as HTMLInputElement).checked);
									}}
									class="rounded border-slate-200 text-sky-600 focus:ring-sky-500"
								/>
								<span class="ml-2">Primary</span>
							</label>
						{/snippet}
					</Field>
					<Field name="hasMiddle">
						{#snippet children(field)}
							<label class="flex items-center text-sm text-slate-700">
								<input
									name="hasMiddle"
									type="checkbox"
									checked={field.state.value ?? false}
									on:change={(event) => {
										field.handleChange((event.target as HTMLInputElement).checked);
										validateFieldValue('hasMiddle', (event.target as HTMLInputElement).checked);
									}}
									class="rounded border-slate-200 text-sky-600 focus:ring-sky-500"
								/>
								<span class="ml-2">Middle</span>
							</label>
						{/snippet}
					</Field>
					<Field name="hasTenth">
						{#snippet children(field)}
							<label class="flex items-center text-sm text-slate-700">
								<input
									name="hasTenth"
									type="checkbox"
									checked={field.state.value ?? false}
									on:change={(event) => {
										field.handleChange((event.target as HTMLInputElement).checked);
										validateFieldValue('hasTenth', (event.target as HTMLInputElement).checked);
									}}
									class="rounded border-slate-200 text-sky-600 focus:ring-sky-500"
								/>
								<span class="ml-2">Tenth</span>
							</label>
						{/snippet}
					</Field>
					<Field name="has12th">
						{#snippet children(field)}
							<label class="flex items-center text-sm text-slate-700">
								<input
									name="has12th"
									type="checkbox"
									checked={field.state.value ?? false}
									on:change={(event) => {
										field.handleChange((event.target as HTMLInputElement).checked);
										validateFieldValue('has12th', (event.target as HTMLInputElement).checked);
									}}
									class="rounded border-slate-200 text-sky-600 focus:ring-sky-500"
								/>
								<span class="ml-2">12th</span>
							</label>
						{/snippet}
					</Field>
				</div>
			</div>

			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				<Field name="coEdType">
					{#snippet children(field)}
						<label class="block text-sm text-slate-700" for="coEdType">
							Co-Ed Status
							<select
								id="coEdType"
								name="coEdType"
								value={field.state.value ?? ''}
								on:input={(event) => {
									field.handleChange((event.target as HTMLSelectElement).value);
									field.setMeta((prev) => ({ ...prev, isTouched: true }));
									validateFieldValue('coEdType', (event.target as HTMLSelectElement).value);
								}}
								on:blur={field.handleBlur}
								class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
								aria-invalid={field.state.meta.errors?.length ? 'true' : 'false'}
								aria-describedby={field.state.meta.errors?.length ? 'coEdType-error' : undefined}
							>
								<option value="">Select Co-Ed Status</option>
								<option value="boys">Boys Only</option>
								<option value="girls">Girls Only</option>
								<option value="coed">Co-Ed</option>
							</select>
							{#if $fieldErrors.coEdType?.length}
								<p class="text-xs text-red-600 mt-1" id="coEdType-error">{$fieldErrors.coEdType[0]}</p>
							{/if}
						</label>
					{/snippet}
				</Field>
				<Field name="totalStudentStrength">
					{#snippet children(field)}
						<label class="block text-sm text-slate-700" for="totalStudentStrength">
							Total Student Strength
							<input
								id="totalStudentStrength"
								name="totalStudentStrength"
								type="text"
								inputmode="numeric"
								pattern="[0-9]*"
								min="0"
								on:input={(event) => {
									let val = (event.target as HTMLInputElement).value;
									// Only allow digits
									val = val.replace(/[^0-9]/g, "");
									(event.target as HTMLInputElement).value = val;
									field.handleChange(val);
									field.setMeta((prev) => ({ ...prev, isTouched: true }));
									validateFieldValue("totalStudentStrength", val);
								}}
								on:blur={field.handleBlur}
								class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
								aria-invalid={field.state.meta.errors?.length ? "true" : "false"}
								aria-describedby={field.state.meta.errors?.length ? "totalStudentStrength-error" : undefined}
							/>
							{#if $fieldErrors.totalStudentStrength?.length}
								<p class="text-xs text-red-600 mt-1" id="totalStudentStrength-error">{$fieldErrors.totalStudentStrength[0]}</p>
							{/if}
						</label>
					{/snippet}
				</Field>
			</div>
		</div>

		<!-- Comments Section -->
		<div class="pb-6">
			<Field name="comments">
				{#snippet children(field)}
					<label class="block text-sm text-slate-700" for="comments">
						School Comments
						<textarea
							id="comments"
							name="comments"
							maxlength="1000"
							rows="3"
							value={field.state.value ?? ''}
							on:input={(event) => {
								field.handleChange((event.target as HTMLTextAreaElement).value);
								field.setMeta((prev) => ({ ...prev, isTouched: true }));
								validateFieldValue('comments', (event.target as HTMLTextAreaElement).value);
							}}
							on:blur={field.handleBlur}
							class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
							placeholder="Add any additional notes or comments about the school..."
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

		<div class="flex items-center gap-3 pt-4">
			<a
				href="/schools"
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
				Update school
			</button>
		</div>
	</form>
</div>
