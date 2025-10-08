/**
 * Test Environment Detection Helper
 * Used to bypass guards/mock expensive operations in test mode
 */

export const isTestEnvironment = (): boolean => {
    return process.env.NODE_ENV === 'test' || process.env.CI === 'true';
};
