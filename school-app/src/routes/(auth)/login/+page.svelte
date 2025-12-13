<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';

	export let form;

	let isLoading = false;

	const handleEnhance = () => {
		isLoading = true;

		return async ({ result, update }) => {
			// On failure or error, re-enable the form and show errors
			if (result.type === 'failure' || result.type === 'error') {
				await update();
				isLoading = false;
				return;
			}

			// Handle redirects explicitly (e.g., redirect to dashboard on success)
			if (result.type === 'redirect') {
				isLoading = false;
				await goto(result.location);
				return;
			}

			// On success without redirect, still re-enable after updating
			if (result.type === 'success') {
				await update();
				isLoading = false;
			}
			// Redirect case: navigation handled by SvelteKit
		};
	};
</script>

<div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
	<div class="w-full max-w-md">
		<div class="bg-white rounded-lg shadow-lg p-8">
			<!-- Header -->
			<div class="text-center mb-8">
				<h1 class="text-3xl font-bold text-gray-900 mb-2">School Survey</h1>
				<p class="text-gray-600">School Eye Health Survey System</p>
			</div>

			<!-- Error Message -->
			{#if form?.error}
				<div class="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
					<p class="text-red-800 text-sm font-medium">{form.error}</p>
				</div>
			{/if}

			<!-- Login Form -->
			<form method="POST" use:enhance={handleEnhance}>
				<div class="space-y-4">
					<!-- Email Field -->
					<div>
						<label for="email" class="block text-sm font-medium text-gray-700 mb-2">
							Email Address
						</label>
						<input
							type="email"
							id="email"
							name="email"
							required
							disabled={isLoading}
							class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition"
							placeholder="admin@school-survey.org"
						/>
					</div>

					<!-- Password Field -->
					<div>
						<label for="password" class="block text-sm font-medium text-gray-700 mb-2">
							Password
						</label>
						<input
							type="password"
							id="password"
							name="password"
							required
							disabled={isLoading}
							class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition"
							placeholder="••••••••"
						/>
					</div>

					<!-- Submit Button -->
					<button
						type="submit"
						disabled={isLoading}
						class="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition duration-200 disabled:cursor-not-allowed"
					>
						{isLoading ? 'Logging in...' : 'Login'}
					</button>
				</div>
			</form>

			<!-- Footer Info -->
			<div class="mt-8 pt-6 border-t border-gray-200">
				<p class="text-center text-xs text-gray-500">
					National School Eye Health Survey System
				</p>
				<p class="text-center text-xs text-gray-500 mt-1">
					© 2024 All rights reserved
				</p>
			</div>
		</div>

		<!-- Demo Credentials -->
		<div class="mt-6 p-4 bg-blue-50 rounded-lg text-sm text-gray-700">
			<p class="font-medium mb-2">Demo Credentials (Development):</p>
			<p class="mb-1"><strong>National Admin:</strong> admin@example.com / password123</p>
			<p><strong>Partner Manager:</strong> manager@example.com / password123</p>
		</div>
	</div>
</div>

<style>
	:global(body) {
		background-color: #f9fafb;
	}
</style>
