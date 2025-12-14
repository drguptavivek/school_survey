<script lang="ts">
	import { page } from '$app/stores';
	import AppShell from '$lib/components/AppShell.svelte';
	import ErrorPage from '$lib/components/ErrorPage.svelte';

	export let status: number;
	export let error: unknown;

	$: user = $page.data?.user ?? null;
	$: useAppShell = Boolean(user) && !$page.url.pathname.startsWith('/login');
</script>

{#if useAppShell}
	<AppShell user={user}>
		<ErrorPage {status} {error} showSiteHeader={false} />
	</AppShell>
{:else}
	<ErrorPage
		{status}
		{error}
		showSiteHeader={true}
		siteHeader={{
			isLoggedIn: Boolean(user),
			userLabel: user?.name ?? user?.email ?? 'Guest',
			authHref: user ? '/logout' : '/login',
			authLabel: user ? 'Logout' : 'Login'
		}}
	/>
{/if}
