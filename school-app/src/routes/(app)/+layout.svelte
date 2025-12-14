<script lang="ts">
	import type { LayoutData } from './$types';
	import AppShell from '$lib/components/AppShell.svelte';

	export let data: LayoutData;

	const user = data.user;
</script>

<AppShell user={user}>
	<slot />
</AppShell>

<style>
	:global(body) {
		background-color: #f9fafb;
	}
</style>
