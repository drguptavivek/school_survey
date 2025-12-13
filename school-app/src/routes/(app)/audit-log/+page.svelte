<script lang="ts">
	import type { PageData } from './$types';

	export let data: PageData;

	const formatDate = (value: string | Date) => new Date(value).toLocaleString();
</script>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<div>
			<p class="text-xs font-semibold uppercase tracking-wide text-sky-700">Audit</p>
			<h1 class="text-2xl font-bold text-slate-900">Audit log</h1>
			<p class="text-sm text-slate-600">Paginated record of partner CRUD and other actions.</p>
		</div>
	</div>

	<div class="rounded-2xl border border-slate-200 bg-white shadow-sm">
		<div class="overflow-x-auto">
			<table class="min-w-full text-sm">
				<thead class="text-left text-slate-600">
					<tr class="border-b border-slate-200 bg-slate-50">
						<th class="px-4 py-2">When</th>
						<th class="px-4 py-2">User</th>
						<th class="px-4 py-2">Action</th>
						<th class="px-4 py-2">Entity</th>
						<th class="px-4 py-2">IP</th>
						<th class="px-4 py-2">Details</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-200">
					{#each data.logs as log}
						<tr>
							<td class="px-4 py-2 text-slate-700">{formatDate(log.createdAt)}</td>
							<td class="px-4 py-2 text-slate-700">
								{log.userName ?? 'Unknown'}{log.userId ? ` (${log.userId})` : ''}
							</td>
							<td class="px-4 py-2 text-slate-700">{log.action}</td>
							<td class="px-4 py-2 text-slate-700">
								{log.entityType}{log.entityId ? `:${log.entityId}` : ''}
							</td>
							<td class="px-4 py-2 text-slate-700">{log.ipAddress ?? '—'}</td>
							<td class="px-4 py-2 text-slate-700 break-all">
								{#if log.changes}
									<pre class="whitespace-pre-wrap text-xs text-slate-600 bg-slate-50 rounded-lg p-2 border border-slate-100">
{log.changes}
									</pre>
								{:else}
									<span class="text-slate-500 text-xs">—</span>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<div class="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-700">
			<div>Page {data.page} of {data.totalPages}</div>
			<div class="flex items-center gap-2">
				<a
					class="rounded-lg border border-slate-200 px-3 py-1.5 hover:border-slate-300 disabled:opacity-50"
					href={`/audit-log?page=${Math.max(1, data.page - 1)}`}
					aria-disabled={data.page <= 1}
					on:click|preventDefault={data.page <= 1 ? () => {} : undefined}
				>
					Previous
				</a>
				<a
					class="rounded-lg border border-slate-200 px-3 py-1.5 hover:border-slate-300 disabled:opacity-50"
					href={`/audit-log?page=${Math.min(data.totalPages, data.page + 1)}`}
					aria-disabled={data.page >= data.totalPages}
					on:click|preventDefault={data.page >= data.totalPages ? () => {} : undefined}
				>
					Next
				</a>
			</div>
		</div>
	</div>
</div>
