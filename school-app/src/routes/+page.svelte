<script lang="ts">
	import type { PageData } from './$types';
	import SiteHeader from '$lib/components/SiteHeader.svelte';

	export let data: PageData;

	const user = data.user;
	const isLoggedIn = Boolean(user);
	const ctaHref = isLoggedIn ? '/dashboard' : '/login';
	const ctaLabel = isLoggedIn ? 'Dashboard' : 'Login';
	const authHref = isLoggedIn ? '/logout' : '/login';
	const authLabel = isLoggedIn ? 'Logout' : 'Login';
	const userLabel = user?.name ?? user?.email ?? 'Guest';
</script>

<svelte:head>
	<title>School Survey | Home</title>
	<meta
		name="description"
		content="Nation-wide School Eye Health Survey platform for national admins, partners, and field teams."
	/>
</svelte:head>

<div class="min-h-screen bg-linear-to-b from-sky-50 via-white to-white text-slate-900">
	<SiteHeader {isLoggedIn} {userLabel} {authHref} {authLabel} />

	<main class="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
		<section class="grid gap-10 lg:grid-cols-[1.1fr,0.9fr] lg:items-center">
			<div class="space-y-6">
				<p class="inline-flex items-center gap-2 rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-sky-800">
					<span class="h-2 w-2 rounded-full bg-sky-500"></span>
					Live rollout across 60 districts
				</p>
				<h1 class="text-4xl font-bold leading-tight text-slate-950 sm:text-5xl">
					Secure, role-aware platform for the School Eye Health Survey
				</h1>
				<p class="text-lg leading-relaxed text-slate-600 sm:text-xl">
					Built with SvelteKit, PostgreSQL, and Drizzle ORM, the system keeps national admins, partner
					managers, and field teams in sync while collecting high-quality eye health data from schools
					across the country.
				</p>
				<div class="flex flex-wrap items-center gap-3">
					<a
						href={ctaHref}
						class="rounded-full bg-sky-700 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-sky-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
					>
						{ctaLabel}
					</a>
					<a
						href="#how-it-works"
						class="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-800 transition hover:-translate-y-0.5 hover:border-sky-400 hover:text-sky-800"
					>
						See how it works
					</a>
				</div>
				<div class="grid gap-4 sm:grid-cols-3">
					<div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
						<p class="text-3xl font-bold text-slate-900">60</p>
						<p class="text-sm text-slate-600">Districts supported</p>
					</div>
					<div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
						<p class="text-3xl font-bold text-slate-900">40</p>
						<p class="text-sm text-slate-600">Partners onboarded</p>
					</div>
					<div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
						<p class="text-3xl font-bold text-slate-900">4</p>
						<p class="text-sm text-slate-600">Roles with tailored access</p>
					</div>
				</div>
			</div>

			<div class="relative">
				<div class="absolute inset-0 -z-10 scale-[1.02] rounded-[28px] bg-linear-to-br from-sky-100 via-white to-amber-50 blur-2xl"></div>
				<div class="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-xl">
					<div class="border-b border-slate-200 bg-slate-50 px-6 py-4">
						<p class="text-sm font-semibold text-slate-800">What you get</p>
						<p class="text-xs text-slate-500">Aligned with the implementation plan and tracker</p>
					</div>
					<div class="divide-y divide-slate-200">
						<div class="flex items-start gap-4 px-6 py-5">
							<div class="mt-0.5 h-9 w-9 rounded-xl bg-sky-100 text-sky-700 ring-1 ring-sky-200 flex items-center justify-center font-semibold">
								1
							</div>
							<div>
								<p class="font-semibold text-slate-900">Secure authentication</p>
								<p class="text-sm text-slate-600">Session-based login with role-aware dashboards.</p>
							</div>
						</div>
						<div class="flex items-start gap-4 px-6 py-5">
							<div class="mt-0.5 h-9 w-9 rounded-xl bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200 flex items-center justify-center font-semibold">
								2
							</div>
							<div>
								<p class="font-semibold text-slate-900">District + partner coverage</p>
								<p class="text-sm text-slate-600">Single source of truth for 60 districts mapped to 40 partners.</p>
							</div>
						</div>
						<div class="flex items-start gap-4 px-6 py-5">
							<div class="mt-0.5 h-9 w-9 rounded-xl bg-amber-100 text-amber-700 ring-1 ring-amber-200 flex items-center justify-center font-semibold">
								3
							</div>
							<div>
								<p class="font-semibold text-slate-900">Survey-ready</p>
								<p class="text-sm text-slate-600">
									Designed for the School Eye Health Survey with offline-friendly workflows.
								</p>
							</div>
						</div>
					</div>
					<div class="px-6 py-5">
						<p class="text-sm font-semibold text-slate-900">Need access?</p>
						<p class="text-sm text-slate-600">
							Use your assigned credentials from the onboarding pack. Demo users are available on the login page for local testing.
						</p>
					</div>
				</div>
			</div>
		</section>

		<section id="how-it-works" class="mt-16 space-y-8">
			<div class="flex items-center justify-between gap-4">
				<div>
					<p class="text-xs font-semibold uppercase tracking-wide text-sky-700">Workflow</p>
					<h2 class="text-2xl font-bold text-slate-950">Built for coordinated national rollout</h2>
					<p class="text-sm text-slate-600">
						Follows the implementation plan and tracker milestones with clear handoffs between roles.
					</p>
				</div>
				<a
					href={ctaHref}
					class="hidden rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:-translate-y-0.5 hover:border-sky-400 hover:text-sky-800 sm:inline-flex"
				>
					{ctaLabel}
				</a>
			</div>

			<div class="grid gap-6 md:grid-cols-3">
				<div class="h-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
					<p class="text-sm font-semibold text-sky-700">National Admins</p>
					<h3 class="mt-2 text-lg font-semibold text-slate-900">Set up partners & districts</h3>
					<p class="mt-2 text-sm text-slate-600">
						Create partners, map 1:1 with districts, and oversee system-wide audit trails with zero trust defaults.
					</p>
				</div>
				<div class="h-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
					<p class="text-sm font-semibold text-emerald-700">Partner Managers</p>
					<h3 class="mt-2 text-lg font-semibold text-slate-900">Prepare schools & teams</h3>
					<p class="mt-2 text-sm text-slate-600">
						Upload schools, assign field teams, and manage survey windows with edit deadlines that match policy.
					</p>
				</div>
				<div class="h-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
					<p class="text-sm font-semibold text-amber-700">Team Members</p>
					<h3 class="mt-2 text-lg font-semibold text-slate-900">Collect and sync data</h3>
					<p class="mt-2 text-sm text-slate-600">
						Fill the School Eye Health Survey on-site with validation, offline support, and clear sync status.
					</p>
				</div>
			</div>

			<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
				<div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
					<p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Data Integrity</p>
					<p class="mt-2 text-sm text-slate-700">
						Row-Level Security in PostgreSQL with Drizzle schemas to keep partner data isolated and auditable.
					</p>
				</div>
				<div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
					<p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Validation</p>
					<p class="mt-2 text-sm text-slate-700">
						Zod-powered checks on both client and server for 50+ survey fields to stop bad data early.
					</p>
				</div>
				<div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
					<p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Reporting</p>
					<p class="mt-2 text-sm text-slate-700">
						CSV and Excel export ready with partner and national rollups for progress dashboards.
					</p>
				</div>
				<div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
					<p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Security</p>
					<p class="mt-2 text-sm text-slate-700">
						Session-based auth, httpOnly cookies, rate limits, and audit logs aligned to the implementation tracker.
					</p>
				</div>
			</div>
		</section>

		<section class="mt-16 rounded-3xl border border-slate-200 bg-slate-950 px-8 py-10 text-white shadow-xl">
			<div class="grid gap-8 lg:grid-cols-[2fr,1fr] lg:items-center">
				<div class="space-y-4">
					<p class="text-xs font-semibold uppercase tracking-wide text-sky-200">Ready to work</p>
					<h2 class="text-3xl font-bold leading-tight">Log in to continue rollout</h2>
					<p class="text-sm text-slate-200">
						Access your role-specific dashboard to manage partners, districts, and survey submissions. If you need help,
						reach out to the implementation team listed in the onboarding kit.
					</p>
					<div class="flex flex-wrap gap-3">
						<a
							href={ctaHref}
							class="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 shadow-lg transition hover:-translate-y-0.5 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
						>
							{ctaLabel}
						</a>
						<a
							href="#how-it-works"
							class="rounded-full border border-white/30 px-5 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:border-white/60"
						>
							Review rollout plan
						</a>
					</div>
				</div>
				<div class="rounded-2xl bg-white/5 p-6 ring-1 ring-white/10">
					<p class="text-sm font-semibold text-sky-100">Highlights</p>
					<ul class="mt-3 space-y-2 text-sm text-slate-100">
						<li>• Auth, session management, and dashboards completed</li>
						<li>• Drizzle schema + migrations applied to PostgreSQL 18</li>
						<li>• Next: partner and district CRUD with audit logging</li>
					</ul>
				</div>
			</div>
		</section>
	</main>
</div>
