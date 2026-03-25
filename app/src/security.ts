// =============================================
// SECURITY UTILITIES MODULE
// Centralized security functions for WAF-Checker
// =============================================

// ---- SSRF Protection ----

const PRIVATE_IP_RANGES = [
	// IPv4
	{ prefix: '127.', mask: null },         // 127.0.0.0/8 loopback
	{ prefix: '10.', mask: null },           // 10.0.0.0/8 private
	{ prefix: '192.168.', mask: null },      // 192.168.0.0/16 private
	{ prefix: '169.254.', mask: null },      // 169.254.0.0/16 link-local / cloud metadata
	{ prefix: '0.', mask: null },            // 0.0.0.0/8
] as const;

function isIn172PrivateRange(ip: string): boolean {
	// 172.16.0.0/12 → 172.16.x.x to 172.31.x.x
	if (!ip.startsWith('172.')) return false;
	const second = parseInt(ip.split('.')[1], 10);
	return second >= 16 && second <= 31;
}

export function isPrivateIP(ip: string): boolean {
	// Normalize
	const trimmed = ip.trim().toLowerCase();

	// IPv6 loopback and private
	if (trimmed === '::1' || trimmed === '::' || trimmed === '0:0:0:0:0:0:0:1') return true;
	if (trimmed.startsWith('fc') || trimmed.startsWith('fd')) return true; // ULA
	if (trimmed.startsWith('fe80')) return true; // link-local
	// IPv4-mapped IPv6 (e.g., ::ffff:127.0.0.1)
	if (trimmed.startsWith('::ffff:')) {
		return isPrivateIP(trimmed.slice(7));
	}

	// IPv4 checks
	if (trimmed === '0.0.0.0' || trimmed === '255.255.255.255') return true;
	for (const range of PRIVATE_IP_RANGES) {
		if (trimmed.startsWith(range.prefix)) return true;
	}
	if (isIn172PrivateRange(trimmed)) return true;

	return false;
}

const RESERVED_HOSTNAMES = new Set([
	'localhost',
	'localhost.localdomain',
	'metadata.google.internal',
	'metadata',
	'instance-data',
	'kubernetes.default.svc',
	'kubernetes.default',
	'kubernetes',
]);

const RESERVED_HOSTNAME_SUFFIXES = [
	'.local',
	'.internal',
	'.localhost',
	'.svc.cluster.local',
];

export function isReservedHostname(hostname: string): boolean {
	const lower = hostname.toLowerCase();
	if (RESERVED_HOSTNAMES.has(lower)) return true;
	for (const suffix of RESERVED_HOSTNAME_SUFFIXES) {
		if (lower.endsWith(suffix)) return true;
	}
	return false;
}

/**
 * Synchronous URL validation (no DNS resolution).
 * Catches IP literals and known reserved hostnames.
 */
export function quickValidateURL(url: string): { valid: boolean; reason?: string } {
	try {
		const parsed = new URL(url);

		// Only allow http and https
		if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
			return { valid: false, reason: `Unsupported protocol: ${parsed.protocol}` };
		}

		const hostname = parsed.hostname;

		// Check reserved hostnames
		if (isReservedHostname(hostname)) {
			return { valid: false, reason: `Reserved hostname: ${hostname}` };
		}

		// Strip brackets from IPv6
		const bare = hostname.startsWith('[') && hostname.endsWith(']')
			? hostname.slice(1, -1)
			: hostname;

		// Check IP literals
		if (isPrivateIP(bare)) {
			return { valid: false, reason: `Private/reserved IP address: ${hostname}` };
		}

		// Block numeric-only hostnames that could resolve to private IPs
		// e.g., http://2130706433 (decimal for 127.0.0.1)
		if (/^\d+$/.test(bare)) {
			return { valid: false, reason: 'Numeric IP addresses are not allowed' };
		}

		// Block hex IPs like 0x7f000001
		if (/^0x[0-9a-f]+$/i.test(bare)) {
			return { valid: false, reason: 'Hex IP addresses are not allowed' };
		}

		return { valid: true };
	} catch {
		return { valid: false, reason: 'Invalid URL format' };
	}
}

/**
 * Async URL validation with DNS resolution check.
 * Resolves hostname and verifies the IP is not private.
 */
export async function validateTargetURL(url: string): Promise<{ valid: boolean; reason?: string }> {
	// First do quick checks
	const quick = quickValidateURL(url);
	if (!quick.valid) return quick;

	try {
		const parsed = new URL(url);
		const hostname = parsed.hostname;

		// Skip DNS check for IP literals (already checked by quickValidateURL)
		if (/^[\d.]+$/.test(hostname) || hostname.startsWith('[')) {
			return { valid: true };
		}

		// Resolve DNS via Cloudflare DoH
		const dnsResp = await fetch(
			`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(hostname)}&type=A`,
			{ headers: { 'Accept': 'application/dns-json' } }
		);

		if (dnsResp.ok) {
			const dnsData: any = await dnsResp.json();
			if (dnsData.Answer) {
				for (const answer of dnsData.Answer) {
					if (answer.type === 1 && isPrivateIP(answer.data)) { // A record
						return { valid: false, reason: `Hostname resolves to private IP: ${answer.data}` };
					}
				}
			}
		}

		return { valid: true };
	} catch {
		return { valid: true }; // Fail open on DNS check errors (quick check already passed)
	}
}

// ---- Rate Limiter ----

