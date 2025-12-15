<script lang="ts">
  interface Props {
    type?: string;
    placeholder?: string;
    value?: string;
    disabled?: boolean;
    class?: string;
    [key: string]: any;
  }

  let { type = 'text', placeholder = '', value = '', disabled = false, class: className = '', ...rest }: Props = $props();

  const inputClass = `w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed ${className}`;
</script>

<input {type} {placeholder} {disabled} class={inputClass} bind:value {...rest} />
