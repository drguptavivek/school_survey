<script lang="ts">
	import { goto } from '$app/navigation';
	import PageContainer from '$lib/components/PageContainer.svelte';
	import SiteHeader from '$lib/components/SiteHeader.svelte';

	export let status: number = 500;
	export let error: unknown;
	export let showSiteHeader: boolean = true;
	export let siteHeader:
		| {
				isLoggedIn: boolean;
				userLabel: string;
				authHref: string;
				authLabel: string;
		  }
		| undefined;

	const titleByStatus: Record<number, string> = {
		401: 'Please sign in',
		403: 'Access denied',
		404: 'Page not found',
		500: 'Something went wrong'
	};

	function getMessage(err: unknown) {
		if (!err) return null;
		if (err instanceof Error) return err.message || null;
		if (typeof err === 'string') return err;
		if (typeof err === 'object') {
			if ('body' in err && (err as any).body && typeof (err as any).body.message === 'string') {
				return (err as any).body.message as string;
			}
			if ('message' in err && typeof (err as any).message === 'string') {
				return (err as any).message as string;
			}
			// Some shapes wrap the message deeper
			if ('error' in err && (err as any).error && typeof (err as any).error.message === 'string') {
				return (err as any).error.message as string;
			}
			// Last resort: attempt to stringify a known body
			if ('body' in err && (err as any).body) {
				try {
					return JSON.stringify((err as any).body);
				} catch {
					// ignore
				}
			}
		}
		try {
			return String(err);
		} catch {
			return null;
		}
	}

	$: title = titleByStatus[status] ?? 'Unexpected error';
	$: message = getMessage(error);
	$: isMissingPartner = status === 403 && Boolean(message?.toLowerCase().includes('not assigned to a partner'));

	function primaryAction() {
		if (status === 401) return { label: 'Go to Login', onClick: () => goto('/login') };
		return { label: 'Back to Dashboard', onClick: () => goto('/dashboard') };
	}

	function secondaryAction() {
		return { label: 'Go Back', onClick: () => history.back() };
	}
</script>

{#if showSiteHeader}
	<SiteHeader
		isLoggedIn={siteHeader?.isLoggedIn ?? false}
		userLabel={siteHeader?.userLabel ?? 'Guest'}
		authHref={siteHeader?.authHref ?? '/login'}
		authLabel={siteHeader?.authLabel ?? 'Login'}
	/>
{/if}

<div class="min-h-[70vh] py-10">
	<PageContainer>
		<div class="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
			<div class="px-6 py-5 border-b border-gray-200">
				<div class="flex items-center justify-between gap-4">
					<h1 class="text-xl font-semibold text-gray-900">{title}</h1>
					<div class="text-sm font-mono text-gray-600">HTTP {status}</div>
				</div>
				{#if isMissingPartner}
					<p class="mt-2 text-sm text-gray-600">
						Your account is missing a partner assignment. Ask a National Admin to assign you to a partner.
					</p>
				{:else if message}
					<p class="mt-2 text-sm text-gray-600">{message}</p>
				{:else}
					<p class="mt-2 text-sm text-gray-600">
						{status === 500
							? 'An unexpected server error occurred. Check the server logs for the underlying cause.'
							: 'You don’t have access to this page.'}
					</p>
				{/if}
			</div>

			<div class="px-6 py-5">
				<div class="flex flex-col sm:flex-row gap-3 sm:justify-end">
					<button
						type="button"
						class="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
						on:click={secondaryAction().onClick}
					>
						{secondaryAction().label}
					</button>
					<button
						type="button"
						class="inline-flex justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
						on:click={primaryAction().onClick}
					>
						{primaryAction().label}
					</button>
				</div>

				<div class="mt-6 text-xs text-gray-500">
					If you believe this is a mistake, contact support and share: <span class="font-mono">HTTP {status}</span>.
				</div>
			</div>
		</div>
	</PageContainer>
</div>
