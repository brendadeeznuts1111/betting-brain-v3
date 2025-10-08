/**
 * Worker-Native DNS Resolution
 *
 * Uses Cloudflare's DNS-over-HTTPS (DoH) API for runtime-agnostic DNS lookups.
 * Compatible with V8 isolates, Bun, and Node.js runtimes.
 */

interface DNSAnswer {
  name: string;
  type: number;
  TTL: number;
  data: string;
}

interface DNSResponse {
  Status: number;
  TC: boolean;
  RD: boolean;
  RA: boolean;
  AD: boolean;
  CD: boolean;
  Question: Array<{ name: string; type: number }>;
  Answer?: DNSAnswer[];
}

export interface DNSResult {
  ip: string;
  latency: number;
  cached?: boolean;
}

/**
 * Resolve a hostname to an IP address using Cloudflare DNS-over-HTTPS
 *
 * @param host - Hostname to resolve (e.g., "api.fantasy402.com")
 * @returns IP address and query latency
 * @throws Error if DNS lookup fails or no A record found
 */
export async function resolveHost(host: string): Promise<DNSResult> {
  const start = performance.now();
  const url = `https://cloudflare-dns.com/dns-query?name=${host}&type=A`;

  try {
    const res = await fetch(url, {
      headers: { 'Accept': 'application/dns-json' }
    });

    if (!res.ok) {
      throw new Error(`DNS lookup failed: ${res.status} ${res.statusText}`);
    }

    const json = await res.json() as DNSResponse;

    if (!json.Answer || json.Answer.length === 0) {
      throw new Error(`No A record found for ${host}`);
    }

    const latency = Math.round(performance.now() - start);

    return {
      ip: json.Answer[0].data,
      latency,
      cached: false, // DoH doesn't expose cache status
    };
  } catch (error) {
    const latency = Math.round(performance.now() - start);
    throw new Error(
      `DNS resolution failed for ${host}: ${error instanceof Error ? error.message : 'Unknown error'} (${latency}ms)`
    );
  }
}

/**
 * Batch resolve multiple hostnames in parallel
 *
 * @param hosts - Array of hostnames to resolve
 * @returns Map of hostname to DNS result (or error)
 */
export async function resolveMultiple(
  hosts: string[]
): Promise<Map<string, DNSResult | Error>> {
  const results = new Map<string, DNSResult | Error>();

  const promises = hosts.map(async (host) => {
    try {
      const result = await resolveHost(host);
      results.set(host, result);
    } catch (error) {
      results.set(host, error as Error);
    }
  });

  await Promise.all(promises);

  return results;
}
