<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import type { UserCreateInput } from '$lib/validation/user';
	import { userCreateSchema } from '$lib/validation/user';
	import { zodAdapter } from '$lib/forms/zodAdapter';
	import { createForm } from '@tanstack/svelte-form';
	import { onMount } from 'svelte';
	import { z } from 'zod';
	import { writable } from 'svelte/store';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';

	export let data: PageData;
	export let form: ActionData;

	type UserErrors = Partial<
		Record<
			'name' | 'email' | 'phoneNumber' | 'role' | 'partnerId' | 'active' | 'dateActiveTill' | 'yearsOfExperience',
			string[]
		>
	>;

	const errors: UserErrors | null = form?.errors ?? (data.errors as UserErrors | null);
	const values: UserCreateInput = (form?.values ?? data.values) as UserCreateInput;
	const fieldErrors = writable<UserErrors>({});

	const formApi = createForm(() => ({
		defaultValues: values,
		// Client-side validation mirrors server Zod schema
		validators: {
			onChange: zodAdapter(userCreateSchema),
			onSubmit: zodAdapter(userCreateSchema)
		},
		onSubmit: () => {
			// Native submit to hit server action after client validation succeeds
			formEl?.submit();
		}
	}));

	const Field = formApi.Field;

	let formEl: HTMLFormElement | null = null;
	const fieldSchemas: Record<keyof UserCreateInput, z.ZodTypeAny> = {
		name: userCreateSchema.shape.name,
		email: userCreateSchema.shape.email,
		phoneNumber: userCreateSchema.shape.phoneNumber,
		role: userCreateSchema.shape.role,
		partnerId: userCreateSchema.shape.partnerId,
		active: userCreateSchema.shape.active,
		dateActiveTill: userCreateSchema.shape.dateActiveTill,
		yearsOfExperience: userCreateSchema.shape.yearsOfExperience
	};

	const validateFieldValue = (key: keyof UserCreateInput, value: unknown) => {
		const result = fieldSchemas[key].safeParse(value);
		const errs = result.success ? [] : result.error.issues.map((err) => err.message);
		
		formApi.setFieldMeta(key, (prev) => ({ ...prev, errors: errs }));
		fieldErrors.update((curr) => ({ ...curr, [key]: errs }));
	};

	// Phone number input filtering
	function digitsOnly(value: string) {
		return value.replace(/[^0-9]/g, '');
	}

	function showsPartner(role: UserCreateInput['role'] | undefined) {
		return role === 'partner_manager' || role === 'team_member';
	}

	function requiresPartner(role: UserCreateInput['role'] | undefined) {
		return role === 'partner_manager';
	}

	// Hydrate server errors on mount
	onMount(() => {
		if (data.errors) {
			Object.entries(data.errors).forEach(([key, errors]) => {
				const fieldKey = key as keyof UserCreateInput;
				fieldErrors.update((curr) => ({ ...curr, [fieldKey]: errors }));
				formApi.setFieldMeta(fieldKey, (prev) => ({ ...prev, errors }));
			});
		}
	});

	// Get first error for field
	function getFirstError(fieldName: string) {
		const errors = Object.entries($fieldErrors).find(([key]) => key === fieldName)?.[1];
		return errors && errors.length > 0 ? errors[0] : null;
	}

	// Format date for display
	function formatDateForDisplay(dateString: string) {
		if (!dateString) return '';
		return dateString; // Already in dd/mm/yyyy format
	}
</script>

