<script lang="ts">
  interface Props {
    class?: string;
  }

  let { class: className = '' }: Props = $props();

  const headerClass = `flex flex-col space-y-1.5 border-b border-gray-200 px-6 py-4 ${className}`;
</script>

<div class={headerClass}>
  <slot />
</div>
