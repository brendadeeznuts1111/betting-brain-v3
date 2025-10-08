/**
 * Query Parameter Helpers
 * Safe parameter extraction and normalization
 */

export function getCustomerId(requestUrl: string | Request): string | null {
    const url = typeof requestUrl === 'string' ? requestUrl : requestUrl.url;
    const parsedUrl = new URL(url);
    const cid = parsedUrl.searchParams.get('cid') || parsedUrl.searchParams.get('customerId');

    if (!cid || cid.trim() === '') return null;
    return cid.trim();
}

export function getEventId(requestUrl: string | Request): string | null {
    const url = typeof requestUrl === 'string' ? requestUrl : requestUrl.url;
    const parsedUrl = new URL(url);
    const eid = parsedUrl.searchParams.get('eid') || parsedUrl.searchParams.get('eventId');

    if (!eid || eid.trim() === '') return null;
    return eid.trim();
}

export function getMarketType(requestUrl: string | Request): string | null {
    const url = typeof requestUrl === 'string' ? requestUrl : requestUrl.url;
    const parsedUrl = new URL(url);
    const mt = parsedUrl.searchParams.get('mt') || parsedUrl.searchParams.get('marketType');

    if (!mt || mt.trim() === '') return null;
    const normalized = mt.trim().toUpperCase();

    // Only allow valid market types
    const validMarkets = ['SPREAD', 'TOTAL', 'MONEYLINE'];
    return validMarkets.includes(normalized) ? normalized : null;
}

export function getTimeWindow(requestUrl: string | Request): number {
    const url = typeof requestUrl === 'string' ? requestUrl : requestUrl.url;
    const parsedUrl = new URL(url);
    const timeWindow = parsedUrl.searchParams.get('timeWindow') ||
        parsedUrl.searchParams.get('lookbackHours');

    const parsed = parseInt(timeWindow || '1', 10);
    return isNaN(parsed) || parsed < 1 ? 1 : Math.min(parsed, 168); // Max 168 hours (1 week)
}

export function getBooleanParam(requestUrl: string | Request, paramName: string): boolean {
    const url = typeof requestUrl === 'string' ? requestUrl : requestUrl.url;
    const parsedUrl = new URL(url);
    return parsedUrl.searchParams.has(paramName);
}