<div class="container mx-auto px-4 py-8">
	<div class="max-w-2xl mx-auto">
		<div class="mb-6">
			<h1 class="text-3xl font-bold text-gray-900">Add User</h1>
			<p class="mt-2 text-gray-600">Create a new user account with auto-generated credentials.</p>
		</div>

		<form
			method="POST"
			bind:this={formEl}
			use:enhance={() => {
				return async ({ result }) => {
					if (result.type === 'redirect') {
						await goto(result.location);
					}
				};
			}}
			class="space-y-6 bg-white shadow rounded-lg p-6"
		>
			<!-- Auto-generated fields display -->
			{#if form?.generatedCode || form?.generatedPassword}
				<div class="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
					<h3 class="text-lg font-medium text-blue-900 mb-3">Generated Credentials</h3>
					<div class="space-y-2">
						{#if form?.generatedCode}
							<div>
								<span class="font-medium text-blue-700">User Code:</span>
								<span class="ml-2 text-blue-900 font-mono">{form?.generatedCode}</span>
							</div>
						{/if}
						{#if form?.generatedPassword}
							<div>
								<span class="font-medium text-blue-700">Temporary Password:</span>
								<span class="ml-2 text-blue-900 font-mono">{form?.generatedPassword}</span>
							</div>
						{/if}
					</div>
					<p class="mt-3 text-sm text-blue-600">Save these credentials securely. The temporary password will be shown only once.</p>
				</div>
			{/if}

			<!-- Name -->
			<Field name="name">
				{#snippet children(field)}
					<div>
						<label for="name" class="block text-sm font-medium text-gray-700 mb-1">
							Name <span class="text-red-500">*</span>
						</label>
						<input
							id="name"
							name="name"
							type="text"
							value={field.state.value ?? ''}
							on:input={(event) => {
								const value = (event.target as HTMLInputElement).value;
								field.handleChange(value);
								field.setMeta((prev) => ({ ...prev, isTouched: true }));
								validateFieldValue('name', value);
							}}
							on:blur={field.handleBlur}
							class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
							class:border-red-500={getFirstError('name')}
							aria-invalid={getFirstError('name') ? 'true' : 'false'}
							aria-describedby={getFirstError('name') ? 'name-error' : undefined}
							required
						/>
						{#if getFirstError('name')}
							<p id="name-error" class="mt-1 text-sm text-red-600">
								{getFirstError('name')}
							</p>
						{/if}
					</div>
				{/snippet}
			</Field>

			<!-- Email -->
			<Field name="email">
				{#snippet children(field)}
					<div>
						<label for="email" class="block text-sm font-medium text-gray-700 mb-1">
							Email <span class="text-red-500">*</span>
						</label>
						<input
							id="email"
							name="email"
							type="email"
							value={field.state.value ?? ''}
							on:input={(event) => {
								const value = (event.target as HTMLInputElement).value;
								field.handleChange(value);
								field.setMeta((prev) => ({ ...prev, isTouched: true }));
								validateFieldValue('email', value);
							}}
							on:blur={field.handleBlur}
							class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
							class:border-red-500={getFirstError('email')}
							aria-invalid={getFirstError('email') ? 'true' : 'false'}
							aria-describedby={getFirstError('email') ? 'email-error' : undefined}
							required
						/>
						{#if getFirstError('email')}
							<p id="email-error" class="mt-1 text-sm text-red-600">
								{getFirstError('email')}
							</p>
						{/if}
					</div>
				{/snippet}
			</Field>

			<!-- Phone Number -->
			<Field name="phoneNumber">
				{#snippet children(field)}
					<div>
						<label for="phoneNumber" class="block text-sm font-medium text-gray-700 mb-1">
							Phone Number <span class="text-red-500">*</span>
						</label>
						<input
							id="phoneNumber"
							name="phoneNumber"
							type="text"
							inputmode="numeric"
							maxlength="10"
							value={field.state.value ?? ''}
							on:input={(event) => {
								const value = digitsOnly((event.target as HTMLInputElement).value);
								(event.target as HTMLInputElement).value = value;
								field.handleChange(value);
								field.setMeta((prev) => ({ ...prev, isTouched: true }));
								validateFieldValue('phoneNumber', value);
							}}
							on:blur={field.handleBlur}
							class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
							class:border-red-500={getFirstError('phoneNumber')}
							aria-invalid={getFirstError('phoneNumber') ? 'true' : 'false'}
							aria-describedby={getFirstError('phoneNumber') ? 'phoneNumber-error' : undefined}
							placeholder="1234567890"
							required
						/>
						{#if getFirstError('phoneNumber')}
							<p id="phoneNumber-error" class="mt-1 text-sm text-red-600">
								{getFirstError('phoneNumber')}
							</p>
						{/if}
					</div>
				{/snippet}
			</Field>

			<!-- Role -->
			<Field name="role">
				{#snippet children(field)}
					<div>
						<label for="role" class="block text-sm font-medium text-gray-700 mb-1">
							Role <span class="text-red-500">*</span>
						</label>
						<select
							id="role"
							name="role"
							value={field.state.value ?? ''}
							on:change={(event) => {
								const value = (event.target as HTMLSelectElement).value as UserCreateInput['role'];
								field.handleChange(value);
								field.setMeta((prev) => ({ ...prev, isTouched: true }));
								validateFieldValue('role', value);
								// Trigger partner validation when role changes
								validateFieldValue('partnerId', formApi.getFieldValue('partnerId'));
							}}
							on:blur={field.handleBlur}
							class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
							class:border-red-500={getFirstError('role')}
							aria-invalid={getFirstError('role') ? 'true' : 'false'}
							aria-describedby={getFirstError('role') ? 'role-error' : undefined}
							required
						>
							{#each data.roleOptions as roleOption}
								<option value={roleOption.value}>{roleOption.label}</option>
							{/each}
						</select>
						{#if getFirstError('role')}
							<p id="role-error" class="mt-1 text-sm text-red-600">
								{getFirstError('role')}
							</p>
						{/if}
					</div>
				{/snippet}
			</Field>

			{#if showsPartner(formApi.getFieldValue('role'))}
				<!-- Partner (only for partner-scoped roles) -->
				<Field name="partnerId">
					{#snippet children(field)}
						<div>
							<label for="partnerId" class="block text-sm font-medium text-gray-700 mb-1">
								Partner
								{#if requiresPartner(formApi.getFieldValue('role'))}
									<span class="text-red-500">*</span>
								{/if}
							</label>
							<select
								id="partnerId"
								name="partnerId"
								value={field.state.value ?? ''}
								on:change={(event) => {
									const value = (event.target as HTMLSelectElement).value;
									field.handleChange(value);
									field.setMeta((prev) => ({ ...prev, isTouched: true }));
									validateFieldValue('partnerId', value);
								}}
								on:blur={field.handleBlur}
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
								class:border-red-500={getFirstError('partnerId')}
								aria-invalid={getFirstError('partnerId') ? 'true' : 'false'}
								aria-describedby={getFirstError('partnerId') ? 'partnerId-error' : undefined}
								required={requiresPartner(formApi.getFieldValue('role'))}
							>
								<option value="">Select partner</option>
								{#each data.partners as partner}
									<option value={partner.id}>{partner.name}</option>
								{/each}
							</select>
							{#if getFirstError('partnerId')}
								<p id="partnerId-error" class="mt-1 text-sm text-red-600">
									{getFirstError('partnerId')}
								</p>
							{/if}
						</div>
					{/snippet}
				</Field>
			{/if}

			<!-- Active Status -->
			<Field name="active">
				{#snippet children(field)}
					<div>
						<fieldset>
							<legend class="block text-sm font-medium text-gray-700 mb-1">
								Active Status <span class="text-red-500">*</span>
							</legend>
							<div class="flex space-x-6">
								<label class="flex items-center">
									<input
										type="radio"
										name="active"
										value="Y"
										checked={field.state.value === 'Y'}
										on:change={() => {
											field.handleChange('Y');
											field.setMeta((prev) => ({ ...prev, isTouched: true }));
											validateFieldValue('active', 'Y');
										}}
										on:blur={field.handleBlur}
										class="mr-2"
										tabindex="0"
									/>
									<span class="text-sm">Yes</span>
								</label>
								<label class="flex items-center">
									<input
										type="radio"
										name="active"
										value="N"
										checked={field.state.value === 'N'}
										on:change={() => {
											field.handleChange('N');
											field.setMeta((prev) => ({ ...prev, isTouched: true }));
											validateFieldValue('active', 'N');
										}}
										on:blur={field.handleBlur}
										class="mr-2"
										tabindex="0"
									/>
									<span class="text-sm">No</span>
								</label>
							</div>
						</fieldset>
						{#if getFirstError('active')}
							<p class="mt-1 text-sm text-red-600">
								{getFirstError('active')}
							</p>
						{/if}
					</div>
				{/snippet}
			</Field>

			<!-- Date Active Till -->
			<Field name="dateActiveTill">
				{#snippet children(field)}
					<div>
						<label for="dateActiveTill" class="block text-sm font-medium text-gray-700 mb-1">
							Date Active Till (dd/mm/yyyy)
						</label>
						<input
							id="dateActiveTill"
							name="dateActiveTill"
							type="text"
							placeholder="DD/MM/YYYY"
							value={field.state.value ?? ''}
							on:input={(event) => {
								const value = (event.target as HTMLInputElement).value;
								field.handleChange(value);
								field.setMeta((prev) => ({ ...prev, isTouched: true }));
								validateFieldValue('dateActiveTill', value);
							}}
							on:blur={field.handleBlur}
							class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
							class:border-red-500={getFirstError('dateActiveTill')}
							aria-invalid={getFirstError('dateActiveTill') ? 'true' : 'false'}
							aria-describedby={getFirstError('dateActiveTill') ? 'dateActiveTill-error' : undefined}
						/>
						{#if getFirstError('dateActiveTill')}
							<p id="dateActiveTill-error" class="mt-1 text-sm text-red-600">
								{getFirstError('dateActiveTill')}
							</p>
						{/if}
					</div>
				{/snippet}
			</Field>

			<!-- Years of Experience -->
			<Field name="yearsOfExperience">
				{#snippet children(field)}
					<div>
						<label for="yearsOfExperience" class="block text-sm font-medium text-gray-700 mb-1">
							Years of Experience
						</label>
						<input
							id="yearsOfExperience"
							name="yearsOfExperience"
							type="text"
							inputmode="numeric"
							value={field.state.value ?? ''}
							on:input={(event) => {
								const value = digitsOnly((event.target as HTMLInputElement).value);
								(event.target as HTMLInputElement).value = value;
								field.handleChange(value);
								field.setMeta((prev) => ({ ...prev, isTouched: true }));
								validateFieldValue('yearsOfExperience', value);
							}}
							on:blur={field.handleBlur}
							class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
							class:border-red-500={getFirstError('yearsOfExperience')}
							aria-invalid={getFirstError('yearsOfExperience') ? 'true' : 'false'}
							aria-describedby={getFirstError('yearsOfExperience') ? 'yearsOfExperience-error' : undefined}
							placeholder="0-99"
						/>
						{#if getFirstError('yearsOfExperience')}
							<p id="yearsOfExperience-error" class="mt-1 text-sm text-red-600">
								{getFirstError('yearsOfExperience')}
							</p>
						{/if}
					</div>
				{/snippet}
			</Field>

			<!-- Hidden inputs for auto-generated fields -->
			<input type="hidden" name="code" value={form?.generatedCode || ''} />
			<input type="hidden" name="temporaryPassword" value={form?.generatedPassword || ''} />

			<!-- Form Actions -->
			<div class="flex justify-end space-x-3 pt-6 border-t border-gray-200">
				<a
					href="/users"
					class="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium"
				>
					Cancel
				</a>
				<button
					type="submit"
					class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
				>
					Create User
				</button>
			</div>
		</form>
	</div>
</div>
