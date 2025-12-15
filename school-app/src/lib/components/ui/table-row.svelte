<script lang="ts">
  interface Props {
    class?: string;
  }

  let { class: className = '' }: Props = $props();

  const rowClass = `border-b border-gray-200 hover:bg-gray-50 ${className}`;
</script>

<tr class={rowClass}>
  <slot />
</tr>
