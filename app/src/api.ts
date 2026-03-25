import { PAYLOADS, ENHANCED_PAYLOADS, PayloadCategory } from './payloads';
import { quickValidateURL, RateLimiter, addSecurityHeaders } from './security';
import { WAFDetector, WAFDetectionResult } from './waf-detection';
import { PayloadEncoder, ProtocolManipulation } from './encoding';
import {
	generateWAFSpecificPayloads,
	generateHTTPManipulationPayloads,
	ADVANCED_PAYLOADS,
	generateEncodedPayloads,
} from './advanced-payloads';
import { HTTPManipulator, ManipulatedRequest, HTTPManipulationOptions } from './http-manipulation';

// =============================================
// RATE LIMITER (in-memory, per-IP, per-endpoint)
// =============================================
const rateLimiter = new RateLimiter();

function getClientIP(request: Request): string {
	return request.headers.get('cf-connecting-ip')
		|| request.headers.get('x-real-ip')
		|| request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
		|| '0.0.0.0';
}

function apiJsonResponse(data: any, status: number = 200, rateHeaders?: Record<string, string>): Response {
	const headers: Record<string, string> = {
		'content-type': 'application/json; charset=UTF-8',
		'access-control-allow-origin': '*',
		'access-control-allow-methods': 'GET, POST, OPTIONS',
		'access-control-allow-headers': 'Content-Type',
		...(rateHeaders || {}),
	};
	return new Response(JSON.stringify(data, null, 2), { status, headers });
}

function rateLimitHeaders(remaining: number, resetAt: number, limit: number = 1): Record<string, string> {
	return {
		'x-ratelimit-limit': String(limit),
		'x-ratelimit-remaining': String(remaining),
		'x-ratelimit-reset': String(Math.ceil(resetAt / 1000)),
	};
}

// --- Payload loading from GitHub ---
const GITHUB_PAYLOADS_URL = 'https://raw.githubusercontent.com/PAPAMICA/waf-payloads/refs/heads/main/payloads.json';
let payloadsLoaded = false;
let payloadsLoading: Promise<void> | null = null;

async function loadPayloadsFromGitHub(): Promise<void> {
	if (payloadsLoaded) return;
	if (payloadsLoading) return payloadsLoading;

	payloadsLoading = (async () => {
		try {
			console.log('Loading payloads from GitHub...');
			const resp = await fetch(GITHUB_PAYLOADS_URL);
			if (!resp.ok) throw new Error(`GitHub fetch failed: ${resp.status}`);
			const data: any = await resp.json();

			// Populate PAYLOADS (base + advanced merged)
			if (data.payloads) {
				for (const [key, value] of Object.entries(data.payloads)) {
					PAYLOADS[key] = value as PayloadCategory;
				}
			}
			if (data.advancedPayloads) {
				for (const [key, value] of Object.entries(data.advancedPayloads)) {
					PAYLOADS[key] = value as PayloadCategory;
					ADVANCED_PAYLOADS[key] = value as PayloadCategory;
				}
			}

			// Generate ENHANCED_PAYLOADS (all payloads + encoded variations)
			const allPayloads = { ...PAYLOADS };
			const encoded = generateEncodedPayloads(allPayloads);
			for (const [key, value] of Object.entries(allPayloads)) {
				ENHANCED_PAYLOADS[key] = value;
			}
			for (const [key, value] of Object.entries(encoded)) {
				ENHANCED_PAYLOADS[key] = value;
			}

			payloadsLoaded = true;
			const totalCategories = Object.keys(PAYLOADS).length;
			const totalPayloads = Object.values(PAYLOADS).reduce((s, c) => s + c.payloads.length, 0);
			console.log(`Payloads loaded: ${totalCategories} categories, ${totalPayloads} payloads`);
		} catch (e) {
			console.error('Failed to load payloads from GitHub:', e);
			payloadsLoading = null; // Allow retry on next request
		}
	})();

	return payloadsLoading;
}

// Вспомогательная функция для отправки запроса с нужным методом и payload
async function sendRequest(
	url: string,
	method: string,
	payload?: string,
	headersObj?: Record<string, string>,
	payloadTemplate?: string,
	followRedirect: boolean = false,
	useEnhancedPayloads: boolean = false,
	detectedWAF?: string,
	httpManipulation?: HTTPManipulationOptions,
) {
	try {
		let resp: Response;
		const headers = headersObj ? new Headers(headersObj) : undefined;
		const redirectOption = followRedirect ? 'follow' : 'manual';
		const startTime = Date.now();

		// Apply WAF-specific payload modifications if WAF is detected
		let finalPayload = payload;
		if (detectedWAF && payload) {
			const wafSpecificPayloads = generateWAFSpecificPayloads(detectedWAF, payload);
			if (wafSpecificPayloads.length > 1) {
				finalPayload = wafSpecificPayloads[1]; // Use first bypass variation
			}
		}

		switch (method) {
			case 'GET':
			case 'DELETE':
				resp = await fetch(finalPayload !== undefined ? url + `?test=${encodeURIComponent(finalPayload)}` : url, {
					method,
					redirect: redirectOption,
					headers,
				});
				break;
			case 'POST':
			case 'PUT':
				if (payloadTemplate) {
					let jsonObj;
					try {
						jsonObj = JSON.parse(payloadTemplate);
						jsonObj = substitutePayload(jsonObj, finalPayload ?? '');
					} catch {
						jsonObj = { test: finalPayload ?? '' };
					}
					resp = await fetch(url, {
						method,
						redirect: redirectOption,
						body: JSON.stringify(jsonObj),
						headers: new Headers({ ...(headersObj || {}), 'Content-Type': 'application/json' }),
					});
				} else {
					resp = await fetch(url, { method, redirect: redirectOption, body: new URLSearchParams({ test: finalPayload ?? '' }), headers });
				}
				break;
			default:
				return null;
		}

		const responseTime = Date.now() - startTime;
		console.log(
			`Request to ${url} with method ${method} and payload ${payload} and headers ${JSON.stringify(headersObj)} returned status ${resp.status} in ${responseTime}ms`,
		);

		return {
			status: resp.status,
			is_redirect: resp.status >= 300 && resp.status < 400,
			responseTime,
			response: resp,
		};
	} catch (e) {
		return { status: 'ERR', is_redirect: false, responseTime: 0 };
	}
}

// Лучше сразу загрузить index.html при старте (если возможно)
let INDEX_HTML = '';

export default {
	async fetch(request: Request, env: any): Promise<Response> {
	  try {
		const urlObj = new URL(request.url);

		// Load payloads from GitHub on first request (non-blocking for static assets)
		if (!payloadsLoaded && urlObj.pathname.startsWith('/api/')) {
			await loadPayloadsFromGitHub();
		} else if (!payloadsLoaded) {
			// Fire and forget for non-API requests
			loadPayloadsFromGitHub();
		}

		// Global rate limiting for all API endpoints
		if (urlObj.pathname.startsWith('/api/')) {
			const clientIP = getClientIP(request);
			const rl = rateLimiter.check(clientIP, urlObj.pathname);
			if (!rl.allowed) {
				return apiJsonResponse(
					{ error: 'Rate limit exceeded', retryAfter: Math.ceil((rl.resetAt - Date.now()) / 1000) },
					429,
					rateLimitHeaders(rl.remaining, rl.resetAt, rl.limit),
				);
			}
		}

		// Load index.html from assets if not already loaded
		if (urlObj.pathname === '/' && !INDEX_HTML && env?.ASSETS) {
			try {
				const asset = await env.ASSETS.fetch(new URL('/index.html', request.url));
				if (asset.ok) {
					INDEX_HTML = await asset.text();
				}
			} catch (e) {
				console.error('Error loading index.html from assets:', e);
			}
		}

		if (urlObj.pathname === '/') {
			// If INDEX_HTML is still empty, try to load from assets on each request
			if (!INDEX_HTML && env?.ASSETS) {
				try {
					const asset = await env.ASSETS.fetch(new URL('/index.html', request.url));
					if (asset.ok) {
						INDEX_HTML = await asset.text();
					}
				} catch (e) {
					console.error('Error loading index.html from assets:', e);
				}
			}
			return addSecurityHeaders(new Response(INDEX_HTML || 'WAF Checker - Loading...', { headers: { 'content-type': 'text/html; charset=UTF-8' } }));
		}
		if (urlObj.pathname === '/api/payloads/status') {
			const totalCategories = Object.keys(PAYLOADS).length;
			const totalPayloads = Object.values(PAYLOADS).reduce((s, c) => s + c.payloads.length, 0);
			return new Response(JSON.stringify({
				loaded: payloadsLoaded,
				categories: totalCategories,
				totalPayloads: totalPayloads,
				source: 'github',
				url: GITHUB_PAYLOADS_URL,
			}), { headers: { 'content-type': 'application/json; charset=UTF-8' } });
		}
		if (urlObj.pathname === '/api/payloads') {
			return handleGetPayloads(urlObj);
		}
		if (urlObj.pathname === '/api/waf-detect') {
			return await handleWAFDetection(request);
		}
		if (urlObj.pathname === '/api/check-stream') {
			// New streaming endpoint with SSE
			return handleApiCheckStream(request);
		}
		if (urlObj.pathname === '/api/check') {
			const url = urlObj.searchParams.get('url');
			if (!url) return new Response('Missing url param', { status: 400 });
			const checkSsrf = quickValidateURL(url);
			if (!checkSsrf.valid) {
				return apiJsonResponse({ error: 'Invalid target URL', reason: checkSsrf.reason }, 400);
			}
			const page = parseInt(urlObj.searchParams.get('page') || '0', 10);
			const methods = (urlObj.searchParams.get('methods') || 'GET')
				.split(',')
				.map((m) => m.trim())
				.filter(Boolean);
			const categoriesParam = urlObj.searchParams.get('categories');
			let categories: string[] | undefined = undefined;
			if (categoriesParam) {
				categories = categoriesParam
					.split(',')
					.map((c) => c.trim())
					.filter(Boolean);
			}
			let payloadTemplate: string | undefined = undefined;
			let customHeaders: string | undefined = undefined;
			let customPayloads: Record<string, { type: string; payloads: string[]; falsePayloads: string[] }> | undefined = undefined;
			if (request.method === 'POST') {
				try {
					const body: any = await request.json();
					if (body && typeof body.payloadTemplate === 'string') {
						payloadTemplate = body.payloadTemplate;
					}
					if (body && typeof body.customHeaders === 'string') {
						customHeaders = body.customHeaders;
					}
					if (body && typeof body.detectedWAF === 'string') {
						// detectedWAF can also come from request body
					}
					if (body && body.customPayloads && typeof body.customPayloads === 'object') {
						customPayloads = body.customPayloads;
					}
				} catch (e) {
					console.error('Error parsing request body:', e);
				}
			}
			// Новый параметр followRedirect
			const followRedirect = urlObj.searchParams.get('followRedirect') === '1';
			// Новый параметр falsePositiveTest
			const falsePositiveTest = urlObj.searchParams.get('falsePositiveTest') === '1';
			// New parameter caseSensitiveTest
			const caseSensitiveTest = urlObj.searchParams.get('caseSensitiveTest') === '1';
			// Enhanced payloads option
			const useEnhancedPayloads = urlObj.searchParams.get('enhancedPayloads') === '1';
			// Use advanced WAF bypass payloads
			const useAdvancedPayloads = urlObj.searchParams.get('useAdvancedPayloads') === '1';
			// Auto WAF detection
			const autoDetectWAF = urlObj.searchParams.get('autoDetectWAF') === '1';
			// Use encoding variations
			const useEncodingVariations = urlObj.searchParams.get('useEncodingVariations') === '1';
			// HTTP manipulation option
			const enableHTTPManipulation = urlObj.searchParams.get('httpManipulation') === '1';
			// Detected WAF type
			const detectedWAF = urlObj.searchParams.get('detectedWAF') || undefined;

			const results = await handleApiCheckFiltered(
				url,
				page,
				methods,
				categories,
				payloadTemplate,
				followRedirect,
				customHeaders,
				falsePositiveTest,
				caseSensitiveTest,
				useEnhancedPayloads,
				useAdvancedPayloads,
				autoDetectWAF,
				useEncodingVariations,
				detectedWAF,
				enableHTTPManipulation
					? {
							enableParameterPollution: true,
							enableVerbTampering: true,
							enableContentTypeConfusion: true,
						}
					: undefined,
				customPayloads,
			);
			return new Response(JSON.stringify(results), { headers: { 'content-type': 'application/json; charset=UTF-8' } });
		}
		if (urlObj.pathname === '/api/http-manipulation') {
			return await handleHTTPManipulation(request);
		}
		if (urlObj.pathname === '/api/batch/start') {
			return await handleBatchStart(request);
		}
		if (urlObj.pathname === '/api/batch/status') {
			return await handleBatchStatus(request);
		}
		if (urlObj.pathname === '/api/batch/stop') {
			return await handleBatchStop(request);
		}
		if (urlObj.pathname === '/api/security-headers') {
			return await handleSecurityHeaders(request);
		}
		if (urlObj.pathname === '/api/dns-recon') {
			return await handleDNSRecon(request);
		}
		if (urlObj.pathname === '/api/recon') {
			return await handleFullRecon(request);
		}
		if (urlObj.pathname === '/api/speedtest') {
			return await handleSpeedTest(request);
		}
		if (urlObj.pathname === '/api/seo') {
			return await handleSEOAudit(request);
		}

		// =============================================================
		// PUBLIC API v1 — rate-limited JSON endpoints for curl / scripts
		// =============================================================
		if (urlObj.pathname.startsWith('/api/v1/')) {
			// Handle CORS preflight
			if (request.method === 'OPTIONS') {
				return apiJsonResponse(null, 204);
			}

			// Rate limiting is now handled globally above.
			// The global rate limiter already checked /api/v1/ with 1 req/min.

			const apiPath = urlObj.pathname.replace('/api/v1', '');

			// GET /api/v1/ — API info
			if (apiPath === '/' || apiPath === '') {
				return apiJsonResponse({
					name: 'WAF-Checker API',
					version: '1.0',
					documentation: `${urlObj.origin}/api/v1/docs`,
					endpoints: [
						'GET /api/v1/waf-checker?url=<target>',
						'GET /api/v1/recon?url=<target>',
						'GET /api/v1/security-headers?url=<target>',
						'GET /api/v1/speedtest?url=<target>',
						'GET /api/v1/seo?url=<target>',
						'GET /api/v1/http-manipulation?url=<target>',
					],
					rateLimit: { limit: 1, window: '1 minute' },
				});
			}

			// GET /api/v1/docs — full documentation
			if (apiPath === '/docs') {
				return apiJsonResponse(getAPIDocumentation(urlObj.origin), 200);
			}

			// Ensure target URL
			const target = urlObj.searchParams.get('url');
			if (!target) {
				return apiJsonResponse({ error: 'Missing required parameter: url', example: `${urlObj.origin}${urlObj.pathname}?url=https://example.com` }, 400);
			}

			// Normalize target URL
			let normalizedTarget = target;
			if (!normalizedTarget.startsWith('http://') && !normalizedTarget.startsWith('https://')) {
				normalizedTarget = 'https://' + normalizedTarget;
			}

			try {
				// --- WAF Checker: full payload test with all advanced options ---
				if (apiPath === '/waf-checker') {
					const methods = (urlObj.searchParams.get('methods') || 'GET').split(',').map(m => m.trim()).filter(Boolean);
					const categoriesParam = urlObj.searchParams.get('categories');
					const categories = categoriesParam ? categoriesParam.split(',').map(c => c.trim()).filter(Boolean) : undefined;
					const page = parseInt(urlObj.searchParams.get('page') || '0', 10);
					const followRedirect = urlObj.searchParams.get('followRedirect') === '1';
					const falsePositiveTest = urlObj.searchParams.get('falsePositiveTest') === '1';
					const caseSensitiveTest = urlObj.searchParams.get('caseSensitiveTest') === '1';
					const useEnhancedPayloads = urlObj.searchParams.get('enhancedPayloads') === '1';
					const useAdvancedPayloads = urlObj.searchParams.get('advancedPayloads') === '1';
					const autoDetectWAF = urlObj.searchParams.get('autoDetectWAF') === '1';
					const useEncodingVariations = urlObj.searchParams.get('encodingVariations') === '1';
					const enableHTTPManipulation = urlObj.searchParams.get('httpManipulation') === '1';
					const detectedWAF = urlObj.searchParams.get('detectedWAF') || undefined;
					const payloadTemplate = urlObj.searchParams.get('payloadTemplate') || undefined;
					const customHeaders = urlObj.searchParams.get('headers') || undefined;

					// Run WAF detection first if autoDetectWAF
					let wafResult: any = null;
					if (autoDetectWAF) {
						try {
							const det = await WAFDetector.activeDetection(normalizedTarget);
							wafResult = det;
						} catch { /* ignore */ }
					}

					const results = await handleApiCheckFiltered(
						normalizedTarget,
						page,
						methods,
						categories,
						payloadTemplate,
						followRedirect,
						customHeaders,
						falsePositiveTest,
						caseSensitiveTest,
						useEnhancedPayloads,
						useAdvancedPayloads,
						autoDetectWAF,
						useEncodingVariations,
						detectedWAF || (wafResult?.wafName && wafResult.wafName !== 'Unknown' ? wafResult.wafName : undefined),
						enableHTTPManipulation ? { enableParameterPollution: true, enableVerbTampering: true, enableContentTypeConfusion: true } : undefined,
					);

					const responseData: any = {
						target: normalizedTarget,
						methods,
						options: {
							followRedirect, falsePositiveTest, caseSensitiveTest,
							enhancedPayloads: useEnhancedPayloads, advancedPayloads: useAdvancedPayloads,
							autoDetectWAF, encodingVariations: useEncodingVariations, httpManipulation: enableHTTPManipulation,
						},
						totalResults: results.length,
						results,
					};
					if (wafResult) responseData.wafDetection = wafResult;
					if (categories) responseData.categories = categories;
					if (page > 0) responseData.page = page;

					return apiJsonResponse(responseData, 200);
				}

				// --- Other endpoints: proxy to internal handlers ---
				const fakeReq = new Request(`${urlObj.origin}/api${apiPath}?url=${encodeURIComponent(normalizedTarget)}`, {
					method: request.method,
					headers: request.headers,
				});

				let response: Response;

				switch (apiPath) {
					case '/recon':
						response = await handleFullRecon(fakeReq);
						break;
					case '/security-headers':
						response = await handleSecurityHeaders(fakeReq);
						break;
					case '/speedtest':
						response = await handleSpeedTest(fakeReq);
						break;
					case '/seo':
						response = await handleSEOAudit(fakeReq);
						break;
					case '/http-manipulation':
						response = await handleHTTPManipulation(fakeReq);
						break;
					default:
						return apiJsonResponse({ error: 'Unknown endpoint', available: ['/waf-checker', '/recon', '/security-headers', '/speedtest', '/seo', '/http-manipulation'] }, 404);
				}

				// Re-wrap the response with rate-limit headers and CORS
				const body = await response.text();
				let jsonData: any;
				try { jsonData = JSON.parse(body); } catch { jsonData = { raw: body }; }

				return apiJsonResponse(jsonData, response.status);
			} catch (err: any) {
				return apiJsonResponse({ error: 'Internal server error', message: err?.message || 'Unknown error' }, 500);
			}
		}

		return new Response('Not found', { status: 404 });
	  } catch (err: any) {
		console.error('Unhandled error in fetch handler:', err);
		return new Response(
			JSON.stringify({ error: 'Internal server error', message: err?.message || 'Unknown error' }),
			{
				status: 500,
				headers: {
					'content-type': 'application/json; charset=UTF-8',
					'access-control-allow-origin': '*',
				},
			}
		);
	  }
	},
};

// API Documentation
function getAPIDocumentation(origin: string) {
	return {
		name: 'WAF-Checker Public API',
		version: '1.0',
		baseUrl: `${origin}/api/v1`,
		rateLimit: {
			maxRequests: 1,
			window: '1 minute',
			headers: {
				'x-ratelimit-limit': 'Maximum requests per window',
				'x-ratelimit-remaining': 'Remaining requests in current window',
				'x-ratelimit-reset': 'Unix timestamp when the window resets',
			},
		},
		authentication: 'None required (public API)',
		responseFormat: 'JSON',
		endpoints: [
			{
				method: 'GET',
				path: '/api/v1/waf-checker',
				description: 'Run WAF payload tests against a target website with full advanced options',
				parameters: [
					{ name: 'url', type: 'string', required: true, description: 'Target URL (e.g. https://example.com)' },
					{ name: 'methods', type: 'string', required: false, description: 'Comma-separated HTTP methods (default: GET). Options: GET,POST,PUT,DELETE' },
					{ name: 'categories', type: 'string', required: false, description: 'Comma-separated payload categories to test' },
					{ name: 'page', type: 'number', required: false, description: 'Pagination (50 results per page, default: 0)' },
					{ name: 'followRedirect', type: '0|1', required: false, description: 'Follow HTTP redirects (default: 0)' },
					{ name: 'falsePositiveTest', type: '0|1', required: false, description: 'Include false-positive control payloads (default: 0)' },
					{ name: 'caseSensitiveTest', type: '0|1', required: false, description: 'Test case-sensitivity of WAF rules (default: 0)' },
					{ name: 'enhancedPayloads', type: '0|1', required: false, description: 'Use enhanced payload set with encoding variations (default: 0)' },
					{ name: 'advancedPayloads', type: '0|1', required: false, description: 'Use advanced WAF bypass payloads (default: 0)' },
					{ name: 'autoDetectWAF', type: '0|1', required: false, description: 'Auto-detect WAF before testing and adapt payloads (default: 0)' },
					{ name: 'encodingVariations', type: '0|1', required: false, description: 'Use encoding variations (URL, double-URL, Unicode, etc.) (default: 0)' },
					{ name: 'httpManipulation', type: '0|1', required: false, description: 'Enable HTTP manipulation techniques (default: 0)' },
					{ name: 'detectedWAF', type: 'string', required: false, description: 'Pre-detected WAF name to use for payload adaptation' },
					{ name: 'payloadTemplate', type: 'string', required: false, description: 'Custom JSON body template (use {{payload}} placeholder)' },
					{ name: 'headers', type: 'string', required: false, description: 'Custom HTTP headers (Header: value format, one per line)' },
				],
				example: {
					curl: `curl "${origin}/api/v1/waf-checker?url=https://example.com&methods=GET,POST&autoDetectWAF=1&advancedPayloads=1"`,
					response: { target: 'https://example.com', wafDetection: '...', totalResults: 50, results: ['...'] },
				},
			},
			{
				method: 'GET',
				path: '/api/v1/recon',
				description: 'Full reconnaissance report: DNS, WHOIS, technologies, SSL/TLS, subdomains, reverse IP, etc.',
				parameters: [{ name: 'url', type: 'string', required: true, description: 'Target URL' }],
				example: {
					curl: `curl "${origin}/api/v1/recon?url=https://example.com"`,
					response: { domain: 'example.com', dns: '...', whois: '...', technologies: '...', ssl: '...' },
				},
			},
			{
				method: 'GET',
				path: '/api/v1/security-headers',
				description: 'Audit HTTP security headers of a website with grades and recommendations',
				parameters: [{ name: 'url', type: 'string', required: true, description: 'Target URL' }],
				example: {
					curl: `curl "${origin}/api/v1/security-headers?url=https://example.com"`,
					response: { grade: 'B+', headers: '...', missing: '...' },
				},
			},
			{
				method: 'GET',
				path: '/api/v1/speedtest',
				description: 'Performance analysis: load times, Core Web Vitals estimates, resource analysis, optimization advice',
				parameters: [{ name: 'url', type: 'string', required: true, description: 'Target URL' }],
				example: {
					curl: `curl "${origin}/api/v1/speedtest?url=https://example.com"`,
					response: { scores: '...', timing: '...', resources: '...', advice: '...' },
				},
			},
			{
				method: 'GET',
				path: '/api/v1/seo',
				description: 'SEO audit: meta tags, headings, links, sitemap, robots.txt, structured data, accessibility, content analysis',
				parameters: [{ name: 'url', type: 'string', required: true, description: 'Target URL' }],
				example: {
					curl: `curl "${origin}/api/v1/seo?url=https://example.com"`,
					response: { score: 85, categories: '...', meta: '...', issues: '...' },
				},
			},
			{
				method: 'GET',
				path: '/api/v1/http-manipulation',
				description: 'Test HTTP manipulation techniques (verb tampering, parameter pollution, content-type confusion)',
				parameters: [{ name: 'url', type: 'string', required: true, description: 'Target URL' }],
				example: {
					curl: `curl "${origin}/api/v1/http-manipulation?url=https://example.com"`,
					response: { results: '...', manipulations: '...' },
				},
			},
		],
		errors: {
			400: 'Missing or invalid parameters',
			404: 'Unknown endpoint',
			429: 'Rate limit exceeded — wait and retry',
			500: 'Internal server error',
			502: 'Cannot reach target site',
		},
		tips: [
			'URL parameter is automatically normalized: "example.com" becomes "https://example.com"',
			'Use jq for pretty-printing: curl ... | jq .',
			'Pipe output to a file: curl ... -o result.json',
		],
	};
}

