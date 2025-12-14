<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import QRCode from 'qrcode';
	import { deleteItem, canDeleteItem } from '$lib/client/delete-utils';

	export let data;

	let searchInput = $page.url.searchParams.get('q') || '';
	let roleSelect = $page.url.searchParams.get('role') || '';
	let activeSelect = $page.url.searchParams.get('active') || '';

	type ResetResult = { id: string; email: string; code: string; temporaryPassword: string };
	let resetForUserId: string | null = null;
	let resetError: string | null = null;
	let resetLoading = false;
	let resetQrDataUrl: string | null = null;
	let resetResult: ResetResult | null = null;
	let deletingId: string | null = null;

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

	function buildCredentialsText(result: ResetResult) {
		return `Email: ${result.email}\nUser Code: ${result.code}\nTemporary Password: ${result.temporaryPassword}`;
	}

	async function resetCredentials(userId: string) {
		const confirmed = window.confirm('Reset credentials for this user? This will generate a new temporary password.');
		if (!confirmed) return;

		resetForUserId = userId;
		resetError = null;
		resetLoading = true;
		resetQrDataUrl = null;
		resetResult = null;

		try {
			const res = await fetch(`/users/${encodeURIComponent(userId)}/reset-credentials`, { method: 'POST' });
			if (!res.ok) {
				const text = await res.text();
				throw new Error(text || `Request failed (${res.status})`);
			}
			const data = (await res.json()) as ResetResult;
			resetResult = data;
			const credentials = buildCredentialsText(data);
			resetQrDataUrl = await QRCode.toDataURL(credentials, { margin: 1, width: 220 });
		} catch (e) {
			resetError = e instanceof Error ? e.message : 'Failed to reset credentials';
		} finally {
			resetLoading = false;
		}
	}

	async function copyResetCredentials() {
		if (!resetResult) return;
		await navigator.clipboard.writeText(buildCredentialsText(resetResult));
	}

	function printResetCredentials() {
		if (!resetResult) return;
		const credentials = buildCredentialsText(resetResult);
		const qrImg = resetQrDataUrl
			? `<img src="${resetQrDataUrl}" alt="Credentials QR code" style="width:220px;height:220px;"/>`
			: '';

		const escaped = credentials.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
		const html = `
      <html>
        <head>
          <title>User Credentials</title>
          <meta charset="utf-8" />
        </head>
        <body style="font-family: ui-sans-serif, system-ui; padding: 24px;">
          <h1 style="margin:0 0 12px 0;">User Credentials</h1>
          <div style="margin: 12px 0;">${qrImg}</div>
          <pre style="white-space:pre-wrap;font-size:14px;background:#f5f5f5;padding:12px;border-radius:8px;">${escaped}</pre>
        </body>
      </html>
    `;

		const iframe = document.createElement('iframe');
		iframe.style.position = 'fixed';
		iframe.style.right = '0';
		iframe.style.bottom = '0';
		iframe.style.width = '0';
		iframe.style.height = '0';
		iframe.style.border = '0';
		iframe.srcdoc = html;
		document.body.appendChild(iframe);

		const cleanup = () => {
			iframe.remove();
		};

		iframe.onload = () => {
			try {
				iframe.contentWindow?.focus();
				iframe.contentWindow?.print();
			} finally {
				setTimeout(cleanup, 1000);
			}
		};
	}

	async function handleDelete(user: any) {
		if (!canDeleteItem(data.user.role, 'user', user.partnerId ?? undefined, data.user.partnerId ?? undefined)) {
			alert('You do not have permission to delete this user');
			return;
		}

		deletingId = user.id;

		const result = await deleteItem('user', user.id, user.name);

		if (result.success) {
			// Reload the page
			goto('/users');
		} else {
			alert(`Error: ${result.error}\n${result.details || ''}`);
			deletingId = null;
		}
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
				<label for="search" class="block text-sm font-medium text-gray-700 mb-1 ">Search users</label>
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

	<!-- Users Cards -->
	<div class="grid grid-cols-3 gap-4">
		{#each data.users as user}
			<div class="bg-white shadow rounded-lg p-5 border border-gray-100">
				<div class="flex items-start justify-between gap-4">
					<div class="min-w-0">
						<div class="flex items-center gap-2 flex-wrap">
							<h2 class="text-base font-semibold text-gray-900 truncate">{user.name}</h2>
							<span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
								{formatRole(user.role)}
							</span>
							<span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full {user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
								{user.isActive ? 'Active' : 'Inactive'}
							</span>
						</div>
						<p class="text-sm text-gray-600 mt-1 break-all">{user.email}</p>
					</div>
					<div class="shrink-0 flex items-center gap-2">
						<button
							type="button"
							class="inline-flex items-center rounded-md border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
							on:click={() => resetCredentials(user.id)}
							disabled={resetLoading && resetForUserId === user.id}
						>
							{#if resetLoading && resetForUserId === user.id}
								Resetting…
							{:else}
								Reset Credentials
							{/if}
						</button>
						<a
							href="/users/{user.id}/edit"
							class="inline-flex items-center rounded-md border border-gray-200 px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-50"
						>
							Edit
						</a>
						{#if canDeleteItem(data.user.role, 'user', user.partnerId ?? undefined, data.user.partnerId ?? undefined)}
							<button
								type="button"
								on:click={() => handleDelete(user)}
								disabled={deletingId === user.id}
								class="inline-flex items-center rounded-md border border-gray-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
							>
								{deletingId === user.id ? 'Deleting...' : 'Delete'}
							</button>
						{/if}
					</div>
				</div>

				<dl class="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
					<div class="flex items-center justify-between sm:block">
						<dt class="text-gray-500">Code</dt>
						<dd class="font-mono text-gray-900">{user.code}</dd>
					</div>
					<div class="flex items-center justify-between sm:block">
						<dt class="text-gray-500">Phone</dt>
						<dd class="text-gray-900">{formatPhoneNumber(user.phoneNumber)}</dd>
					</div>
					<div class="flex items-center justify-between sm:block">
						<dt class="text-gray-500">Partner</dt>
						<dd class="text-gray-900">{user.partnerName || 'N/A'}</dd>
					</div>
					<div class="flex items-center justify-between sm:block">
						<dt class="text-gray-500">Created</dt>
						<dd class="text-gray-900">{formatDate(user.createdAt)}</dd>
					</div>
					<div class="flex items-center justify-between sm:block">
						<dt class="text-gray-500">Last Login</dt>
						<dd class="text-gray-900">{user.lastLoginAt ? formatDate(user.lastLoginAt) : 'N/A'}</dd>
					</div>
				</dl>

				{#if resetForUserId === user.id}
					{#if resetError}
						<div class="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
							{resetError}
						</div>
					{/if}

					{#if resetResult}
						<div class="mt-4 rounded-md border border-blue-200 bg-blue-50 p-4">
							<div class="flex items-start justify-between gap-3">
								<h3 class="text-sm font-semibold text-blue-900">New Credentials</h3>
								<div class="flex items-center gap-2">
									<button
										type="button"
										class="inline-flex items-center gap-1 rounded-md bg-white px-3 py-1.5 text-sm font-medium text-blue-700 border border-blue-200 hover:bg-blue-100"
										on:click={copyResetCredentials}
										aria-label="Copy credentials"
									>
										<svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2">
											<path d="M8 8h10v12H8z" />
											<path d="M6 16H5a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1" />
										</svg>
										Copy
									</button>
									<button
										type="button"
										class="inline-flex items-center gap-1 rounded-md bg-white px-3 py-1.5 text-sm font-medium text-blue-700 border border-blue-200 hover:bg-blue-100"
										on:click={printResetCredentials}
										aria-label="Print credentials"
									>
										<svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2">
											<path d="M6 9V2h12v7" />
											<path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
											<path d="M6 14h12v8H6z" />
										</svg>
										Print
									</button>
								</div>
							</div>
							<div class="mt-3 space-y-2 text-sm">
								<div>
									<span class="font-medium text-blue-700">Email (Login):</span>
									<span class="ml-2 text-blue-900 font-mono break-all">{resetResult.email}</span>
								</div>
								<div>
									<span class="font-medium text-blue-700">User Code:</span>
									<span class="ml-2 text-blue-900 font-mono">{resetResult.code}</span>
								</div>
								<div>
									<span class="font-medium text-blue-700">Temporary Password:</span>
									<span class="ml-2 text-blue-900 font-mono">{resetResult.temporaryPassword}</span>
								</div>
							</div>
							{#if resetQrDataUrl}
								<div class="mt-4 flex justify-center">
									<img
										src={resetQrDataUrl}
										alt="Credentials QR code"
										class="h-[220px] w-[220px] bg-white p-2 rounded-md border border-blue-200"
									/>
								</div>
							{/if}
						</div>
					{/if}
				{/if}
			</div>
		{:else}
			<div class="bg-white shadow rounded-lg p-6 text-center text-sm text-gray-500">
				No users found matching your criteria.
			</div>
		{/each}
	</div>
</div>
