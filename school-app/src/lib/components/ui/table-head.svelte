<script lang="ts">
  interface Props {
    class?: string;
  }

  let { class: className = '' }: Props = $props();

  const headClass = `h-12 px-4 text-left align-middle font-medium text-gray-700 bg-gray-50 ${className}`;
</script>

<th class={headClass}>
  <slot />
</th>