// New streaming endpoint with parallelized requests
async function handleApiCheckStream(request: Request): Promise<Response> {
	const urlObj = new URL(request.url);
	const urlParam = urlObj.searchParams.get('url');
	if (!urlParam) return new Response('Missing url param', { status: 400 });
	let url: string = urlParam;
	const ssrfCheck = quickValidateURL(url);
	if (!ssrfCheck.valid) {
		return new Response(`data: ${JSON.stringify({ type: 'error', message: ssrfCheck.reason })}\n\n`, {
			headers: {
				'content-type': 'text/event-stream',
				'cache-control': 'no-cache',
				'connection': 'keep-alive',
			},
		});
	}

	const methods = (urlObj.searchParams.get('methods') || 'GET')
		.split(',')
		.map((m) => m.trim())
		.filter(Boolean);
	const categoriesParam = urlObj.searchParams.get('categories');
	let categories: string[] | undefined = undefined;
	if (categoriesParam) {
		categories = categoriesParam
			.split(',')
			.map((c) => c.trim())
			.filter(Boolean);
	}

	let payloadTemplate: string | undefined = undefined;
	let customHeaders: string | undefined = undefined;
	let customPayloads: Record<string, { type: string; payloads: string[]; falsePayloads: string[]; _deleted?: boolean }> | undefined = undefined;
	if (request.method === 'POST') {
		try {
			const body: any = await request.json();
			if (body && typeof body.payloadTemplate === 'string') {
				payloadTemplate = body.payloadTemplate;
			}
			if (body && typeof body.customHeaders === 'string') {
				customHeaders = body.customHeaders;
			}
			if (body && body.customPayloads && typeof body.customPayloads === 'object') {
				customPayloads = body.customPayloads;
			}
		} catch (e) {
			console.error('Error parsing request body:', e);
		}
	}

	const followRedirect = urlObj.searchParams.get('followRedirect') === '1';
	const falsePositiveTest = urlObj.searchParams.get('falsePositiveTest') === '1';
	const caseSensitiveTest = urlObj.searchParams.get('caseSensitiveTest') === '1';
	const useEnhancedPayloads = urlObj.searchParams.get('enhancedPayloads') === '1';
	const useAdvancedPayloads = urlObj.searchParams.get('useAdvancedPayloads') === '1';
	const autoDetectWAF = urlObj.searchParams.get('autoDetectWAF') === '1';
	const useEncodingVariations = urlObj.searchParams.get('useEncodingVariations') === '1';
	const enableHTTPManipulation = urlObj.searchParams.get('httpManipulation') === '1';
	const detectedWAF = urlObj.searchParams.get('detectedWAF') || undefined;

	// Create a readable stream for SSE
	const stream = new ReadableStream({
		async start(controller) {
			const encoder = new TextEncoder();

			const sendEvent = (type: string, data: any) => {
				const message = `data: ${JSON.stringify({ type, ...data })}\n\n`;
				controller.enqueue(encoder.encode(message));
			};

			try {
				// Get payload source
				let payloadSource: Record<string, PayloadCategory> = useEnhancedPayloads ? { ...ENHANCED_PAYLOADS } : { ...PAYLOADS };
				if (useAdvancedPayloads) {
					payloadSource = { ...payloadSource, ...ADVANCED_PAYLOADS };
				}
				if (useEncodingVariations) {
					const encodedPayloads = generateEncodedPayloads(payloadSource);
					payloadSource = { ...payloadSource, ...encodedPayloads };
				}

				// Merge custom payloads
				if (customPayloads && Object.keys(customPayloads).length > 0) {
					for (const [category, data] of Object.entries(customPayloads)) {
						if (data._deleted) continue; // Skip deleted categories
						if (payloadSource[category]) {
							const existingPayloads = payloadSource[category].payloads || [];
							const existingFalsePayloads = payloadSource[category].falsePayloads || [];
							const customPayloadsList = data.payloads || [];
							const customFalsePayloadsList = data.falsePayloads || [];
							const mergedPayloads = [...new Set([...existingPayloads, ...customPayloadsList])];
							const mergedFalsePayloads = [...new Set([...existingFalsePayloads, ...customFalsePayloadsList])];
							payloadSource[category] = {
								...payloadSource[category],
								payloads: mergedPayloads,
								falsePayloads: mergedFalsePayloads,
							};
						} else {
							payloadSource[category] = {
								type: (data.type as PayloadCategory['type']) || 'ParamCheck',
								payloads: data.payloads || [],
								falsePayloads: data.falsePayloads || [],
							};
						}
					}
				}

				const payloadEntries =
					categories && categories.length
						? Object.entries(payloadSource).filter(([cat]) => categories.includes(cat))
						: Object.entries(payloadSource);

				// WAF detection if needed
				let wafDetectionResult: WAFDetectionResult | undefined;
				if (autoDetectWAF) {
					try {
						wafDetectionResult = await WAFDetector.activeDetection(url);
						sendEvent('waf-detected', { waf: wafDetectionResult });
					} catch (e) {
						console.error('WAF detection failed:', e);
					}
				}

				// Prepare all test requests
				const testRequests: Array<{
					category: string;
					payload: string;
					method: string;
					headersObj?: Record<string, string>;
					checkType: string;
				}> = [];

				let baseUrl: string;
				try {
					const u = new URL(url);
					baseUrl = `${u.protocol}//${u.host}`;
				} catch {
					baseUrl = url;
				}

				let originalUrl = url;
				if (caseSensitiveTest) {
					try {
						const u = new URL(url);
						const modifiedHostname = randomUppercase(u.hostname);
						u.hostname = modifiedHostname;
						url = u.toString();
						baseUrl = `${u.protocol}//${u.host}`;
					} catch (e) {
						url = randomUppercase(url);
						baseUrl = randomUppercase(baseUrl);
					}
				}

				const detectedWAFType = detectedWAF || (wafDetectionResult?.detected ? wafDetectionResult.wafType : undefined);

				// Build all test requests
				for (const [category, info] of payloadEntries) {
					const checkType = info.type || 'ParamCheck';
					const payloads = falsePositiveTest ? info.falsePayloads || [] : info.payloads || [];

					if (checkType === 'ParamCheck') {
						for (let payload of payloads) {
							if (caseSensitiveTest) {
								payload = randomUppercase(payload);
							}

							let payloadVariations = [payload];
							if (detectedWAFType) {
								const wafSpecificPayloads = generateWAFSpecificPayloads(detectedWAFType, payload);
								payloadVariations = wafSpecificPayloads.length > 1 ? wafSpecificPayloads : [payload];
							}
							if (useEncodingVariations && !detectedWAFType) {
								const encodedVariations = PayloadEncoder.generateBypassVariations(payload, category);
								payloadVariations = encodedVariations;
							}

							for (const currentPayload of payloadVariations) {
								for (const method of methods) {
									let headersObj = customHeaders ? processCustomHeaders(customHeaders, currentPayload) : undefined;
									let finalPayload = currentPayload;
									if (enableHTTPManipulation) {
										const pollutedPayloads = generateHTTPManipulationPayloads(currentPayload, 'pollution');
										if (pollutedPayloads.length > 1) {
											finalPayload = pollutedPayloads[1];
										}
									}
									testRequests.push({ category, payload: finalPayload, method, headersObj, checkType });
								}
							}
						}
					} else if (checkType === 'FileCheck') {
						for (let payload of payloads) {
							if (caseSensitiveTest) {
								payload = randomUppercase(payload);
							}
							const fileUrl = baseUrl.replace(/\/$/, '') + '/' + payload.replace(/^\//, '');
							const headersObj = customHeaders ? processCustomHeaders(customHeaders, payload) : undefined;
							testRequests.push({ category, payload: fileUrl, method: 'GET', headersObj, checkType });
						}
					} else if (checkType === 'Header') {
						for (let payload of payloads) {
							if (caseSensitiveTest) {
								payload = randomUppercase(payload);
							}
							const headersObj: Record<string, string> = {};
							for (const line of payload.split(/\r?\n/)) {
								const idx = line.indexOf(':');
								if (idx > 0) {
									const name = line.slice(0, idx).trim();
									const value = line.slice(idx + 1).trim();
									headersObj[name] = value;
								}
							}
							if (customHeaders) {
								const customHeadersObj = processCustomHeaders(customHeaders, payload);
								Object.assign(headersObj, customHeadersObj);
							}
							for (const method of methods) {
								testRequests.push({ category, payload, method, headersObj, checkType });
							}
						}
					}
				}

				// Send total count
				sendEvent('total', { count: testRequests.length });

				// Process requests in parallel batches
				const PARALLEL_BATCH_SIZE = 5; // Reduced from 20 to avoid overwhelming Miniflare subrequest limits
				let completedCount = 0;

				for (let i = 0; i < testRequests.length; i += PARALLEL_BATCH_SIZE) {
					const batch = testRequests.slice(i, i + PARALLEL_BATCH_SIZE);

					// Execute batch in parallel
					const batchPromises = batch.map(async (req) => {
						try {
							let finalUrl = url;
							let finalMethod = req.method;
							let finalPayload: string | undefined = req.payload;

							if (req.checkType === 'FileCheck') {
								finalUrl = req.payload;
								finalPayload = undefined;
							}

							const res = await sendRequest(
								finalUrl,
								finalMethod,
								finalPayload,
								req.headersObj,
								payloadTemplate,
								followRedirect,
								useEnhancedPayloads,
								detectedWAFType,
							);

							const result = {
								category: req.category,
								payload: req.payload,
								method: req.method,
								status: res ? res.status : 'ERR',
								is_redirect: res ? res.is_redirect : false,
								responseTime: res ? res.responseTime : 0,
								wafDetected: wafDetectionResult?.detected || false,
								wafType: detectedWAFType || 'Unknown',
							};

							completedCount++;
							sendEvent('result', { result, completed: completedCount, total: testRequests.length });

							return result;
						} catch (e) {
							completedCount++;
							const errorResult = {
								category: req.category,
								payload: req.payload,
								method: req.method,
								status: 'ERR',
								is_redirect: false,
								responseTime: 0,
							};
							sendEvent('result', { result: errorResult, completed: completedCount, total: testRequests.length });
							return errorResult;
						}
					});

					await Promise.allSettled(batchPromises);
				}

				// Send completion
				sendEvent('complete', {});
				controller.close();
			} catch (error) {
				sendEvent('error', { message: error instanceof Error ? error.message : 'Unknown error' });
				controller.close();
			}
		},
	});

	return new Response(stream, {
		headers: {
			'content-type': 'text/event-stream',
			'cache-control': 'no-cache',
			'connection': 'keep-alive',
		},
	});
}

async function handleApiCheckFiltered(
	url: string,
	page: number,
	methods: string[],
	categories?: string[],
	payloadTemplate?: string,
	followRedirect: boolean = false,
	customHeaders?: string,
	falsePositiveTest: boolean = false,
	caseSensitiveTest: boolean = false,
	useEnhancedPayloads: boolean = false,
	useAdvancedPayloads: boolean = false,
	autoDetectWAF: boolean = false,
	useEncodingVariations: boolean = false,
	detectedWAF?: string,
	httpManipulation?: HTTPManipulationOptions,
	customPayloads?: Record<string, { type: string; payloads: string[]; falsePayloads: string[]; _deleted?: boolean }>,
): Promise<any[]> {
	const METHODS = methods && methods.length ? methods : ['GET'];
	const results: any[] = [];
	let baseUrl: string;
	const limit = 50;
	const start = page * limit;
	const end = start + limit;
	let offset = 0;
	try {
		const u = new URL(url);
		baseUrl = `${u.protocol}//${u.host}`;
	} catch {
		baseUrl = url;
	}

	// Case sensitive test: Modify URL hostname if flag is set
	let originalUrl = url; // Keep original for potential error logging or if modification fails
	let originalBaseUrl = baseUrl; // Keep original baseUrl

	if (caseSensitiveTest) {
		try {
			const u = new URL(url);
			const modifiedHostname = randomUppercase(u.hostname);
			u.hostname = modifiedHostname;
			url = u.toString();
			baseUrl = `${u.protocol}//${u.host}`;
			console.log(`Case Sensitive Test: Modified URL from ${originalUrl} to ${url}`);
		} catch (e) {
			console.log(`Case Sensitive Test: Failed to parse URL ${originalUrl}, error: ${e}`);
			// Fallback: uppercase the whole URL and baseUrl string if parsing fails
			url = randomUppercase(url);
			baseUrl = randomUppercase(baseUrl);
			console.log(`Case Sensitive Test: Fallback - modified URL from ${originalUrl} to ${url}`);
		}
	}

	// Auto-detect WAF if requested
	let wafDetectionResult: WAFDetectionResult | undefined;
	if (autoDetectWAF) {
		try {
			wafDetectionResult = await WAFDetector.activeDetection(url);
			console.log(`WAF Detection Result: ${JSON.stringify(wafDetectionResult)}`);
		} catch (e) {
			console.error('WAF detection failed:', e);
		}
	}

	// Choose payload source based on options
	let payloadSource: Record<string, PayloadCategory> = useEnhancedPayloads ? { ...ENHANCED_PAYLOADS } : { ...PAYLOADS };

	// Add advanced payloads if requested
	if (useAdvancedPayloads) {
		payloadSource = { ...payloadSource, ...ADVANCED_PAYLOADS };
	}

	// Generate encoded payload variations if requested
	if (useEncodingVariations) {
		const encodedPayloads = generateEncodedPayloads(payloadSource);
		payloadSource = { ...payloadSource, ...encodedPayloads };
	}

	// Merge custom payloads if provided
	if (customPayloads && Object.keys(customPayloads).length > 0) {
		for (const [category, data] of Object.entries(customPayloads)) {
			if (payloadSource[category]) {
				// Merge with existing category: add custom payloads to existing ones
				const existingPayloads = payloadSource[category].payloads || [];
				const existingFalsePayloads = payloadSource[category].falsePayloads || [];
				const customPayloadsList = data.payloads || [];
				const customFalsePayloadsList = data.falsePayloads || [];

				// Create unique sets to avoid duplicates
				const mergedPayloads = [...new Set([...existingPayloads, ...customPayloadsList])];
				const mergedFalsePayloads = [...new Set([...existingFalsePayloads, ...customFalsePayloadsList])];

				payloadSource[category] = {
					...payloadSource[category],
					payloads: mergedPayloads,
					falsePayloads: mergedFalsePayloads,
				};
			} else {
				// New custom category
				payloadSource[category] = {
					type: (data.type as PayloadCategory['type']) || 'ParamCheck',
					payloads: data.payloads || [],
					falsePayloads: data.falsePayloads || [],
				};
			}
		}
		console.log(`Merged custom payloads. Total categories: ${Object.keys(payloadSource).length}`);
	}

	const payloadEntries =
		categories && categories.length
			? Object.entries(payloadSource).filter(([cat]) => categories.includes(cat))
			: Object.entries(payloadSource);
	for (const [category, info] of payloadEntries) {
		const checkType = info.type || 'ParamCheck';
		const payloads = falsePositiveTest ? info.falsePayloads || [] : info.payloads || [];
		if (checkType === 'ParamCheck') {
			for (let payload of payloads) {
				// Use let so we can reassign
				if (caseSensitiveTest) {
					payload = randomUppercase(payload); // Modify payload
				}

				// Generate WAF-specific bypass variations if WAF is detected
				let payloadVariations = [payload];
				if (detectedWAF && wafDetectionResult?.detected) {
					const wafSpecificPayloads = generateWAFSpecificPayloads(wafDetectionResult.wafType, payload);
					payloadVariations = wafSpecificPayloads.length > 1 ? wafSpecificPayloads : [payload];
				} else if (detectedWAF) {
					const wafSpecificPayloads = generateWAFSpecificPayloads(detectedWAF, payload);
					payloadVariations = wafSpecificPayloads.length > 1 ? wafSpecificPayloads : [payload];
				}

				// Generate encoding variations if enabled
				if (useEncodingVariations && !detectedWAF) {
					const encodedVariations = PayloadEncoder.generateBypassVariations(payload, category);
					payloadVariations = encodedVariations;
				}

				// Test each payload variation
				for (const currentPayload of payloadVariations) {
					for (const method of METHODS) {
						if (offset >= end) return results;
						if (offset >= start) {
							// Process custom headers if provided
							let headersObj = customHeaders ? processCustomHeaders(customHeaders, currentPayload) : undefined;

							// Apply HTTP manipulation if enabled
							let finalPayload = currentPayload;
							let finalMethod = method;
							if (httpManipulation?.enableParameterPollution) {
								const pollutedPayloads = generateHTTPManipulationPayloads(currentPayload, 'pollution');
								if (pollutedPayloads.length > 1) {
									finalPayload = pollutedPayloads[1]; // Use first variation
								}
							}

							const detectedWAFType = detectedWAF || (wafDetectionResult?.detected ? wafDetectionResult.wafType : undefined);

							const res = await sendRequest(
								url,
								finalMethod,
								finalPayload,
								headersObj,
								payloadTemplate,
								followRedirect,
								useEnhancedPayloads,
								detectedWAFType,
							);
							results.push({
								category,
								payload: currentPayload,
								originalPayload: payload, // Keep track of original
								method,
								status: res ? res.status : 'ERR',
								is_redirect: res ? res.is_redirect : false,
								responseTime: res ? res.responseTime : 0,
								wafDetected: wafDetectionResult?.detected || false,
								wafType: detectedWAFType || 'Unknown',
								bypassTechnique: currentPayload !== payload ? 'Advanced' : 'Standard',
							});
						}
						offset++;
					}
				}
			}
		} else if (checkType === 'FileCheck') {
			for (let payload of payloads) {
				// Use let so we can reassign
				if (caseSensitiveTest) {
					payload = randomUppercase(payload); // Modify payload
				}
				if (offset >= end) return results;
				if (offset >= start) {
					// Use potentially modified baseUrl for the base, and modified payload for the file path
					const fileUrl = baseUrl.replace(/\/$/, '') + '/' + payload.replace(/^\//, '');
					// Process custom headers if provided
					const headersObj = customHeaders ? processCustomHeaders(customHeaders, payload) : undefined;
					const res = await sendRequest(
						fileUrl,
						'GET',
						undefined,
						headersObj,
						undefined,
						followRedirect,
						useEnhancedPayloads,
						detectedWAF || (wafDetectionResult?.detected ? wafDetectionResult.wafType : undefined),
					);
					results.push({
						category,
						payload,
						method: 'GET',
						status: res ? res.status : 'ERR',
						is_redirect: res ? res.is_redirect : false,
						responseTime: res ? res.responseTime : 0,
						wafDetected: wafDetectionResult?.detected || false,
						wafType: detectedWAF || (wafDetectionResult?.detected ? wafDetectionResult.wafType : 'Unknown'),
					});
				}
				offset++;
			}
		} else if (checkType === 'Header') {
			for (let payload of payloads) {
				// Use let so we can reassign
				if (caseSensitiveTest) {
					payload = randomUppercase(payload); // Modify payload
				}
				// Create headers from payload (potentially modified)
				const headersObj: Record<string, string> = {};
				for (const line of payload.split(/\r?\n/)) {
					// Use the potentially modified payload here
					const idx = line.indexOf(':');
					if (idx > 0) {
						const name = line.slice(0, idx).trim();
						const value = line.slice(idx + 1).trim();
						headersObj[name] = value;
					}
				}

				// Add custom headers if provided
				if (customHeaders) {
					const customHeadersObj = processCustomHeaders(customHeaders, payload);
					// Merge headers (custom headers override payload headers if same name)
					Object.assign(headersObj, customHeadersObj);
				}

				for (const method of METHODS) {
					if (offset >= end) return results;
					if (offset >= start) {
						const res = await sendRequest(
							url,
							method,
							undefined,
							headersObj,
							payloadTemplate,
							followRedirect,
							useEnhancedPayloads,
							detectedWAF || (wafDetectionResult?.detected ? wafDetectionResult.wafType : undefined),
						);
						results.push({
							category,
							payload,
							method,
							status: res ? res.status : 'ERR',
							is_redirect: res ? res.is_redirect : false,
							responseTime: res ? res.responseTime : 0,
							wafDetected: wafDetectionResult?.detected || false,
							wafType: detectedWAF || (wafDetectionResult?.detected ? wafDetectionResult.wafType : 'Unknown'),
						});
					}
					offset++;
				}
			}
		}
	}
	return results;
}

// New endpoint for HTTP manipulation testing
async function handleHTTPManipulation(request: Request): Promise<Response> {
	const urlObj = new URL(request.url);
	const targetUrl = urlObj.searchParams.get('url');

	if (!targetUrl) {
		return new Response(JSON.stringify({ error: 'Missing url parameter' }), {
			status: 400,
			headers: { 'content-type': 'application/json; charset=UTF-8' },
		});
	}

	const manipSsrf = quickValidateURL(targetUrl);
	if (!manipSsrf.valid) {
		return apiJsonResponse({ error: 'Invalid target URL', reason: manipSsrf.reason }, 400);
	}

	try {
		const testPayload = 'test_payload';
		const manipulationOptions: HTTPManipulationOptions = {
			enableVerbTampering: true,
			enableParameterPollution: true,
			enableContentTypeConfusion: true,
			enableRequestSmuggling: false,
			enableHostHeaderInjection: true,
		};

		// Generate manipulated requests
		const manipulatedRequests = HTTPManipulator.generateManipulatedRequests(targetUrl, 'GET', testPayload, manipulationOptions);

		// Execute limited number of requests for testing
		const limitedRequests = manipulatedRequests.slice(0, 10);
		const results = await HTTPManipulator.batchExecuteRequests(limitedRequests, false, 3);

		return new Response(
			JSON.stringify({
				total_techniques: manipulatedRequests.length,
				tested_techniques: limitedRequests.length,
				results,
				timestamp: new Date().toISOString(),
			}),
			{
				headers: { 'content-type': 'application/json; charset=UTF-8' },
			},
		);
	} catch (error) {
		return new Response(
			JSON.stringify({
				error: 'HTTP manipulation test failed',
				message: error instanceof Error ? error.message : 'Unknown error',
			}),
			{
				status: 500,
				headers: { 'content-type': 'application/json; charset=UTF-8' },
			},
		);
	}
}

// Endpoint to get default payloads for configuration
function handleGetPayloads(urlObj: URL): Response {
	const category = urlObj.searchParams.get('category');
	const includeAdvanced = urlObj.searchParams.get('includeAdvanced') === '1';
	const includeEnhanced = urlObj.searchParams.get('includeEnhanced') === '1';

	// Combine all payload sources
	let allPayloads: Record<string, PayloadCategory> = { ...PAYLOADS };

	if (includeEnhanced) {
		allPayloads = { ...allPayloads, ...ENHANCED_PAYLOADS };
	}

	if (includeAdvanced) {
		allPayloads = { ...allPayloads, ...ADVANCED_PAYLOADS };
	}

	if (category) {
		// Return specific category
		const categoryData = allPayloads[category];
		if (!categoryData) {
			return new Response(JSON.stringify({ error: 'Category not found' }), {
				status: 404,
				headers: { 'content-type': 'application/json; charset=UTF-8' },
			});
		}
		return new Response(
			JSON.stringify({
				category,
				type: categoryData.type,
				payloads: categoryData.payloads,
				falsePayloads: categoryData.falsePayloads,
			}),
			{ headers: { 'content-type': 'application/json; charset=UTF-8' } }
		);
	}

	// Return all categories with their payloads
	const result: Record<string, { type: string; payloads: string[]; falsePayloads: string[] }> = {};

	for (const [cat, data] of Object.entries(allPayloads)) {
		result[cat] = {
			type: data.type,
			payloads: data.payloads,
			falsePayloads: data.falsePayloads,
		};
	}

	return new Response(JSON.stringify(result), {
		headers: { 'content-type': 'application/json; charset=UTF-8' },
	});
}

// New endpoint for WAF detection
async function handleWAFDetection(request: Request): Promise<Response> {
	const urlObj = new URL(request.url);
	const targetUrl = urlObj.searchParams.get('url');

	if (!targetUrl) {
		return new Response(JSON.stringify({ error: 'Missing url parameter' }), {
			status: 400,
			headers: { 'content-type': 'application/json; charset=UTF-8' },
		});
	}

	const wafSsrf = quickValidateURL(targetUrl);
	if (!wafSsrf.valid) {
		return apiJsonResponse({ error: 'Invalid target URL', reason: wafSsrf.reason }, 400);
	}

	try {
		// Run both detections in parallel with allSettled to prevent one failure from crashing the other
		const [detectionResult, bypassResult] = await Promise.allSettled([
			WAFDetector.activeDetection(targetUrl),
			WAFDetector.detectBypassOpportunities(targetUrl),
		]);

		const detection = detectionResult.status === 'fulfilled' ? detectionResult.value : null;
		const bypassOpportunities = bypassResult.status === 'fulfilled' ? bypassResult.value : null;

		return new Response(
			JSON.stringify({
				detection,
				bypassOpportunities,
				timestamp: new Date().toISOString(),
			}),
			{
				headers: { 'content-type': 'application/json; charset=UTF-8' },
			},
		);
	} catch (error) {
		return new Response(
			JSON.stringify({
				error: 'WAF detection failed',
				message: error instanceof Error ? error.message : 'Unknown error',
			}),
			{
				status: 500,
				headers: { 'content-type': 'application/json; charset=UTF-8' },
			},
		);
	}
}

// Helper function to parse and process custom headers
function processCustomHeaders(customHeadersStr: string, payload?: string): Record<string, string> {
	const headersObj: Record<string, string> = {};
	if (!customHeadersStr || !customHeadersStr.trim()) return headersObj;

	for (const line of customHeadersStr.split(/\r?\n/)) {
		const idx = line.indexOf(':');
		if (idx > 0) {
			const name = line.slice(0, idx).trim();
			let value = line.slice(idx + 1).trim();
			// Replace {PAYLOAD} placeholder with actual payload
			if (payload && value.includes('{PAYLOAD}')) {
				value = value.replace(/\{PAYLOAD\}/g, payload);
			}
			headersObj[name] = value;
		}
	}
	return headersObj;
}

// Helper function to substitute payload in JSON template
function substitutePayload(obj: any, payload: string): any {
	if (typeof obj === 'string') {
		return obj.replace(/\{PAYLOAD\}/g, payload);
	} else if (Array.isArray(obj)) {
		return obj.map((item) => substitutePayload(item, payload));
	} else if (obj && typeof obj === 'object') {
		const result: any = {};
		for (const [key, value] of Object.entries(obj)) {
			result[key] = substitutePayload(value, payload);
		}
		return result;
	}
	return obj;
}

// Helper function to randomly uppercase characters in a string
function randomUppercase(str: string): string {
	let result = '';
	for (let i = 0; i < str.length; i++) {
		const char = str[i];
		// Randomly uppercase 50% of alphabetic characters
		if (char.match(/[a-zA-Z]/) && Math.random() > 0.5) {
			if (char === char.toLowerCase()) {
				result += char.toUpperCase();
			} else {
				result += char.toLowerCase();
			}
		} else {
			result += char;
		}
	}
	return result;
}

// Global batch state storage (in production, use a database or KV store)
const MAX_BATCH_JOBS = 50;
const MAX_BATCH_JOBS_PER_IP = 3;

const batchJobs = new Map<
	string,
	{
		id: string;
		ownerIP: string;
		status: 'running' | 'completed' | 'stopped' | 'error';
		progress: number;
		currentUrl: string;
		startTime: string;
		results: any[];
		error?: string;
		totalUrls: number;
		completedUrls: number;
	}
>();

// Cleanup old batch jobs periodically to prevent memory leaks
function cleanupOldBatchJobs() {
	const cutoffTime = Date.now() - 1 * 60 * 60 * 1000; // 1 hour (reduced from 24h)

	for (const [jobId, job] of batchJobs.entries()) {
		const jobStartTime = new Date(job.startTime).getTime();
		if (jobStartTime < cutoffTime && job.status !== 'running') {
			batchJobs.delete(jobId);
			console.log(`Cleaned up old batch job: ${jobId}`);
		}
	}
}

async function handleBatchStart(request: Request): Promise<Response> {
	// Run cleanup on each batch start request
	cleanupOldBatchJobs();

	try {
		const body = await request.json() as any;
		const { urls, config } = body;

		// Remove delay from config as it's handled client-side
		if (config && config.delayBetweenRequests) {
			delete config.delayBetweenRequests;
		}

		if (!urls || !Array.isArray(urls) || urls.length === 0) {
			return new Response(JSON.stringify({ error: 'No URLs provided' }), {
				status: 400,
				headers: { 'content-type': 'application/json' },
			});
		}

		if (urls.length > 100) {
			return new Response(JSON.stringify({ error: 'Maximum 100 URLs allowed' }), {
				status: 400,
				headers: { 'content-type': 'application/json' },
			});
		}

		// Validate URLs
		const validUrls: string[] = [];
		const invalidUrls: string[] = [];

		for (const url of urls) {
			const urlValidation = quickValidateURL(url);
			if (!urlValidation.valid) {
				invalidUrls.push(`${url} (${urlValidation.reason})`);
			} else {
				validUrls.push(url);
			}
		}

		if (invalidUrls.length > 0) {
			return new Response(
				JSON.stringify({
					error: `Invalid URLs found: ${invalidUrls.join(', ')}`,
					validUrls: validUrls.length,
					invalidUrls: invalidUrls.length,
				}),
				{
					status: 400,
					headers: { 'content-type': 'application/json' },
				},
			);
		}

		if (validUrls.length === 0) {
			return new Response(JSON.stringify({ error: 'No valid URLs provided' }), {
				status: 400,
				headers: { 'content-type': 'application/json' },
			});
		}

		// Enforce batch job limits
		const clientIP = getClientIP(request);
		if (batchJobs.size >= MAX_BATCH_JOBS) {
			return new Response(JSON.stringify({ error: 'Too many batch jobs globally. Try again later.' }), {
				status: 429,
				headers: { 'content-type': 'application/json' },
			});
		}
		const ipJobCount = Array.from(batchJobs.values()).filter(j => j.ownerIP === clientIP && j.status === 'running').length;
		if (ipJobCount >= MAX_BATCH_JOBS_PER_IP) {
			return new Response(JSON.stringify({ error: `Maximum ${MAX_BATCH_JOBS_PER_IP} concurrent batch jobs per IP.` }), {
				status: 429,
				headers: { 'content-type': 'application/json' },
			});
		}

		const jobId = crypto.randomUUID();
		const startTime = new Date().toISOString();

		// Initialize batch job
		batchJobs.set(jobId, {
			id: jobId,
			ownerIP: clientIP,
			status: 'running',
			progress: 0,
			currentUrl: '',
			startTime,
			results: [],
			totalUrls: validUrls.length,
			completedUrls: 0,
		});

		console.log(`Batch job ${jobId} initialized with ${validUrls.length} valid URLs (${invalidUrls.length} invalid URLs filtered out)`);

		// Start batch processing asynchronously
		processBatchAsync(jobId, validUrls, config || {});

		return new Response(
			JSON.stringify({
				jobId,
				status: 'started',
				totalUrls: validUrls.length,
				filteredUrls: invalidUrls.length,
			}),
			{
				headers: { 'content-type': 'application/json' },
			},
		);
	} catch (error) {
		return new Response(JSON.stringify({ error: 'Invalid request body' }), {
			status: 400,
			headers: { 'content-type': 'application/json' },
		});
	}
}

async function handleBatchStatus(request: Request): Promise<Response> {
	// Occasionally run cleanup on status requests (every ~20th request)
	if (Math.random() < 0.05) {
		cleanupOldBatchJobs();
	}

	const urlObj = new URL(request.url);
	const jobId = urlObj.searchParams.get('jobId');

	if (!jobId) {
		return new Response(JSON.stringify({ error: 'Missing jobId parameter' }), {
			status: 400,
			headers: { 'content-type': 'application/json' },
		});
	}

	const job = batchJobs.get(jobId);
	if (!job) {
		return new Response(JSON.stringify({ error: 'Job not found' }), {
			status: 404,
			headers: { 'content-type': 'application/json' },
		});
	}

	// Verify job ownership
	const statusIP = getClientIP(request);
	if (job.ownerIP !== statusIP) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), {
			status: 403,
			headers: { 'content-type': 'application/json' },
		});
	}

	// Return job data without exposing ownerIP
	const { ownerIP, ...safeJob } = job;
	return new Response(JSON.stringify(safeJob), {
		headers: { 'content-type': 'application/json' },
	});
}

async function handleBatchStop(request: Request): Promise<Response> {
	const urlObj = new URL(request.url);
	const jobId = urlObj.searchParams.get('jobId');

	if (!jobId) {
		return new Response(JSON.stringify({ error: 'Missing jobId parameter' }), {
			status: 400,
			headers: { 'content-type': 'application/json' },
		});
	}

	const job = batchJobs.get(jobId);
	if (!job) {
		return new Response(JSON.stringify({ error: 'Job not found' }), {
			status: 404,
			headers: { 'content-type': 'application/json' },
		});
	}

	// Verify job ownership
	const stopIP = getClientIP(request);
	if (job.ownerIP !== stopIP) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), {
			status: 403,
			headers: { 'content-type': 'application/json' },
		});
	}

	if (job.status === 'running') {
		job.status = 'stopped';
		job.error = 'Stopped by user';
	}

	return new Response(JSON.stringify({ status: 'stopped' }), {
		headers: { 'content-type': 'application/json' },
	});
}

