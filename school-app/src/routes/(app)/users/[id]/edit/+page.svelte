<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import type { UserUpdateInput } from '$lib/validation/user';
	import { userUpdateSchema } from '$lib/validation/user';
	import { zodAdapter } from '$lib/forms/zodAdapter';
	import { createForm } from '@tanstack/svelte-form';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { z } from 'zod';
	import { writable } from 'svelte/store';

	export let data: PageData;
	export let form: ActionData;

	let formEl: HTMLFormElement | null = null;

	type UserErrors = Partial<
		Record<
			'id' | 'name' | 'email' | 'phoneNumber' | 'role' | 'partnerId' | 'active' | 'dateActiveTill' | 'yearsOfExperience',
			string[]
		>
	>;

	const errors: UserErrors | null = form?.errors ?? (data.errors as UserErrors | null);
	const values: UserUpdateInput = (form?.values ?? data.values) as UserUpdateInput;
	const fieldErrors = writable<UserErrors>({});
	let selectedRole: UserUpdateInput['role'] | undefined = values?.role;
	const isSelf = Boolean(data?.isSelf);
	function isLockedPartner() {
		return Boolean(data.lockPartner && data.lockedPartnerId);
	}

	const formApi = createForm(() => ({
		defaultValues: values,
		validators: {
			onChange: zodAdapter(userUpdateSchema),
			onSubmit: zodAdapter(userUpdateSchema)
		},
		onSubmit: () => {
			formEl?.submit();
		}
	}));

	const Field = formApi.Field;

	const fieldSchemas: Record<keyof UserUpdateInput, z.ZodTypeAny> = {
		id: userUpdateSchema.shape.id,
		name: userUpdateSchema.shape.name,
		email: userUpdateSchema.shape.email,
		phoneNumber: userUpdateSchema.shape.phoneNumber,
		role: userUpdateSchema.shape.role,
		partnerId: userUpdateSchema.shape.partnerId,
		active: userUpdateSchema.shape.active,
		dateActiveTill: userUpdateSchema.shape.dateActiveTill,
		yearsOfExperience: userUpdateSchema.shape.yearsOfExperience
	};

	const validateFieldValue = (key: keyof UserUpdateInput, value: unknown) => {
		const result = fieldSchemas[key].safeParse(value);
		const errs = result.success ? [] : result.error.issues.map((err) => err.message);

		formApi.setFieldMeta(key, (prev) => ({ ...prev, errors: errs }));
		fieldErrors.update((curr) => ({ ...curr, [key]: errs }));
	};

	async function checkEmailUnique(email: string) {
		const trimmed = email.trim();
		if (!trimmed) return;

		try {
			const excludeId = values?.id ? `&excludeId=${encodeURIComponent(values.id)}` : '';
			const res = await fetch(`/users/check-email?email=${encodeURIComponent(trimmed)}${excludeId}`);
			if (!res.ok) return;
			const data = (await res.json()) as { exists: boolean };
			if (data.exists) {
				formApi.setFieldMeta('email', (prev) => ({ ...prev, errors: ['A user with this email already exists'] }));
				fieldErrors.update((curr) => ({ ...curr, email: ['A user with this email already exists'] }));
			}
		} catch {
			// ignore network/temporary failures; submit still validates server-side
		}
	}

	function digitsOnly(value: string) {
		return value.replace(/[^0-9]/g, '');
	}

	function showsPartner(role: UserUpdateInput['role'] | undefined) {
		return role === 'partner_manager' || role === 'team_member';
	}

	function requiresPartner(role: UserUpdateInput['role'] | undefined) {
		return role === 'partner_manager' || role === 'team_member';
	}

	function hydrateFromServer(nextValues: UserUpdateInput | null, nextErrors: UserErrors | null) {
		if (nextValues) {
			for (const [key, val] of Object.entries(nextValues)) {
				formApi.setFieldValue(key as keyof UserUpdateInput, val as never, { dontValidate: true });
			}
			selectedRole = nextValues.role;
		}
		if (nextErrors) {
			for (const [key, val] of Object.entries(nextErrors)) {
				const fieldKey = key as keyof UserUpdateInput;
				formApi.setFieldMeta(fieldKey, (prev) => ({ ...prev, errors: val ?? [] }));
				fieldErrors.update((curr) => ({ ...curr, [fieldKey]: val ?? [] }));
			}
		}
	}

	onMount(() => {
		hydrateFromServer(values, errors);
		if (data.lockPartner && data.lockedPartnerId) {
			formApi.setFieldValue('partnerId', data.lockedPartnerId as never, { dontValidate: true });
		}
	});

	// Re-hydrate after enhanced form submissions (when `form` prop updates)
	$: if (form) {
		hydrateFromServer((form.values ?? null) as UserUpdateInput | null, (form.errors ?? null) as UserErrors | null);
	}

	function getFirstError(fieldName: string) {
		const errs = Object.entries($fieldErrors).find(([key]) => key === fieldName)?.[1];
		return errs && errs.length > 0 ? errs[0] : null;
	}

	// Format role for display
	function formatRole(role: string) {
		const roleMap: Record<string, string> = {
			'national_admin': 'National Admin',
			'data_manager': 'Data Manager',
			'partner_manager': 'Partner Manager',
			'team_member': 'Team Member'
		};
		return roleMap[role] || role;
	}

	// Format phone number for display
	function formatPhoneNumber(phoneNumber: string) {
		if (!phoneNumber) return 'N/A';
		return phoneNumber.replace(/(\d{3})(\d{4})/, '($1) $2-$3');
	}
