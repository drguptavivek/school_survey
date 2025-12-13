<script lang="ts">
	import { page } from '$app/stores';
	import type { LayoutData } from './$types';

	export let data: LayoutData;

	const user = data.user;

	const navigationItems = [
		{ href: '/dashboard', label: 'Dashboard', icon: '📊' },
		{ href: '/partners', label: 'Partners', icon: '🤝', roles: ['national_admin'] },
		{ href: '/districts', label: 'Districts', icon: '📍', roles: ['national_admin'] },
		{ href: '/partner-districts', label: 'Partner-Districts', icon: '🗺️', roles: ['national_admin'] },
		{ href: '/schools', label: 'Schools', icon: '🏫', roles: ['national_admin', 'partner_manager'] },
		{ href: '/surveys', label: 'Surveys', icon: '📋', roles: ['team_member', 'partner_manager', 'data_manager'] },
		{ href: '/users', label: 'Users', icon: '👥', roles: ['national_admin', 'partner_manager'] },
		{ href: '/reports', label: 'Reports', icon: '📈', roles: ['national_admin', 'data_manager', 'partner_manager'] },
		{ href: '/audit-log', label: 'Audit Log', icon: '📝', roles: ['national_admin'] }
		
	];

	// Filter navigation items based on user role
	const visibleItems = navigationItems.filter((item) => {
		if (!item.roles) return true;
		return item.roles.includes(user.role);
	});
</script>

<div class="min-h-screen bg-gray-50">
	<!-- Header -->
	<header class="bg-white shadow">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
			<div>
				<h1 class="text-2xl font-bold text-gray-900">School Eye Health Survey</h1>
				<p class="text-sm text-gray-600">Multi-tenant Survey Management System</p>
			</div>
			<div class="flex items-center gap-4">
				<div class="text-right">
					<p class="text-sm font-medium text-gray-900">{user.name}</p>
					<p class="text-xs text-gray-600 capitalize">{user.role.replace('_', ' ')}</p>
				</div>
				<a href="/logout" class="text-blue-600 hover:text-blue-800 text-sm font-medium">
					Logout
				</a>
			</div>
		</div>
	</header>

	<div class="flex h-full">
		<!-- Sidebar Navigation -->
		<nav class="w-64 bg-white shadow min-h-screen">
			<div class="px-4 py-6 space-y-1">
				{#each visibleItems as item (item.href)}
					<a
						href={item.href}
						class={`block px-4 py-2 rounded-lg transition ${
							$page.url.pathname === item.href
								? 'bg-blue-100 text-blue-700 font-medium'
								: 'text-gray-700 hover:bg-gray-100'
						}`}
					>
						<span class="mr-2">{item.icon}</span>
						{item.label}
					</a>
				{/each}
			</div>
		</nav>

		<!-- Main Content -->
		<main class="flex-1 p-8">
			<slot />
		</main>
	</div>
</div>

<style>
	:global(body) {
		background-color: #f9fafb;
	}
</style>