async function processBatchAsync(jobId: string, urls: string[], config: any) {
	const job = batchJobs.get(jobId);
	if (!job) return;

	const maxConcurrent = Math.min(config.maxConcurrent || 3, 5);
	let completedCount = 0;

	const semaphore = { permits: maxConcurrent, queue: [] as Array<() => void> };

	async function acquireSemaphore(): Promise<void> {
		if (semaphore.permits > 0) {
			semaphore.permits--;
			return Promise.resolve();
		}
		return new Promise<void>((resolve) => {
			semaphore.queue.push(resolve);
		});
	}

	function releaseSemaphore(): void {
		semaphore.permits++;
		if (semaphore.queue.length > 0) {
			const resolve = semaphore.queue.shift();
			if (resolve) {
				semaphore.permits--;
				resolve();
			}
		}
	}

	function updateProgress(currentUrl: string = '') {
		const currentJob = batchJobs.get(jobId);
		if (currentJob && currentJob.status === 'running') {
			currentJob.completedUrls = completedCount;
			currentJob.progress = Math.round((completedCount / urls.length) * 100);
			currentJob.currentUrl = currentUrl;
			console.log(`Batch ${jobId} progress: ${currentJob.progress}% (${completedCount}/${urls.length}) - ${currentUrl}`);
		}
	}

	const processUrl = async (url: string, index: number): Promise<string | null> => {
		const currentJob = batchJobs.get(jobId);
		if (!currentJob || currentJob.status !== 'running') return null;

		await acquireSemaphore();

		try {
			// Update current URL being processed
			updateProgress(url);

			// Delay is now handled on client-side

			const currentJobCheck = batchJobs.get(jobId);
			if (!currentJobCheck || currentJobCheck.status !== 'running') return null;

			// Run tests for this URL with timeout
			const urlResults = await Promise.race([
				testSingleUrlForBatch(url, config),
				new Promise<never>(
					(_, reject) => setTimeout(() => reject(new Error('URL test timeout')), 300000), // 5 minute timeout
				),
			]);

			const finalJob = batchJobs.get(jobId);
			if (finalJob && finalJob.status === 'running') {
				const resultEntry = {
					url,
					success: true,
					results: urlResults,
					timestamp: new Date().toISOString(),
					totalTests: urlResults.length,
					bypassedTests: urlResults.filter((r) => r.status === 200 || r.status === '200').length,
					bypassRate:
						urlResults.length > 0
							? Math.round((urlResults.filter((r) => r.status === 200 || r.status === '200').length / urlResults.length) * 100)
							: 0,
				};

				finalJob.results.push(resultEntry);
				completedCount++;
				updateProgress(url);
			}

			return url;
		} catch (error) {
			console.error(`Error processing URL ${url}:`, error);
			const errorJob = batchJobs.get(jobId);
			if (errorJob && errorJob.status === 'running') {
				errorJob.results.push({
					url,
					success: false,
					error: error instanceof Error ? error.message : 'Unknown error',
					timestamp: new Date().toISOString(),
					totalTests: 0,
					bypassedTests: 0,
					bypassRate: 0,
				});

				completedCount++;
				updateProgress(url);
			}
			return null;
		} finally {
			releaseSemaphore();
		}
	};

	try {
		const promises = urls.map((url, index) => processUrl(url, index));
		await Promise.allSettled(promises);

		const finalJob = batchJobs.get(jobId);
		if (finalJob) {
			finalJob.status = finalJob.status === 'running' ? 'completed' : finalJob.status;
			finalJob.progress = 100;
			finalJob.completedUrls = completedCount;
			finalJob.currentUrl = '';
			console.log(`Batch ${jobId} finished with status: ${finalJob.status}`);
		}
	} catch (error) {
		console.error(`Batch ${jobId} failed:`, error);
		const errorJob = batchJobs.get(jobId);
		if (errorJob) {
			errorJob.status = 'error';
			errorJob.error = error instanceof Error ? error.message : 'Unknown error';
		}
	}
}

async function testSingleUrlForBatch(url: string, config: any): Promise<any[]> {
	console.log(`Starting batch test for URL: ${url}`);
	const methods = config.methods || ['GET'];
	const categories = config.categories || ['SQL Injection', 'XSS'];

	let allResults: any[] = [];
	let page = 0;
	let maxPages = 10; // Limit to prevent infinite loops

	while (page < maxPages) {
		const params = new URLSearchParams({
			url,
			methods: methods.join(','),
			categories: categories.join(','),
			page: page.toString(),
			followRedirect: config.followRedirect ? '1' : '0',
			falsePositiveTest: config.falsePositiveTest ? '1' : '0',
			caseSensitiveTest: config.caseSensitiveTest ? '1' : '0',
			enhancedPayloads: config.enhancedPayloads ? '1' : '0',
			useAdvancedPayloads: config.useAdvancedPayloads ? '1' : '0',
			autoDetectWAF: config.autoDetectWAF ? '1' : '0',
			useEncodingVariations: config.useEncodingVariations ? '1' : '0',
			httpManipulation: config.httpManipulation ? '1' : '0',
		});

		try {
			const results = await handleApiCheckFiltered(
				url,
				page,
				methods,
				categories,
				config.payloadTemplate,
				config.followRedirect || false,
				config.customHeaders,
				config.falsePositiveTest || false,
				config.caseSensitiveTest || false,
				config.enhancedPayloads || false,
				config.useAdvancedPayloads || false,
				config.autoDetectWAF || false,
				config.useEncodingVariations || false,
				undefined,
				config.httpManipulation
					? {
							enableParameterPollution: true,
							enableVerbTampering: true,
							enableContentTypeConfusion: true,
						}
					: undefined,
			);

			if (!results || !results.length) {
				console.log(`No more results for ${url} at page ${page}`);
				break;
			}

			allResults = allResults.concat(results);
			console.log(`Batch test ${url}: page ${page} completed, ${results.length} results, total: ${allResults.length}`);
			page++;

			// Limit results to prevent memory issues
			if (allResults.length > 1000) {
				console.log(`Result limit reached for ${url}`);
				break;
			}
		} catch (error) {
			console.error(`Error testing ${url} at page ${page}:`, error);
			break;
		}
	}

	console.log(`Batch test completed for ${url}: ${allResults.length} total results`);
	return allResults;
}

// =============================================
// Security Headers Audit
// =============================================
const SECURITY_HEADERS: Record<string, { description: string; severity: 'critical' | 'high' | 'medium' | 'low'; recommendation: string }> = {
	'content-security-policy': {
		description: 'Controls resources the browser is allowed to load. Prevents XSS and data injection attacks.',
		severity: 'critical',
		recommendation: "Add a Content-Security-Policy header (e.g., default-src 'self'; script-src 'self')",
	},
	'strict-transport-security': {
		description: 'Forces HTTPS connections and prevents SSL stripping attacks.',
		severity: 'critical',
		recommendation: 'Add Strict-Transport-Security: max-age=31536000; includeSubDomains; preload',
	},
	'x-frame-options': {
		description: 'Prevents clickjacking by controlling iframe embedding.',
		severity: 'high',
		recommendation: 'Add X-Frame-Options: DENY or SAMEORIGIN',
	},
	'x-content-type-options': {
		description: 'Prevents MIME-type sniffing attacks.',
		severity: 'medium',
		recommendation: 'Add X-Content-Type-Options: nosniff',
	},
	'referrer-policy': {
		description: 'Controls how much referrer information is shared with other sites.',
		severity: 'medium',
		recommendation: 'Add Referrer-Policy: strict-origin-when-cross-origin',
	},
	'permissions-policy': {
		description: 'Controls which browser features can be used (camera, mic, geolocation, etc.).',
		severity: 'medium',
		recommendation: 'Add Permissions-Policy: camera=(), microphone=(), geolocation=()',
	},
	'x-xss-protection': {
		description: 'Legacy XSS filter for older browsers. Modern CSP is preferred.',
		severity: 'low',
		recommendation: 'Add X-XSS-Protection: 1; mode=block (or rely on CSP)',
	},
	'cross-origin-opener-policy': {
		description: 'Prevents cross-origin windows from interacting with your page.',
		severity: 'medium',
		recommendation: 'Add Cross-Origin-Opener-Policy: same-origin',
	},
	'cross-origin-resource-policy': {
		description: 'Prevents other origins from reading your resources.',
		severity: 'medium',
		recommendation: 'Add Cross-Origin-Resource-Policy: same-origin',
	},
	'cross-origin-embedder-policy': {
		description: 'Controls cross-origin resource loading for added isolation.',
		severity: 'low',
		recommendation: 'Add Cross-Origin-Embedder-Policy: require-corp',
	},
};

const INFORMATION_DISCLOSURE_HEADERS = ['server', 'x-powered-by', 'x-aspnet-version', 'x-aspnetmvc-version', 'x-generator', 'x-drupal-cache', 'x-varnish'];

async function handleSecurityHeaders(request: Request): Promise<Response> {
	const urlObj = new URL(request.url);
	const targetUrl = urlObj.searchParams.get('url');

	if (!targetUrl) {
		return new Response(JSON.stringify({ error: 'Missing url parameter' }), {
			status: 400,
			headers: { 'content-type': 'application/json; charset=UTF-8' },
		});
	}

	const headersSsrf = quickValidateURL(targetUrl);
	if (!headersSsrf.valid) {
		return apiJsonResponse({ error: 'Invalid target URL', reason: headersSsrf.reason }, 400);
	}

	try {
		// Validate URL
		let parsedUrl: URL;
		try {
			parsedUrl = new URL(targetUrl);
		} catch {
			return new Response(JSON.stringify({ error: 'Invalid URL format' }), {
				status: 400,
				headers: { 'content-type': 'application/json; charset=UTF-8' },
			});
		}

		const startTime = Date.now();
		const resp = await fetch(targetUrl, {
			method: 'GET',
			redirect: 'follow',
			headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WAF-Checker/1.0)' },
		});
		const responseTime = Date.now() - startTime;

		const present: Array<{ header: string; value: string; description: string; severity: string }> = [];
		const missing: Array<{ header: string; description: string; severity: string; recommendation: string }> = [];
		const informationDisclosure: Array<{ header: string; value: string }> = [];

		// Check security headers
		for (const [header, info] of Object.entries(SECURITY_HEADERS)) {
			const value = resp.headers.get(header);
			if (value) {
				present.push({ header, value, description: info.description, severity: info.severity });
			} else {
				missing.push({ header, description: info.description, severity: info.severity, recommendation: info.recommendation });
			}
		}

		// Check information disclosure
		for (const header of INFORMATION_DISCLOSURE_HEADERS) {
			const value = resp.headers.get(header);
			if (value) {
				informationDisclosure.push({ header, value });
			}
		}

		// Calculate score
		const totalHeaders = Object.keys(SECURITY_HEADERS).length;
		const presentCount = present.length;
		const criticalMissing = missing.filter(h => h.severity === 'critical').length;
		const highMissing = missing.filter(h => h.severity === 'high').length;

		let score = Math.round((presentCount / totalHeaders) * 100);
		// Penalty for critical/high missing
		score = Math.max(0, score - (criticalMissing * 15) - (highMissing * 8));
		// Penalty for information disclosure
		score = Math.max(0, score - (informationDisclosure.length * 3));

		let grade: string;
		if (score >= 90) grade = 'A+';
		else if (score >= 80) grade = 'A';
		else if (score >= 70) grade = 'B';
		else if (score >= 55) grade = 'C';
		else if (score >= 40) grade = 'D';
		else grade = 'F';

		return new Response(
			JSON.stringify({
				url: targetUrl,
				status: resp.status,
				responseTime,
				score,
				grade,
				present,
				missing,
				informationDisclosure,
				totalChecked: totalHeaders,
				timestamp: new Date().toISOString(),
			}),
			{ headers: { 'content-type': 'application/json; charset=UTF-8' } },
		);
	} catch (error) {
		return new Response(
			JSON.stringify({ error: 'Security headers audit failed', message: error instanceof Error ? error.message : 'Unknown error' }),
			{ status: 500, headers: { 'content-type': 'application/json; charset=UTF-8' } },
		);
	}
}

// =============================================
// DNS Reconnaissance + WHOIS
// =============================================
const DNS_RECORD_TYPES = ['A', 'AAAA', 'CNAME', 'MX', 'NS', 'TXT', 'SOA'];

async function resolveDNS(hostname: string, type: string): Promise<any[]> {
	try {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 3000);
		const resp = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(hostname)}&type=${type}`, {
			headers: { Accept: 'application/dns-json' },
			signal: controller.signal,
		});
		clearTimeout(timeout);
		if (!resp.ok) return [];
		const data: any = await resp.json();
		return data.Answer || [];
	} catch {
		return [];
	}
}

function detectInfraFromRecords(records: Record<string, any[]>): Array<{ type: string; provider: string; evidence: string }> {
	const detected: Array<{ type: string; provider: string; evidence: string }> = [];
	const seen = new Set<string>();

	const patterns: Array<{ pattern: RegExp; provider: string; type: string }> = [
		{ pattern: /cloudflare/i, provider: 'Cloudflare', type: 'CDN/WAF' },
		{ pattern: /akamai|edgekey|edgesuite/i, provider: 'Akamai', type: 'CDN/WAF' },
		{ pattern: /fastly/i, provider: 'Fastly', type: 'CDN' },
		{ pattern: /amazonaws|aws|cloudfront/i, provider: 'AWS', type: 'Cloud/CDN' },
		{ pattern: /azure|microsoft/i, provider: 'Azure', type: 'Cloud' },
		{ pattern: /google|ghs\.googlehosted/i, provider: 'Google Cloud', type: 'Cloud' },
		{ pattern: /incapsula|imperva/i, provider: 'Imperva', type: 'WAF' },
		{ pattern: /sucuri/i, provider: 'Sucuri', type: 'WAF' },
		{ pattern: /stackpath|highwinds/i, provider: 'StackPath', type: 'CDN/WAF' },
		{ pattern: /ovh/i, provider: 'OVH', type: 'Hosting' },
		{ pattern: /hetzner/i, provider: 'Hetzner', type: 'Hosting' },
		{ pattern: /digitalocean/i, provider: 'DigitalOcean', type: 'Cloud' },
		{ pattern: /vercel/i, provider: 'Vercel', type: 'Platform' },
		{ pattern: /netlify/i, provider: 'Netlify', type: 'Platform' },
		{ pattern: /wpengine/i, provider: 'WP Engine', type: 'Hosting' },
	];

	for (const [type, answers] of Object.entries(records)) {
		for (const answer of answers) {
			const value = String(answer.data || '');
			for (const p of patterns) {
				if (p.pattern.test(value) && !seen.has(p.provider)) {
					seen.add(p.provider);
					detected.push({ type: p.type, provider: p.provider, evidence: `${type} record: ${value}` });
				}
			}
		}
	}

	return detected;
}

// =============================================
// Subdomain Discovery
// =============================================
const COMMON_SUBDOMAINS = [
	'www', 'mail', 'ftp', 'webmail', 'smtp', 'pop', 'imap', 'blog', 'forum',
	'shop', 'store', 'api', 'dev', 'staging', 'test', 'admin', 'portal',
	'vpn', 'remote', 'cdn', 'media', 'static', 'assets', 'img', 'images',
	'app', 'mobile', 'ns1', 'ns2', 'ns3', 'dns', 'dns1', 'dns2',
	'mx', 'mx1', 'mx2', 'email', 'cloud', 'git', 'gitlab', 'github',
	'jenkins', 'ci', 'cd', 'docker', 'k8s', 'registry', 'monitor',
	'grafana', 'prometheus', 'kibana', 'elastic', 'status', 'health',
	'docs', 'wiki', 'help', 'support', 'kb', 'intranet', 'internal',
	'crm', 'erp', 'sso', 'auth', 'login', 'oauth', 'id', 'identity',
	'db', 'database', 'mysql', 'postgres', 'redis', 'mongo', 'sql',
	'backup', 'bak', 'old', 'new', 'beta', 'alpha', 'demo', 'sandbox',
	'proxy', 'gateway', 'edge', 'lb', 'loadbalancer', 'cache',
	'ws', 'websocket', 'socket', 'realtime', 'live', 'streaming',
	'files', 'download', 'upload', 'storage', 's3',
	'web', 'www2', 'www3', 'secure', 'ssl', 'pay', 'payment', 'checkout',
	'cpanel', 'plesk', 'whm', 'panel', 'dashboard', 'manage',
	'autodiscover', 'autoconfig', 'webdisk', 'calendar', 'contacts',
];

async function discoverSubdomainsCT(domain: string): Promise<string[]> {
	try {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 8000);
		const resp = await fetch(`https://crt.sh/?q=%25.${encodeURIComponent(domain)}&output=json`, {
			signal: controller.signal,
			headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WAF-Checker/1.0)' },
		});
		clearTimeout(timeout);
		if (!resp.ok) return [];
		const data: any[] = await resp.json();
		const subdomains = new Set<string>();
		for (const entry of data) {
			const name = String(entry.name_value || '').toLowerCase().trim();
			// Split multi-line entries (crt.sh sometimes returns \n-separated names)
			for (const n of name.split('\n')) {
				const clean = n.trim().replace(/^\*\./, '');
				if (clean && clean.endsWith(`.${domain}`) && clean !== domain && !clean.includes('*')) {
					subdomains.add(clean);
				}
			}
		}
		return Array.from(subdomains);
	} catch {
		return [];
	}
}

async function discoverSubdomainsBrute(domain: string): Promise<Array<{ subdomain: string; ip: string }>> {
	const found: Array<{ subdomain: string; ip: string }> = [];
	// Process in batches of 15 to avoid overwhelming DNS
	const batchSize = 15;
	for (let i = 0; i < COMMON_SUBDOMAINS.length; i += batchSize) {
		const batch = COMMON_SUBDOMAINS.slice(i, i + batchSize);
		const results = await Promise.allSettled(batch.map(async (sub) => {
			const fqdn = `${sub}.${domain}`;
			const records = await resolveDNS(fqdn, 'A');
			if (records.length > 0) {
				return { subdomain: fqdn, ip: records[0].data };
			}
			return null;
		}));
		for (const r of results) {
			if (r.status === 'fulfilled' && r.value) found.push(r.value);
		}
	}
	return found;
}

async function handleDNSRecon(request: Request): Promise<Response> {
	const urlObj = new URL(request.url);
	const targetUrl = urlObj.searchParams.get('url');

	if (!targetUrl) {
		return new Response(JSON.stringify({ error: 'Missing url parameter' }), {
			status: 400,
			headers: { 'content-type': 'application/json; charset=UTF-8' },
		});
	}

	const dnsSsrf = quickValidateURL(targetUrl);
	if (!dnsSsrf.valid) {
		return apiJsonResponse({ error: 'Invalid target URL', reason: dnsSsrf.reason }, 400);
	}

	let hostname: string;
	try {
		hostname = new URL(targetUrl).hostname;
	} catch {
		return new Response(JSON.stringify({ error: 'Invalid URL' }), {
			status: 400,
			headers: { 'content-type': 'application/json; charset=UTF-8' },
		});
	}

	// Extract the root domain (e.g. "sub.example.com" -> "example.com")
	const domainParts = hostname.split('.');
	const rootDomain = domainParts.length > 2 ? domainParts.slice(-2).join('.') : hostname;

	try {
		// Run DNS resolution, WHOIS, reverse DNS, subdomain discovery, reverse IP, and domain RDAP in parallel
		const [dnsSettled, whoisSettled, ptrSettled, ctSubsSettled, bruteSubsSettled, reverseIpSettled, domainWhoisSettled] = await Promise.allSettled([
			// DNS records
			(async () => {
				const results = await Promise.allSettled(DNS_RECORD_TYPES.map(async (type) => {
					const records = await resolveDNS(hostname, type);
					return { type, records };
				}));
				const records: Record<string, any[]> = {};
				for (const r of results) {
					if (r.status === 'fulfilled' && r.value.records.length > 0) {
						records[r.value.type] = r.value.records;
					}
				}
				return records;
			})(),
			// WHOIS
			(async () => {
				const aRecords = await resolveDNS(hostname, 'A');
				if (aRecords.length === 0) return null;
				const ip = aRecords[0].data;
				const whoisResp = await fetchWithTimeout(`https://ipwho.is/${ip}`, {}, 5000);
				if (!whoisResp.ok) return null;
				const raw: any = await whoisResp.json();
				if (raw.success === false) return null;
				return {
					status: 'success',
					query: raw.ip || ip,
					country: raw.country || 'N/A',
					countryCode: raw.country_code || '',
					region: raw.region_code || '',
					regionName: raw.region || '',
					city: raw.city || '',
					zip: raw.postal || '',
					lat: raw.latitude || 0,
					lon: raw.longitude || 0,
					timezone: raw.timezone?.id || '',
					isp: raw.connection?.isp || '',
					org: raw.connection?.org || '',
					as: raw.connection?.asn ? `AS${raw.connection.asn}` : '',
					asname: raw.connection?.org || '',
					reverse: '',
				};
			})(),
			// Reverse DNS PTR
			(async () => {
				const aRecords = await resolveDNS(hostname, 'A');
				if (aRecords.length === 0) return null;
				return resolveReverseDNS(aRecords[0].data);
			})(),
			// Certificate Transparency subdomain discovery
			discoverSubdomainsCT(rootDomain),
			// DNS brute-force subdomain discovery
			discoverSubdomainsBrute(rootDomain),
			// Reverse IP lookup (other domains on same IP)
			(async () => {
				const aRecords = await resolveDNS(hostname, 'A');
				if (aRecords.length === 0) return [];
				return reverseIPLookup(aRecords[0].data);
			})(),
			// Domain WHOIS via RDAP — direct registry servers
			(async () => {
				try {
					const tld = rootDomain.split('.').pop()?.toLowerCase() || '';
					const rdapServers: Record<string, string> = {
						'com': 'https://rdap.verisign.com/com/v1/domain/',
						'net': 'https://rdap.verisign.com/net/v1/domain/',
						'org': 'https://rdap.publicinterestregistry.org/rdap/domain/',
						'fr': 'https://rdap.nic.fr/domain/',
						'de': 'https://rdap.denic.de/domain/',
						'uk': 'https://rdap.nominet.uk/uk/domain/',
						'io': 'https://rdap.nic.io/domain/',
						'dev': 'https://rdap.nic.google/domain/',
						'app': 'https://rdap.nic.google/domain/',
						'eu': 'https://rdap.eu/domain/',
						'nl': 'https://rdap.sidn.nl/domain/',
						'be': 'https://rdap.dns.be/domain/',
						'ch': 'https://rdap.nic.ch/domain/',
						'it': 'https://rdap.nic.it/domain/',
						'es': 'https://rdap.nic.es/domain/',
						'pl': 'https://rdap.dns.pl/domain/',
						'se': 'https://rdap.iis.se/domain/',
						'br': 'https://rdap.registro.br/domain/',
						'au': 'https://rdap.auda.org.au/domain/',
						'jp': 'https://rdap.jprs.jp/domain/',
						'ru': 'https://rdap.tcinet.ru/domain/',
						'co': 'https://rdap.nic.co/domain/',
						'cc': 'https://rdap.verisign.com/cc/v1/domain/',
						'tv': 'https://rdap.verisign.com/tv/v1/domain/',
						'me': 'https://rdap.nic.me/domain/',
						'info': 'https://rdap.afilias.net/rdap/info/domain/',
						'xyz': 'https://rdap.nic.xyz/domain/',
					};
					let rdapResp: Response | null = null;
					const directUrl = rdapServers[tld];
					if (directUrl) {
						try {
							rdapResp = await fetchWithTimeout(`${directUrl}${encodeURIComponent(rootDomain)}`, {
								headers: { 'Accept': 'application/rdap+json, application/json' },
							}, 8000);
							if (!rdapResp.ok) rdapResp = null;
						} catch { rdapResp = null; }
					}
					if (!rdapResp) {
						try {
							const bootstrapResp = await fetchWithTimeout('https://data.iana.org/rdap/dns.json', {}, 5000);
							if (bootstrapResp.ok) {
								const bootstrap: any = await bootstrapResp.json();
								for (const entry of (bootstrap.services || [])) {
									const tlds: string[] = entry[0] || [];
									const urls: string[] = entry[1] || [];
									if (tlds.includes(tld) && urls.length > 0) {
										const baseUrl = urls[0].endsWith('/') ? urls[0] : urls[0] + '/';
										rdapResp = await fetchWithTimeout(`${baseUrl}domain/${encodeURIComponent(rootDomain)}`, {
											headers: { 'Accept': 'application/rdap+json, application/json' },
										}, 8000);
										if (!rdapResp.ok) rdapResp = null;
										break;
									}
								}
							}
						} catch { /* ignore */ }
					}
					if (!rdapResp || !rdapResp.ok) return null;
					const rdap: any = await rdapResp.json();

					// Helper: extract contact info from an entity's vcardArray
					// Clean URI prefixes from vCard values
					const cleanUri = (val: string | null): string | null => {
						if (!val) return null;
						return val.replace(/^(tel:|mailto:|sip:)/i, '').trim() || null;
					};

					const extractContact = (entity: any) => {
						const contact: Record<string, string | null> = { name: null, org: null, email: null, phone: null, address: null, country: null };
						if (!entity?.vcardArray?.[1]) return contact;
						for (const field of entity.vcardArray[1]) {
							const key = field[0];
							const val = field[3];
							if (key === 'fn') contact.name = (typeof val === 'string' ? val.trim() : null) || null;
							else if (key === 'org') {
								const orgVal = Array.isArray(val) ? val[0] : val;
								contact.org = (typeof orgVal === 'string' ? orgVal.trim() : null) || null;
							}
							else if (key === 'email') contact.email = cleanUri(typeof val === 'string' ? val : null);
							else if (key === 'tel') contact.phone = cleanUri(typeof val === 'string' ? val : (typeof val === 'object' && val?.uri ? val.uri : null));
							else if (key === 'adr') {
								const parts = Array.isArray(val) ? val : [];
								const addrParts = parts.filter((p: any) => p && typeof p === 'string' && p.trim());
								if (addrParts.length > 0) contact.address = addrParts.join(', ');
								if (parts.length >= 7 && parts[6] && typeof parts[6] === 'string') contact.country = parts[6].trim();
							}
						}
						if (!contact.name && entity.handle) contact.name = entity.handle;
						return contact;
					};

					let registrar: string | null = null;
					let registrant: Record<string, string | null> | null = null;
					let adminContact: Record<string, string | null> | null = null;
					let techContact: Record<string, string | null> | null = null;
					let abuseContact: Record<string, string | null> | null = null;

					const processEntities = (entities: any[]) => {
						for (const entity of entities) {
							const roles: string[] = entity.roles || [];
							if (roles.includes('registrar')) {
								registrar = entity.vcardArray?.[1]?.find((v: any) => v[0] === 'fn')?.[3]
									|| entity.publicIds?.[0]?.identifier
									|| entity.handle
									|| null;
								if (entity.entities) {
									for (const sub of entity.entities) {
										if (sub.roles?.includes('abuse')) abuseContact = extractContact(sub);
									}
								}
							}
							if (roles.includes('registrant')) registrant = extractContact(entity);
							if (roles.includes('administrative')) adminContact = extractContact(entity);
							if (roles.includes('technical')) techContact = extractContact(entity);
							if (roles.includes('abuse') && !abuseContact) abuseContact = extractContact(entity);
						}
					};

					if (rdap.entities) processEntities(rdap.entities);

					// Extract dates from events
					let creationDate: string | null = null;
					let expirationDate: string | null = null;
					let lastChanged: string | null = null;
					if (rdap.events) {
						for (const ev of rdap.events) {
							if (ev.eventAction === 'registration') creationDate = ev.eventDate || null;
							else if (ev.eventAction === 'expiration') expirationDate = ev.eventDate || null;
							else if (ev.eventAction === 'last changed' || ev.eventAction === 'last update of RDAP database') lastChanged = ev.eventDate || null;
						}
					}

					// Extract status
					const status: string[] = rdap.status || [];

					// Extract nameservers from RDAP
					const rdapNameservers: string[] = (rdap.nameservers || []).map((ns: any) => String(ns.ldhName || '').toLowerCase()).filter((n: string) => n);

					// Domain name and handle
					const domainName = rdap.ldhName || rdap.handle || rootDomain;

					// DNSSEC
					const dnssec = rdap.secureDNS?.delegationSigned === true;

					// Clean up null-only contacts
					const isEmptyContact = (c: Record<string, string | null> | null) => !c || Object.values(c).every(v => !v);

					return {
						domainName,
						registrar,
						registrant: isEmptyContact(registrant) ? null : registrant,
						adminContact: isEmptyContact(adminContact) ? null : adminContact,
						techContact: isEmptyContact(techContact) ? null : techContact,
						abuseContact: isEmptyContact(abuseContact) ? null : abuseContact,
						creationDate,
						expirationDate,
						lastChanged,
						status,
						dnssec,
						rdapNameservers: rdapNameservers.length > 0 ? rdapNameservers : null,
					};
				} catch { return null; }
			})(),
		]);

		const dnsRecords = dnsSettled.status === 'fulfilled' ? dnsSettled.value : {};
		const whoisData = whoisSettled.status === 'fulfilled' ? whoisSettled.value : null;
		const reverseDns = ptrSettled.status === 'fulfilled' ? ptrSettled.value : null;
		const reverseIpDomains = reverseIpSettled.status === 'fulfilled' ? reverseIpSettled.value : [];
		const domainWhois = domainWhoisSettled.status === 'fulfilled' ? domainWhoisSettled.value : null;

		// Merge subdomains from CT and brute-force
		const ctSubdomains = ctSubsSettled.status === 'fulfilled' ? ctSubsSettled.value : [];
		const bruteSubdomains = bruteSubsSettled.status === 'fulfilled' ? bruteSubsSettled.value : [];

		// Build unified subdomain list with IPs
		const subdomainMap = new Map<string, string>();
		for (const brute of bruteSubdomains) {
			subdomainMap.set(brute.subdomain, brute.ip);
		}
		for (const ctSub of ctSubdomains) {
			if (!subdomainMap.has(ctSub)) subdomainMap.set(ctSub, '');
		}
		const subdomains = Array.from(subdomainMap.entries())
			.map(([name, ip]) => ({ name, ip, source: bruteSubdomains.some(b => b.subdomain === name) ? (ctSubdomains.includes(name) ? 'DNS + CT' : 'DNS') : 'CT' }))
			.sort((a, b) => a.name.localeCompare(b.name));

		// Detect infrastructure from DNS records
		const infrastructure = detectInfraFromRecords(dnsRecords);

		// Extract IPs
		const aRecords = dnsRecords['A'] || [];
		const ipAddresses = aRecords.map((r: any) => r.data);
		const aaaaRecords = dnsRecords['AAAA'] || [];
		const ipv6Addresses = aaaaRecords.map((r: any) => r.data);

		// Nameservers
		const nsRecords = dnsRecords['NS'] || [];
		const nameservers = nsRecords.map((r: any) => String(r.data).replace(/\.$/, ''));

		// MX
		const mxRecords = dnsRecords['MX'] || [];
		const mailServers = mxRecords.map((r: any) => {
			const parts = String(r.data).split(' ');
			return { priority: parseInt(parts[0]) || 0, server: (parts[1] || '').replace(/\.$/, '') };
		}).sort((a: any, b: any) => a.priority - b.priority);

		// TXT
		const txtRecords = dnsRecords['TXT'] || [];
		const txtValues = txtRecords.map((r: any) => String(r.data).replace(/^"|"$/g, ''));

		// Email security
		const spfRecord = txtValues.find((t: string) => t.startsWith('v=spf1'));
		const dmarcRecords = await resolveDNS(`_dmarc.${hostname}`, 'TXT');
		const dmarcRecord = dmarcRecords.length > 0 ? String(dmarcRecords[0].data).replace(/^"|"$/g, '') : null;

		// Add PTR to whois if available
		if (whoisData && reverseDns) whoisData.reverse = reverseDns;

		return new Response(
			JSON.stringify({
				hostname,
				rootDomain,
				ipAddresses,
				ipv6Addresses,
				reverseDns,
				nameservers,
				mailServers,
				txtRecords: txtValues,
				dnsRecords,
				infrastructure,
				domainWhois,
				whois: whoisData,
				subdomains,
				subdomainStats: {
					total: subdomains.length,
					fromCT: ctSubdomains.length,
					fromDNS: bruteSubdomains.length,
				},
				reverseIpDomains,
				emailSecurity: {
					spf: spfRecord || null,
					dmarc: dmarcRecord || null,
					hasSPF: !!spfRecord,
					hasDMARC: !!dmarcRecord,
				},
				timestamp: new Date().toISOString(),
			}),
			{ headers: { 'content-type': 'application/json; charset=UTF-8' } },
		);
	} catch (error) {
		return new Response(
			JSON.stringify({ error: 'DNS reconnaissance failed', message: error instanceof Error ? error.message : 'Unknown error' }),
			{ status: 500, headers: { 'content-type': 'application/json; charset=UTF-8' } },
		);
	}
}

