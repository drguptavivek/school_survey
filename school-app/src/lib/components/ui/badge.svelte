<script lang="ts">
  interface Props {
    variant?: 'default' | 'secondary' | 'outline';
    class?: string;
  }

  let { variant = 'default', class: className = '' }: Props = $props();

  const variants: Record<string, string> = {
    default: 'bg-blue-100 text-blue-800',
    secondary: 'bg-gray-100 text-gray-800',
    outline: 'border border-gray-300 bg-white text-gray-900'
  };

  const badgeClass = `inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${variants[variant]} ${className}`;
</script>

<span class={badgeClass}>
  <slot />
</span>
