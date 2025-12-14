<script lang="ts">
    import { Button } from '$lib/components/ui/button';
    import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
    import { Badge } from '$lib/components/ui/badge';
    import { Separator } from '$lib/components/ui/separator';
    import { ArrowLeft, Edit, Download, Calendar, User, MapPin, School, Eye } from 'lucide-svelte';
    import { page } from '$app/stores';

    export let data;

    // Format date
    function formatDate(dateString: string): string {
        return new Date(dateString).toLocaleString('en-IN', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Format gender
    function formatGender(sex: string): string {
        return sex === 'male' ? 'Male' : 'Female';
    }

    // Format consent
    function formatConsent(consent: string): string {
        return consent === 'yes' ? 'Yes' : consent === 'refused' ? 'Refused' : 'Absent';
    }

    // Format vision values
    function formatVision(value: string | null): string {
        if (!value) return 'Not assessed';
        return value;
    }

    // Get sex badge color
    function getSexColor(sex: string): string {
        return sex === 'male' ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800';
    }

    // Format yes/no
    function formatYesNo(value: boolean | null): string {
        if (value === null) return 'Not specified';
        return value ? 'Yes' : 'No';
    }
</script>

<div class="space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-start">
        <div class="space-y-1">
            <Button variant="ghost" href="/surveys" class="mb-2">
                <ArrowLeft class="mr-2 h-4 w-4" />
                Back to Surveys
            </Button>
            <h1 class="text-3xl font-bold">Survey Details</h1>
            <p class="text-muted-foreground">
                Survey ID: <code class="bg-muted px-2 py-1 rounded">{data.survey.surveyUniqueId}</code>
            </p>
        </div>

        <div class="flex gap-2">
            {#if data.permissions.canEdit}
                <Button href="/surveys/{$page.params.id}/edit">
                    <Edit class="mr-2 h-4 w-4" />
                    Edit Survey
                </Button>
            {/if}
            <Button variant="outline" href="/surveys/{$page.params.id}/export">
                <Download class="mr-2 h-4 w-4" />
                Export
            </Button>
        </div>
    </div>

    <!-- Edit Status -->
    {#if data.permissions.canEdit}
        <Card>
            <CardContent class="pt-6">
                <div class="flex items-center gap-2">
                    <Eye class="h-5 w-5 text-green-600" />
                    <span class="text-sm">
                        <strong>Edit Allowed:</strong> {data.permissions.editReason}
                    </span>
                </div>
            </CardContent>
        </Card>
    {:else}
        <Card>
            <CardContent class="pt-6">
                <div class="flex items-center gap-2 text-muted-foreground">
                    <Eye class="h-5 w-5" />
                    <span class="text-sm">
                        <strong>Read Only:</strong> Edit period has expired
                    </span>
                </div>
            </CardContent>
        </Card>
    {/if}

    <!-- School and Student Information -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
            <CardHeader>
                <CardTitle class="flex items-center gap-2">
                    <School class="h-5 w-5" />
                    School Information
                </CardTitle>
            </CardHeader>
            <CardContent class="space-y-4">
                <div>
                    <label class="text-sm font-medium text-muted-foreground">School Name</label>
                    <p class="font-semibold">{data.school.name} ({data.school.code})</p>
                </div>
                <div>
                    <label class="text-sm font-medium text-muted-foreground">District</label>
                    <p>{data.district.name} ({data.district.code})</p>
                </div>
                <div>
                    <label class="text-sm font-medium text-muted-foreground">Partner</label>
                    <p>{data.partner.name} ({data.partner.code})</p>
                </div>
                <div>
                    <label class="text-sm font-medium text-muted-foreground">Address</label>
                    <p>{data.school.address || 'Not provided'}</p>
                </div>
                <div>
                    <label class="text-sm font-medium text-muted-foreground">Contact</label>
                    <p>{data.school.phone || 'Not provided'}</p>
                </div>
                <div class="flex gap-4">
                    <div>
                        <label class="text-sm font-medium text-muted-foreground">Type</label>
                        <p>{data.school.type || 'Not specified'}</p>
                    </div>
                    <div>
                        <label class="text-sm font-medium text-muted-foreground">Area</label>
                        <p>{data.school.area || 'Not specified'}</p>
                    </div>
                </div>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle class="flex items-center gap-2">
                    <User class="h-5 w-5" />
                    Student Information
                </CardTitle>
            </CardHeader>
            <CardContent class="space-y-4">
                <div>
                    <label class="text-sm font-medium text-muted-foreground">Student Name</label>
                    <p class="font-semibold">{data.survey.studentName}</p>
                </div>
                <div class="grid grid-cols-3 gap-4">
                    <div>
                        <label class="text-sm font-medium text-muted-foreground">Class</label>
                        <p>{data.survey.class}</p>
                    </div>
                    <div>
                        <label class="text-sm font-medium text-muted-foreground">Section</label>
                        <p>{data.survey.section}</p>
                    </div>
                    <div>
                        <label class="text-sm font-medium text-muted-foreground">Roll No</label>
                        <p>{data.survey.rollNo}</p>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="text-sm font-medium text-muted-foreground">Age</label>
                        <p>{data.survey.age} years</p>
                    </div>
                    <div>
                        <label class="text-sm font-medium text-muted-foreground">Sex</label>
                        <Badge variant="secondary" class={getSexColor(data.survey.sex)}>
                            {formatGender(data.survey.sex)}
                        </Badge>
                    </div>
                </div>
                <div>
                    <label class="text-sm font-medium text-muted-foreground">Consent</label>
                    <p>{formatConsent(data.survey.consent)}</p>
                </div>
                <div>
                    <label class="text-sm font-medium text-muted-foreground">Survey Date</label>
                    <p>{formatDate(data.survey.surveyDate)}</p>
                </div>
            </CardContent>
        </Card>
    </div>

    <!-- Section A: Basic Details -->
    <Card>
        <CardHeader>
            <CardTitle>Section A: Distance Vision Assessment</CardTitle>
            <CardDescription>Vision screening results for both eyes</CardDescription>
        </CardHeader>
        <CardContent>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="space-y-4">
                    <h4 class="font-semibold">Right Eye</h4>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="text-sm font-medium text-muted-foreground">Unaided VA</label>
                            <p>{formatVision(data.survey.unaidedVaRightEye)}</p>
                        </div>
                        <div>
                            <label class="text-sm font-medium text-muted-foreground">Presenting VA</label>
                            <p>{formatVision(data.survey.presentingVaRightEye)}</p>
                        </div>
                    </div>
                </div>
                <div class="space-y-4">
                    <h4 class="font-semibold">Left Eye</h4>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="text-sm font-medium text-muted-foreground">Unaided VA</label>
                            <p>{formatVision(data.survey.unaidedVaLeftEye)}</p>
                        </div>
                        <div>
                            <label class="text-sm font-medium text-muted-foreground">Presenting VA</label>
                            <p>{formatVision(data.survey.presentingVaLeftEye)}</p>
                        </div>
                    </div>
                </div>
            </div>
            <Separator class="my-4" />
            <div>
                <label class="text-sm font-medium text-muted-foreground">Uses Distance Glasses</label>
                <p>{formatYesNo(data.survey.usesDistanceGlasses)}</p>
            </div>
            <div>
                <label class="text-sm font-medium text-muted-foreground">Referred for Refraction</label>
                <p>{formatYesNo(data.survey.referredForRefraction)}</p>
            </div>
        </CardContent>
    </Card>

    <!-- Section C: Refraction Details (Conditional) -->
    {#if data.survey.referredForRefraction}
        <Card>
            <CardHeader>
                <CardTitle>Section C: Refraction Details</CardTitle>
                <CardDescription>Refraction assessment results</CardDescription>
            </CardHeader>
            <CardContent>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="space-y-4">
                        <h4 class="font-semibold">Right Eye</h4>
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="text-sm font-medium text-muted-foreground">Spherical Power</label>
                                <p>{data.survey.sphericalPowerRight || 'Not assessed'} D</p>
                            </div>
                            <div>
                                <label class="text-sm font-medium text-muted-foreground">Cylindrical Power</label>
                                <p>{data.survey.cylindricalPowerRight || 'Not assessed'} D</p>
                            </div>
                            <div>
                                <label class="text-sm font-medium text-muted-foreground">Axis</label>
                                <p>{data.survey.axisRight || 'Not assessed'}°</p>
                            </div>
                            <div>
                                <label class="text-sm font-medium text-muted-foreground">BCVA</label>
                                <p>{formatVision(data.survey.bcvaRightEye)}</p>
                            </div>
                        </div>
                    </div>
                    <div class="space-y-4">
                        <h4 class="font-semibold">Left Eye</h4>
                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label class="text-sm font-medium text-muted-foreground">Spherical Power</label>
                                <p>{data.survey.sphericalPowerLeft || 'Not assessed'} D</p>
                            </div>
                            <div>
                                <label class="text-sm font-medium text-muted-foreground">Cylindrical Power</label>
                                <p>{data.survey.cylindricalPowerLeft || 'Not assessed'} D</p>
                            </div>
                            <div>
                                <label class="text-sm font-medium text-muted-foreground">Axis</label>
                                <p>{data.survey.axisLeft || 'Not assessed'}°</p>
                            </div>
                            <div>
                                <label class="text-sm font-medium text-muted-foreground">BCVA</label>
                                <p>{formatVision(data.survey.bcvaLeftEye)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>

        <!-- Section D: Main Cause -->
        <Card>
            <CardHeader>
                <CardTitle>Section D: Main Cause of Visual Impairment</CardTitle>
            </CardHeader>
            <CardContent>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <h4 class="font-semibold mb-2">Right Eye</h4>
                        <p>{data.survey.causeRightEye || 'Not specified'}</p>
                        {#if data.survey.causeRightEyeOther}
                            <p class="text-sm text-muted-foreground mt-1">{data.survey.causeRightEyeOther}</p>
                        {/if}
                    </div>
                    <div>
                        <h4 class="font-semibold mb-2">Left Eye</h4>
                        <p>{data.survey.causeLeftEye || 'Not specified'}</p>
                        {#if data.survey.causeLeftEyeOther}
                            <p class="text-sm text-muted-foreground mt-1">{data.survey.causeLeftEyeOther}</p>
                        {/if}
                    </div>
                </div>
            </CardContent>
        </Card>
    {/if}

    <!-- Section E: Barriers -->
    <Card>
        <CardHeader>
            <CardTitle>Section E: Barriers to Eye Care</CardTitle>
        </CardHeader>
        <CardContent>
            <div class="space-y-2">
                <div>
                    <label class="text-sm font-medium text-muted-foreground">Barrier 1</label>
                    <p>{data.survey.barrier1 || 'No barrier identified'}</p>
                </div>
                <div>
                    <label class="text-sm font-medium text-muted-foreground">Barrier 2</label>
                    <p>{data.survey.barrier2 || 'No second barrier'}</p>
                </div>
            </div>
        </CardContent>
    </Card>

    <!-- Section F: Follow-up Details (Conditional) -->
    {#if data.survey.usesDistanceGlasses}
        <Card>
            <CardHeader>
                <CardTitle>Section F: Follow-up Details</CardTitle>
                <CardDescription>For students using glasses</CardDescription>
            </CardHeader>
            <CardContent>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label class="text-sm font-medium text-muted-foreground">Time Since Last Checkup</label>
                        <p>{data.survey.timeSinceLastCheckup || 'Not specified'}</p>
                    </div>
                    <div>
                        <label class="text-sm font-medium text-muted-foreground">Place of Last Refraction</label>
                        <p>{data.survey.placeOfLastRefraction || 'Not specified'}</p>
                    </div>
                    <div>
                        <label class="text-sm font-medium text-muted-foreground">Cost of Glasses</label>
                        <p>{data.survey.costOfGlasses || 'Not specified'}</p>
                    </div>
                    <div>
                        <label class="text-sm font-medium text-muted-foreground">Uses Spectacles Regularly</label>
                        <p>{formatYesNo(data.survey.usesSpectacleRegularly)}</p>
                    </div>
                    <div>
                        <label class="text-sm font-medium text-muted-foreground">Spectacle Alignment</label>
                        <p>{formatYesNo(data.survey.spectacleAlignmentCentering)}</p>
                    </div>
                    <div>
                        <label class="text-sm font-medium text-muted-foreground">Spectacle Scratches</label>
                        <p>{data.survey.spectacleScratches || 'Not assessed'}</p>
                    </div>
                    <div>
                        <label class="text-sm font-medium text-muted-foreground">Frame Integrity</label>
                        <p>{data.survey.spectacleFrameIntegrity || 'Not assessed'}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    {/if}

    <!-- Section G: Advice -->
    <Card>
        <CardHeader>
            <CardTitle>Section G: Advice Given</CardTitle>
        </CardHeader>
        <CardContent>
            <div class="space-y-4">
                <div>
                    <label class="text-sm font-medium text-muted-foreground">Spectacles Prescribed</label>
                    <p>{formatYesNo(data.survey.spectaclesPrescribed)}</p>
                </div>
                <div>
                    <label class="text-sm font-medium text-muted-foreground">Referred to Ophthalmologist</label>
                    <p>{formatYesNo(data.survey.referredToOphthalmologist)}</p>
                </div>
            </div>
        </CardContent>
    </Card>

    <!-- Audit Trail -->
    <Card>
        <CardHeader>
            <CardTitle>Audit Trail</CardTitle>
        </CardHeader>
        <CardContent>
            <div class="space-y-4">
                <div class="flex items-center gap-2">
                    <Calendar class="h-4 w-4 text-muted-foreground" />
                    <div>
                        <label class="text-sm font-medium">Submitted</label>
                        <p class="text-sm">{formatDate(data.survey.submittedAt)} by {data.submittedByUser.name} ({data.submittedByUser.email})</p>
                    </div>
                </div>
                {#if data.survey.lastEditedAt && data.lastEditedByUser}
                    <div class="flex items-center gap-2">
                        <Edit class="h-4 w-4 text-muted-foreground" />
                        <div>
                            <label class="text-sm font-medium">Last Edited</label>
                            <p class="text-sm">{formatDate(data.survey.lastEditedAt)} by {data.lastEditedByUser.name} ({data.lastEditedByUser.email})</p>
                        </div>
                    </div>
                {/if}
            </div>
        </CardContent>
    </Card>
</div>