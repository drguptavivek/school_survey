<script lang="ts">
  interface Props {
    class?: string;
  }

  let { class: className = '' }: Props = $props();

  const headerClass = `bg-gray-50 ${className}`;
</script>

<thead class={headerClass}>
  <slot />
</thead>
