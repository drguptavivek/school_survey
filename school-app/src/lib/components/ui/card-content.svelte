<script lang="ts">
  interface Props {
    class?: string;
  }

  let { class: className = '' }: Props = $props();

  const contentClass = `px-6 py-4 ${className}`;
</script>

<div class={contentClass}>
  <slot />
</div>