</script>

<div class="container mx-auto px-4 py-8">
	<div class="max-w-2xl mx-auto">
		<div class="mb-6">
			<h1 class="text-3xl font-bold text-gray-900">Edit User</h1>
			<p class="mt-2 text-gray-600">Update user information below.</p>
		</div>

			<form
				method="POST"
				bind:this={formEl}
				use:enhance={() => {
					return async ({ result, update }) => {
						if (result.type === 'redirect') {
							await goto(result.location);
							return;
						}
						await update();
					};
				}}
				class="space-y-6 bg-white shadow rounded-lg p-6"
			>
			<input type="hidden" name="id" value={values.id} />

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
							<p id="name-error" class="mt-1 text-sm text-red-600">{getFirstError('name')}</p>
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
							on:blur={() => {
								field.handleBlur();
								checkEmailUnique(String(field.state.value ?? ''));
							}}
							class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
							class:border-red-500={getFirstError('email')}
							aria-invalid={getFirstError('email') ? 'true' : 'false'}
							aria-describedby={getFirstError('email') ? 'email-error' : undefined}
							required
						/>
						{#if getFirstError('email')}
							<p id="email-error" class="mt-1 text-sm text-red-600">{getFirstError('email')}</p>
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
							<p id="phoneNumber-error" class="mt-1 text-sm text-red-600">{getFirstError('phoneNumber')}</p>
						{/if}
					</div>
				{/snippet}
			</Field>

				<!-- Role -->
				{#if data.lockPartner && isSelf}
					<div>
						<div class="block text-sm font-medium text-gray-700 mb-1" role="status">Role</div>
						<div class="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700">
							{formatRole(String(values.role))}
						</div>
						<input type="hidden" name="role" value={values.role} />
					</div>
				{:else}
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
										const value = (event.target as HTMLSelectElement).value as UserUpdateInput['role'];
										selectedRole = value;
										field.handleChange(value);
										field.setMeta((prev) => ({ ...prev, isTouched: true }));
										validateFieldValue('role', value);
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
									<p id="role-error" class="mt-1 text-sm text-red-600">{getFirstError('role')}</p>
								{/if}
							</div>
						{/snippet}
					</Field>
				{/if}

				{#if showsPartner(selectedRole)}
					<!-- Partner (only for partner-scoped roles) -->
					<Field name="partnerId">
						{#snippet children(field)}
							<div>
								{#if isLockedPartner()}
									<input type="hidden" name="partnerId" value={data.lockedPartnerId} />
								{/if}
								<label for="partnerId" class="block text-sm font-medium text-gray-700 mb-1">
									Partner
									{#if requiresPartner(selectedRole)}
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
									required={requiresPartner(selectedRole)}
									disabled={isLockedPartner()}
								>
									<option value="">Select partner</option>
									{#each data.partners as partner}
										<option value={partner.id}>{partner.name}</option>
									{/each}
								</select>
								{#if isLockedPartner()}
									<p class="mt-1 text-xs text-gray-500">
										Partner Managers can only assign their own partner.
									</p>
								{/if}
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
							<p class="mt-1 text-sm text-red-600">{getFirstError('active')}</p>
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
							<p id="dateActiveTill-error" class="mt-1 text-sm text-red-600">{getFirstError('dateActiveTill')}</p>
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
							<p id="yearsOfExperience-error" class="mt-1 text-sm text-red-600">{getFirstError('yearsOfExperience')}</p>
						{/if}
					</div>
				{/snippet}
			</Field>

			<!-- User Info Display -->
			<div class="bg-gray-50 border border-gray-200 rounded-md p-4 mb-6">
				<h3 class="text-lg font-medium text-gray-900 mb-3">User Information</h3>
				<div class="space-y-2">
					<div>
						<span class="font-medium text-gray-700">User Code:</span>
						<span class="ml-2 text-gray-900 font-mono">{data.user.code}</span>
					</div>
					<div>
						<span class="font-medium text-gray-700">Partner:</span>
						<span class="ml-2 text-gray-900">{data.user.partnerName || 'N/A'}</span>
					</div>
					<div>
						<span class="font-medium text-gray-700">Created:</span>
						<span class="ml-2 text-gray-900">{new Date(data.user.createdAt).toLocaleDateString('en-GB')}</span>
					</div>
					<div>
						<span class="font-medium text-gray-700">Last Login:</span>
						<span class="ml-2 text-gray-900">{data.user.lastLoginAt ? new Date(data.user.lastLoginAt).toLocaleDateString('en-GB') : 'Never'}</span>
					</div>
				</div>
			</div>

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
					Update User
				</button>
			</div>
		</form>
	</div>
</div>
