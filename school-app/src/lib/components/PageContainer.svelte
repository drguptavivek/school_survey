<script lang="ts">
	export let className: string = '';
</script>

<div class={`mx-auto w-full max-w-3xl px-4 sm:px-6 lg:px-8 ${className}`.trim()}>
	<slot />
</div>

