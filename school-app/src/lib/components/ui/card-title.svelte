<script lang="ts">
  interface Props {
    class?: string;
  }

  let { class: className = '' }: Props = $props();

  const titleClass = `text-lg font-semibold leading-none tracking-tight ${className}`;
</script>

<h2 class={titleClass}>
  <slot />
</h2>
