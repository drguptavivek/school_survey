<script lang="ts">
	export let id: string;
	export let label: string;
	export let value: string | boolean | number = '';
	export let type: string = 'text';
	export let error: string | undefined = undefined;
	export let touched: boolean = false;
	export let placeholder: string = '';
	export let required: boolean = false;
	export let maxlength: number | undefined = undefined;
	export let min: number | undefined = undefined;
	export let rows: number | undefined = undefined;
	export let disabled: boolean = false;

	export let onChange: ((value: string | boolean) => void) | undefined = undefined;
	export let onBlur: (() => void) | undefined = undefined;
</script>

<div class="block text-sm text-slate-700">
	<label for={id} class="block text-sm font-medium text-slate-700 mb-1">
		{label}
		{#if required}
			<span class="text-red-600">*</span>
		{/if}
	</label>

	{#if type === 'textarea'}
		<div class="relative">
			<textarea
				{id}
				{placeholder}
				{maxlength}
				{rows}
				{disabled}
				value={String(value)}
				on:input={(e) => onChange?.(e.currentTarget.value)}
				on:blur={() => onBlur?.()}
				class="w-full rounded-lg border px-3 py-2 text-sm transition-all {error && touched
					? 'border-red-500 bg-red-50 focus:border-red-400 focus:ring-2 focus:ring-red-100'
					: 'border-slate-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-100'}"
				aria-invalid={error ? 'true' : 'false'}
				aria-describedby={error ? `${id}-error` : undefined}
			></textarea>
			{#if error && touched}
				<div class="absolute right-3 top-3">
					<svg class="h-5 w-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
						<path
							fill-rule="evenodd"
							d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
							clip-rule="evenodd"
						/>
					</svg>
				</div>
			{:else if value && touched}
				<div class="absolute right-3 top-3">
					<svg class="h-5 w-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
						<path
							fill-rule="evenodd"
							d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
							clip-rule="evenodd"
						/>
					</svg>
				</div>
			{/if}
		</div>
	{:else if type === 'checkbox'}
		<label class="flex items-center text-sm text-slate-700">
			<input
				{id}
				{type}
				{disabled}
				checked={Boolean(value)}
				on:change={(e) => onChange?.(e.currentTarget.checked)}
				on:blur={() => onBlur?.()}
				class="rounded border-slate-200 text-sky-600 focus:ring-sky-500"
			/>
			<span class="ml-2">{label}</span>
		</label>
	{:else if type === 'select'}
		<div class="relative">
			<select
				{id}
				{disabled}
				value={String(value)}
				on:input={(e) => onChange?.(e.currentTarget.value)}
				on:blur={() => onBlur?.()}
				class="mt-1 w-full rounded-lg border px-3 py-2 text-sm transition-all {error && touched
					? 'border-red-500 bg-red-50 focus:border-red-400 focus:ring-2 focus:ring-red-100'
					: 'border-slate-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-100'}"
				aria-invalid={error ? 'true' : 'false'}
				aria-describedby={error ? `${id}-error` : undefined}
			>
				<slot />
			</select>
			{#if error && touched}
				<div class="absolute right-3 top-3">
					<svg class="h-5 w-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
						<path
							fill-rule="evenodd"
							d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
							clip-rule="evenodd"
						/>
					</svg>
				</div>
			{/if}
		</div>
	{:else}
		<div class="relative mt-1">
			<input
				{id}
				{type}
				{placeholder}
				{maxlength}
				{min}
				{disabled}
				{required}
				value={String(value)}
				on:input={(e) => onChange?.(e.currentTarget.value)}
				on:blur={() => onBlur?.()}
				class="w-full rounded-lg border px-3 py-2 text-sm transition-all {error && touched
					? 'border-red-500 bg-red-50 focus:border-red-400 focus:ring-2 focus:ring-red-100'
					: 'border-slate-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-100'}"
				aria-invalid={error ? 'true' : 'false'}
				aria-describedby={error ? `${id}-error` : undefined}
			/>
			{#if error && touched}
				<div class="absolute right-3 top-3">
					<svg class="h-5 w-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
						<path
							fill-rule="evenodd"
							d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
							clip-rule="evenodd"
						/>
					</svg>
				</div>
			{:else if value && touched && type !== 'checkbox'}
				<div class="absolute right-3 top-3">
					<svg class="h-5 w-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
						<path
							fill-rule="evenodd"
							d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
							clip-rule="evenodd"
						/>
					</svg>
				</div>
			{/if}
		</div>
	{/if}

	{#if error && touched}
		<div class="mt-2 rounded-md bg-red-50 p-2">
			<p class="text-xs font-medium text-red-700" id="{id}-error">{error}</p>
		</div>
	{/if}
</div>
