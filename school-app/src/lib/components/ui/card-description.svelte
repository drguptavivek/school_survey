<script lang="ts">
  interface Props {
    class?: string;
  }

  let { class: className = '' }: Props = $props();

  const descClass = `text-sm text-gray-600 ${className}`;
</script>

<p class={descClass}>
  <slot />
</p>