// =============================================
// Full Reconnaissance
// =============================================

// Technology detection patterns from response headers and HTML
const TECH_PATTERNS: Array<{ name: string; category: string; detect: (headers: Headers, html: string, url: string) => string | null }> = [
	// CMS
	{ name: 'WordPress', category: 'CMS', detect: (h, html) => {
		if (html.includes('wp-content') || html.includes('wp-includes') || html.includes('wp-json')) return 'HTML patterns (wp-content/wp-includes)';
		if (h.get('x-powered-by')?.toLowerCase().includes('wordpress')) return 'X-Powered-By header';
		if (h.get('link')?.includes('wp-json')) return 'REST API link header';
		return null;
	}},
	{ name: 'Drupal', category: 'CMS', detect: (h, html) => {
		if (h.get('x-drupal-cache') || h.get('x-generator')?.toLowerCase().includes('drupal')) return 'Drupal headers';
		if (html.includes('Drupal.settings') || html.includes('/sites/default/files')) return 'HTML patterns';
		return null;
	}},
	{ name: 'Joomla', category: 'CMS', detect: (h, html) => {
		if (html.includes('/media/jui/') || html.includes('Joomla!') || html.includes('/administrator/')) return 'HTML patterns';
		if (h.get('x-content-encoded-by')?.includes('Joomla')) return 'X-Content-Encoded-By header';
		return null;
	}},
	{ name: 'Shopify', category: 'CMS/E-commerce', detect: (h, html) => {
		if (html.includes('cdn.shopify.com') || html.includes('Shopify.theme')) return 'HTML patterns';
		if (h.get('x-shopid') || h.get('x-shardid')) return 'Shopify headers';
		return null;
	}},
	{ name: 'Magento', category: 'CMS/E-commerce', detect: (h, html) => {
		if (html.includes('Mage.Cookies') || html.includes('/skin/frontend/') || html.includes('magento')) return 'HTML patterns';
		if (h.get('set-cookie')?.includes('frontend=')) return 'Magento cookie';
		return null;
	}},
	{ name: 'PrestaShop', category: 'CMS/E-commerce', detect: (h, html) => {
		if (html.includes('prestashop') || html.includes('/modules/ps_') || html.includes('PrestaShop')) return 'HTML patterns';
		return null;
	}},
	{ name: 'Ghost', category: 'CMS', detect: (h, html) => {
		if (html.includes('ghost-') || h.get('x-powered-by')?.includes('Ghost')) return 'Ghost patterns';
		return null;
	}},
	{ name: 'Wix', category: 'Website Builder', detect: (h, html) => {
		if (html.includes('wix.com') || html.includes('X-Wix-')) return 'HTML/header patterns';
		return null;
	}},
	{ name: 'Squarespace', category: 'Website Builder', detect: (h, html) => {
		if (html.includes('squarespace.com') || html.includes('Squarespace')) return 'HTML patterns';
		return null;
	}},
	{ name: 'Webflow', category: 'Website Builder', detect: (h, html) => {
		if (html.includes('webflow.com') || html.includes('wf-') || h.get('x-powered-by')?.includes('Webflow')) return 'Webflow patterns';
		return null;
	}},
	// Frameworks
	{ name: 'Next.js', category: 'Framework', detect: (h, html) => {
		if (h.get('x-powered-by')?.includes('Next.js') || html.includes('__NEXT_DATA__') || html.includes('/_next/')) return 'Next.js patterns';
		return null;
	}},
	{ name: 'Nuxt.js', category: 'Framework', detect: (h, html) => {
		if (html.includes('__NUXT__') || html.includes('/_nuxt/')) return 'Nuxt patterns';
		return null;
	}},
	{ name: 'React', category: 'Frontend', detect: (h, html) => {
		if (html.includes('__REACT_') || html.includes('react-root') || html.includes('data-reactroot')) return 'React markers';
		return null;
	}},
	{ name: 'Vue.js', category: 'Frontend', detect: (h, html) => {
		if (html.includes('__vue__') || html.includes('data-v-') || html.includes('vue.')) return 'Vue.js markers';
		return null;
	}},
	{ name: 'Angular', category: 'Frontend', detect: (h, html) => {
		if (html.includes('ng-version') || html.includes('ng-app') || html.includes('angular')) return 'Angular markers';
		return null;
	}},
	{ name: 'Laravel', category: 'Framework', detect: (h, html) => {
		if (h.get('set-cookie')?.includes('laravel_session')) return 'Laravel session cookie';
		if (html.includes('csrf-token') && html.includes('Laravel')) return 'HTML patterns';
		return null;
	}},
	{ name: 'Django', category: 'Framework', detect: (h, html) => {
		if (h.get('set-cookie')?.includes('csrftoken') && h.get('set-cookie')?.includes('sessionid')) return 'Django cookies';
		return null;
	}},
	{ name: 'Ruby on Rails', category: 'Framework', detect: (h, html) => {
		if (h.get('x-powered-by')?.includes('Phusion') || h.get('set-cookie')?.includes('_rails_')) return 'Rails patterns';
		return null;
	}},
	{ name: 'Express.js', category: 'Framework', detect: (h) => {
		if (h.get('x-powered-by')?.includes('Express')) return 'X-Powered-By: Express';
		return null;
	}},
	{ name: 'ASP.NET', category: 'Framework', detect: (h, html) => {
		if (h.get('x-aspnet-version') || h.get('x-powered-by')?.includes('ASP.NET')) return 'ASP.NET headers';
		if (html.includes('__VIEWSTATE') || html.includes('__EVENTVALIDATION')) return 'ASP.NET HTML patterns';
		return null;
	}},
	{ name: 'PHP', category: 'Language', detect: (h) => {
		if (h.get('x-powered-by')?.toLowerCase().includes('php')) return `X-Powered-By: ${h.get('x-powered-by')}`;
		if (h.get('set-cookie')?.includes('PHPSESSID')) return 'PHPSESSID cookie';
		return null;
	}},
	// Servers
	{ name: 'Nginx', category: 'Web Server', detect: (h) => {
		const server = h.get('server') || '';
		if (server.toLowerCase().includes('nginx')) return `Server: ${server}`;
		return null;
	}},
	{ name: 'Apache', category: 'Web Server', detect: (h) => {
		const server = h.get('server') || '';
		if (server.toLowerCase().includes('apache')) return `Server: ${server}`;
		return null;
	}},
	{ name: 'LiteSpeed', category: 'Web Server', detect: (h) => {
		const server = h.get('server') || '';
		if (server.toLowerCase().includes('litespeed')) return `Server: ${server}`;
		return null;
	}},
	{ name: 'IIS', category: 'Web Server', detect: (h) => {
		const server = h.get('server') || '';
		if (server.toLowerCase().includes('iis') || server.toLowerCase().includes('microsoft')) return `Server: ${server}`;
		return null;
	}},
	{ name: 'Caddy', category: 'Web Server', detect: (h) => {
		const server = h.get('server') || '';
		if (server.toLowerCase().includes('caddy')) return `Server: ${server}`;
		return null;
	}},
	// CDN/Infra
	// NOTE: Cloudflare detection is handled separately in Full Recon to cross-reference with DNS.
	// For standalone tech detection, require strong signals only (not cf-ray alone, which can be injected by Worker proxy).
	{ name: 'Cloudflare', category: 'CDN/WAF', detect: (h, html) => {
		const server = h.get('server')?.toLowerCase() || '';
		const hasCfServer = server.includes('cloudflare');
		const hasCfCacheStatus = !!h.get('cf-cache-status');
		const hasCfRay = !!h.get('cf-ray');
		const hasCloudflareHTML = html.includes('challenges.cloudflare.com') || html.includes('__cf_bm') || html.includes('cf-browser-verification');
		// Require server:cloudflare + at least one more indicator, or HTML evidence
		if (hasCfServer && (hasCfRay || hasCfCacheStatus)) return `Server: cloudflare + ${hasCfCacheStatus ? 'cf-cache-status' : 'cf-ray'}`;
		if (hasCloudflareHTML) return 'Cloudflare challenge/scripts in HTML';
		// cf-ray alone is NOT enough (Cloudflare Workers add it to all proxied responses)
		return null;
	}},
	{ name: 'Akamai', category: 'CDN', detect: (h) => {
		if (h.get('x-akamai-transformed') || h.get('server')?.toLowerCase().includes('akamai')) return 'Akamai headers';
		return null;
	}},
	{ name: 'Fastly', category: 'CDN', detect: (h) => {
		if (h.get('x-served-by')?.includes('cache-') || h.get('via')?.includes('varnish') && h.get('x-fastly-request-id')) return 'Fastly headers';
		return null;
	}},
	{ name: 'Vercel', category: 'Platform', detect: (h) => {
		if (h.get('x-vercel-id') || h.get('server')?.toLowerCase().includes('vercel')) return 'Vercel headers';
		return null;
	}},
	{ name: 'Netlify', category: 'Platform', detect: (h) => {
		if (h.get('x-nf-request-id') || h.get('server')?.toLowerCase().includes('netlify')) return 'Netlify headers';
		return null;
	}},
	// Analytics
	{ name: 'Google Analytics', category: 'Analytics', detect: (h, html) => {
		if (html.includes('google-analytics.com') || html.includes('gtag(') || html.includes('googletagmanager.com') || html.includes('GA_TRACKING_ID')) return 'GA scripts';
		return null;
	}},
	{ name: 'Matomo/Piwik', category: 'Analytics', detect: (h, html) => {
		if (html.includes('matomo') || html.includes('piwik')) return 'Matomo/Piwik scripts';
		return null;
	}},
	// Security
	{ name: 'reCAPTCHA', category: 'Security', detect: (h, html) => {
		if (html.includes('recaptcha') || html.includes('google.com/recaptcha')) return 'reCAPTCHA scripts';
		return null;
	}},
	{ name: 'hCaptcha', category: 'Security', detect: (h, html) => {
		if (html.includes('hcaptcha.com') || html.includes('h-captcha')) return 'hCaptcha scripts';
		return null;
	}},
	{ name: 'Turnstile', category: 'Security', detect: (h, html) => {
		if (html.includes('challenges.cloudflare.com/turnstile') || html.includes('cf-turnstile')) return 'Turnstile widget';
		return null;
	}},
	// More CMS
	{ name: 'TYPO3', category: 'CMS', detect: (h, html) => {
		if (html.includes('typo3') || html.includes('TYPO3') || h.get('x-generator')?.includes('TYPO3')) return 'TYPO3 patterns';
		return null;
	}},
	{ name: 'Hugo', category: 'CMS', detect: (h, html) => {
		if (html.includes('Hugo') && html.includes('generator') || html.includes('/hugo')) return 'Hugo patterns';
		return null;
	}},
	{ name: 'Gatsby', category: 'Framework', detect: (h, html) => {
		if (html.includes('gatsby') || html.includes('___gatsby') || h.get('x-powered-by')?.includes('Gatsby')) return 'Gatsby patterns';
		return null;
	}},
	{ name: 'Svelte/SvelteKit', category: 'Framework', detect: (h, html) => {
		if (html.includes('__sveltekit') || html.includes('svelte') || h.get('x-sveltekit-page')) return 'SvelteKit patterns';
		return null;
	}},
	{ name: 'Remix', category: 'Framework', detect: (h, html) => {
		if (html.includes('__remix') || html.includes('remix-run')) return 'Remix patterns';
		return null;
	}},
	{ name: 'Astro', category: 'Framework', detect: (h, html) => {
		if (html.includes('astro-') || html.match(/data-astro-/)) return 'Astro patterns';
		return null;
	}},
	// More servers / platforms
	{ name: 'Envoy', category: 'Web Server', detect: (h) => {
		const server = h.get('server') || '';
		if (server.toLowerCase().includes('envoy')) return `Server: ${server}`;
		return null;
	}},
	{ name: 'OpenResty', category: 'Web Server', detect: (h) => {
		const server = h.get('server') || '';
		if (server.toLowerCase().includes('openresty')) return `Server: ${server}`;
		return null;
	}},
	{ name: 'AWS', category: 'Platform', detect: (h) => {
		if (h.get('x-amz-request-id') || h.get('x-amzn-requestid') || h.get('server')?.includes('AmazonS3') || h.get('x-amz-cf-id')) return 'AWS headers';
		return null;
	}},
	{ name: 'Google Cloud', category: 'Platform', detect: (h) => {
		if (h.get('x-cloud-trace-context') || h.get('server')?.includes('Google') || h.get('via')?.includes('google')) return 'GCP headers';
		return null;
	}},
	{ name: 'Azure', category: 'Platform', detect: (h) => {
		if (h.get('x-azure-ref') || h.get('x-ms-request-id') || h.get('server')?.includes('Microsoft-Azure')) return 'Azure headers';
		return null;
	}},
	// More analytics
	{ name: 'Hotjar', category: 'Analytics', detect: (h, html) => {
		if (html.includes('hotjar.com') || html.includes('_hjSettings')) return 'Hotjar scripts';
		return null;
	}},
	{ name: 'Microsoft Clarity', category: 'Analytics', detect: (h, html) => {
		if (html.includes('clarity.ms') || html.includes('clarity(')) return 'Clarity scripts';
		return null;
	}},
	{ name: 'Plausible', category: 'Analytics', detect: (h, html) => {
		if (html.includes('plausible.io')) return 'Plausible scripts';
		return null;
	}},
	{ name: 'Umami', category: 'Analytics', detect: (h, html) => {
		if (html.includes('umami.') || html.includes('data-website-id')) return 'Umami scripts';
		return null;
	}},
	// Optimization & Performance
	{ name: 'Varnish', category: 'Cache', detect: (h) => {
		if (h.get('via')?.toLowerCase().includes('varnish') || h.get('x-varnish')) return 'Varnish headers';
		return null;
	}},
	{ name: 'WP Rocket', category: 'Cache', detect: (h, html) => {
		if (html.includes('wp-rocket') || html.includes('wprocket') || h.get('x-powered-by')?.includes('Starter')) return 'WP Rocket patterns';
		return null;
	}},
	{ name: 'LiteSpeed Cache', category: 'Cache', detect: (h, html) => {
		if (h.get('x-litespeed-cache') || html.includes('litespeed-cache')) return 'LiteSpeed Cache headers';
		return null;
	}},
	{ name: 'WP Super Cache', category: 'Cache', detect: (h, html) => {
		if (html.includes('wp-super-cache') || html.includes('supercache')) return 'WP Super Cache patterns';
		return null;
	}},
	{ name: 'W3 Total Cache', category: 'Cache', detect: (h, html) => {
		if (html.includes('w3-total-cache') || html.includes('W3 Total Cache')) return 'W3TC patterns';
		return null;
	}},
	// E-commerce
	{ name: 'WooCommerce', category: 'E-commerce', detect: (h, html) => {
		if (html.includes('woocommerce') || html.includes('wc-') || html.includes('WooCommerce')) return 'WooCommerce patterns';
		return null;
	}},
	// SEO
	{ name: 'Yoast SEO', category: 'SEO', detect: (h, html) => {
		if (html.includes('yoast') || html.includes('Yoast SEO')) return 'Yoast SEO comments/patterns';
		return null;
	}},
	{ name: 'Rank Math', category: 'SEO', detect: (h, html) => {
		if (html.includes('rank-math') || html.includes('Rank Math')) return 'Rank Math patterns';
		return null;
	}},
	// Fonts
	{ name: 'Google Fonts', category: 'Font', detect: (h, html) => {
		if (html.includes('fonts.googleapis.com') || html.includes('fonts.gstatic.com')) return 'Google Fonts CDN';
		return null;
	}},
	{ name: 'Adobe Fonts', category: 'Font', detect: (h, html) => {
		if (html.includes('use.typekit.net') || html.includes('adobe') && html.includes('font')) return 'Adobe Fonts/Typekit';
		return null;
	}},
	// Chat / Support
	{ name: 'Intercom', category: 'Chat', detect: (h, html) => {
		if (html.includes('intercom') || html.includes('Intercom')) return 'Intercom widget';
		return null;
	}},
	{ name: 'Crisp', category: 'Chat', detect: (h, html) => {
		if (html.includes('crisp.chat') || html.includes('$crisp')) return 'Crisp widget';
		return null;
	}},
	{ name: 'Zendesk', category: 'Chat', detect: (h, html) => {
		if (html.includes('zendesk') || html.includes('zdassets.com')) return 'Zendesk widget';
		return null;
	}},
	{ name: 'Tawk.to', category: 'Chat', detect: (h, html) => {
		if (html.includes('tawk.to') || html.includes('Tawk_API')) return 'Tawk.to widget';
		return null;
	}},
	// Marketing
	{ name: 'Facebook Pixel', category: 'Marketing', detect: (h, html) => {
		if (html.includes('fbq(') || html.includes('facebook.com/tr') || html.includes('fbevents.js')) return 'FB Pixel scripts';
		return null;
	}},
	{ name: 'Google Ads', category: 'Marketing', detect: (h, html) => {
		if (html.includes('googleads') || html.includes('adsbygoogle') || html.includes('pagead2')) return 'Google Ads scripts';
		return null;
	}},
];

// =============================================
// Reverse DNS (PTR) lookup
// =============================================
async function resolveReverseDNS(ip: string): Promise<string | null> {
	try {
		const parts = ip.split('.');
		if (parts.length !== 4) return null;
		const reversed = parts.reverse().join('.') + '.in-addr.arpa';
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 3000);
		const resp = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(reversed)}&type=PTR`, {
			headers: { Accept: 'application/dns-json' },
			signal: controller.signal,
		});
		clearTimeout(timeout);
		if (!resp.ok) return null;
		const data: any = await resp.json();
		if (data.Answer && data.Answer.length > 0) {
			return String(data.Answer[0].data).replace(/\.$/, '');
		}
		return null;
	} catch {
		return null;
	}
}

// =============================================
// Reverse IP Lookup (domains on same IP)
// =============================================
async function reverseIPLookup(ip: string): Promise<string[]> {
	const allDomains = new Set<string>();

	// Strategy 1: HackerTarget API (plain text, one domain per line)
	try {
		const resp = await fetchWithTimeout(
			`https://api.hackertarget.com/reverseiplookup/?q=${encodeURIComponent(ip)}`,
			{ headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } },
			5000,
		);
		if (resp.ok) {
			const text = await resp.text();
			if (text && !text.includes('error') && !text.includes('API count exceeded') && !text.includes('No DNS A records')) {
				for (const line of text.split('\n')) {
					const d = line.trim().toLowerCase();
					if (d && d.includes('.') && !d.includes(' ') && !d.includes('<')) {
						allDomains.add(d);
					}
				}
			}
		}
	} catch { /* ignore */ }

	// Strategy 2: rapiddns.io HTML scraping (if strategy 1 returned nothing)
	if (allDomains.size === 0) {
		try {
			const resp = await fetchWithTimeout(
				`https://rapiddns.io/s/${encodeURIComponent(ip)}?full=1`,
				{ headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } },
				6000,
			);
			if (resp.ok) {
				const html = await resp.text();
				// Extract domains from table cells: <td>domain.com</td>
				const tdRegex = /<td>([a-z0-9][\w.-]*\.[a-z]{2,})<\/td>/gi;
				let match: RegExpExecArray | null;
				while ((match = tdRegex.exec(html)) !== null) {
					const d = match[1].toLowerCase();
					if (d.includes('.') && !d.match(/^\d+\.\d+\.\d+\.\d+$/)) {
						allDomains.add(d);
					}
				}
			}
		} catch { /* ignore */ }
	}

	return [...allDomains];
}

