<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';

	export let data;

	let searchInput = $page.url.searchParams.get('q') || '';
	let roleSelect = $page.url.searchParams.get('role') || '';
	let activeSelect = $page.url.searchParams.get('active') || '';

	// Function to update URL with search parameters
	function updateSearchParams() {
		const params = new URLSearchParams();
		if (searchInput) params.set('q', searchInput);
		if (roleSelect) params.set('role', roleSelect);
		if (activeSelect) params.set('active', activeSelect);
		
		const queryString = params.toString();
		const newUrl = queryString ? `/users?${queryString}` : '/users';
		goto(newUrl, { replaceState: true });
	}

	// Debounced search
	let searchTimeout: NodeJS.Timeout;
	function handleSearchInput() {
		clearTimeout(searchTimeout);
		searchTimeout = setTimeout(updateSearchParams, 300);
	}

	function handleRoleChange() {
		updateSearchParams();
	}

	function handleActiveChange() {
		updateSearchParams();
	}

	function formatDate(dateValue: string | Date | null) {
		if (!dateValue) return 'N/A';
		const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
		return date.toLocaleDateString('en-GB', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric'
		});
	}

	function formatRole(role: string) {
		const roleMap: Record<string, string> = {
			'national_admin': 'National Admin',
			'data_manager': 'Data Manager',
			'partner_manager': 'Partner Manager',
			'team_member': 'Team Member'
		};
		return roleMap[role] || role;
	}

	function formatPhoneNumber(phoneNumber: string | null) {
		if (!phoneNumber) return 'N/A';
		return phoneNumber.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
	}
</script>

<div class="container mx-auto px-4 py-8">
	<div class="flex justify-between items-center mb-6">
		<h1 class="text-3xl font-bold text-gray-900">Users</h1>
		<a href="/users/add" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium">
			Add User
		</a>
	</div>

	<!-- Filters -->
	<div class="bg-white shadow rounded-lg p-6 mb-6">
		<div class="grid grid-cols-1 md:grid-cols-4 gap-4">
			<div>
				<label for="search" class="sr-only">Search users</label>
				<input
					id="search"
					type="text"
					placeholder="Search by name, email, code, or phone..."
					bind:value={searchInput}
					on:input={handleSearchInput}
					class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
					aria-label="Search users by name, email, code, or phone number"
				/>
			</div>
			
			<div>
				<label for="role" class="block text-sm font-medium text-gray-700 mb-1">Role</label>
				<select
					id="role"
					bind:value={roleSelect}
					on:change={handleRoleChange}
					class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
				>
					<option value="">All Roles</option>
					{#each data.roles as roleOption}
						<option value={roleOption.value}>{roleOption.label}</option>
					{/each}
				</select>
			</div>

			<div>
				<label for="active" class="block text-sm font-medium text-gray-700 mb-1">Status</label>
				<select
					id="active"
					bind:value={activeSelect}
					on:change={handleActiveChange}
					class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
				>
					<option value="">All Status</option>
					<option value="Y">Active</option>
					<option value="N">Inactive</option>
				</select>
			</div>

			<div class="flex items-end">
				<a
					href="/users"
					class="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium w-full"
				>
					Clear Filters
				</a>
			</div>
		</div>
	</div>

	<!-- Users Table -->
	<div class="bg-white shadow rounded-lg overflow-hidden">
		<div class="overflow-x-auto">
			<table class="min-w-full divide-y divide-gray-200">
				<thead class="bg-gray-50">
					<tr>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Partner</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
					</tr>
				</thead>
				<tbody class="bg-white divide-y divide-gray-200">
					{#each data.users as user}
						<tr class="hover:bg-gray-50">
							<td class="px-6 py-4 whitespace-nowrap">
								<div class="text-sm font-medium text-gray-900">{user.name}</div>
							</td>
							<td class="px-6 py-4 whitespace-nowrap">
								<div class="text-sm text-gray-900">{user.code}</div>
							</td>
							<td class="px-6 py-4 whitespace-nowrap">
								<div class="text-sm text-gray-900">{user.email}</div>
							</td>
							<td class="px-6 py-4 whitespace-nowrap">
								<div class="text-sm text-gray-900">{formatPhoneNumber(user.phoneNumber)}</div>
							</td>
							<td class="px-6 py-4 whitespace-nowrap">
								<span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
									{formatRole(user.role)}
								</span>
							</td>
							<td class="px-6 py-4 whitespace-nowrap">
								<div class="text-sm text-gray-900">{user.partnerName || 'N/A'}</div>
							</td>
							<td class="px-6 py-4 whitespace-nowrap">
								<span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full {user.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
									{user.active ? 'Active' : 'Inactive'}
								</span>
							</td>
							<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
								{formatDate(user.createdAt)}
							</td>
							<td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
								<a href="/users/{user.id}/edit" class="text-indigo-600 hover:text-indigo-900 mr-3">
									Edit
								</a>
							</td>
						</tr>
					{:else}
						<tr>
							<td colspan="9" class="px-6 py-4 text-center text-sm text-gray-500">
								No users found matching your criteria.
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</div>
