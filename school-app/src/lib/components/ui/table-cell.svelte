<script lang="ts">
  interface Props {
    class?: string;
  }

  let { class: className = '' }: Props = $props();

  const cellClass = `h-12 px-4 align-middle text-sm ${className}`;
</script>

<td class={cellClass}>
  <slot />
</td>
