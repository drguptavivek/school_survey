<script lang="ts">
    import { enhance } from '$app/forms';
    import { page } from '$app/stores';
    import { onMount } from 'svelte';
    import { superForm } from 'sveltekit-superforms';
    import { zodClient } from 'sveltekit-superforms/adapters';
    import { z } from 'zod';
    import { Button } from '$lib/components/ui/button';
    import { Input } from '$lib/components/ui/input';
    import { Select } from '$lib/components/ui/select';
    import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
    import { Badge } from '$lib/components/ui/badge';
    import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '$lib/components/ui/table';
    import { Search, Filter, Download, Eye, Edit, Trash2, ChevronLeft, ChevronRight } from 'lucide-svelte';

    export let data;

    // Search form schema
    const searchSchema = z.object({
        search: z.string().optional(),
        district: z.string().optional(),
        school: z.string().optional(),
        partner: z.string().optional()
    });

    const { form, enhance: searchEnhance, errors } = superForm({
        schema: zodClient(searchSchema),
        defaults: {
            search: data.filters.search,
            district: data.filters.districtId,
            school: data.filters.schoolId,
            partner: data.filters.partnerId
        },
        resetForm: false,
        onResult: ({ result }) => {
            if (result.type === 'success') {
                // Reset to first page when searching
                $page.url.searchParams.set('page', '1');
            }
        }
    });

    // Format date
    function formatDate(dateString: string): string {
        return new Date(dateString).toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Get edit status color
    function getEditStatusColor(status: string): string {
        switch (status) {
            case 'Can Edit':
                return 'bg-green-100 text-green-800';
            case 'Read Only':
                return 'bg-gray-100 text-gray-800';
            default:
                return 'bg-yellow-100 text-yellow-800';
        }
    }

    // Get sex badge color
    function getSexColor(sex: string): string {
        return sex === 'male' ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800';
    }

    // Build pagination URL
    function buildPageUrl(pageNum: number): string {
        const url = new URL($page.url);
        url.searchParams.set('page', pageNum.toString());
        return url.pathname + url.search;
    }
</script>

<div class="space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center">
        <div>
            <h1 class="text-3xl font-bold">Survey Management</h1>
            <p class="text-muted-foreground">
                View and manage submitted eye health surveys ({data.pagination.total} total)
            </p>
        </div>

        {#if data.user.role === 'national_admin' || data.user.role === 'data_manager'}
            <Button href="/surveys/export">
                <Download class="mr-2 h-4 w-4" />
                Export Data
            </Button>
        {/if}
    </div>

    <!-- Search and Filters -->
    <Card>
        <CardHeader>
            <CardTitle class="flex items-center gap-2">
                <Filter class="h-5 w-5" />
                Search & Filters
            </CardTitle>
        </CardHeader>
        <CardContent>
            <form method="GET" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" use:searchEnhance>
                <!-- Search -->
                <div class="space-y-2">
                    <label for="search" class="text-sm font-medium">Search</label>
                    <div class="relative">
                        <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            id="search"
                            name="search"
                            type="text"
                            placeholder="Student name or survey ID..."
                            class="pl-10"
                            bind:value={$form.search}
                        />
                    </div>
                </div>

                <!-- Partner Filter (Admin only) -->
                {#if data.user.role === 'national_admin' || data.user.role === 'data_manager'}
                    <div class="space-y-2">
                        <label for="partner" class="text-sm font-medium">Partner</label>
                        <Select bind:value={$form.partner} name="partner">
                            <option value="">All Partners</option>
                            {#each data.filterOptions.partners as partner}
                                <option value={partner.id}>{partner.name} ({partner.code})</option>
                            {/each}
                        </Select>
                    </div>
                {/if}

                <!-- District Filter -->
                <div class="space-y-2">
                    <label for="district" class="text-sm font-medium">District</label>
                    <Select bind:value={$form.district} name="district" disabled={!$form.partner && (data.user.role !== 'national_admin' && data.user.role !== 'data_manager') && !data.filterOptions.districts.length}>
                        <option value="">All Districts</option>
                        {#each data.filterOptions.districts as district}
                            <option value={district.id}>{district.name} ({district.code})</option>
                        {/each}
                    </Select>
                </div>

                <!-- School Filter -->
                <div class="space-y-2">
                    <label for="school" class="text-sm font-medium">School</label>
                    <Select bind:value={$form.school} name="school" disabled={!$form.district && !data.filterOptions.schools.length}>
                        <option value="">All Schools</option>
                        {#each data.filterOptions.schools as school}
                            <option value={school.id}>{school.name} ({school.code})</option>
                        {/each}
                    </Select>
                </div>

                <!-- Search Button -->
                <div class="flex items-end">
                    <Button type="submit" class="w-full">
                        <Search class="mr-2 h-4 w-4" />
                        Search
                    </Button>
                </div>
            </form>
        </CardContent>
    </Card>

    <!-- Surveys Table -->
    <Card>
        <CardHeader>
            <CardTitle>Submitted Surveys</CardTitle>
            <CardDescription>
                Showing page {data.pagination.page} of {data.pagination.totalPages}
                ({data.surveys.length} of {data.pagination.total} surveys)
            </CardDescription>
        </CardHeader>
        <CardContent>
            {#if data.surveys.length === 0}
                <div class="text-center py-8">
                    <p class="text-muted-foreground">No surveys found matching your criteria.</p>
                </div>
            {:else}
                <div class="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Survey ID</TableHead>
                                <TableHead>Student Name</TableHead>
                                <TableHead>School</TableHead>
                                <TableHead>Class/Sec</TableHead>
                                <TableHead>Age</TableHead>
                                <TableHead>Sex</TableHead>
                                <TableHead>Submitted</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead class="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {#each data.surveys as survey}
                                <TableRow>
                                    <TableCell class="font-mono text-sm">
                                        {survey.surveyUniqueId}
                                    </TableCell>
                                    <TableCell class="font-medium">
                                        {survey.studentName}
                                    </TableCell>
                                    <TableCell>
                                        <div>
                                            <div class="font-medium">{survey.school?.name}</div>
                                            <div class="text-sm text-muted-foreground">{survey.school?.code}</div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {survey.class}-{survey.section}
                                    </TableCell>
                                    <TableCell>{survey.age}</TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" class={getSexColor(survey.sex)}>
                                            {survey.sex}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div class="text-sm">
                                            {formatDate(survey.submittedAt)}
                                        </div>
                                        {#if survey.submittedByUser}
                                            <div class="text-xs text-muted-foreground">
                                                by {survey.submittedByUser.name}
                                            </div>
                                        {/if}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" class={getEditStatusColor(survey.editStatus)}>
                                            {survey.editStatus}
                                        </Badge>
                                    </TableCell>
                                    <TableCell class="text-right">
                                        <div class="flex justify-end gap-2">
                                            <Button variant="outline" size="sm" href="/surveys/{survey.id}">
                                                <Eye class="h-4 w-4" />
                                            </Button>
                                            {#if survey.editStatus === 'Can Edit'}
                                                <Button variant="outline" size="sm" href="/surveys/{survey.id}/edit">
                                                    <Edit class="h-4 w-4" />
                                                </Button>
                                            {/if}
                                            {#if data.user.role === 'national_admin' || data.user.role === 'data_manager'}
                                                <Button variant="outline" size="sm" href="/surveys/{survey.id}/delete" method="POST">
                                                    <Trash2 class="h-4 w-4" />
                                                </Button>
                                            {/if}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            {/each}
                        </TableBody>
                    </Table>
                </div>

                <!-- Pagination -->
                {#if data.pagination.totalPages > 1}
                    <div class="flex items-center justify-between mt-4">
                        <div class="text-sm text-muted-foreground">
                            Showing {((data.pagination.page - 1) * data.pagination.limit) + 1} to
                            {Math.min(data.pagination.page * data.pagination.limit, data.pagination.total)}
                            of {data.pagination.total} results
                        </div>

                        <div class="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={!data.pagination.hasPrev}
                                href={buildPageUrl(data.pagination.page - 1)}
                            >
                                <ChevronLeft class="h-4 w-4" />
                                Previous
                            </Button>

                            <span class="text-sm">
                                Page {data.pagination.page} of {data.pagination.totalPages}
                            </span>

                            <Button
                                variant="outline"
                                size="sm"
                                disabled={!data.pagination.hasNext}
                                href={buildPageUrl(data.pagination.page + 1)}
                            >
                                Next
                                <ChevronRight class="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                {/if}
            {/if}
        </CardContent>
    </Card>
</div>