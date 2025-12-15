<script lang="ts">
  interface Props {
    class?: string;
  }

  let { class: className = '' }: Props = $props();

  const tableClass = `w-full border-collapse border border-gray-200 ${className}`;
</script>

<table class={tableClass}>
  <slot />
</table>
