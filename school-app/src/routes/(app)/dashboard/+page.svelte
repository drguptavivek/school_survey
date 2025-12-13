<script lang="ts">
	import type { PageData } from './$types';

	export let data: PageData;

	const user = data.user;
</script>

<div>
	<h2 class="text-3xl font-bold text-gray-900 mb-8">
		Welcome, {user.name}!
	</h2>

	<!-- Role-specific Dashboard Content -->
	{#if user.role === 'national_admin'}
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
			<div class="bg-white rounded-lg shadow p-6">
				<h3 class="text-gray-600 text-sm font-medium mb-2">Partners</h3>
				<p class="text-3xl font-bold text-blue-600">40</p>
				<p class="text-xs text-gray-500 mt-1">Across 60 districts</p>
			</div>
			<div class="bg-white rounded-lg shadow p-6">
				<h3 class="text-gray-600 text-sm font-medium mb-2">Districts</h3>
				<p class="text-3xl font-bold text-green-600">60</p>
				<p class="text-xs text-gray-500 mt-1">All districts active</p>
			</div>
			<div class="bg-white rounded-lg shadow p-6">
				<h3 class="text-gray-600 text-sm font-medium mb-2">Schools</h3>
				<p class="text-3xl font-bold text-purple-600">-</p>
				<p class="text-xs text-gray-500 mt-1">Uploaded by partners</p>
			</div>
			<div class="bg-white rounded-lg shadow p-6">
				<h3 class="text-gray-600 text-sm font-medium mb-2">Surveys</h3>
				<p class="text-3xl font-bold text-orange-600">-</p>
				<p class="text-xs text-gray-500 mt-1">Total collected</p>
			</div>
		</div>

		<div class="bg-white rounded-lg shadow p-6">
			<h3 class="text-lg font-bold text-gray-900 mb-4">National Admin Actions</h3>
			<ul class="space-y-2 text-gray-700">
				<li>✓ Create and manage partner accounts</li>
				<li>✓ Map partners to districts</li>
				<li>✓ View all survey data</li>
				<li>✓ Download national-level reports</li>
				<li>✓ Manage system users</li>
				<li>✓ Access audit logs</li>
			</ul>
		</div>
	{:else if user.role === 'data_manager'}
		<div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
			<div class="bg-white rounded-lg shadow p-6">
				<h3 class="text-gray-600 text-sm font-medium mb-2">Total Surveys</h3>
				<p class="text-3xl font-bold text-blue-600">-</p>
				<p class="text-xs text-gray-500 mt-1">Across all partners</p>
			</div>
			<div class="bg-white rounded-lg shadow p-6">
				<h3 class="text-gray-600 text-sm font-medium mb-2">Schools Covered</h3>
				<p class="text-3xl font-bold text-green-600">-</p>
				<p class="text-xs text-gray-500 mt-1">Data collected from</p>
			</div>
			<div class="bg-white rounded-lg shadow p-6">
				<h3 class="text-gray-600 text-sm font-medium mb-2">Students Assessed</h3>
				<p class="text-3xl font-bold text-purple-600">-</p>
				<p class="text-xs text-gray-500 mt-1">Total participants</p>
			</div>
		</div>

		<div class="bg-white rounded-lg shadow p-6">
			<h3 class="text-lg font-bold text-gray-900 mb-4">Data Manager Functions</h3>
			<ul class="space-y-2 text-gray-700">
				<li>✓ View all survey data</li>
				<li>✓ Generate national-level reports</li>
				<li>✓ Download data in CSV/Excel formats</li>
				<li>✓ Access data visualizations and analytics</li>
			</ul>
		</div>
	{:else if user.role === 'partner_manager'}
		<div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
			<div class="bg-white rounded-lg shadow p-6">
				<h3 class="text-gray-600 text-sm font-medium mb-2">Team Members</h3>
				<p class="text-3xl font-bold text-blue-600">-</p>
				<p class="text-xs text-gray-500 mt-1">In your partner</p>
			</div>
			<div class="bg-white rounded-lg shadow p-6">
				<h3 class="text-gray-600 text-sm font-medium mb-2">Schools Assigned</h3>
				<p class="text-3xl font-bold text-green-600">-</p>
				<p class="text-xs text-gray-500 mt-1">For survey</p>
			</div>
			<div class="bg-white rounded-lg shadow p-6">
				<h3 class="text-gray-600 text-sm font-medium mb-2">Surveys Submitted</h3>
				<p class="text-3xl font-bold text-purple-600">-</p>
				<p class="text-xs text-gray-500 mt-1">Total collected</p>
			</div>
		</div>

		<div class="bg-white rounded-lg shadow p-6">
			<h3 class="text-lg font-bold text-gray-900 mb-4">Partner Manager Actions</h3>
			<ul class="space-y-2 text-gray-700">
				<li>✓ Upload school lists (CSV)</li>
				<li>✓ Select schools for survey</li>
				<li>✓ Create team member accounts</li>
				<li>✓ Edit surveys (within 15 days)</li>
				<li>✓ View partner-specific data</li>
				<li>✓ Download partner reports</li>
			</ul>
		</div>
	{:else if user.role === 'team_member'}
		<div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
			<div class="bg-white rounded-lg shadow p-6">
				<h3 class="text-gray-600 text-sm font-medium mb-2">Schools Assigned</h3>
				<p class="text-3xl font-bold text-blue-600">-</p>
				<p class="text-xs text-gray-500 mt-1">To survey</p>
			</div>
			<div class="bg-white rounded-lg shadow p-6">
				<h3 class="text-gray-600 text-sm font-medium mb-2">Surveys Submitted</h3>
				<p class="text-3xl font-bold text-green-600">-</p>
				<p class="text-xs text-gray-500 mt-1">Total collected</p>
			</div>
		</div>

		<div class="bg-white rounded-lg shadow p-6">
			<h3 class="text-lg font-bold text-gray-900 mb-4">Team Member Functions</h3>
			<ul class="space-y-2 text-gray-700">
				<li>✓ View assigned schools</li>
				<li>✓ Submit eye health surveys</li>
				<li>✓ Edit surveys (within 24 hours)</li>
				<li>✓ Work offline with auto-sync</li>
				<li>✓ View submission history</li>
			</ul>
		</div>
	{/if}

	<!-- Coming Soon Features -->
	<div class="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
		<h3 class="text-lg font-bold text-blue-900 mb-4">🚀 Coming Soon</h3>
		<ul class="text-blue-800 space-y-2">
			<li>• Analytics dashboard with interactive charts</li>
			<li>• Advanced filtering and search capabilities</li>
			<li>• Real-time survey status tracking</li>
			<li>• Mobile-friendly offline surveys</li>
			<li>• Automated report generation</li>
		</ul>
	</div>
</div>
