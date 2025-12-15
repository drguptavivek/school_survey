<script lang="ts">
  interface Props {
    class?: string;
  }

  let { class: className = '' }: Props = $props();

  const cardClass = `rounded-lg border border-gray-200 bg-white shadow-sm ${className}`;
</script>

<div class={cardClass}>
  <slot />
</div>