// =============================================
// CMS Deep Analysis (plugins, themes, versions)
// =============================================
function extractCMSDetails(html: string, headers: Headers) {
	const result: {
		cmsName: string | null;
		plugins: Array<{ slug: string; name: string; version: string | null }>;
		themes: Array<{ slug: string; name: string; version: string | null; active: boolean }>;
	} = { cmsName: null, plugins: [], themes: [] };

	// Known page builders / NOT CMS (should not be reported as the main CMS)
	const PAGE_BUILDERS = ['elementor', 'divi', 'beaver builder', 'wpbakery', 'oxygen', 'bricks', 'brizy', 'thrive', 'seedprod', 'spectra'];

	// Detect WordPress FIRST via HTML patterns (most reliable)
	const isWP = html.includes('wp-content') || html.includes('wp-includes');
	if (isWP) {
		result.cmsName = 'WordPress';
	}

	// Parse generator for other CMS (only if not already detected as WP)
	if (!result.cmsName) {
		const genMatch = html.match(/<meta[^>]*name=["']generator["'][^>]*content=["']([^"']*)["']/i)
			|| html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']generator["']/i);
		if (genMatch) {
			const raw = genMatch[1].trim();
			if (/^Drupal/i.test(raw)) { result.cmsName = 'Drupal'; }
			else if (/^Joomla/i.test(raw)) { result.cmsName = 'Joomla'; }
			else {
				// Other generators (but skip page builders)
				const genericVer = raw.match(/^([\w.\-/]+)/);
				if (genericVer && !PAGE_BUILDERS.some(pb => genericVer[1].toLowerCase().includes(pb))) {
					result.cmsName = genericVer[1];
				}
			}
		}
	}

	// WordPress specific extraction
	if (isWP) {

		// Extract plugins: /wp-content/plugins/SLUG/
		const pluginMap = new Map<string, string | null>();
		const pluginRegex = /\/wp-content\/plugins\/([a-zA-Z0-9_-]+)\/?[^"']*?(?:\?ver=([\d.]+))?/g;
		let m: RegExpExecArray | null;
		while ((m = pluginRegex.exec(html)) !== null) {
			const slug = m[1];
			const ver = m[2] || null;
			if (!pluginMap.has(slug) || (ver && !pluginMap.get(slug))) {
				pluginMap.set(slug, ver);
			}
		}
		// Also try ver= in same tag for plugins without inline ver
		const pluginTagRegex = /\/wp-content\/plugins\/([a-zA-Z0-9_-]+)\/[^"']*["'][^>]*$/gm;
		// Second pass: look for ver= following the plugin URL in the same tag
		const tagRegex = /<(?:script|link)[^>]*\/wp-content\/plugins\/([a-zA-Z0-9_-]+)\/[^"']*(?:\?[^"']*ver=([\d.]+))?[^>]*>/gi;
		while ((m = tagRegex.exec(html)) !== null) {
			const slug = m[1];
			const ver = m[2] || null;
			if (!pluginMap.has(slug) || (ver && !pluginMap.get(slug))) {
				pluginMap.set(slug, ver);
			}
		}
		for (const [slug, ver] of pluginMap) {
			const name = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
			result.plugins.push({ slug, name, version: ver });
		}
		result.plugins.sort((a, b) => a.name.localeCompare(b.name));

		// Extract themes: /wp-content/themes/SLUG/
		const themeMap = new Map<string, string | null>();
		const themeRegex = /\/wp-content\/themes\/([a-zA-Z0-9_-]+)\/?[^"']*?(?:\?ver=([\d.]+))?/g;
		while ((m = themeRegex.exec(html)) !== null) {
			const slug = m[1];
			const ver = m[2] || null;
			if (!themeMap.has(slug) || (ver && !themeMap.get(slug))) {
				themeMap.set(slug, ver);
			}
		}
		let isFirst = true;
		for (const [slug, ver] of themeMap) {
			const name = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
			result.themes.push({ slug, name, version: ver, active: isFirst });
			isFirst = false;
		}
	}

	// Drupal modules
	if (html.includes('/modules/') && (html.includes('drupal') || html.includes('Drupal'))) {
		const drupalModRegex = /\/modules\/(?:contrib\/)?([a-zA-Z0-9_-]+)\/[^"']*?(?:\?[^"']*v=([\d.]+))?/g;
		let m2: RegExpExecArray | null;
		const modMap = new Map<string, string | null>();
		while ((m2 = drupalModRegex.exec(html)) !== null) {
			const slug = m2[1];
			if (['system', 'core', 'node', 'user', 'field'].includes(slug)) continue;
			if (!modMap.has(slug)) modMap.set(slug, m2[2] || null);
		}
		for (const [slug, ver] of modMap) {
			const name = slug.replace(/-/g, ' ').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
			result.plugins.push({ slug, name, version: ver });
		}
	}

	return result;
}

// =============================================
// Extract JS libraries with versions
// =============================================
function extractJSLibraries(html: string): Array<{ name: string; version: string | null; evidence: string }> {
	const libs: Array<{ name: string; version: string | null; evidence: string }> = [];
	const found = new Set<string>();

	const patterns: Array<{ name: string; regex: RegExp; verGroup?: number }> = [
		{ name: 'jQuery', regex: /jquery[.-]?([\d.]+)?(?:\.min)?\.js/i, verGroup: 1 },
		{ name: 'jQuery Migrate', regex: /jquery-migrate[.-]?([\d.]+)?(?:\.min)?\.js/i, verGroup: 1 },
		{ name: 'jQuery UI', regex: /jquery-ui[.-]?([\d.]+)?(?:\.min)?\.js/i, verGroup: 1 },
		{ name: 'Bootstrap', regex: /bootstrap[.-]?([\d.]+)?(?:\.min)?\.(?:js|css)/i, verGroup: 1 },
		{ name: 'Font Awesome', regex: /font-?awesome[/-]?([\d.]+)?/i, verGroup: 1 },
		{ name: 'Lodash', regex: /lodash[.-]?([\d.]+)?(?:\.min)?\.js/i, verGroup: 1 },
		{ name: 'Moment.js', regex: /moment[.-]?([\d.]+)?(?:\.min)?\.js/i, verGroup: 1 },
		{ name: 'Axios', regex: /axios[.-]?([\d.]+)?(?:\.min)?\.js/i, verGroup: 1 },
		{ name: 'GSAP', regex: /gsap[.-]?([\d.]+)?(?:\.min)?\.js/i, verGroup: 1 },
		{ name: 'Swiper', regex: /swiper[/-]?([\d.]+)?(?:\.min)?\.(?:js|css)/i, verGroup: 1 },
		{ name: 'Slick', regex: /slick[.-]?([\d.]+)?(?:\.min)?\.(?:js|css)/i, verGroup: 1 },
		{ name: 'AOS', regex: /aos[.-]?([\d.]+)?(?:\.min)?\.(?:js|css)/i, verGroup: 1 },
		{ name: 'Owl Carousel', regex: /owl[.-]?carousel[.-]?([\d.]+)?/i, verGroup: 1 },
		{ name: 'Lightbox', regex: /lightbox[.-]?([\d.]+)?(?:\.min)?\.(?:js|css)/i, verGroup: 1 },
		{ name: 'Select2', regex: /select2[.-]?([\d.]+)?(?:\.min)?\.(?:js|css)/i, verGroup: 1 },
		{ name: 'DataTables', regex: /dataTables[.-]?([\d.]+)?(?:\.min)?\.js/i, verGroup: 1 },
		{ name: 'Chart.js', regex: /chart[.-]?([\d.]+)?(?:\.min)?\.js/i, verGroup: 1 },
		{ name: 'Three.js', regex: /three[.-]?([\d.]+)?(?:\.min)?\.js/i, verGroup: 1 },
		{ name: 'D3.js', regex: /d3[.-]?([\d.]+)?(?:\.min)?\.js/i, verGroup: 1 },
		{ name: 'TailwindCSS', regex: /tailwind[.-]?([\d.]+)?(?:\.min)?\.css/i, verGroup: 1 },
		{ name: 'Alpine.js', regex: /alpine[.-]?([\d.]+)?(?:\.min)?\.js/i, verGroup: 1 },
		{ name: 'htmx', regex: /htmx[.-]?([\d.]+)?(?:\.min)?\.js/i, verGroup: 1 },
		{ name: 'Turbo', regex: /turbo[.-]?([\d.]+)?(?:\.min)?\.js/i, verGroup: 1 },
		{ name: 'Elementor', regex: /elementor[/-]?([\d.]+)?/i, verGroup: 1 },
	];

	for (const pat of patterns) {
		const match = html.match(pat.regex);
		if (match) {
			if (found.has(pat.name)) continue;
			found.add(pat.name);
			const ver = pat.verGroup && match[pat.verGroup] ? match[pat.verGroup] : null;
			libs.push({ name: pat.name, version: ver, evidence: match[0].substring(0, 80) });
		}
	}

	// Try to extract jQuery version from inline code
	if (!found.has('jQuery')) {
		const jqInline = html.match(/jquery[\/\s]+([\d.]+)/i);
		if (jqInline) {
			found.add('jQuery');
			libs.push({ name: 'jQuery', version: jqInline[1], evidence: jqInline[0] });
		}
	}

	return libs;
}

// =============================================
// Extract Open Graph + social metadata
// =============================================
function extractOpenGraph(html: string): Record<string, string> {
	const og: Record<string, string> = {};
	const ogRegex = /<meta[^>]*(?:property|name)=["'](og:|twitter:)([^"']*)["'][^>]*content=["']([^"']*)["']/gi;
	let m: RegExpExecArray | null;
	while ((m = ogRegex.exec(html)) !== null) {
		og[m[1] + m[2]] = m[3];
	}
	// Reverse attribute order
	const ogRegex2 = /<meta[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["'](og:|twitter:)([^"']*)["']/gi;
	while ((m = ogRegex2.exec(html)) !== null) {
		if (!og[m[2] + m[3]]) og[m[2] + m[3]] = m[1];
	}
	return og;
}

// =============================================
// Extract page metadata
// =============================================
function extractPageMeta(html: string): {
	language: string | null; canonical: string | null; favicon: string | null;
	feeds: Array<{ type: string; href: string }>; emails: string[];
} {
	const langMatch = html.match(/<html[^>]*\slang=["']([^"']*)["']/i);
	const canonMatch = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["']/i)
		|| html.match(/<link[^>]*href=["']([^"']*)["'][^>]*rel=["']canonical["']/i);
	const faviconMatch = html.match(/<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']*)["']/i)
		|| html.match(/<link[^>]*href=["']([^"']*)["'][^>]*rel=["'](?:shortcut )?icon["']/i);

	const feeds: Array<{ type: string; href: string }> = [];
	const feedRegex = /<link[^>]*rel=["']alternate["'][^>]*type=["'](application\/(?:rss|atom)\+xml)["'][^>]*href=["']([^"']*)["']/gi;
	let m: RegExpExecArray | null;
	while ((m = feedRegex.exec(html)) !== null) {
		feeds.push({ type: m[1].includes('atom') ? 'Atom' : 'RSS', href: m[2] });
	}

	// Extract emails (simple regex, deduplicate)
	const emailSet = new Set<string>();
	const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
	while ((m = emailRegex.exec(html)) !== null) {
		const email = m[0].toLowerCase();
		if (!email.includes('example.') && !email.includes('wixpress') && !email.includes('schema.org') && !email.includes('sentry.')) {
			emailSet.add(email);
		}
	}

	return {
		language: langMatch ? langMatch[1] : null,
		canonical: canonMatch ? canonMatch[1] : null,
		favicon: faviconMatch ? faviconMatch[1] : null,
		feeds,
		emails: Array.from(emailSet).slice(0, 20),
	};
}

// Common paths to probe for technology fingerprinting
const PROBE_PATHS = [
	{ path: '/robots.txt', name: 'robots.txt' },
	{ path: '/sitemap.xml', name: 'sitemap.xml' },
	{ path: '/wp-login.php', name: 'WordPress Login' },
	{ path: '/wp-json/', name: 'WordPress REST API' },
	{ path: '/administrator/', name: 'Joomla Admin' },
	{ path: '/user/login', name: 'Drupal Login' },
	{ path: '/.well-known/security.txt', name: 'security.txt' },
	{ path: '/favicon.ico', name: 'Favicon' },
];

// Fetch with timeout helper
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs: number = 8000): Promise<Response> {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), timeoutMs);
	try {
		const resp = await fetch(url, { ...options, signal: controller.signal });
		return resp;
	} finally {
		clearTimeout(timeout);
	}
}

async function handleFullRecon(request: Request): Promise<Response> {
	const urlObj = new URL(request.url);
	const targetUrl = urlObj.searchParams.get('url');

	if (!targetUrl) {
		return new Response(JSON.stringify({ error: 'Missing url parameter' }), {
			status: 400, headers: { 'content-type': 'application/json; charset=UTF-8' },
		});
	}

	const reconSsrf = quickValidateURL(targetUrl);
	if (!reconSsrf.valid) {
		return apiJsonResponse({ error: 'Invalid target URL', reason: reconSsrf.reason }, 400);
	}

	let parsedTarget: URL;
	try {
		parsedTarget = new URL(targetUrl);
	} catch {
		return new Response(JSON.stringify({ error: 'Invalid URL' }), {
			status: 400, headers: { 'content-type': 'application/json; charset=UTF-8' },
		});
	}

	const baseUrl = `${parsedTarget.protocol}//${parsedTarget.host}`;
	const hostname = parsedTarget.hostname;
	const reconDomainParts = hostname.split('.');
	const reconRootDomain = reconDomainParts.length > 2 ? reconDomainParts.slice(-2).join('.') : hostname;

	// Result containers with defaults (so partial results still work)
	let mainResponseTime = 0;
	let mainHtml = '';
	let mainHeaders: Headers = new Headers();
	let mainStatus = 0;
	const responseHeaders: Record<string, string> = {};
	const technologies: Array<{ name: string; category: string; evidence: string }> = [];
	let pageInfo: any = { title: null, description: null, generator: null, generatorFull: null, statusCode: 0, contentType: '', contentLength: '0' };
	let dnsRecords: Record<string, any[]> = {};
	let ipAddresses: string[] = [];
	let ipv6Addresses: string[] = [];
	let nameservers: string[] = [];
	let infrastructure: Array<{ type: string; provider: string; evidence: string }> = [];
	let whoisData: any = null;
	let reverseDns: string | null = null;
	let probeResults: Array<{ path: string; name: string; status: number; exists: boolean; contentType?: string; snippet?: string }> = [];
	const cookies: Array<{ name: string; flags: string[] }> = [];
	let cmsDetails: any = { cmsName: null, plugins: [], themes: [] };
	let jsLibraries: Array<{ name: string; version: string | null; evidence: string }> = [];
	let openGraph: Record<string, string> = {};
	let pageMeta: any = { language: null, canonical: null, favicon: null, feeds: [], emails: [] };
	let sslCertificate: any = null;
	let reverseIpDomains: string[] = [];
	let subdomains: Array<{ name: string; ip: string; source: string }> = [];
	let subdomainStats: any = { total: 0, fromCT: 0, fromDNS: 0 };
	let mailServers: Array<{ priority: number; server: string }> = [];
	let txtValues: string[] = [];
	let emailSecurity: any = { spf: null, dmarc: null, hasSPF: false, hasDMARC: false };

	try {
		// === ALL PHASES IN PARALLEL: Page fetch + DNS + WHOIS/PTR + Probes + SSL Cert + Reverse IP ===
		const [pageResult, dnsResult, whoisPtrResult, probesResult, sslResult, reverseIpResult, domainRdapResult, ctSubsResult, bruteSubsResult, dmarcResult] = await Promise.allSettled([
			// Phase 1: Main page fetch (5s timeout)
			(async () => {
				const startTime = Date.now();
				const mainResp = await fetchWithTimeout(targetUrl, {
					method: 'GET', redirect: 'follow',
					headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
				}, 5000);
				const rt = Date.now() - startTime;
				const html = await mainResp.text();
				const hdrs: Record<string, string> = {};
				mainResp.headers.forEach((v, k) => { hdrs[k] = v; });
				return { responseTime: rt, html, headers: mainResp.headers, rawHeaders: hdrs, status: mainResp.status };
			})(),
			// Phase 2: DNS (3s per record)
			(async () => {
				const dnsTypes = ['A', 'AAAA', 'CNAME', 'MX', 'NS', 'TXT'];
				const results = await Promise.allSettled(dnsTypes.map(async (type) => {
					const records = await resolveDNS(hostname, type);
					return { type, records };
				}));
				const records: Record<string, any[]> = {};
				for (const r of results) {
					if (r.status === 'fulfilled' && r.value.records.length > 0) {
						records[r.value.type] = r.value.records;
					}
				}
				return records;
			})(),
			// Phase 3: WHOIS + Reverse DNS PTR (3s each)
			(async () => {
				const aRecords = await resolveDNS(hostname, 'A');
				if (aRecords.length === 0) return { whois: null, ptr: null };
				const ip = aRecords[0].data;
				const [whoisSettled, ptrSettled] = await Promise.allSettled([
					(async () => {
						const whoisResp = await fetchWithTimeout(`https://ipwho.is/${ip}`, {}, 3000);
						if (!whoisResp.ok) return null;
						const raw: any = await whoisResp.json();
						if (raw.success === false) return null;
						return {
							ip: raw.ip || ip, country: raw.country || 'N/A', countryCode: raw.country_code || '',
							region: raw.region || '', city: raw.city || '', isp: raw.connection?.isp || '',
							org: raw.connection?.org || '', asn: raw.connection?.asn ? `AS${raw.connection.asn}` : '',
							asnOrg: raw.connection?.org || '',
						};
					})(),
					resolveReverseDNS(ip),
				]);
				return {
					whois: whoisSettled.status === 'fulfilled' ? whoisSettled.value : null,
					ptr: ptrSettled.status === 'fulfilled' ? ptrSettled.value : null,
				};
			})(),
			// Phase 4: Probes (HEAD for most, GET only for text files, 3s timeout)
			Promise.allSettled(PROBE_PATHS.map(async (probe) => {
				const needsBody = probe.path === '/robots.txt' || probe.path === '/.well-known/security.txt';
				try {
					const probeResp = await fetchWithTimeout(`${baseUrl}${probe.path}`, {
						method: needsBody ? 'GET' : 'HEAD', redirect: 'follow',
						headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WAF-Checker/1.0)' },
					}, 3000);
					const exists = probeResp.status >= 200 && probeResp.status < 400;
					let snippet: string | undefined;
					if (exists && needsBody) {
						const text = await probeResp.text();
						snippet = text.substring(0, 500);
					}
					return { path: probe.path, name: probe.name, status: probeResp.status, exists, contentType: probeResp.headers.get('content-type') || undefined, snippet };
				} catch {
					return { path: probe.path, name: probe.name, status: 0, exists: false };
				}
			})),
			// Phase 5: SSL certificate info via crt.sh (latest cert)
			(async () => {
				try {
					const resp = await fetchWithTimeout(
						`https://crt.sh/?q=${encodeURIComponent(hostname)}&output=json`,
						{ headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } },
						8000,
					);
					if (!resp.ok) return null;
					const text = await resp.text();
					if (!text || text.startsWith('<') || text.startsWith('<!')) return null; // HTML error page
					const certs: any[] = JSON.parse(text);
					if (!Array.isArray(certs) || certs.length === 0) return null;
					// Prefer non-precert, non-expired entries; fallback to any
					const now = Date.now();
					const validCerts = certs.filter((c: any) => {
						if (!c.not_after) return false;
						return new Date(c.not_after).getTime() > now;
					});
					const pool = validCerts.length > 0 ? validCerts : certs;
					const nonPrecerts = pool.filter((c: any) => c.name_value && !String(c.entry_type || '').includes('precert'));
					const sorted = (nonPrecerts.length > 0 ? nonPrecerts : pool)
						.sort((a: any, b: any) => new Date(b.not_before || 0).getTime() - new Date(a.not_before || 0).getTime());
					const cert = sorted[0];
					if (!cert) return null;
					return {
						issuer: cert.issuer_name || null,
						subject: cert.common_name || cert.name_value?.split('\n')[0] || null,
						notBefore: cert.not_before || null,
						notAfter: cert.not_after || null,
						serialNumber: cert.serial_number || null,
						domains: [...new Set(
							(cert.name_value || '').split('\n').map((d: string) => d.trim().toLowerCase()).filter((d: string) => d && d !== hostname.toLowerCase())
						)].slice(0, 20),
					};
				} catch { return null; }
			})(),
			// Phase 6: Reverse IP lookup (other domains on same IP)
			(async () => {
				const aRecords = await resolveDNS(hostname, 'A');
				if (aRecords.length === 0) return [];
				return reverseIPLookup(aRecords[0].data);
			})(),
			// Phase 7: Domain WHOIS via RDAP — direct registry servers (no third-party redirect)
			(async () => {
				try {
					const tld = reconRootDomain.split('.').pop()?.toLowerCase() || '';
					// Direct RDAP servers per TLD (official registry endpoints)
					const rdapServers: Record<string, string> = {
						'com': 'https://rdap.verisign.com/com/v1/domain/',
						'net': 'https://rdap.verisign.com/net/v1/domain/',
						'org': 'https://rdap.publicinterestregistry.org/rdap/domain/',
						'fr': 'https://rdap.nic.fr/domain/',
						'de': 'https://rdap.denic.de/domain/',
						'uk': 'https://rdap.nominet.uk/uk/domain/',
						'co.uk': 'https://rdap.nominet.uk/uk/domain/',
						'io': 'https://rdap.nic.io/domain/',
						'dev': 'https://rdap.nic.google/domain/',
						'app': 'https://rdap.nic.google/domain/',
						'page': 'https://rdap.nic.google/domain/',
						'new': 'https://rdap.nic.google/domain/',
						'eu': 'https://rdap.eu/domain/',
						'nl': 'https://rdap.sidn.nl/domain/',
						'be': 'https://rdap.dns.be/domain/',
						'ch': 'https://rdap.nic.ch/domain/',
						'li': 'https://rdap.nic.ch/domain/',
						'at': 'https://rdap.nic.at/domain/',
						'info': 'https://rdap.afilias.net/rdap/info/domain/',
						'me': 'https://rdap.nic.me/domain/',
						'cc': 'https://rdap.verisign.com/cc/v1/domain/',
						'tv': 'https://rdap.verisign.com/tv/v1/domain/',
						'name': 'https://rdap.verisign.com/name/v1/domain/',
						'xyz': 'https://rdap.nic.xyz/domain/',
						'online': 'https://rdap.nic.online/domain/',
						'site': 'https://rdap.nic.site/domain/',
						'tech': 'https://rdap.nic.tech/domain/',
						'store': 'https://rdap.nic.store/domain/',
						'cloud': 'https://rdap.nic.cloud/domain/',
						'top': 'https://rdap.nic.top/domain/',
						'ru': 'https://rdap.tcinet.ru/domain/',
						'su': 'https://rdap.tcinet.ru/domain/',
						'br': 'https://rdap.registro.br/domain/',
						'au': 'https://rdap.auda.org.au/domain/',
						'ca': 'https://rdap.ca.fury.ca/rdap/domain/',
						'jp': 'https://rdap.jprs.jp/domain/',
						'cn': 'https://rdap.cnnic.cn/rdap/domain/',
						'in': 'https://rdap.registry.in/domain/',
						'pl': 'https://rdap.dns.pl/domain/',
						'se': 'https://rdap.iis.se/domain/',
						'no': 'https://rdap.norid.no/domain/',
						'fi': 'https://rdap.fi/domain/',
						'dk': 'https://rdap.dk-hostmaster.dk/domain/',
						'cz': 'https://rdap.nic.cz/domain/',
						'it': 'https://rdap.nic.it/domain/',
						'es': 'https://rdap.nic.es/domain/',
						'pt': 'https://rdap.dns.pt/domain/',
						'nu': 'https://rdap.iis.se/domain/',
						'nz': 'https://rdap.nzrs.net.nz/domain/',
						'co': 'https://rdap.nic.co/domain/',
					};

					let rdapResp: Response | null = null;

					// 1) Try direct RDAP server for this TLD
					const directUrl = rdapServers[tld];
					if (directUrl) {
						try {
							rdapResp = await fetchWithTimeout(`${directUrl}${encodeURIComponent(reconRootDomain)}`, {
								headers: { 'Accept': 'application/rdap+json, application/json' },
							}, 8000);
							if (!rdapResp.ok) rdapResp = null;
						} catch { rdapResp = null; }
					}

					// 2) Fallback: IANA RDAP bootstrap for unknown TLDs
					if (!rdapResp) {
						try {
							const bootstrapResp = await fetchWithTimeout('https://data.iana.org/rdap/dns.json', {}, 5000);
							if (bootstrapResp.ok) {
								const bootstrap: any = await bootstrapResp.json();
								for (const entry of (bootstrap.services || [])) {
									const tlds: string[] = entry[0] || [];
									const urls: string[] = entry[1] || [];
									if (tlds.includes(tld) && urls.length > 0) {
										const baseUrl = urls[0].endsWith('/') ? urls[0] : urls[0] + '/';
										rdapResp = await fetchWithTimeout(`${baseUrl}domain/${encodeURIComponent(reconRootDomain)}`, {
											headers: { 'Accept': 'application/rdap+json, application/json' },
										}, 8000);
										if (!rdapResp.ok) rdapResp = null;
										break;
									}
								}
							}
						} catch { /* ignore bootstrap failure */ }
					}

					if (!rdapResp || !rdapResp.ok) return null;
					const rdap: any = await rdapResp.json();

					const cleanUri = (val: string | null): string | null => {
						if (!val) return null;
						return val.replace(/^(tel:|mailto:|sip:)/i, '').trim() || null;
					};
					const extractContact = (entity: any) => {
						const contact: Record<string, string | null> = { name: null, org: null, email: null, phone: null, address: null, country: null };
						if (!entity?.vcardArray?.[1]) return contact;
						for (const field of entity.vcardArray[1]) {
							const key = field[0];
							const val = field[3];
							if (key === 'fn') contact.name = (typeof val === 'string' ? val.trim() : null) || null;
							else if (key === 'org') {
								const orgVal = Array.isArray(val) ? val[0] : val;
								contact.org = (typeof orgVal === 'string' ? orgVal.trim() : null) || null;
							}
							else if (key === 'email') contact.email = cleanUri(typeof val === 'string' ? val : null);
							else if (key === 'tel') contact.phone = cleanUri(typeof val === 'string' ? val : (typeof val === 'object' && val?.uri ? val.uri : null));
							else if (key === 'adr') {
								const parts = Array.isArray(val) ? val : [];
								const addrParts = parts.filter((p: any) => p && typeof p === 'string' && p.trim());
								if (addrParts.length > 0) contact.address = addrParts.join(', ');
								if (parts.length >= 7 && parts[6] && typeof parts[6] === 'string') contact.country = parts[6].trim();
							}
						}
						if (!contact.name && entity.handle) contact.name = entity.handle;
						return contact;
					};

					let registrar: string | null = null;
					let registrant: Record<string, string | null> | null = null;
					let adminContact: Record<string, string | null> | null = null;
					let techContact: Record<string, string | null> | null = null;
					let abuseContact: Record<string, string | null> | null = null;

					const processEntities = (entities: any[]) => {
						for (const entity of entities) {
							const roles: string[] = entity.roles || [];
							if (roles.includes('registrar')) {
								registrar = entity.vcardArray?.[1]?.find((v: any) => v[0] === 'fn')?.[3]
									|| entity.publicIds?.[0]?.identifier || entity.handle || null;
								if (entity.entities) {
									for (const sub of entity.entities) {
										if (sub.roles?.includes('abuse')) abuseContact = extractContact(sub);
									}
								}
							}
							if (roles.includes('registrant')) registrant = extractContact(entity);
							if (roles.includes('administrative')) adminContact = extractContact(entity);
							if (roles.includes('technical')) techContact = extractContact(entity);
							if (roles.includes('abuse') && !abuseContact) abuseContact = extractContact(entity);
						}
					};
					if (rdap.entities) processEntities(rdap.entities);

					let creationDate: string | null = null;
					let expirationDate: string | null = null;
					let lastChanged: string | null = null;
					if (rdap.events) {
						for (const ev of rdap.events) {
							if (ev.eventAction === 'registration') creationDate = ev.eventDate || null;
							else if (ev.eventAction === 'expiration') expirationDate = ev.eventDate || null;
							else if (ev.eventAction === 'last changed' || ev.eventAction === 'last update of RDAP database') lastChanged = ev.eventDate || null;
						}
					}
					const status: string[] = rdap.status || [];
					const rdapNameservers: string[] = (rdap.nameservers || []).map((ns: any) => String(ns.ldhName || '').toLowerCase()).filter((n: string) => n);
					const domainName = rdap.ldhName || rdap.handle || reconRootDomain;
					const dnssec = rdap.secureDNS?.delegationSigned === true;
					const isEmptyContact = (c: Record<string, string | null> | null) => !c || Object.values(c).every(v => !v);
					return {
						domainName, registrar,
						registrant: isEmptyContact(registrant) ? null : registrant,
						adminContact: isEmptyContact(adminContact) ? null : adminContact,
						techContact: isEmptyContact(techContact) ? null : techContact,
						abuseContact: isEmptyContact(abuseContact) ? null : abuseContact,
						creationDate, expirationDate, lastChanged, status, dnssec,
						rdapNameservers: rdapNameservers.length > 0 ? rdapNameservers : null,
					};
				} catch { return null; }
			})(),
			// Phase 8: Certificate Transparency subdomain discovery
			discoverSubdomainsCT(reconRootDomain),
			// Phase 9: DNS brute-force subdomain discovery
			discoverSubdomainsBrute(reconRootDomain),
			// Phase 10: DMARC record
			(async () => {
				try {
					const dmarcRecs = await resolveDNS(`_dmarc.${hostname}`, 'TXT');
					return dmarcRecs.length > 0 ? String(dmarcRecs[0].data).replace(/^"|"$/g, '') : null;
				} catch { return null; }
			})(),
		]);

		// === Collect page results & run sync analysis ===
		if (pageResult.status === 'fulfilled') {
			const pg = pageResult.value;
			mainResponseTime = pg.responseTime;
			mainHtml = pg.html;
			mainHeaders = pg.headers;
			mainStatus = pg.status;
			Object.assign(responseHeaders, pg.rawHeaders);
		}

		if (mainHtml || mainStatus) {
			for (const tech of TECH_PATTERNS) {
				try {
					const evidence = tech.detect(mainHeaders, mainHtml, targetUrl);
					if (evidence) technologies.push({ name: tech.name, category: tech.category, evidence });
				} catch {}
			}

			const titleMatch = mainHtml.match(/<title[^>]*>([^<]*)<\/title>/i);
			const descMatch = mainHtml.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i)
				|| mainHtml.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i);
			const generatorMatch = mainHtml.match(/<meta[^>]*name=["']generator["'][^>]*content=["']([^"']*)["']/i)
				|| mainHtml.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']generator["']/i);

			let generatorClean: string | null = null;
			let generatorFull: string | null = null;
			if (generatorMatch) {
				generatorFull = generatorMatch[1].trim();
				const cleanMatch = generatorFull.match(/^([\w.\-/]+(?:\s+[\d.]+)?)/);
				generatorClean = cleanMatch ? cleanMatch[1] : generatorFull;
			}

			pageInfo = {
				title: titleMatch ? titleMatch[1].trim() : null,
				description: descMatch ? descMatch[1].trim() : null,
				generator: generatorClean, generatorFull,
				statusCode: mainStatus,
				contentType: mainHeaders.get('content-type') || '',
				contentLength: mainHeaders.get('content-length') || String(mainHtml.length),
			};

			cmsDetails = extractCMSDetails(mainHtml, mainHeaders);
			jsLibraries = extractJSLibraries(mainHtml);
			openGraph = extractOpenGraph(mainHtml);
			pageMeta = extractPageMeta(mainHtml);

			if (generatorClean) {
				const existing = technologies.find(t => generatorClean!.toLowerCase().includes(t.name.toLowerCase()));
				if (!existing) technologies.push({ name: generatorClean, category: 'Generator', evidence: `<meta name="generator">` });
			}
		}

		// === Collect DNS results ===
		if (dnsResult.status === 'fulfilled') {
			dnsRecords = dnsResult.value;
			ipAddresses = (dnsRecords['A'] || []).map((r: any) => r.data);
			ipv6Addresses = (dnsRecords['AAAA'] || []).map((r: any) => r.data);
			nameservers = (dnsRecords['NS'] || []).map((r: any) => String(r.data).replace(/\.$/, ''));
			infrastructure = detectInfraFromRecords(dnsRecords);

			// Cross-reference: remove Cloudflare from technologies if DNS doesn't confirm it
			const dnsConfirmsCF = nameservers.some(ns => /cloudflare/i.test(ns))
				|| (dnsRecords['CNAME'] || []).some((r: any) => /cloudflare/i.test(String(r.data || '')));
			if (!dnsConfirmsCF) {
				const cfIdx = technologies.findIndex(t => t.name === 'Cloudflare' && t.category === 'CDN/WAF');
				if (cfIdx !== -1) {
					// Only keep Cloudflare if it was detected via HTML (not just headers which may be Worker-injected)
					const ev = technologies[cfIdx].evidence || '';
					if (!ev.includes('HTML') && !ev.includes('challenge') && !ev.includes('script')) {
						technologies.splice(cfIdx, 1);
					}
				}
			}
		}

		// === Collect WHOIS + PTR ===
		if (whoisPtrResult.status === 'fulfilled') {
			whoisData = whoisPtrResult.value.whois;
			reverseDns = whoisPtrResult.value.ptr;
		}

		// === Collect probe results ===
		if (probesResult.status === 'fulfilled') {
			for (const r of probesResult.value) {
				if (r.status === 'fulfilled') probeResults.push(r.value);
			}
		}

		// === Collect SSL certificate ===
		if (sslResult.status === 'fulfilled') sslCertificate = sslResult.value;

		// === Collect Reverse IP ===
		if (reverseIpResult.status === 'fulfilled') reverseIpDomains = reverseIpResult.value;

		// === Collect Domain RDAP ===
		const reconDomainWhois = domainRdapResult.status === 'fulfilled' ? domainRdapResult.value : null;

		// === Collect subdomains ===
		const ctSubdomains = ctSubsResult.status === 'fulfilled' ? ctSubsResult.value : [];
		const bruteSubdomains = bruteSubsResult.status === 'fulfilled' ? bruteSubsResult.value : [];
		const subdomainMap = new Map<string, string>();
		for (const brute of bruteSubdomains) {
			subdomainMap.set(brute.subdomain, brute.ip);
		}
		for (const ctSub of ctSubdomains) {
			if (!subdomainMap.has(ctSub)) subdomainMap.set(ctSub, '');
		}
		subdomains = Array.from(subdomainMap.entries())
			.map(([name, ip]) => ({ name, ip, source: bruteSubdomains.some(b => b.subdomain === name) ? (ctSubdomains.includes(name) ? 'DNS + CT' : 'DNS') : 'CT' }))
			.sort((a, b) => a.name.localeCompare(b.name));
		subdomainStats = { total: subdomains.length, fromCT: ctSubdomains.length, fromDNS: bruteSubdomains.length };

		// === Extract MX, TXT, Email Security from DNS records ===
		const mxRecords = dnsRecords['MX'] || [];
		mailServers = mxRecords.map((r: any) => {
			const parts = String(r.data).split(' ');
			return { priority: parseInt(parts[0]) || 0, server: (parts[1] || '').replace(/\.$/, '') };
		}).sort((a: any, b: any) => a.priority - b.priority);

		const txtRecords = dnsRecords['TXT'] || [];
		txtValues = txtRecords.map((r: any) => String(r.data).replace(/^"|"$/g, ''));

		const spfRecord = txtValues.find((t: string) => t.startsWith('v=spf1'));
		const dmarcRecord = dmarcResult.status === 'fulfilled' ? dmarcResult.value : null;
		emailSecurity = { spf: spfRecord || null, dmarc: dmarcRecord || null, hasSPF: !!spfRecord, hasDMARC: !!dmarcRecord };

		// === PHASE 6: Security headers (from phase 1 data) ===
		const securityHeadersList = ['content-security-policy', 'strict-transport-security', 'x-frame-options', 'x-content-type-options', 'referrer-policy', 'permissions-policy'];
		const securityHeaders: Record<string, string | null> = {};
		for (const h of securityHeadersList) securityHeaders[h] = mainHeaders.get(h);
		const securityScore = Object.values(securityHeaders).filter(v => v !== null).length;

		// === PHASE 7: SSL / TLS deep analysis ===
		const isHttps = parsedTarget.protocol === 'https:';
		const hstsHeader = mainHeaders.get('strict-transport-security');

		// Parse HSTS header into structured data
		let hstsParsed: any = null;
		if (hstsHeader) {
			const maxAgeMatch = hstsHeader.match(/max-age=(\d+)/i);
			hstsParsed = {
				raw: hstsHeader,
				maxAge: maxAgeMatch ? parseInt(maxAgeMatch[1], 10) : null,
				includeSubDomains: /includesubdomains/i.test(hstsHeader),
				preload: /preload/i.test(hstsHeader),
			};
		}

		// HTTP → HTTPS redirect test (run in parallel, quick check)
		let httpRedirect: any = { tested: false, redirects: false, redirectUrl: null, statusCode: null };
		try {
			const httpUrl = `http://${hostname}/`;
			const rResp = await fetchWithTimeout(httpUrl, { redirect: 'manual', headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WAF-Checker/1.0)' } }, 4000);
			httpRedirect.tested = true;
			httpRedirect.statusCode = rResp.status;
			const location = rResp.headers.get('location') || '';
			if (rResp.status >= 300 && rResp.status < 400 && location.startsWith('https://')) {
				httpRedirect.redirects = true;
				httpRedirect.redirectUrl = location;
			}
		} catch { httpRedirect.tested = true; }

		// Mixed content detection (scan HTML for http:// resources)
		const mixedContent: string[] = [];
		if (mainHtml && isHttps) {
			const httpPatterns = mainHtml.matchAll(/(?:src|href|action|poster|data)\s*=\s*["'](http:\/\/[^"']+)["']/gi);
			const seen = new Set<string>();
			for (const m of httpPatterns) {
				const url = m[1];
				if (!seen.has(url) && !url.includes('localhost') && !url.includes('127.0.0.1')) {
					seen.add(url);
					mixedContent.push(url);
				}
				if (mixedContent.length >= 20) break;
			}
		}

		// Extract additional info from response headers
		const serverHeader = mainHeaders.get('server') || null;
		const altSvc = mainHeaders.get('alt-svc') || null;

		// TLS / Protocol detection from headers + CDN knowledge
		const tlsInfo: { protocols: Array<{ name: string; supported: boolean | null; note: string }>; http2: boolean | null; http3: boolean | null; alpn: string | null } = {
			protocols: [],
			http2: null,
			http3: null,
			alpn: null,
		};

		// HTTP/3 detection via Alt-Svc header (h3 = HTTP/3 over QUIC = TLS 1.3)
		if (altSvc) {
			tlsInfo.alpn = altSvc;
			if (altSvc.includes('h3')) {
				tlsInfo.http3 = true;
			}
			if (altSvc.includes('h2')) {
				tlsInfo.http2 = true;
			}
		}

		// HTTP/2 detection from via header or other indicators
		const viaHeader = mainHeaders.get('via') || '';
		if (viaHeader.includes('2') || viaHeader.includes('HTTP/2')) {
			tlsInfo.http2 = true;
		}

		// Infer TLS support from CDN/infrastructure knowledge
		const infraProviders = infrastructure.map(i => i.provider.toLowerCase());
		const isCloudflare = infraProviders.includes('cloudflare') || nameservers.some(ns => /cloudflare/i.test(ns));
		const isAkamai = infraProviders.includes('akamai');
		const isAWS = infraProviders.includes('aws');
		const isFastly = infraProviders.includes('fastly');
		const isVercel = infraProviders.includes('vercel');
		const isNetlify = infraProviders.includes('netlify');
		const isMajorCDN = isCloudflare || isAkamai || isAWS || isFastly || isVercel || isNetlify;

		if (isHttps && mainStatus && mainStatus > 0) {
			// TLS 1.3
			if (tlsInfo.http3) {
				tlsInfo.protocols.push({ name: 'TLS 1.3', supported: true, note: 'Confirmed — HTTP/3 (h3) requires TLS 1.3' });
			} else if (isCloudflare || isFastly || isVercel || isNetlify) {
				tlsInfo.protocols.push({ name: 'TLS 1.3', supported: true, note: `Enabled by default on ${isCloudflare ? 'Cloudflare' : isFastly ? 'Fastly' : isVercel ? 'Vercel' : 'Netlify'}` });
			} else if (isMajorCDN) {
				tlsInfo.protocols.push({ name: 'TLS 1.3', supported: null, note: 'Likely supported by CDN — verify in server config' });
			} else {
				tlsInfo.protocols.push({ name: 'TLS 1.3', supported: null, note: 'Check server config — recommended to enable' });
			}

			// TLS 1.2
			tlsInfo.protocols.push({ name: 'TLS 1.2', supported: true, note: 'HTTPS connection succeeded — TLS 1.2 minimum' });

			// TLS 1.1 & 1.0
			if (isCloudflare) {
				tlsInfo.protocols.push({ name: 'TLS 1.1', supported: false, note: 'Disabled by Cloudflare (since June 2024)' });
				tlsInfo.protocols.push({ name: 'TLS 1.0', supported: false, note: 'Disabled by Cloudflare (since June 2024)' });
			} else if (isFastly || isVercel || isNetlify) {
				tlsInfo.protocols.push({ name: 'TLS 1.1', supported: false, note: `Disabled by default on ${isFastly ? 'Fastly' : isVercel ? 'Vercel' : 'Netlify'}` });
				tlsInfo.protocols.push({ name: 'TLS 1.0', supported: false, note: `Disabled by default on ${isFastly ? 'Fastly' : isVercel ? 'Vercel' : 'Netlify'}` });
			} else {
				tlsInfo.protocols.push({ name: 'TLS 1.1', supported: null, note: 'Deprecated — should be disabled' });
				tlsInfo.protocols.push({ name: 'TLS 1.0', supported: null, note: 'Deprecated — should be disabled' });
			}
		}

		// Extract certificate algorithm from issuer
		let certAlgorithm: string | null = null;
		if (sslCertificate?.issuer) {
			const issuerLc = sslCertificate.issuer.toLowerCase();
			if (issuerLc.includes('ecdsa') || issuerLc.includes('ec ') || issuerLc.includes('e1') || issuerLc.includes('e5') || issuerLc.includes('e6')) certAlgorithm = 'ECDSA';
			else if (issuerLc.includes('rsa') || issuerLc.includes('r3') || issuerLc.includes('r4') || issuerLc.includes('r10') || issuerLc.includes('r11')) certAlgorithm = 'RSA';
		}

		// Determine SSL/TLS security score
		let sslScore = 0;
		const sslChecks: Array<{ test: string; status: 'ok' | 'warning' | 'fail' | 'info'; detail: string }> = [];

		// Check HTTPS
		if (isHttps) { sslScore += 20; sslChecks.push({ test: 'HTTPS', status: 'ok', detail: 'Connection is encrypted via HTTPS' }); }
		else { sslChecks.push({ test: 'HTTPS', status: 'fail', detail: 'Site does not use HTTPS — all traffic is unencrypted' }); }

		// Check HTTP→HTTPS redirect
		if (httpRedirect.redirects) { sslScore += 15; sslChecks.push({ test: 'HTTP → HTTPS Redirect', status: 'ok', detail: `HTTP redirects to HTTPS (${httpRedirect.statusCode})` }); }
		else if (httpRedirect.tested && httpRedirect.statusCode) { sslChecks.push({ test: 'HTTP → HTTPS Redirect', status: 'fail', detail: `HTTP does not redirect to HTTPS (status ${httpRedirect.statusCode})` }); }
		else { sslChecks.push({ test: 'HTTP → HTTPS Redirect', status: 'warning', detail: 'Could not test HTTP redirect' }); }

		// Check HSTS
		if (hstsParsed) {
			if (hstsParsed.maxAge && hstsParsed.maxAge >= 31536000) {
				sslScore += 20;
				sslChecks.push({ test: 'HSTS', status: 'ok', detail: `Configured with max-age=${hstsParsed.maxAge} (≥ 1 year)` });
			} else if (hstsParsed.maxAge && hstsParsed.maxAge > 0) {
				sslScore += 10;
				sslChecks.push({ test: 'HSTS', status: 'warning', detail: `max-age=${hstsParsed.maxAge} — recommended: 31536000 (1 year) or more` });
			} else {
				sslChecks.push({ test: 'HSTS', status: 'warning', detail: 'HSTS header present but max-age is missing or 0' });
			}
			if (hstsParsed.includeSubDomains) { sslScore += 10; sslChecks.push({ test: 'HSTS includeSubDomains', status: 'ok', detail: 'All subdomains enforce HTTPS' }); }
			else { sslChecks.push({ test: 'HSTS includeSubDomains', status: 'warning', detail: 'Subdomains not included — consider adding includeSubDomains' }); }
			if (hstsParsed.preload) { sslScore += 10; sslChecks.push({ test: 'HSTS Preload', status: 'ok', detail: 'Eligible for browser HSTS preload list' }); }
			else { sslChecks.push({ test: 'HSTS Preload', status: 'info', detail: 'Not preloaded — consider adding preload directive' }); }
		} else {
			sslChecks.push({ test: 'HSTS', status: 'fail', detail: 'No Strict-Transport-Security header — browsers can be SSL-stripped' });
		}

		// Check certificate validity
		if (sslCertificate) {
			sslScore += 15;
			const notAfter = sslCertificate.notAfter ? new Date(sslCertificate.notAfter) : null;
			const daysLeft = notAfter ? Math.ceil((notAfter.getTime() - Date.now()) / 86400000) : null;
			if (daysLeft !== null && daysLeft > 30) {
				sslChecks.push({ test: 'Certificate Validity', status: 'ok', detail: `Valid for ${daysLeft} more days` });
			} else if (daysLeft !== null && daysLeft > 0) {
				sslChecks.push({ test: 'Certificate Validity', status: 'warning', detail: `Expires in ${daysLeft} days — renewal needed soon` });
			} else if (daysLeft !== null) {
				sslChecks.push({ test: 'Certificate Validity', status: 'fail', detail: 'Certificate has expired' });
			}
			if (certAlgorithm === 'ECDSA') { sslScore += 10; sslChecks.push({ test: 'Key Algorithm', status: 'ok', detail: 'ECDSA — modern and efficient' }); }
			else if (certAlgorithm === 'RSA') { sslChecks.push({ test: 'Key Algorithm', status: 'info', detail: 'RSA — widely compatible' }); }
		} else {
			sslChecks.push({ test: 'Certificate', status: 'warning', detail: 'Certificate details not available from CT logs' });
		}

		// Check mixed content
		if (mixedContent.length === 0 && isHttps) { sslScore += 10; sslChecks.push({ test: 'Mixed Content', status: 'ok', detail: 'No HTTP resources detected on HTTPS page' }); }
		else if (mixedContent.length > 0) { sslChecks.push({ test: 'Mixed Content', status: 'fail', detail: `${mixedContent.length} insecure HTTP resource(s) found on HTTPS page` }); }

		// TLS Protocol checks
		if (tlsInfo.http3) {
			sslChecks.push({ test: 'HTTP/3 (QUIC)', status: 'ok', detail: 'HTTP/3 supported — uses TLS 1.3 natively' });
		}
		if (tlsInfo.http2) {
			sslChecks.push({ test: 'HTTP/2', status: 'ok', detail: 'HTTP/2 supported (ALPN)' });
		} else if (tlsInfo.http2 === null && isHttps) {
			sslChecks.push({ test: 'HTTP/2', status: 'info', detail: 'Cannot determine HTTP/2 support from headers' });
		}

		// Cap score at 100
		sslScore = Math.min(sslScore, 100);

		// Determine SSL grade
		const sslGrade = sslScore >= 90 ? 'A+' : sslScore >= 80 ? 'A' : sslScore >= 70 ? 'B' : sslScore >= 50 ? 'C' : sslScore >= 30 ? 'D' : 'F';

		// === PHASE 8: Cookies ===
		const setCookieHeaders = responseHeaders['set-cookie'];
		if (setCookieHeaders) {
			for (const cookieStr of setCookieHeaders.split(/,(?=\s*\w+=)/)) {
				const parts = cookieStr.trim().split(';');
				const nameValue = parts[0]?.split('=');
				if (nameValue && nameValue[0]) {
					const flags: string[] = [];
					const cookieLower = cookieStr.toLowerCase();
					if (cookieLower.includes('secure')) flags.push('Secure');
					if (cookieLower.includes('httponly')) flags.push('HttpOnly');
					if (cookieLower.includes('samesite')) {
						const ssMatch = cookieLower.match(/samesite=(\w+)/);
						flags.push(`SameSite=${ssMatch ? ssMatch[1] : '?'}`);
					}
					cookies.push({ name: nameValue[0].trim(), flags });
				}
			}
		}

		return new Response(
			JSON.stringify({
				url: targetUrl,
				hostname,
				responseTime: mainResponseTime,
				pageInfo,
				cmsDetails,
				technologies,
				jsLibraries,
				openGraph,
				pageMeta,
				dns: { ipAddresses, ipv6Addresses, nameservers, records: dnsRecords },
				reverseDns,
				reverseIpDomains,
				infrastructure,
				domainWhois: reconDomainWhois,
				whois: whoisData,
				mailServers,
				txtRecords: txtValues,
				emailSecurity,
				subdomains,
				subdomainStats,
				probes: probeResults,
				securityHeaders,
				securityHeadersScore: `${securityScore}/${securityHeadersList.length}`,
				ssl: {
					isHttps,
					hsts: hstsHeader || null,
					hstsParsed,
					httpRedirect,
					mixedContent,
					tlsInfo,
					serverHeader,
					certAlgorithm,
					certificate: sslCertificate,
					score: sslScore,
					grade: sslGrade,
					checks: sslChecks,
				},
				cookies,
				responseHeaders,
				timestamp: new Date().toISOString(),
			}),
			{ headers: { 'content-type': 'application/json; charset=UTF-8' } },
		);
	} catch (error) {
		return new Response(
			JSON.stringify({ error: 'Full reconnaissance failed', message: error instanceof Error ? error.message : 'Unknown error' }),
			{ status: 500, headers: { 'content-type': 'application/json; charset=UTF-8' } },
		);
	}
}

// ================================================
// SPEED TEST — Detailed site performance analysis
// ================================================
async function handleSpeedTest(request: Request): Promise<Response> {
	const urlObj = new URL(request.url);
	const targetUrl = urlObj.searchParams.get('url');

	if (!targetUrl) {
		return new Response(JSON.stringify({ error: 'Missing url parameter' }), {
			status: 400, headers: { 'content-type': 'application/json; charset=UTF-8' },
		});
	}

	const speedSsrf = quickValidateURL(targetUrl);
	if (!speedSsrf.valid) {
		return apiJsonResponse({ error: 'Invalid target URL', reason: speedSsrf.reason }, 400);
	}

	let parsedTarget: URL;
	try {
		parsedTarget = new URL(targetUrl);
	} catch {
		return new Response(JSON.stringify({ error: 'Invalid URL' }), {
			status: 400, headers: { 'content-type': 'application/json; charset=UTF-8' },
		});
	}

	const hostname = parsedTarget.hostname;

	try {
		// ---- Phase 1: DNS resolution timing ----
		const dnsStart = Date.now();
		const aRecords = await resolveDNS(hostname, 'A');
		const dnsTime = Date.now() - dnsStart;

		// ---- Phase 2: Full page fetch with timing ----
		const fetchStart = Date.now();
		const controller = new AbortController();
		const fetchTimeout = setTimeout(() => controller.abort(), 15000);
		const mainResp = await fetch(targetUrl, {
			signal: controller.signal,
			headers: {
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
				'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
				'Accept-Encoding': 'gzip, deflate, br',
				'Accept-Language': 'en-US,en;q=0.9',
			},
			redirect: 'follow',
		});
		clearTimeout(fetchTimeout);
		const ttfb = Date.now() - fetchStart;

		const htmlBytes = await mainResp.arrayBuffer();
		const totalTime = Date.now() - fetchStart;
		const downloadTime = totalTime - ttfb;
		const html = new TextDecoder().decode(htmlBytes);
		const htmlSize = htmlBytes.byteLength;

		const headers: Record<string, string> = {};
		mainResp.headers.forEach((value, key) => { headers[key] = value; });
		const statusCode = mainResp.status;
		const redirected = mainResp.redirected;
		const finalUrl = mainResp.url;

		// ---- Phase 3: Parse HTML for resources ----
		const cssLinks: string[] = [];
		const jsScripts: string[] = [];
		const images: string[] = [];
		const fonts: string[] = [];
		const inlineCssSize = { count: 0, chars: 0 };
		const inlineJsSize = { count: 0, chars: 0 };

		// External CSS
		const cssRegex = /<link[^>]+rel=["']stylesheet["'][^>]*href=["']([^"']+)["']/gi;
		let m: RegExpExecArray | null;
		while ((m = cssRegex.exec(html)) !== null) cssLinks.push(m[1]);

		// External JS
		const jsRegex = /<script[^>]+src=["']([^"']+)["'][^>]*>/gi;
		while ((m = jsRegex.exec(html)) !== null) jsScripts.push(m[1]);

		// Images
		const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
		while ((m = imgRegex.exec(html)) !== null) images.push(m[1]);
		// Background images in inline style
		const bgRegex = /url\(["']?([^"')]+\.(?:jpg|jpeg|png|gif|webp|svg|avif))["']?\)/gi;
		while ((m = bgRegex.exec(html)) !== null) images.push(m[1]);

		// Fonts
		const fontRegex = /url\(["']?([^"')]+\.(?:woff2?|ttf|otf|eot))["']?\)/gi;
		while ((m = fontRegex.exec(html)) !== null) fonts.push(m[1]);
		// Preloaded fonts
		const fontPreloadRegex = /<link[^>]+rel=["']preload["'][^>]+as=["']font["'][^>]*href=["']([^"']+)["']/gi;
		while ((m = fontPreloadRegex.exec(html)) !== null) fonts.push(m[1]);

		// Inline CSS
		const inlineCssRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
		while ((m = inlineCssRegex.exec(html)) !== null) {
			inlineCssSize.count++;
			inlineCssSize.chars += m[1].length;
		}

		// Inline JS
		const inlineJsRegex = /<script(?![^>]+src=)[^>]*>([\s\S]*?)<\/script>/gi;
		while ((m = inlineJsRegex.exec(html)) !== null) {
			if (m[1].trim().length > 0) {
				inlineJsSize.count++;
				inlineJsSize.chars += m[1].length;
			}
		}

		// ---- Phase 4: Fetch critical resources to measure sizes ----
		interface ResourceInfo {
			url: string;
			size: number;
			time: number;
			type: string;
			status: number;
			compressed: boolean;
		}
		const resourceResults: ResourceInfo[] = [];

		const resolveUrl = (href: string): string => {
			try {
				return new URL(href, finalUrl).toString();
			} catch {
				return href;
			}
		};

		// Fetch a sample of resources (max 10 CSS + 10 JS + 5 images for speed)
		const resourcesToFetch: { url: string; type: string }[] = [];
		cssLinks.slice(0, 10).forEach(u => resourcesToFetch.push({ url: resolveUrl(u), type: 'css' }));
		jsScripts.slice(0, 10).forEach(u => resourcesToFetch.push({ url: resolveUrl(u), type: 'js' }));
		images.slice(0, 5).forEach(u => resourcesToFetch.push({ url: resolveUrl(u), type: 'image' }));
		fonts.slice(0, 3).forEach(u => resourcesToFetch.push({ url: resolveUrl(u), type: 'font' }));

		const fetchResource = async (r: { url: string; type: string }): Promise<ResourceInfo | null> => {
			try {
				const start = Date.now();
				const resp = await fetchWithTimeout(r.url, {
					headers: { 'Accept': '*/*', 'Accept-Encoding': 'gzip, deflate, br' },
				}, 8000);
				const buf = await resp.arrayBuffer();
				return {
					url: r.url,
					size: buf.byteLength,
					time: Date.now() - start,
					type: r.type,
					status: resp.status,
					compressed: !!(resp.headers.get('content-encoding')),
				};
			} catch { return null; }
		};

		const resourcePromises = resourcesToFetch.map(fetchResource);
		const resourceSettled = await Promise.allSettled(resourcePromises);
		for (const r of resourceSettled) {
			if (r.status === 'fulfilled' && r.value) resourceResults.push(r.value);
		}

		// ---- Phase 5: Analyze headers for performance indicators ----
		const cacheControl = headers['cache-control'] || null;
		const contentEncoding = headers['content-encoding'] || null;
		const server = headers['server'] || null;
		const xPoweredBy = headers['x-powered-by'] || null;
		const contentType = headers['content-type'] || null;
		const transferEncoding = headers['transfer-encoding'] || null;
		const keepAlive = headers['keep-alive'] || headers['connection'] || null;
		const vary = headers['vary'] || null;
		const etag = headers['etag'] || null;
		const lastModified = headers['last-modified'] || null;
		const http2 = mainResp.headers.get('alt-svc')?.includes('h3') || mainResp.headers.get('alt-svc')?.includes('h2') || false;

		// Detect preload/prefetch hints
		const preloadHints: string[] = [];
		const preloadRegex2 = /<link[^>]+rel=["'](preload|prefetch|preconnect|dns-prefetch|modulepreload)["'][^>]*>/gi;
		while ((m = preloadRegex2.exec(html)) !== null) preloadHints.push(m[0]);

		// Detect lazy loading
		const lazyImages = (html.match(/loading=["']lazy["']/gi) || []).length;
		const totalImages = images.length;

		// Detect async/defer scripts
		const asyncScripts = (html.match(/<script[^>]+async/gi) || []).length;
		const deferScripts = (html.match(/<script[^>]+defer/gi) || []).length;
		const totalExternalScripts = jsScripts.length;
		const renderBlockingScripts = totalExternalScripts - asyncScripts - deferScripts;

		// Detect critical CSS indicators
		const hasCriticalCss = html.includes('rel="preload"') && html.includes('as="style"');

		// Detect modern image formats
		const modernImages = images.filter(i => /\.(webp|avif)/i.test(i)).length;

		// ---- Phase 6: Calculate resource totals ----
		const totalCssSize = resourceResults.filter(r => r.type === 'css').reduce((s, r) => s + r.size, 0);
		const totalJsSize = resourceResults.filter(r => r.type === 'js').reduce((s, r) => s + r.size, 0);
		const totalImgSize = resourceResults.filter(r => r.type === 'image').reduce((s, r) => s + r.size, 0);
		const totalFontSize = resourceResults.filter(r => r.type === 'font').reduce((s, r) => s + r.size, 0);
		const totalResourceSize = htmlSize + totalCssSize + totalJsSize + totalImgSize + totalFontSize;

		const slowestResource = resourceResults.length > 0
			? resourceResults.reduce((a, b) => a.time > b.time ? a : b)
			: null;

		// ---- Phase 7: Compute performance score (0-100) ----
		let score = 100;
		const penalties: { rule: string; points: number; detail: string }[] = [];

		const penalize = (rule: string, points: number, detail: string) => {
			score -= points;
			penalties.push({ rule, points, detail });
		};

		// TTFB scoring (target < 200ms good, < 600ms ok, > 1000ms bad)
		if (ttfb > 2000) penalize('Slow TTFB', 25, `TTFB is ${ttfb}ms (target: <200ms)`);
		else if (ttfb > 1000) penalize('Slow TTFB', 15, `TTFB is ${ttfb}ms (target: <200ms)`);
		else if (ttfb > 600) penalize('Moderate TTFB', 8, `TTFB is ${ttfb}ms (target: <200ms)`);
		else if (ttfb > 200) penalize('TTFB could improve', 3, `TTFB is ${ttfb}ms (target: <200ms)`);

		// DNS time
		if (dnsTime > 200) penalize('Slow DNS', 5, `DNS resolution took ${dnsTime}ms`);

		// Page size
		if (htmlSize > 500000) penalize('Large HTML', 10, `HTML is ${(htmlSize / 1024).toFixed(0)}KB (target: <100KB)`);
		else if (htmlSize > 200000) penalize('Large HTML', 5, `HTML is ${(htmlSize / 1024).toFixed(0)}KB (target: <100KB)`);
		else if (htmlSize > 100000) penalize('HTML could be smaller', 2, `HTML is ${(htmlSize / 1024).toFixed(0)}KB`);

		// Total resource size
		if (totalResourceSize > 5000000) penalize('Very heavy page', 15, `Total ~${(totalResourceSize / 1024 / 1024).toFixed(1)}MB`);
		else if (totalResourceSize > 3000000) penalize('Heavy page', 10, `Total ~${(totalResourceSize / 1024 / 1024).toFixed(1)}MB`);
		else if (totalResourceSize > 1500000) penalize('Page weight', 5, `Total ~${(totalResourceSize / 1024 / 1024).toFixed(1)}MB`);

		// Compression
		if (!contentEncoding) penalize('No compression', 10, 'Response is not gzip/br compressed');

		const uncompressedResources = resourceResults.filter(r => !r.compressed && r.size > 10000);
		if (uncompressedResources.length > 3) penalize('Uncompressed resources', 5, `${uncompressedResources.length} resources >10KB not compressed`);

		// Caching
		if (!cacheControl) penalize('No cache headers', 5, 'Missing Cache-Control header');
		else if (cacheControl.includes('no-store') || cacheControl.includes('no-cache')) penalize('Aggressive no-cache', 3, 'Cache-Control disables caching');

		if (!etag && !lastModified) penalize('No validation headers', 3, 'Missing ETag and Last-Modified');

		// Render-blocking resources
		if (renderBlockingScripts > 5) penalize('Many render-blocking scripts', 10, `${renderBlockingScripts} scripts without async/defer`);
		else if (renderBlockingScripts > 2) penalize('Render-blocking scripts', 5, `${renderBlockingScripts} scripts without async/defer`);

		// CSS count
		if (cssLinks.length > 10) penalize('Too many CSS files', 5, `${cssLinks.length} external stylesheets`);
		else if (cssLinks.length > 5) penalize('Multiple CSS files', 2, `${cssLinks.length} external stylesheets`);

		// JS count
		if (jsScripts.length > 20) penalize('Too many JS files', 8, `${jsScripts.length} external scripts`);
		else if (jsScripts.length > 10) penalize('Many JS files', 4, `${jsScripts.length} external scripts`);

		// JS total size
		if (totalJsSize > 1000000) penalize('Very large JS bundle', 10, `Total JS ~${(totalJsSize / 1024).toFixed(0)}KB`);
		else if (totalJsSize > 500000) penalize('Large JS bundle', 5, `Total JS ~${(totalJsSize / 1024).toFixed(0)}KB`);

		// Image optimization
		if (totalImages > 0 && modernImages === 0) penalize('No modern image formats', 5, 'No WebP/AVIF images detected');
		if (totalImages > 5 && lazyImages === 0) penalize('No lazy loading', 5, `${totalImages} images without lazy loading`);

		// Inline resources
		if (inlineJsSize.chars > 50000) penalize('Large inline JS', 5, `${(inlineJsSize.chars / 1024).toFixed(0)}KB of inline JavaScript`);
		if (inlineCssSize.chars > 50000) penalize('Large inline CSS', 3, `${(inlineCssSize.chars / 1024).toFixed(0)}KB of inline CSS`);

		// Redirect
		if (redirected) penalize('Redirect detected', 2, `Redirected to ${finalUrl}`);

		score = Math.max(0, Math.min(100, score));
		const grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 50 ? 'D' : 'F';

		// ---- Phase 8: Generate advice ----
		const advice: { priority: 'critical' | 'important' | 'suggestion'; title: string; description: string }[] = [];

		if (ttfb > 600) advice.push({ priority: 'critical', title: 'Reduce Time to First Byte (TTFB)', description: `Your TTFB is ${ttfb}ms. Use a CDN, optimize server-side processing, enable HTTP/2, or upgrade your hosting. Target: <200ms.` });
		if (!contentEncoding) advice.push({ priority: 'critical', title: 'Enable compression (gzip/Brotli)', description: 'Your HTML response is not compressed. Enable gzip or Brotli compression on your server to reduce transfer size by 60-80%.' });
		if (renderBlockingScripts > 2) advice.push({ priority: 'critical', title: 'Eliminate render-blocking scripts', description: `${renderBlockingScripts} scripts block page rendering. Add "async" or "defer" attributes, or move scripts to the bottom of <body>.` });
		if (totalJsSize > 500000) advice.push({ priority: 'critical', title: 'Reduce JavaScript bundle size', description: `Total JS is ${(totalJsSize / 1024).toFixed(0)}KB. Use code splitting, tree shaking, and remove unused dependencies. Target: <300KB.` });
		if (totalResourceSize > 3000000) advice.push({ priority: 'critical', title: 'Reduce total page weight', description: `Page weighs ~${(totalResourceSize / 1024 / 1024).toFixed(1)}MB. Compress images, minify CSS/JS, and remove unused resources. Target: <1.5MB.` });
		if (cssLinks.length > 5) advice.push({ priority: 'important', title: 'Consolidate CSS files', description: `${cssLinks.length} CSS files increase HTTP overhead. Bundle them into fewer files or use critical CSS inlining.` });
		if (jsScripts.length > 10) advice.push({ priority: 'important', title: 'Consolidate JavaScript files', description: `${jsScripts.length} JS files. Bundle modules together or use HTTP/2 multiplexing.` });
		if (!cacheControl || cacheControl.includes('no-store')) advice.push({ priority: 'important', title: 'Implement browser caching', description: 'Set Cache-Control headers with appropriate max-age for static resources (CSS, JS, images, fonts).' });
		if (totalImages > 0 && modernImages === 0) advice.push({ priority: 'important', title: 'Use modern image formats', description: 'Convert images to WebP or AVIF format for 25-50% smaller file sizes while maintaining quality.' });
		if (totalImages > 5 && lazyImages === 0) advice.push({ priority: 'important', title: 'Enable lazy loading for images', description: `Add loading="lazy" to below-the-fold images. ${totalImages} images detected without lazy loading.` });
		if (uncompressedResources.length > 0) advice.push({ priority: 'important', title: 'Compress all resources', description: `${uncompressedResources.length} resources over 10KB are served without compression. Enable gzip/Brotli for all text-based assets.` });
		if (fonts.length > 4) advice.push({ priority: 'suggestion', title: 'Reduce font files', description: `${fonts.length} font files detected. Limit to 2-3 font families and use font-display: swap.` });
		if (inlineJsSize.chars > 30000) advice.push({ priority: 'suggestion', title: 'Externalize inline JavaScript', description: `${(inlineJsSize.chars / 1024).toFixed(0)}KB of inline JS. Extract to external files for better caching.` });
		if (!hasCriticalCss && cssLinks.length > 2) advice.push({ priority: 'suggestion', title: 'Implement Critical CSS', description: 'Inline critical above-the-fold CSS and defer the rest to speed up first paint.' });
		if (preloadHints.length === 0) advice.push({ priority: 'suggestion', title: 'Add resource hints', description: 'Use <link rel="preload">, <link rel="preconnect">, and <link rel="dns-prefetch"> for critical resources.' });
		if (dnsTime > 100) advice.push({ priority: 'suggestion', title: 'Optimize DNS resolution', description: `DNS took ${dnsTime}ms. Use a fast DNS provider (Cloudflare, Google DNS) or add dns-prefetch hints.` });
		if (!etag && !lastModified) advice.push({ priority: 'suggestion', title: 'Add validation headers', description: 'Add ETag or Last-Modified headers to allow conditional requests and save bandwidth.' });
		if (redirected) advice.push({ priority: 'suggestion', title: 'Avoid redirects', description: `A redirect added latency. Point directly to the final URL: ${finalUrl}` });

		// Sort advice by priority
		const priorityOrder = { critical: 0, important: 1, suggestion: 2 };
		advice.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

		// ---- Phase 9: Estimated Web Vitals (computed locally, no external API) ----
		// FCP ≈ TTFB + time for first render-blocking CSS
		const cssResources = resourceResults.filter(r => r.type === 'css');
		const firstCssTime = cssResources.length > 0 ? Math.min(...cssResources.map(r => r.time)) : 0;
		const estimatedFCP = ttfb + firstCssTime + (renderBlockingScripts > 0 ? 100 : 0);

		// LCP ≈ TTFB + largest resource load time (typically largest image or main content)
		const imageResources = resourceResults.filter(r => r.type === 'image');
		const largestImageTime = imageResources.length > 0 ? Math.max(...imageResources.map(r => r.time)) : 0;
		const largestCssTime = cssResources.length > 0 ? Math.max(...cssResources.map(r => r.time)) : 0;
		const estimatedLCP = ttfb + Math.max(largestImageTime, largestCssTime, firstCssTime + 200);

		// TBT ≈ estimated from JS size + render-blocking scripts
		const estimatedTBT = Math.round(
			(totalJsSize / 1024) * 0.5 + // ~0.5ms per KB of JS to parse/execute
			renderBlockingScripts * 50 + // ~50ms per render-blocking script
			(inlineJsSize.chars / 1024) * 0.3 // inline JS overhead
		);

		// CLS ≈ heuristic based on images without dimensions, fonts, dynamic content
		const imagesWithoutLazy = totalImages - lazyImages;
		const estimatedCLS = Math.min(1,
			(imagesWithoutLazy > 5 ? 0.15 : imagesWithoutLazy > 2 ? 0.08 : 0.02) +
			(fonts.length > 3 ? 0.05 : 0) +
			(inlineCssSize.count === 0 && cssLinks.length > 3 ? 0.05 : 0)
		);

		// Speed Index ≈ weighted combination of FCP and LCP
		const estimatedSI = Math.round(estimatedFCP * 0.4 + estimatedLCP * 0.6);

		// TTI ≈ LCP + TBT
		const estimatedTTI = estimatedLCP + estimatedTBT;

		// Score each vital (using Lighthouse thresholds)
		const scoreVital = (value: number, good: number, poor: number): number => {
			if (value <= good) return Math.min(1, 0.9 + 0.1 * (1 - value / good));
			if (value <= poor) return 0.5 + 0.4 * (1 - (value - good) / (poor - good));
			return Math.max(0, 0.5 * (1 - (value - poor) / poor));
		};
		const scoreCLS = (value: number): number => {
			if (value <= 0.1) return 0.9 + 0.1 * (1 - value / 0.1);
			if (value <= 0.25) return 0.5 + 0.4 * (1 - (value - 0.1) / 0.15);
			return Math.max(0, 0.5 * (1 - (value - 0.25) / 0.25));
		};

		const webVitals = {
			fcp: { numericValue: estimatedFCP, value: (estimatedFCP / 1000).toFixed(1) + ' s', score: scoreVital(estimatedFCP, 1800, 3000) },
			lcp: { numericValue: estimatedLCP, value: (estimatedLCP / 1000).toFixed(1) + ' s', score: scoreVital(estimatedLCP, 2500, 4000) },
			tbt: { numericValue: estimatedTBT, value: estimatedTBT + ' ms', score: scoreVital(estimatedTBT, 200, 600) },
			cls: { numericValue: estimatedCLS, value: estimatedCLS.toFixed(2), score: scoreCLS(estimatedCLS) },
			si: { numericValue: estimatedSI, value: (estimatedSI / 1000).toFixed(1) + ' s', score: scoreVital(estimatedSI, 3400, 5800) },
			tti: { numericValue: estimatedTTI, value: (estimatedTTI / 1000).toFixed(1) + ' s', score: scoreVital(estimatedTTI, 3800, 7300) },
		};

		// Compute Lighthouse-like performance score (weighted like Lighthouse)
		// Lighthouse weights: FCP 10%, SI 10%, LCP 25%, TBT 30%, CLS 25%
		const lighthousePerf = Math.round(
			webVitals.fcp.score * 10 +
			webVitals.si.score * 10 +
			webVitals.lcp.score * 25 +
			webVitals.tbt.score * 30 +
			webVitals.cls.score * 25
		);

		// Accessibility estimate (based on HTML analysis)
		const accessibilityChecks: { pass: boolean; label: string }[] = [];
		const hasLangAttr = /<html[^>]+lang=/i.test(html);
		accessibilityChecks.push({ pass: hasLangAttr, label: 'HTML lang attribute' });
		const hasViewport = /<meta[^>]+name=["']viewport["']/i.test(html);
		accessibilityChecks.push({ pass: hasViewport, label: 'Viewport meta tag' });
		const imgTags = html.match(/<img[^>]*>/gi) || [];
		const imgWithAlt = imgTags.filter((t: string) => /alt=["'][^"']*["']/i.test(t)).length;
		const altRatio = imgTags.length > 0 ? imgWithAlt / imgTags.length : 1;
		accessibilityChecks.push({ pass: altRatio >= 0.8, label: `Image alt attributes (${imgWithAlt}/${imgTags.length})` });
		const hasHeadings = /<h[1-6][^>]*>/i.test(html);
		accessibilityChecks.push({ pass: hasHeadings, label: 'Heading structure' });
		const hasSkipNav = /skip.*nav|skip.*content|skiplink/i.test(html);
		accessibilityChecks.push({ pass: hasSkipNav, label: 'Skip navigation link' });
		const ariaCount = (html.match(/aria-/gi) || []).length;
		accessibilityChecks.push({ pass: ariaCount > 3, label: `ARIA attributes (${ariaCount} found)` });
		const formLabels = (html.match(/<label/gi) || []).length;
		const formInputs = (html.match(/<input(?![^>]+type=["'](?:hidden|submit|button)["'])/gi) || []).length;
		accessibilityChecks.push({ pass: formInputs === 0 || formLabels >= formInputs * 0.7, label: `Form labels (${formLabels}/${formInputs})` });
		const accessibilityScore = Math.round((accessibilityChecks.filter(c => c.pass).length / accessibilityChecks.length) * 100);

		// Best Practices estimate
		const bpChecks: { pass: boolean; label: string }[] = [];
		bpChecks.push({ pass: parsedTarget.protocol === 'https:', label: 'HTTPS' });
		bpChecks.push({ pass: !xPoweredBy, label: 'No X-Powered-By header' });
		const hasDoctype = /^<!doctype html>/i.test(html.trim());
		bpChecks.push({ pass: hasDoctype, label: 'HTML doctype' });
		const hasCharset = /<meta[^>]+charset=/i.test(html);
		bpChecks.push({ pass: hasCharset, label: 'Character encoding' });
		bpChecks.push({ pass: !html.includes('http:') || html.includes('https:'), label: 'No mixed content' });
		const bestPracticesScore = Math.round((bpChecks.filter(c => c.pass).length / bpChecks.length) * 100);

		// SEO estimate
		const seoChecks: { pass: boolean; label: string }[] = [];
		const hasTitle = /<title[^>]*>[^<]+<\/title>/i.test(html);
		seoChecks.push({ pass: hasTitle, label: 'Title tag' });
		const hasMetaDesc = /<meta[^>]+name=["']description["'][^>]+content=["'][^"']+["']/i.test(html);
		seoChecks.push({ pass: hasMetaDesc, label: 'Meta description' });
		seoChecks.push({ pass: hasViewport, label: 'Viewport meta' });
		const hasCanonical = /<link[^>]+rel=["']canonical["']/i.test(html);
		seoChecks.push({ pass: hasCanonical, label: 'Canonical URL' });
		const hasOG = /<meta[^>]+property=["']og:/i.test(html);
		seoChecks.push({ pass: hasOG, label: 'Open Graph tags' });
		const hasStructuredData = /application\/ld\+json/i.test(html);
		seoChecks.push({ pass: hasStructuredData, label: 'Structured data (JSON-LD)' });
		seoChecks.push({ pass: hasHeadings, label: 'Heading hierarchy' });
		const hasRobots = /<meta[^>]+name=["']robots["']/i.test(html) || true; // default allow
		seoChecks.push({ pass: hasRobots, label: 'Robots meta' });
		const seoScore = Math.round((seoChecks.filter(c => c.pass).length / seoChecks.length) * 100);

		const lighthouse = {
			scores: {
				performance: lighthousePerf,
				accessibility: accessibilityScore,
				'best-practices': bestPracticesScore,
				seo: seoScore,
			},
			webVitals,
			accessibilityChecks,
			bestPracticesChecks: bpChecks,
			seoChecks,
		};

		// ---- Build response ----
		return new Response(
			JSON.stringify({
				url: targetUrl,
				finalUrl,
				hostname,
				statusCode,
				redirected,
				// Timings
				timing: {
					dns: dnsTime,
					ttfb,
					download: downloadTime,
					total: totalTime,
				},
				// Sizes
				sizes: {
					html: htmlSize,
					css: totalCssSize,
					js: totalJsSize,
					images: totalImgSize,
					fonts: totalFontSize,
					total: totalResourceSize,
				},
				// Resource counts
				counts: {
					cssFiles: cssLinks.length,
					jsFiles: jsScripts.length,
					images: totalImages,
					fonts: fonts.length,
					inlineCss: inlineCssSize,
					inlineJs: inlineJsSize,
				},
				// Performance indicators
				performance: {
					compressed: !!contentEncoding,
					compressionType: contentEncoding,
					cacheControl,
					etag: !!etag,
					lastModified: !!lastModified,
					http2,
					server,
					asyncScripts,
					deferScripts,
					renderBlockingScripts,
					lazyImages,
					modernImages,
					totalImages,
					hasCriticalCss,
					preloadHints: preloadHints.length,
				},
				// Individual resources
				resources: resourceResults.map(r => ({
					url: r.url.length > 120 ? r.url.substring(0, 117) + '...' : r.url,
					size: r.size,
					time: r.time,
					type: r.type,
					compressed: r.compressed,
				})),
				slowestResource: slowestResource ? {
					url: slowestResource.url.length > 120 ? slowestResource.url.substring(0, 117) + '...' : slowestResource.url,
					time: slowestResource.time,
					size: slowestResource.size,
					type: slowestResource.type,
				} : null,
				// Score & grade
				score,
				grade,
				penalties,
				// Advice
				advice,
				// Lighthouse-like metrics (computed locally)
				lighthouse,
				timestamp: new Date().toISOString(),
			}),
			{ headers: { 'content-type': 'application/json; charset=UTF-8' } },
		);
	} catch (error) {
		return new Response(
			JSON.stringify({ error: 'Speed test failed', message: error instanceof Error ? error.message : 'Unknown error' }),
			{ status: 500, headers: { 'content-type': 'application/json; charset=UTF-8' } },
		);
	}
}

// ================================================
// SEO AUDIT — Comprehensive SEO analysis
// ================================================
async function handleSEOAudit(request: Request): Promise<Response> {
	const urlObj = new URL(request.url);
	const targetUrl = urlObj.searchParams.get('url');

	if (!targetUrl) {
		return new Response(JSON.stringify({ error: 'Missing url parameter' }), {
			status: 400, headers: { 'content-type': 'application/json; charset=UTF-8' },
		});
	}

	const seoSsrf = quickValidateURL(targetUrl);
	if (!seoSsrf.valid) {
		return apiJsonResponse({ error: 'Invalid target URL', reason: seoSsrf.reason }, 400);
	}

	let parsedTarget: URL;
	try {
		parsedTarget = new URL(targetUrl);
	} catch {
		return new Response(JSON.stringify({ error: 'Invalid URL' }), {
			status: 400, headers: { 'content-type': 'application/json; charset=UTF-8' },
		});
	}

	const hostname = parsedTarget.hostname;
	const origin = parsedTarget.origin;

	try {
		// ---- Phase 1: Fetch main page ----
		let mainResp!: Response;
		let mainHtml = '';
		let mainTime = 0;
		let finalUrl = targetUrl;
		const seoFetchHeaders: Record<string, string> = {
			'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
			'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
			'Accept-Encoding': 'gzip, deflate, br',
			'Accept-Language': 'en-US,en;q=0.9,fr;q=0.8',
		};
		const mainStart = Date.now();
		// Use raw fetch with AbortController (same pattern as SpeedTest which works)
		{
			const controller = new AbortController();
			const timer = setTimeout(() => controller.abort(), 15000);
			try {
				mainResp = await fetch(targetUrl, {
					signal: controller.signal,
					headers: seoFetchHeaders,
					redirect: 'follow',
				});
				const ttfb = Date.now() - mainStart;
				mainHtml = await mainResp.text();
				mainTime = Date.now() - mainStart;
				finalUrl = mainResp.url || targetUrl;
			} catch (fetchErr) {
				clearTimeout(timer);
				const msg = fetchErr instanceof Error ? fetchErr.message : 'Unknown error';
				return new Response(
					JSON.stringify({ error: 'Cannot reach target site', message: `Failed to fetch ${hostname}: ${msg}` }),
					{ status: 502, headers: { 'content-type': 'application/json; charset=UTF-8' } },
				);
			}
			clearTimeout(timer);
		}

		// ---- Phase 2: Parallel fetches (robots.txt, sitemap.xml, multiple pages) ----
		const [robotsResult, sitemapResult] = await Promise.allSettled([
			fetchWithTimeout(`${origin}/robots.txt`, { headers: seoFetchHeaders }, 5000).then(async r => {
				if (!r.ok) return null;
				const txt = await r.text();
				return txt.length < 50000 ? txt : txt.substring(0, 50000);
			}).catch(() => null),
			fetchWithTimeout(`${origin}/sitemap.xml`, { headers: seoFetchHeaders }, 5000).then(async r => {
				if (!r.ok) return null;
				const txt = await r.text();
				return txt.length < 200000 ? txt : txt.substring(0, 200000);
			}).catch(() => null),
		]);

		const robotsTxt = robotsResult.status === 'fulfilled' ? robotsResult.value : null;
		const sitemapXml = sitemapResult.status === 'fulfilled' ? sitemapResult.value : null;

		// ---- Phase 3: Parse main page ----

		// Meta tags extraction
		const getMetaContent = (name: string): string | null => {
			const patterns = [
				new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']*)["']`, 'i'),
				new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+name=["']${name}["']`, 'i'),
			];
			for (const p of patterns) {
				const m = mainHtml.match(p);
				if (m) return m[1];
			}
			return null;
		};
		const getMetaProperty = (prop: string): string | null => {
			const patterns = [
				new RegExp(`<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']*)["']`, 'i'),
				new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${prop}["']`, 'i'),
			];
			for (const p of patterns) {
				const m = mainHtml.match(p);
				if (m) return m[1];
			}
			return null;
		};

		// Title
		const titleMatch = mainHtml.match(/<title[^>]*>([^<]*)<\/title>/i);
		const title = titleMatch ? titleMatch[1].trim() : null;

		// Meta description
		const metaDescription = getMetaContent('description');

		// Viewport
		const viewport = getMetaContent('viewport');

		// Canonical
		const canonicalMatch = mainHtml.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["']/i)
			|| mainHtml.match(/<link[^>]+href=["']([^"']*)["'][^>]+rel=["']canonical["']/i);
		const canonical = canonicalMatch ? canonicalMatch[1] : null;

		// Robots meta
		const robotsMeta = getMetaContent('robots');

		// Open Graph
		const ogTitle = getMetaProperty('og:title');
		const ogDescription = getMetaProperty('og:description');
		const ogImage = getMetaProperty('og:image');
		const ogUrl = getMetaProperty('og:url');
		const ogType = getMetaProperty('og:type');
		const ogSiteName = getMetaProperty('og:site_name');

		// Twitter Card
		const twitterCard = getMetaContent('twitter:card');
		const twitterTitle = getMetaContent('twitter:title');
		const twitterDescription = getMetaContent('twitter:description');
		const twitterImage = getMetaContent('twitter:image');

		// Charset
		const charsetMatch = mainHtml.match(/<meta[^>]+charset=["']?([^"'\s>]+)/i);
		const charset = charsetMatch ? charsetMatch[1].toUpperCase() : null;

		// Language
		const langMatch = mainHtml.match(/<html[^>]+lang=["']([^"']*)["']/i);
		const lang = langMatch ? langMatch[1] : null;

		// Hreflang tags
		const hreflangMatches = [...mainHtml.matchAll(/<link[^>]+hreflang=["']([^"']*)["'][^>]+href=["']([^"']*)["']/gi)];
		const hreflangs = hreflangMatches.map(m => ({ lang: m[1], url: m[2] }));
		// Also check reverse order
		const hreflangMatches2 = [...mainHtml.matchAll(/<link[^>]+href=["']([^"']*)["'][^>]+hreflang=["']([^"']*)["']/gi)];
		for (const m of hreflangMatches2) {
			if (!hreflangs.some(h => h.lang === m[2])) {
				hreflangs.push({ lang: m[2], url: m[1] });
			}
		}

		// Headings analysis
		const headings: { tag: string; text: string }[] = [];
		const headingRegex = /<(h[1-6])[^>]*>([\s\S]*?)<\/\1>/gi;
		let headingMatch;
		while ((headingMatch = headingRegex.exec(mainHtml)) !== null && headings.length < 100) {
			const text = headingMatch[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
			if (text) headings.push({ tag: headingMatch[1].toUpperCase(), text: text.substring(0, 200) });
		}

		// Images analysis
		const imgRegex = /<img[^>]*>/gi;
		const images: { src: string; alt: string | null; hasAlt: boolean; lazy: boolean; width: boolean; height: boolean }[] = [];
		let imgMatch;
		while ((imgMatch = imgRegex.exec(mainHtml)) !== null && images.length < 200) {
			const tag = imgMatch[0];
			const srcM = tag.match(/src=["']([^"']*)["']/i);
			const altM = tag.match(/alt=["']([^"']*)["']/i);
			const hasAlt = /alt=/i.test(tag);
			const lazy = /loading=["']lazy["']/i.test(tag);
			const hasWidth = /width=/i.test(tag);
			const hasHeight = /height=/i.test(tag);
			images.push({
				src: srcM ? srcM[1].substring(0, 200) : '',
				alt: altM ? altM[1] : null,
				hasAlt,
				lazy,
				width: hasWidth,
				height: hasHeight,
			});
		}

		// Internal and external links
		const linkRegex = /<a[^>]+href=["']([^"'#]*?)["'][^>]*>([\s\S]*?)<\/a>/gi;
		const internalLinks: { url: string; text: string; nofollow: boolean }[] = [];
		const externalLinks: { url: string; text: string; nofollow: boolean; hasTarget: boolean }[] = [];
		let linkMatch;
		while ((linkMatch = linkRegex.exec(mainHtml)) !== null && (internalLinks.length + externalLinks.length) < 500) {
			const href = linkMatch[1].trim();
			if (!href || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) continue;
			const text = linkMatch[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
			const tagStr = linkMatch[0];
			const nofollow = /rel=["'][^"']*nofollow[^"']*["']/i.test(tagStr);
			const hasTarget = /target=["']_blank["']/i.test(tagStr);

			try {
				const resolved = new URL(href, finalUrl);
				if (resolved.hostname === hostname || resolved.hostname === `www.${hostname}` || hostname === `www.${resolved.hostname}`) {
					if (internalLinks.length < 200) {
						internalLinks.push({ url: resolved.pathname + resolved.search, text: text.substring(0, 100), nofollow });
					}
				} else {
					if (externalLinks.length < 100) {
						externalLinks.push({ url: resolved.href.substring(0, 200), text: text.substring(0, 100), nofollow, hasTarget });
					}
				}
			} catch { /* invalid URL */ }
		}

		// Structured data (JSON-LD)
		const jsonLdRegex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
		const structuredData: any[] = [];
		let jsonLdMatch;
		while ((jsonLdMatch = jsonLdRegex.exec(mainHtml)) !== null && structuredData.length < 20) {
			try {
				const parsed = JSON.parse(jsonLdMatch[1].trim());
				structuredData.push({
					type: parsed['@type'] || (Array.isArray(parsed['@graph']) ? 'Graph' : 'Unknown'),
					summary: JSON.stringify(parsed).substring(0, 300),
				});
			} catch {
				structuredData.push({ type: 'Invalid JSON-LD', summary: jsonLdMatch[1].substring(0, 200) });
			}
		}

		// Check for social media links
		const socialPatterns: { name: string; pattern: RegExp }[] = [
			{ name: 'Facebook', pattern: /facebook\.com\/[a-zA-Z0-9._-]+/i },
			{ name: 'Twitter/X', pattern: /(?:twitter|x)\.com\/[a-zA-Z0-9._-]+/i },
			{ name: 'Instagram', pattern: /instagram\.com\/[a-zA-Z0-9._-]+/i },
			{ name: 'LinkedIn', pattern: /linkedin\.com\/(?:company|in)\/[a-zA-Z0-9._-]+/i },
			{ name: 'YouTube', pattern: /youtube\.com\/(?:channel|c|@|user)\/[a-zA-Z0-9._-]+/i },
			{ name: 'GitHub', pattern: /github\.com\/[a-zA-Z0-9._-]+/i },
			{ name: 'TikTok', pattern: /tiktok\.com\/@[a-zA-Z0-9._-]+/i },
			{ name: 'Pinterest', pattern: /pinterest\.com\/[a-zA-Z0-9._-]+/i },
		];
		const socialLinks: { name: string; url: string }[] = [];
		for (const sp of socialPatterns) {
			const m = mainHtml.match(sp.pattern);
			if (m) socialLinks.push({ name: sp.name, url: m[0] });
		}

		// Content analysis
		const bodyMatch = mainHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i);
		const bodyContent = bodyMatch ? bodyMatch[1].replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() : '';
		const wordCount = bodyContent.split(/\s+/).filter(w => w.length > 0).length;
		const textLength = bodyContent.length;

		// Check for noindex, nofollow directives
		const hasNoIndex = robotsMeta ? /noindex/i.test(robotsMeta) : false;
		const hasNoFollow = robotsMeta ? /nofollow/i.test(robotsMeta) : false;

		// Check for HTTP headers
		const xRobotsTag = mainResp.headers.get('x-robots-tag');
		const contentType = mainResp.headers.get('content-type');

		// Favicon
		const faviconMatch = mainHtml.match(/<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"']*)["']/i)
			|| mainHtml.match(/<link[^>]+href=["']([^"']*)["'][^>]+rel=["'](?:shortcut )?icon["']/i);
		const favicon = faviconMatch ? faviconMatch[1] : null;

		// CSS/JS inline vs external
		const inlineStyles = (mainHtml.match(/<style[\s\S]*?<\/style>/gi) || []).length;
		const inlineScripts = (mainHtml.match(/<script(?![^>]*src=)[^>]*>[\s\S]*?<\/script>/gi) || []).length;
		const externalCSS = [...mainHtml.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]*>/gi)].length;
		const externalJS = [...mainHtml.matchAll(/<script[^>]+src=["'][^"']+["'][^>]*>/gi)].length;

		// Check for AMP
		const isAMP = /<html[^>]*\s(?:amp|⚡)/i.test(mainHtml);

		// Check for PWA manifest
		const manifestMatch = mainHtml.match(/<link[^>]+rel=["']manifest["'][^>]+href=["']([^"']*)["']/i);
		const hasManifest = !!manifestMatch;

		// Doctype
		const hasDoctype = /^<!DOCTYPE\s+html>/i.test(mainHtml.trim());

		// Check if HTTPS
		const isHTTPS = parsedTarget.protocol === 'https:';

		// ---- Additional SEO data ----
		const urlPath = parsedTarget.pathname;
		const urlAnalysis = {
			length: finalUrl.length,
			pathLength: urlPath.length,
			hasTrailingSlash: urlPath.endsWith('/') && urlPath !== '/',
			hasUnderscore: urlPath.includes('_'),
			hasUppercase: /[A-Z]/.test(urlPath),
			hasSpecialChars: /[^a-zA-Z0-9\-_\/.]/.test(urlPath.replace(/^\//, '')),
			depth: urlPath.split('/').filter(s => s).length,
			hasExtension: /\.[a-z]{2,5}$/i.test(urlPath),
			isClean: !/[?&=]/.test(urlPath) && urlPath.length < 100 && !/[A-Z_]/.test(urlPath),
		};

		// HTTP response headers for SEO
		const seoHeaders: Record<string, string | null> = {
			'content-type': mainResp.headers.get('content-type'),
			'content-encoding': mainResp.headers.get('content-encoding'),
			'cache-control': mainResp.headers.get('cache-control'),
			'x-robots-tag': mainResp.headers.get('x-robots-tag'),
			'x-frame-options': mainResp.headers.get('x-frame-options'),
			'content-security-policy': mainResp.headers.get('content-security-policy') ? 'Present' : null,
			'strict-transport-security': mainResp.headers.get('strict-transport-security'),
			'server': mainResp.headers.get('server'),
			'vary': mainResp.headers.get('vary'),
			'x-powered-by': mainResp.headers.get('x-powered-by'),
			'link': mainResp.headers.get('link'),
		};

		// Page size (use string length as approximation; safe for Workers memory)
		const htmlSize = mainHtml.length;

		// Text-to-HTML ratio
		const textToHtmlRatio = htmlSize > 0 ? Math.round((textLength / htmlSize) * 100) : 0;

		// Redirect detection
		const wasRedirected = mainResp.redirected || (mainResp.url && mainResp.url !== targetUrl);
		const redirectTarget = wasRedirected ? mainResp.url : null;

		// Mixed content detection (http:// resources on https page)
		const mixedContent: string[] = [];
		if (isHTTPS) {
			const httpResources = [...mainHtml.matchAll(/(?:src|href|action)=["'](http:\/\/[^"']+)["']/gi)];
			for (const m of httpResources.slice(0, 20)) {
				mixedContent.push(m[1].substring(0, 150));
			}
		}

		// Meta tags: author, generator, theme-color
		const metaAuthor = getMetaContent('author');
		const metaGenerator = getMetaContent('generator');
		const themeColor = getMetaContent('theme-color');

		// Apple-touch-icon
		const appleTouchIcon = mainHtml.match(/<link[^>]+rel=["']apple-touch-icon["'][^>]+href=["']([^"']*)["']/i);

		// Preconnect / Prefetch / Preload hints
		const preconnects = [...mainHtml.matchAll(/<link[^>]+rel=["']preconnect["'][^>]+href=["']([^"']*)["']/gi)].map(m => m[1]);
		const prefetches = [...mainHtml.matchAll(/<link[^>]+rel=["'](?:dns-prefetch|prefetch)["'][^>]+href=["']([^"']*)["']/gi)].map(m => m[1]);
		const preloads = [...mainHtml.matchAll(/<link[^>]+rel=["']preload["'][^>]+href=["']([^"']*)["']/gi)].map(m => m[1]);

		// Keyword extraction (top words from body text)
		const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'it', 'this', 'that', 'are', 'was', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'can', 'could', 'would', 'should', 'not', 'from', 'they', 'we', 'you', 'he', 'she', 'its', 'their', 'our', 'your', 'my', 'all', 'each', 'every', 'both', 'more', 'other', 'some', 'such', 'no', 'nor', 'so', 'than', 'too', 'very', 'just', 'about', 'up', 'out', 'if', 'what', 'which', 'who', 'how', 'when', 'where', 'why', 'been', 'being', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'same', 'then', 'here', 'there', 'also', 'de', 'la', 'le', 'les', 'un', 'une', 'des', 'du', 'et', 'en', 'est', 'que', 'qui', 'dans', 'pour', 'pas', 'sur', 'plus', 'par', 'au', 'ce', 'il', 'se', 'ne', 'son', 'avec', 'nous', 'vous', 'mais', 'ou', 'si', 'comme', 'ses', 'sa', 'aux', 'ces', 'mon', 'ma', 'mes', 'nos', 'vos', 'leur', 'leurs']);
		const wordFreq: Record<string, number> = {};
		const words = bodyContent.toLowerCase().split(/[\s,.!?;:()\[\]{}"']+/).filter(w => w.length >= 3 && !stopWords.has(w) && !/^\d+$/.test(w));
		for (const w of words) {
			wordFreq[w] = (wordFreq[w] || 0) + 1;
		}
		const topKeywords = Object.entries(wordFreq).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([word, count]) => ({
			word, count, density: Math.round((count / Math.max(words.length, 1)) * 10000) / 100,
		}));

		// Readability estimation (avg sentence length + avg word length)
		const sentences = bodyContent.split(/[.!?]+/).filter(s => s.trim().length > 10);
		const avgSentenceLength = sentences.length > 0 ? Math.round(wordCount / sentences.length) : 0;
		const avgWordLength = words.length > 0 ? Math.round(words.reduce((sum, w) => sum + w.length, 0) / words.length * 10) / 10 : 0;
		// Simple readability index (Automated Readability Index approximation)
		const readabilityScore = sentences.length > 0 ? Math.round(4.71 * avgWordLength + 0.5 * avgSentenceLength - 21.43) : 0;
		const readability = {
			avgSentenceLength,
			avgWordLength,
			sentenceCount: sentences.length,
			readabilityIndex: Math.max(0, Math.min(20, readabilityScore)),
			level: readabilityScore <= 6 ? 'Easy' : readabilityScore <= 10 ? 'Medium' : readabilityScore <= 14 ? 'Hard' : 'Very Hard',
		};

		// Nofollow link ratio
		const nofollowInternalCount = internalLinks.filter(l => l.nofollow).length;
		const nofollowExternalCount = externalLinks.filter(l => l.nofollow).length;

		// Empty links (no text)
		const emptyLinks = internalLinks.filter(l => !l.text.trim()).length + externalLinks.filter(l => !l.text.trim()).length;

		// Iframes
		const iframes = [...mainHtml.matchAll(/<iframe[^>]+src=["']([^"']*)["']/gi)].map(m => m[1].substring(0, 150));

		// Forms without action
		const formsTotal = (mainHtml.match(/<form/gi) || []).length;
		const formsNoAction = (mainHtml.match(/<form(?![^>]*action=)/gi) || []).length;

		// Deprecated HTML tags
		const deprecatedTags = ['font', 'center', 'strike', 'marquee', 'blink', 'big', 'bgsound', 'frame', 'frameset'];
		const foundDeprecated: string[] = [];
		for (const tag of deprecatedTags) {
			if (new RegExp(`<${tag}[\\s>]`, 'i').test(mainHtml)) foundDeprecated.push(tag);
		}

		// Accessibility basics
		const accessibilityChecks = {
			hasLang: !!lang,
			hasSkipNav: /skip[\s-]*(?:to[\s-]*)?(?:content|nav|main)/i.test(mainHtml),
			hasAriaLandmarks: /role=["'](?:banner|navigation|main|contentinfo)["']/i.test(mainHtml) || /<(?:header|nav|main|footer)[^>]*>/i.test(mainHtml),
			formsHaveLabels: !(/<input(?![^>]*type=["'](?:hidden|submit|button)["'])[^>]*>/i.test(mainHtml) && !/<label/i.test(mainHtml)),
			tabindex: (mainHtml.match(/tabindex=/gi) || []).length,
			ariaAttributes: (mainHtml.match(/aria-/gi) || []).length,
			roleAttributes: (mainHtml.match(/role=/gi) || []).length,
		};

		// Resource hints summary
		const resourceHints = {
			preconnect: preconnects.slice(0, 10),
			prefetch: prefetches.slice(0, 10),
			preload: preloads.slice(0, 10),
		};

		// ---- Phase 4: Robots.txt analysis ----
		const robotsAnalysis: { exists: boolean; sitemapUrls: string[]; disallowedPaths: string[]; allowedPaths: string[]; userAgents: string[]; crawlDelay: number | null } = {
			exists: !!robotsTxt,
			sitemapUrls: [],
			disallowedPaths: [],
			allowedPaths: [],
			userAgents: [],
			crawlDelay: null,
		};
		if (robotsTxt) {
			const lines = robotsTxt.split('\n');
			for (const line of lines) {
				const trimmed = line.trim();
				if (trimmed.toLowerCase().startsWith('sitemap:')) {
					robotsAnalysis.sitemapUrls.push(trimmed.substring(8).trim());
				} else if (trimmed.toLowerCase().startsWith('disallow:')) {
					const path = trimmed.substring(9).trim();
					if (path && robotsAnalysis.disallowedPaths.length < 50) robotsAnalysis.disallowedPaths.push(path);
				} else if (trimmed.toLowerCase().startsWith('allow:')) {
					const path = trimmed.substring(6).trim();
					if (path && robotsAnalysis.allowedPaths.length < 50) robotsAnalysis.allowedPaths.push(path);
				} else if (trimmed.toLowerCase().startsWith('user-agent:')) {
					const ua = trimmed.substring(11).trim();
					if (ua && !robotsAnalysis.userAgents.includes(ua)) robotsAnalysis.userAgents.push(ua);
				} else if (trimmed.toLowerCase().startsWith('crawl-delay:')) {
					robotsAnalysis.crawlDelay = parseFloat(trimmed.substring(12).trim()) || null;
				}
			}
		}

		// ---- Phase 5: Sitemap analysis ----
		const sitemapAnalysis: { exists: boolean; format: string | null; urls: number; sampleUrls: string[]; lastmod: string | null; nestedSitemaps: string[] } = {
			exists: false,
			format: null,
			urls: 0,
			sampleUrls: [],
			lastmod: null,
			nestedSitemaps: [],
		};

		let sitemapContent = sitemapXml;
		// Try sitemap from robots.txt if direct fetch failed
		if (!sitemapContent && robotsAnalysis.sitemapUrls.length > 0) {
			try {
				const smResp = await fetchWithTimeout(robotsAnalysis.sitemapUrls[0], {}, 5000);
				if (smResp.ok) sitemapContent = await smResp.text();
			} catch { /* ignore */ }
		}
		// Also try /sitemap_index.xml
		if (!sitemapContent) {
			try {
				const smResp = await fetchWithTimeout(`${origin}/sitemap_index.xml`, {}, 5000);
				if (smResp.ok) {
					const txt = await smResp.text();
					if (txt.includes('<sitemapindex') || txt.includes('<urlset')) sitemapContent = txt;
				}
			} catch { /* ignore */ }
		}

		if (sitemapContent) {
			sitemapAnalysis.exists = true;
			if (sitemapContent.includes('<sitemapindex')) {
				sitemapAnalysis.format = 'Sitemap Index';
				const nestedUrls = [...sitemapContent.matchAll(/<loc>\s*(.*?)\s*<\/loc>/gi)];
				sitemapAnalysis.nestedSitemaps = nestedUrls.slice(0, 20).map(m => m[1]);
				sitemapAnalysis.urls = nestedUrls.length;
				// Fetch first nested sitemap to count URLs
				if (sitemapAnalysis.nestedSitemaps.length > 0) {
					try {
						const nestedResp = await fetchWithTimeout(sitemapAnalysis.nestedSitemaps[0], {}, 5000);
						if (nestedResp.ok) {
							const nestedTxt = await nestedResp.text();
							const nestedLocs = [...nestedTxt.matchAll(/<loc>\s*(.*?)\s*<\/loc>/gi)];
							sitemapAnalysis.sampleUrls = nestedLocs.slice(0, 10).map(m => m[1]);
							sitemapAnalysis.urls = nestedLocs.length;
							const lastmodM = nestedTxt.match(/<lastmod>\s*(.*?)\s*<\/lastmod>/i);
							if (lastmodM) sitemapAnalysis.lastmod = lastmodM[1];
						}
					} catch { /* ignore */ }
				}
			} else if (sitemapContent.includes('<urlset')) {
				sitemapAnalysis.format = 'URL Set';
				const locs = [...sitemapContent.matchAll(/<loc>\s*(.*?)\s*<\/loc>/gi)];
				sitemapAnalysis.urls = locs.length;
				sitemapAnalysis.sampleUrls = locs.slice(0, 10).map(m => m[1]);
				const lastmodM = sitemapContent.match(/<lastmod>\s*(.*?)\s*<\/lastmod>/i);
				if (lastmodM) sitemapAnalysis.lastmod = lastmodM[1];
			} else {
				sitemapAnalysis.format = 'Unknown/Text';
				const lines = sitemapContent.split('\n').filter(l => l.trim().startsWith('http'));
				sitemapAnalysis.urls = lines.length;
				sitemapAnalysis.sampleUrls = lines.slice(0, 10);
			}
		}

		// ---- Phase 6: Crawl discovered internal pages (max 5) ----
		const uniqueInternalPaths = [...new Set(internalLinks.map(l => l.url))].filter(u => u !== '/' && u !== parsedTarget.pathname);
		const pagesToCrawl = uniqueInternalPaths.slice(0, 5);
		const crawledPages: {
			url: string;
			statusCode: number;
			title: string | null;
			metaDescription: string | null;
			h1: string | null;
			wordCount: number;
			canonical: string | null;
			issues: string[];
		}[] = [];

		const crawlPromises = pagesToCrawl.map(async (path) => {
			try {
				const pageUrl = `${origin}${path}`;
				const resp = await fetchWithTimeout(pageUrl, {
					headers: seoFetchHeaders,
					redirect: 'follow',
				}, 5000);
				const html = await resp.text();
				const pTitle = html.match(/<title[^>]*>([^<]*)<\/title>/i);
				const pDesc = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)
					|| html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i);
				const pH1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
				const pCanonical = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["']/i);
				const pBody = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
				const pText = pBody ? pBody[1].replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() : '';
				const pWordCount = pText.split(/\s+/).filter(w => w.length > 0).length;

				const issues: string[] = [];
				const t = pTitle ? pTitle[1].trim() : null;
				if (!t) issues.push('Missing title');
				else if (t.length < 10) issues.push('Title too short');
				else if (t.length > 60) issues.push('Title too long');
				const d = pDesc ? pDesc[1] : null;
				if (!d) issues.push('Missing meta description');
				else if (d.length < 50) issues.push('Meta description too short');
				else if (d.length > 160) issues.push('Meta description too long');
				const h = pH1 ? pH1[1].replace(/<[^>]+>/g, '').trim() : null;
				if (!h) issues.push('Missing H1');
				if (pWordCount < 100) issues.push('Thin content');
				if (!pCanonical) issues.push('Missing canonical');

				return {
					url: path,
					statusCode: resp.status,
					title: t,
					metaDescription: d ? d.substring(0, 160) : null,
					h1: h ? h.substring(0, 150) : null,
					wordCount: pWordCount,
					canonical: pCanonical ? pCanonical[1] : null,
					issues,
				};
			} catch {
				return { url: path, statusCode: 0, title: null, metaDescription: null, h1: null, wordCount: 0, canonical: null, issues: ['Failed to fetch'] };
			}
		});
		const crawlResults = await Promise.allSettled(crawlPromises);
		for (const r of crawlResults) {
			if (r.status === 'fulfilled') crawledPages.push(r.value);
		}

		// ---- Phase 7: Scoring ----
		const checks: { category: string; label: string; pass: boolean; detail: string; weight: number }[] = [];

		// Title
		if (title) {
			checks.push({ category: 'Meta Tags', label: 'Title tag present', pass: true, detail: `"${title.substring(0, 60)}"`, weight: 5 });
			if (title.length >= 10 && title.length <= 60) {
				checks.push({ category: 'Meta Tags', label: 'Title length optimal (10-60 chars)', pass: true, detail: `${title.length} characters`, weight: 3 });
			} else {
				checks.push({ category: 'Meta Tags', label: 'Title length optimal (10-60 chars)', pass: false, detail: `${title.length} characters (${title.length < 10 ? 'too short' : 'too long'})`, weight: 3 });
			}
		} else {
			checks.push({ category: 'Meta Tags', label: 'Title tag present', pass: false, detail: 'Missing <title>', weight: 5 });
		}

		// Description
		if (metaDescription) {
			checks.push({ category: 'Meta Tags', label: 'Meta description present', pass: true, detail: `${metaDescription.length} characters`, weight: 4 });
			if (metaDescription.length >= 50 && metaDescription.length <= 160) {
				checks.push({ category: 'Meta Tags', label: 'Meta description length optimal (50-160 chars)', pass: true, detail: `${metaDescription.length} characters`, weight: 2 });
			} else {
				checks.push({ category: 'Meta Tags', label: 'Meta description length optimal (50-160 chars)', pass: false, detail: `${metaDescription.length} characters (${metaDescription.length < 50 ? 'too short' : 'too long'})`, weight: 2 });
			}
		} else {
			checks.push({ category: 'Meta Tags', label: 'Meta description present', pass: false, detail: 'Missing meta description', weight: 4 });
		}

		// Viewport
		checks.push({ category: 'Meta Tags', label: 'Viewport meta tag', pass: !!viewport, detail: viewport || 'Missing', weight: 3 });

		// Canonical
		checks.push({ category: 'Meta Tags', label: 'Canonical URL defined', pass: !!canonical, detail: canonical || 'Missing canonical tag', weight: 3 });

		// Language
		checks.push({ category: 'Meta Tags', label: 'HTML lang attribute', pass: !!lang, detail: lang || 'Missing lang attribute', weight: 2 });

		// Charset
		checks.push({ category: 'Meta Tags', label: 'Charset declaration', pass: !!charset, detail: charset || 'Missing charset', weight: 2 });

		// Doctype
		checks.push({ category: 'Technical', label: 'HTML doctype declared', pass: hasDoctype, detail: hasDoctype ? '<!DOCTYPE html>' : 'Missing doctype', weight: 1 });

		// HTTPS
		checks.push({ category: 'Technical', label: 'HTTPS enabled', pass: isHTTPS, detail: isHTTPS ? 'Secure connection' : 'HTTP only — not secure', weight: 4 });

		// Favicon
		checks.push({ category: 'Technical', label: 'Favicon defined', pass: !!favicon, detail: favicon ? favicon.substring(0, 100) : 'Missing favicon', weight: 1 });

		// Robots meta
		checks.push({ category: 'Indexability', label: 'Page is indexable', pass: !hasNoIndex, detail: hasNoIndex ? 'noindex set' : (robotsMeta || 'No robots restriction'), weight: 4 });
		checks.push({ category: 'Indexability', label: 'Page is followable', pass: !hasNoFollow, detail: hasNoFollow ? 'nofollow set' : 'Links are followed', weight: 2 });

		// Robots.txt
		checks.push({ category: 'Indexability', label: 'robots.txt exists', pass: robotsAnalysis.exists, detail: robotsAnalysis.exists ? `${robotsAnalysis.disallowedPaths.length} disallow rules` : 'Not found', weight: 2 });

		// Sitemap
		checks.push({ category: 'Indexability', label: 'Sitemap found', pass: sitemapAnalysis.exists, detail: sitemapAnalysis.exists ? `${sitemapAnalysis.urls} URLs (${sitemapAnalysis.format})` : 'No sitemap found', weight: 3 });

		// H1
		const h1Tags = headings.filter(h => h.tag === 'H1');
		if (h1Tags.length === 1) {
			checks.push({ category: 'Content', label: 'Single H1 tag', pass: true, detail: `"${h1Tags[0].text.substring(0, 60)}"`, weight: 3 });
		} else if (h1Tags.length === 0) {
			checks.push({ category: 'Content', label: 'Single H1 tag', pass: false, detail: 'No H1 tag found', weight: 3 });
		} else {
			checks.push({ category: 'Content', label: 'Single H1 tag', pass: false, detail: `${h1Tags.length} H1 tags (should be 1)`, weight: 3 });
		}

		// Heading hierarchy
		const headingTags = headings.map(h => parseInt(h.tag[1]));
		let hasSkip = false;
		for (let i = 1; i < headingTags.length; i++) {
			if (headingTags[i] > headingTags[i - 1] + 1) { hasSkip = true; break; }
		}
		checks.push({ category: 'Content', label: 'Heading hierarchy valid', pass: !hasSkip, detail: hasSkip ? 'Heading level skipped (e.g. H2→H4)' : 'Sequential heading levels', weight: 2 });

		// Content length
		if (wordCount >= 300) {
			checks.push({ category: 'Content', label: 'Sufficient content length', pass: true, detail: `${wordCount} words`, weight: 3 });
		} else {
			checks.push({ category: 'Content', label: 'Sufficient content length', pass: false, detail: `${wordCount} words (recommended: 300+)`, weight: 3 });
		}

		// Image alt tags
		const imgsWithoutAlt = images.filter(img => !img.hasAlt);
		const altPct = images.length > 0 ? Math.round(((images.length - imgsWithoutAlt.length) / images.length) * 100) : 100;
		checks.push({ category: 'Content', label: 'Images have alt attributes', pass: imgsWithoutAlt.length === 0, detail: `${altPct}% of ${images.length} images have alt`, weight: 3 });

		// Image dimensions
		const imgsWithoutDim = images.filter(img => !img.width || !img.height);
		checks.push({ category: 'Performance', label: 'Images have width/height', pass: imgsWithoutDim.length === 0 || images.length === 0, detail: `${images.length - imgsWithoutDim.length}/${images.length} images have explicit dimensions`, weight: 2 });

		// Lazy loading
		const lazyImgs = images.filter(img => img.lazy);
		checks.push({ category: 'Performance', label: 'Lazy loading on images', pass: lazyImgs.length > 0 || images.length <= 3, detail: `${lazyImgs.length}/${images.length} images use lazy loading`, weight: 2 });

		// Open Graph
		const hasOG = !!(ogTitle && ogDescription && ogImage);
		checks.push({ category: 'Social', label: 'Open Graph tags complete', pass: hasOG, detail: hasOG ? 'og:title, og:description, og:image present' : 'Missing OG tags', weight: 3 });

		// Twitter Card
		const hasTwitter = !!(twitterCard && twitterTitle);
		checks.push({ category: 'Social', label: 'Twitter Card tags', pass: hasTwitter, detail: hasTwitter ? `Card type: ${twitterCard}` : 'Missing Twitter Card tags', weight: 2 });

		// Structured Data
		checks.push({ category: 'Social', label: 'Structured Data (JSON-LD)', pass: structuredData.length > 0, detail: structuredData.length > 0 ? `${structuredData.length} schema(s): ${structuredData.map(s => s.type).join(', ')}` : 'No structured data found', weight: 3 });

		// Hreflang
		if (hreflangs.length > 0) {
			checks.push({ category: 'International', label: 'Hreflang tags present', pass: true, detail: `${hreflangs.length} language variants`, weight: 2 });
		}

		// Internal links
		checks.push({ category: 'Links', label: 'Internal links present', pass: internalLinks.length >= 3, detail: `${internalLinks.length} internal links found`, weight: 2 });

		// External links
		checks.push({ category: 'Links', label: 'External links present', pass: externalLinks.length > 0, detail: `${externalLinks.length} external links`, weight: 1 });

		// PWA
		checks.push({ category: 'Technical', label: 'Web App Manifest', pass: hasManifest, detail: hasManifest ? 'manifest.json linked' : 'No PWA manifest', weight: 1 });

		// Social links
		checks.push({ category: 'Social', label: 'Social media links', pass: socialLinks.length >= 2, detail: `${socialLinks.length} social profile(s) found`, weight: 1 });

		// URL quality
		checks.push({ category: 'URL', label: 'URL length under 100 chars', pass: finalUrl.length <= 100, detail: `${finalUrl.length} characters`, weight: 2 });
		checks.push({ category: 'URL', label: 'No uppercase in URL path', pass: !urlAnalysis.hasUppercase, detail: urlAnalysis.hasUppercase ? 'Contains uppercase letters' : 'All lowercase', weight: 1 });
		checks.push({ category: 'URL', label: 'No underscores in URL', pass: !urlAnalysis.hasUnderscore, detail: urlAnalysis.hasUnderscore ? 'Underscores found (use hyphens)' : 'Clean URL', weight: 1 });
		checks.push({ category: 'URL', label: 'No special characters', pass: !urlAnalysis.hasSpecialChars, detail: urlAnalysis.hasSpecialChars ? 'Special characters detected' : 'Clean path', weight: 1 });

		// Page size
		checks.push({ category: 'Performance', label: 'HTML size under 100 KB', pass: htmlSize < 102400, detail: `${(htmlSize / 1024).toFixed(1)} KB`, weight: 2 });

		// Text-to-HTML ratio
		checks.push({ category: 'Content', label: 'Text-to-HTML ratio > 10%', pass: textToHtmlRatio >= 10, detail: `${textToHtmlRatio}% text vs HTML`, weight: 2 });

		// Mixed content
		checks.push({ category: 'Technical', label: 'No mixed content', pass: mixedContent.length === 0, detail: mixedContent.length > 0 ? `${mixedContent.length} HTTP resources on HTTPS page` : 'Clean', weight: 3 });

		// Deprecated tags
		checks.push({ category: 'Technical', label: 'No deprecated HTML tags', pass: foundDeprecated.length === 0, detail: foundDeprecated.length > 0 ? `Found: ${foundDeprecated.join(', ')}` : 'Modern HTML', weight: 1 });

		// Inline styles/scripts ratio
		const tooManyInline = inlineStyles > 5 || inlineScripts > 10;
		checks.push({ category: 'Performance', label: 'Minimal inline code', pass: !tooManyInline, detail: `${inlineStyles} inline styles, ${inlineScripts} inline scripts`, weight: 1 });

		// Empty links
		checks.push({ category: 'Links', label: 'No empty anchor text', pass: emptyLinks === 0, detail: emptyLinks > 0 ? `${emptyLinks} links with no text` : 'All links have text', weight: 2 });

		// Resource hints
		checks.push({ category: 'Performance', label: 'Resource hints used', pass: preconnects.length > 0 || preloads.length > 0, detail: `${preconnects.length} preconnect, ${preloads.length} preload, ${prefetches.length} prefetch`, weight: 1 });

		// Accessibility
		checks.push({ category: 'Accessibility', label: 'Skip navigation link', pass: accessibilityChecks.hasSkipNav, detail: accessibilityChecks.hasSkipNav ? 'Present' : 'Missing skip-to-content link', weight: 2 });
		checks.push({ category: 'Accessibility', label: 'ARIA landmarks', pass: accessibilityChecks.hasAriaLandmarks, detail: accessibilityChecks.hasAriaLandmarks ? 'Semantic HTML5 or ARIA roles present' : 'Missing landmarks', weight: 2 });
		checks.push({ category: 'Accessibility', label: 'Form labels present', pass: accessibilityChecks.formsHaveLabels, detail: accessibilityChecks.formsHaveLabels ? 'Forms have labels' : 'Inputs missing labels', weight: 2 });

		// Calculate score
		const totalWeight = checks.reduce((sum, c) => sum + c.weight, 0);
		const earnedWeight = checks.filter(c => c.pass).reduce((sum, c) => sum + c.weight, 0);
		const score = Math.round((earnedWeight / totalWeight) * 100);
		const grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 50 ? 'D' : 'F';

		// Group checks by category
		const checksByCategory: Record<string, typeof checks> = {};
		for (const c of checks) {
			if (!checksByCategory[c.category]) checksByCategory[c.category] = [];
			checksByCategory[c.category].push(c);
		}

		return new Response(
			JSON.stringify({
				url: targetUrl,
				finalUrl,
				hostname,
				statusCode: mainResp.status,
				responseTime: mainTime,
				isHTTPS,
				wasRedirected,
				redirectTarget,
				// Meta tags
				meta: { title, titleLength: title?.length || 0, metaDescription, descriptionLength: metaDescription?.length || 0, viewport, canonical, robotsMeta, charset, lang, favicon, hasDoctype, isAMP, hasManifest, author: metaAuthor, generator: metaGenerator, themeColor, appleTouchIcon: appleTouchIcon ? appleTouchIcon[1] : null },
				// URL analysis
				urlAnalysis,
				// HTTP Headers
				seoHeaders,
				// Page size & ratio
				pageSize: { htmlSize, textLength, textToHtmlRatio },
				// Open Graph
				openGraph: { title: ogTitle, description: ogDescription, image: ogImage, url: ogUrl, type: ogType, siteName: ogSiteName },
				// Twitter Card
				twitterCard: { card: twitterCard, title: twitterTitle, description: twitterDescription, image: twitterImage },
				// Content
				content: { wordCount, textLength, headings, h1Tags, imagesTotal: images.length, imagesWithoutAlt: imgsWithoutAlt.length, imagesWithoutDimensions: imgsWithoutDim.length, lazyImages: lazyImgs.length, inlineStyles, inlineScripts, externalCSS, externalJS },
				// Keywords
				topKeywords,
				// Readability
				readability,
				// Links
				links: { internalCount: internalLinks.length, externalCount: externalLinks.length, nofollowInternal: nofollowInternalCount, nofollowExternal: nofollowExternalCount, emptyLinks, internalLinks: internalLinks.slice(0, 30), externalLinks: externalLinks.slice(0, 20) },
				// Structured Data
				structuredData,
				// Social
				socialLinks,
				// Hreflang
				hreflangs,
				// Robots
				robots: robotsAnalysis,
				// Sitemap
				sitemap: sitemapAnalysis,
				// Crawled pages
				crawledPages,
				// Mixed content
				mixedContent,
				// Deprecated HTML
				deprecatedTags: foundDeprecated,
				// Iframes
				iframes,
				// Accessibility
				accessibility: accessibilityChecks,
				// Resource hints
				resourceHints,
				// Score
				score,
				grade,
				checks,
				checksByCategory,
				timestamp: new Date().toISOString(),
			}),
			{ headers: { 'content-type': 'application/json; charset=UTF-8' } },
		);
	} catch (error) {
		console.error('[SEO Audit] Error:', error instanceof Error ? error.stack || error.message : error);
		return new Response(
			JSON.stringify({ error: 'SEO audit failed', message: error instanceof Error ? error.message : 'Unknown error' }),
			{ status: 500, headers: { 'content-type': 'application/json; charset=UTF-8' } },
		);
	}
}