interface RateLimitConfig {
	windowMs: number;
	maxRequests: number;
}

const ENDPOINT_LIMITS: Record<string, RateLimitConfig> = {
	'/api/check':             { windowMs: 60_000, maxRequests: 10 },
	'/api/check-stream':      { windowMs: 60_000, maxRequests: 5 },
	'/api/waf-detect':        { windowMs: 60_000, maxRequests: 5 },
	'/api/batch/start':       { windowMs: 60_000, maxRequests: 3 },
	'/api/batch/status':      { windowMs: 60_000, maxRequests: 30 },
	'/api/batch/stop':        { windowMs: 60_000, maxRequests: 10 },
	'/api/recon':             { windowMs: 60_000, maxRequests: 5 },
	'/api/dns-recon':         { windowMs: 60_000, maxRequests: 5 },
	'/api/security-headers':  { windowMs: 60_000, maxRequests: 10 },
	'/api/speedtest':         { windowMs: 60_000, maxRequests: 5 },
	'/api/seo':               { windowMs: 60_000, maxRequests: 5 },
	'/api/http-manipulation': { windowMs: 60_000, maxRequests: 5 },
	'/api/v1/':               { windowMs: 60_000, maxRequests: 1 },
};

const DEFAULT_LIMIT: RateLimitConfig = { windowMs: 60_000, maxRequests: 10 };

interface RateLimitEntry {
	count: number;
	resetAt: number;
}

export class RateLimiter {
	private store = new Map<string, RateLimitEntry>();
	private lastCleanup = Date.now();
	private cleanupIntervalMs = 60_000;

	private getConfig(endpoint: string): RateLimitConfig {
		// Exact match first
		if (ENDPOINT_LIMITS[endpoint]) return ENDPOINT_LIMITS[endpoint];
		// Prefix match (e.g., /api/v1/check matches /api/v1/)
		for (const [prefix, config] of Object.entries(ENDPOINT_LIMITS)) {
			if (prefix.endsWith('/') && endpoint.startsWith(prefix)) return config;
		}
		return DEFAULT_LIMIT;
	}

	check(ip: string, endpoint: string): { allowed: boolean; remaining: number; resetAt: number; limit: number } {
		const now = Date.now();

		// Deterministic cleanup every 60s
		if (now - this.lastCleanup > this.cleanupIntervalMs) {
			this.cleanup(now);
		}

		const config = this.getConfig(endpoint);
		const key = `${ip}:${endpoint}`;
		let entry = this.store.get(key);

		if (!entry || now > entry.resetAt) {
			entry = { count: 0, resetAt: now + config.windowMs };
			this.store.set(key, entry);
		}

		entry.count++;
		const allowed = entry.count <= config.maxRequests;
		const remaining = Math.max(0, config.maxRequests - entry.count);
		return { allowed, remaining, resetAt: entry.resetAt, limit: config.maxRequests };
	}

	private cleanup(now: number): void {
		for (const [key, entry] of this.store) {
			if (now > entry.resetAt) this.store.delete(key);
		}
		this.lastCleanup = now;
	}
}

// ---- HTML Escaping ----

export function escapeHtml(s: string): string {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#x27;');
}

// ---- Custom Header Validation ----

const MAX_CUSTOM_HEADERS = 20;

function isValidHeaderToken(name: string): boolean {
	// Reject control characters: \r, \n, \0
	return !/[\r\n\0]/.test(name) && name.length > 0;
}

function isValidHeaderValue(value: string): boolean {
	return !/[\r\n\0]/.test(value);
}

/**
 * Parse and sanitize custom headers string.
 * Rejects headers with CRLF injection attempts.
 */
export function sanitizeCustomHeaders(headersStr: string, payload?: string): Record<string, string> {
	const headersObj: Record<string, string> = {};
	if (!headersStr || !headersStr.trim()) return headersObj;

	let count = 0;
	for (const line of headersStr.split(/\r?\n/)) {
		if (!line.trim()) continue;

		const idx = line.indexOf(':');
		if (idx <= 0) continue;

		const name = line.slice(0, idx).trim();
		let value = line.slice(idx + 1).trim();

		// Validate header name and value
		if (!isValidHeaderToken(name) || !isValidHeaderValue(value)) {
			continue; // Skip invalid headers silently
		}

		// Replace {PAYLOAD} placeholder
		if (payload && value.includes('{PAYLOAD}')) {
			value = value.replace(/\{PAYLOAD\}/g, payload);
		}

		headersObj[name] = value;
		count++;

		if (count >= MAX_CUSTOM_HEADERS) break;
	}

	return headersObj;
}

// ---- Security Response Headers ----

const SECURITY_HEADERS: Record<string, string> = {
	'x-content-type-options': 'nosniff',
	'x-frame-options': 'DENY',
	'referrer-policy': 'strict-origin-when-cross-origin',
	'permissions-policy': 'camera=(), microphone=(), geolocation=()',
	'content-security-policy': [
		"default-src 'self'",
		"script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com",
		"style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com",
		"font-src 'self' https://fonts.gstatic.com",
		"img-src 'self' data: https://cdn.simpleicons.org",
		"connect-src 'self'",
	].join('; '),
};

/**
 * Add security headers to an HTML response.
 */
export function addSecurityHeaders(response: Response): Response {
	const newHeaders = new Headers(response.headers);
	for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
		newHeaders.set(key, value);
	}
	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers: newHeaders,
	});
}
