<script lang="ts">
  interface Props {
    class?: string;
  }

  let { class: className = '' }: Props = $props();

  const bodyClass = `${className}`;
</script>

<tbody class={bodyClass}>
  <slot />
</tbody>
