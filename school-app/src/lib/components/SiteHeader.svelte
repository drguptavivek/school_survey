<script context="module" lang="ts">
	export type SiteHeaderVariant = 'public' | 'app';
</script>

<script lang="ts">
	export let variant: SiteHeaderVariant = 'public';
	export let isLoggedIn: boolean = false;
	export let userLabel: string = 'Guest';
	export let userRole: string | null = null;
	export let userCode: string | null = null;
	export let authHref: string = '/login';
	export let authLabel: string = 'Login';
</script>

{#if variant === 'app'}
	<header class="bg-white shadow">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
			<div>
				<h1 class="text-2xl font-bold text-gray-900">School Eye Health Survey</h1>
				<p class="text-sm text-gray-600">Multi-tenant Survey Management System</p>
			</div>
			{#if isLoggedIn}
				<div class="flex items-center gap-4">
					<div class="text-right">
						<p class="text-sm font-medium text-gray-900">{userLabel}</p>
						<p class="text-xs text-gray-600">
							{#if userRole}{userRole.replace('_', ' ')}{/if}
							{#if userRole && userCode} • {/if}
							{#if userCode}{userCode}{/if}
						</p>
					</div>
					<a href={authHref} class="text-blue-600 hover:text-blue-800 text-sm font-medium">
						{authLabel}
					</a>
				</div>
			{:else}
				<a href={authHref} class="text-blue-600 hover:text-blue-800 text-sm font-medium">
					{authLabel}
				</a>
			{/if}
		</div>
	</header>
{:else}
	<header class="border-b border-slate-200/80 bg-white/80 backdrop-blur">
		<div class="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
			<div class="flex items-center gap-3">
				<div
					class="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-600 text-lg font-bold text-white"
				>
					SE
				</div>
				<div>
					<p class="text-sm font-semibold uppercase tracking-wide text-sky-700">School Survey</p>
					<p class="text-sm text-slate-500">Nation-wide School Eye Health Program</p>
				</div>
			</div>
			<div class="flex items-center gap-3">
				{#if isLoggedIn}
					<div class="hidden text-right text-sm sm:block">
						<p class="font-semibold text-slate-900">{userLabel}</p>
						<p class="text-xs text-slate-500">Signed in</p>
					</div>
				{/if}
				<a
					class="rounded-full bg-sky-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-sky-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
					href={authHref}
				>
					{authLabel}
				</a>
			</div>
		</div>
	</header>
{/if}
