<script lang="ts">
  interface Props {
    variant?: 'default' | 'outline' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    href?: string;
    disabled?: boolean;
    type?: 'button' | 'submit' | 'reset';
    class?: string;
  }

  let {
    variant = 'default',
    size = 'md',
    href,
    disabled = false,
    type = 'button',
    class: className = '',
    ...rest
  }: Props & Record<string, any> = $props();

  const baseStyles =
    'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed';

  const variants: Record<string, string> = {
    default: 'bg-blue-600 text-white hover:bg-blue-700',
    outline: 'border border-gray-300 bg-white text-gray-900 hover:bg-gray-50',
    ghost: 'text-gray-900 hover:bg-gray-100'
  };

  const sizes: Record<string, string> = {
    sm: 'h-8 px-3 text-sm gap-1',
    md: 'h-10 px-4 text-base gap-2',
    lg: 'h-12 px-6 text-lg gap-2'
  };

  const buttonClass = `${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`;
</script>

{#if href}
  <a {href} class={buttonClass} {...rest}>
    <slot />
  </a>
{:else}
  <button {type} {disabled} class={buttonClass} {...rest}>
    <slot />
  </button>
{/if}
