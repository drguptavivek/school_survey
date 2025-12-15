<script lang="ts">
  interface Props {
    value?: string;
    disabled?: boolean;
    class?: string;
    [key: string]: any;
  }

  let { value = '', disabled = false, class: className = '', ...rest }: Props = $props();

  const selectClass = `w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed ${className}`;
</script>

<select class={selectClass} {disabled} bind:value {...rest}>
  <slot />
</select>
