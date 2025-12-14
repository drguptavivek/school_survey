<script lang="ts">
	import { page } from '$app/stores';
	import AppShell from '$lib/components/AppShell.svelte';
	import ErrorPage from '$lib/components/ErrorPage.svelte';

	export let status: number;
	export let error: unknown;
</script>

<AppShell user={$page.data?.user ?? null}>
	<ErrorPage {status} {error} showSiteHeader={false} />
</AppShell>
