<script lang="ts">
	import { page } from '$app/stores';
	import SiteHeader from '$lib/components/SiteHeader.svelte';

	export let user: { name: string; email: string; role: string; code?: string | null } | null = null;

	const navigationItems = [
		{ href: '/dashboard', label: 'Dashboard', icon: '📊' },
		{ href: '/partners', label: 'Partners', icon: '🤝', roles: ['national_admin'] },
		{ href: '/districts', label: 'Districts', icon: '📍', roles: ['national_admin'] },
		{ href: '/schools', label: 'Schools', icon: '🏫', roles: ['national_admin', 'partner_manager', 'team_member', 'data_manager'] },
		{ href: '/surveys', label: 'Surveys', icon: '📋', roles: ['team_member', 'partner_manager', 'data_manager'] },
		{ href: '/users', label: 'Users', icon: '👥', roles: ['national_admin', 'partner_manager', 'team_member', 'data_manager'] },
		{ href: '/reports', label: 'Reports', icon: '📈', roles: ['national_admin', 'data_manager', 'partner_manager'] },
		{ href: '/audit-log', label: 'Audit Log', icon: '📝', roles: ['national_admin'] }
	];

	$: role = user?.role ?? '';
	$: visibleItems = navigationItems.filter((item) => !item.roles || item.roles.includes(role));
</script>

<div class="min-h-screen bg-gray-50">
	<SiteHeader
		variant="app"
		isLoggedIn={Boolean(user)}
		userLabel={user?.name ?? user?.email ?? 'Guest'}
		userRole={user?.role ?? null}
		userCode={user?.code ?? null}
		authHref={user ? '/logout' : '/login'}
		authLabel={user ? 'Logout' : 'Login'}
	/>

	<div class="flex h-full">
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

		<main class="flex-1 p-8">
			<slot />
		</main>
	</div>
</div>
