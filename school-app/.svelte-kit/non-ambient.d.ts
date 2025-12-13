
// this file is generated — do not edit it


declare module "svelte/elements" {
	export interface HTMLAttributes<T> {
		'data-sveltekit-keepfocus'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-noscroll'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-preload-code'?:
			| true
			| ''
			| 'eager'
			| 'viewport'
			| 'hover'
			| 'tap'
			| 'off'
			| undefined
			| null;
		'data-sveltekit-preload-data'?: true | '' | 'hover' | 'tap' | 'off' | undefined | null;
		'data-sveltekit-reload'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-replacestate'?: true | '' | 'off' | undefined | null;
	}
}

export {};


declare module "$app/types" {
	export interface AppTypes {
		RouteId(): "/(auth)" | "/(app)" | "/" | "/(app)/dashboard" | "/(auth)/login" | "/(auth)/logout";
		RouteParams(): {
			
		};
		LayoutParams(): {
			"/(auth)": Record<string, never>;
			"/(app)": Record<string, never>;
			"/": Record<string, never>;
			"/(app)/dashboard": Record<string, never>;
			"/(auth)/login": Record<string, never>;
			"/(auth)/logout": Record<string, never>
		};
		Pathname(): "/" | "/dashboard" | "/dashboard/" | "/login" | "/login/" | "/logout" | "/logout/";
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): "/robots.txt" | string & {};
	}
}