<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';

	export let data: PageData;

	let formEl: HTMLFormElement | null = null;

	// Format date for display
	function formatDateForDisplay(dateString: string) {
		if (!dateString) return '';
		return dateString; // Already in dd/mm/yyyy format
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
				return async ({ result }) => {
					if (result.type === 'redirect') {
						await goto(result.location);
					}
				};
			}}
			class="space-y-6 bg-white shadow rounded-lg p-6"
		>
			<!-- Name -->
			<div>
				<label for="name" class="block text-sm font-medium text-gray-700 mb-1">
					Name <span class="text-red-500">*</span>
				</label>
				<input
					id="name"
					name="name"
					type="text"
					value={data.user.name}
					class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
					required
				/>
			</div>

			<!-- Email -->
			<div>
				<label for="email" class="block text-sm font-medium text-gray-700 mb-1">
					Email <span class="text-red-500">*</span>
				</label>
				<input
					id="email"
					name="email"
					type="email"
					value={data.user.email}
					class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
					required
				/>
			</div>

			<!-- Phone Number -->
			<div>
				<label for="phoneNumber" class="block text-sm font-medium text-gray-700 mb-1">
					Phone Number
				</label>
				<input
					id="phoneNumber"
					name="phoneNumber"
					type="text"
					inputmode="numeric"
					maxlength="10"
					value={data.user.phoneNumber || ''}
					class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
					placeholder="1234567890"
				/>
			</div>

			<!-- Role -->
			<div>
				<label for="role" class="block text-sm font-medium text-gray-700 mb-1">
					Role <span class="text-red-500">*</span>
				</label>
				<select
					id="role"
					name="role"
					value={data.user.role}
					class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
					required
				>
					<option value="national_admin">National Admin</option>
					<option value="data_manager">Data Manager</option>
					<option value="partner_manager">Partner Manager</option>
					<option value="team_member">Team Member</option>
				</select>
			</div>

			<!-- Active Status -->
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-1">
					Active Status <span class="text-red-500">*</span>
				</label>
				<div class="flex space-x-6">
					<label class="flex items-center">
						<input
							type="radio"
							name="active"
							value="Y"
							checked={data.user.isActive}
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
							checked={!data.user.isActive}
							class="mr-2"
							tabindex="0"
						/>
						<span class="text-sm">No</span>
					</label>
				</div>
			</div>

			<!-- Date Active Till -->
			<div>
				<label for="dateActiveTill" class="block text-sm font-medium text-gray-700 mb-1">
					Date Active Till (dd/mm/yyyy)
				</label>
				<input
					id="dateActiveTill"
					name="dateActiveTill"
					type="text"
					placeholder="DD/MM/YYYY"
					value={formatDateForDisplay(data.user.dateActiveTill?.toISOString().split('T')[0])}
					class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
				/>
			</div>

			<!-- Years of Experience -->
			<div>
				<label for="yearsOfExperience" class="block text-sm font-medium text-gray-700 mb-1">
					Years of Experience
				</label>
				<input
					id="yearsOfExperience"
					name="yearsOfExperience"
					type="text"
					inputmode="numeric"
					value={data.user.yearsOfExperience?.toString() || ''}
					class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
					placeholder="0-99"
				/>
			</div>

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
