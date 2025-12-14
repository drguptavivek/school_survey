/**
 * Server-side validation utilities
 */

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate phone number (10 digits)
 */
export function validatePhoneNumber(phone: string): boolean {
    const phoneRegex = /^\d{10}$/;
    return phoneRegex.test(phone);
}

/**
 * Validate organization phone (10-20 chars with +, -, (), spaces)
 */
export function validateOrgPhone(phone: string): boolean {
    const phoneRegex = /^[0-9+()\-\s]{10,20}$/;
    return phoneRegex.test(phone);
}

/**
 * Validate pincode (6 digits)
 */
export function validatePincode(pincode: string): boolean {
    const pincodeRegex = /^\d{6}$/;
    return pincodeRegex.test(pincode);
}

/**
 * Validate student strength (positive integer)
 */
export function validateStudentStrength(strength: number | string): boolean {
    const num = typeof strength === 'string' ? parseInt(strength, 10) : strength;
    return !isNaN(num) && num > 0 && num <= 10000; // Reasonable upper limit
}

/**
 * Validate year of experience (0-50 years)
 */
export function validateYearsOfExperience(years: number | string): boolean {
    const num = typeof years === 'string' ? parseInt(years, 10) : years;
    return !isNaN(num) && num >= 0 && num <= 50;
}

/**
 * Validate survey unique ID format
 * Format: {district_code}-{school_code}-{class}-{section}-{roll_no}
 */
export function validateSurveyUniqueId(id: string): boolean {
    // Basic format validation
    const parts = id.split('-');
    if (parts.length !== 5) return false;

    const [districtCode, schoolCode, className, section, rollNo] = parts;

    // District code: 3 digits (101+)
    if (!/^\d{3,}$/.test(districtCode)) return false;

    // School code: 3 digits (201+)
    if (!/^\d{3,}$/.test(schoolCode)) return false;

    // Class: 1-12
    const classNum = parseInt(className);
    if (isNaN(classNum) || classNum < 1 || classNum > 12) return false;

    // Section: 1-10 characters (alphanumeric)
    if (!/^[A-Za-z0-9]{1,10}$/.test(section)) return false;

    // Roll number: up to 20 characters
    if (!/^.{1,20}$/.test(rollNo)) return false;

    return true;
}

/**
 * Generate survey unique ID
 */
export function generateSurveyUniqueId(
    districtCode: string,
    schoolCode: string,
    className: number,
    section: string,
    rollNo: string
): string {
    return `${districtCode}-${schoolCode}-${className}-${section}-${rollNo}`;
}

/**
 * Validate device ID
 */
export function validateDeviceId(deviceId: string): boolean {
    // Device ID should be at least 10 characters and max 255
    return typeof deviceId === 'string' &&
           deviceId.length >= 10 &&
           deviceId.length <= 255 &&
           /^[A-Za-z0-9\-_]+$/.test(deviceId);
}

/**
 * Sanitize and validate string input
 */
export function validateString(input: string, minLength = 0, maxLength = 255): boolean {
    if (typeof input !== 'string') return false;
    const trimmed = input.trim();
    return trimmed.length >= minLength && trimmed.length <= maxLength;
}

/**
 * Validate date string (YYYY-MM-DD format)
 */
export function validateDateString(dateString: string): boolean {
    if (typeof dateString !== 'string') return false;
    const date = new Date(dateString);
    return !isNaN(date.getTime()) && dateString.match(/^\d{4}-\d{2}-\d{2}$/);
}

/**
 * Validate age (5-18 years for students)
 */
export function validateAge(age: number | string): boolean {
    const num = typeof age === 'string' ? parseInt(age, 10) : age;
    return !isNaN(num) && num >= 5 && num <= 18;
}

/**
 * Validate numeric input with optional decimal places
 */
export function validateDecimal(input: string | number, min?: number, max?: number, decimalPlaces = 2): boolean {
    const num = typeof input === 'string' ? parseFloat(input) : input;
    if (isNaN(num)) return false;

    if (min !== undefined && num < min) return false;
    if (max !== undefined && num > max) return false;

    // Check decimal places
    const decimalPart = num.toString().split('.')[1];
    if (decimalPart && decimalPart.length > decimalPlaces) return false;

    return true;
}

/**
 * Validate enum value against allowed values
 */
export function validateEnum(value: string, allowedValues: string[]): boolean {
    return allowedValues.includes(value);
}

/**
 * Validate coordinates (latitude/longitude)
 */
export function validateCoordinate(coord: number, type: 'lat' | 'lng'): boolean {
    if (isNaN(coord)) return false;

    if (type === 'lat') {
        return coord >= -90 && coord <= 90;
    } else {
        return coord >= -180 && coord <= 180;
    }
}

/**
 * Common validation patterns
 */
export const ValidationPatterns = {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    phone10: /^\d{10}$/,
    orgPhone: /^[0-9+()\-\s]{10,20}$/,
    pincode: /^\d{6}$/,
    deviceId: /^[A-Za-z0-9\-_]{10,255}$/,
    schoolCode: /^\d{3,}$/,
    districtCode: /^\d{3,}$/,
    dateISO: /^\d{4}-\d{2}-\d{2}$/,
    section: /^[A-Za-z0-9]{1,10}$/,
    rollNo: /^.{1,20}$/,
    name: /^[A-Za-z\s\-\.]{2,100}$/,
    alphanumeric: /^[A-Za-z0-9\s\-_\.]+$/
};