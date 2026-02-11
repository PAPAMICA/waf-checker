function escapeHtml(str) {
	const div = document.createElement('div');
	div.textContent = str;
	return div.innerHTML;
}

// ===========================================
// UNIFIED CYBER LOADER
// ===========================================

/**
 * Generate a unified cyber loader HTML.
 * @param {Object} opts
 * @param {'sm'|'md'|'lg'} opts.size - Loader size (default 'md')
 * @param {string} opts.color - Tailwind text color class (default 'text-cyber-accent')
 * @param {string} opts.text - Main loading text
 * @param {string} opts.subtext - Smaller secondary text
 * @param {boolean} opts.inline - Inline mode (for buttons/small areas)
 * @returns {string} HTML string
 */
function cyberLoader(opts = {}) {
	const size = opts.size || 'md';
	const color = opts.color || 'text-cyber-accent';
	const text = opts.text || '';
	const subtext = opts.subtext || '';
	const inline = opts.inline || false;

	const loader = `<div class="cyber-loader cyber-loader--${size} ${color}"><div class="cyber-loader__ring"></div><div class="cyber-loader__arc"></div><div class="cyber-loader__dot"></div></div>`;

	if (inline) {
		return `<span class="cyber-loader-inline ${color}">${loader}<span class="cyber-loader-text text-sm">${text}</span></span>`;
	}

	let html = `<div class="flex flex-col items-center justify-center gap-3">
		${loader}`;
	if (text) {
		html += `<p class="cyber-loader-text text-sm ${color}">${text}</p>`;
	}
	if (subtext) {
		html += `<p class="text-gray-600 text-xs">${subtext}</p>`;
	}
	html += `</div>`;
	return html;
}

// ===========================================
// URL NORMALIZATION
// ===========================================

/**
 * Normalize URL by adding https:// scheme if missing
 * @param {string} url - The URL to normalize
 * @returns {string} - The normalized URL with scheme
 */
function normalizeUrl(url) {
	if (!url || typeof url !== 'string') {
		return url;
	}

	const trimmedUrl = url.trim();
	if (!trimmedUrl) {
		return trimmedUrl;
	}

	// Check if URL already has a scheme (http://, https://, ftp://, etc.)
	if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(trimmedUrl)) {
		return trimmedUrl;
	}

	// Add https:// if no scheme is present
	return `https://${trimmedUrl}`;
}

// ===========================================
// CUSTOM ALERT & CONFIRM DIALOGS
// ===========================================

let confirmResolve = null;

function showAlert(message, title = 'Information', type = 'info') {
	const modal = document.getElementById('customAlertModal');
	const titleEl = document.getElementById('alertTitle');
	const messageEl = document.getElementById('alertMessage');
	const iconEl = document.getElementById('alertIcon');

	titleEl.textContent = title;
	messageEl.textContent = message;

	// Set icon based on type
	let iconSvg = '';
	let iconClass = '';
	switch (type) {
		case 'success':
			iconClass = 'bg-cyber-success/20';
			iconSvg =
				'<svg class="w-5 h-5 text-cyber-success" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>';
			break;
		case 'error':
			iconClass = 'bg-cyber-danger/20';
			iconSvg =
				'<svg class="w-5 h-5 text-cyber-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>';
			break;
		case 'warning':
			iconClass = 'bg-cyber-warning/20';
			iconSvg =
				'<svg class="w-5 h-5 text-cyber-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>';
			break;
		default:
			iconClass = 'bg-cyber-accent/20';
			iconSvg =
				'<svg class="w-5 h-5 text-cyber-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>';
	}

	iconEl.className = `w-10 h-10 rounded-lg flex items-center justify-center ${iconClass}`;
	iconEl.innerHTML = iconSvg;

	modal.style.display = 'flex';
	document.body.style.overflow = 'hidden';
}

function closeAlert() {
	const modal = document.getElementById('customAlertModal');
	modal.style.display = 'none';
	document.body.style.overflow = '';
}

function showConfirm(message, title = 'Confirm', type = 'warning') {
	return new Promise((resolve) => {
		confirmResolve = resolve;

		const modal = document.getElementById('customConfirmModal');
		const titleEl = document.getElementById('confirmTitle');
		const messageEl = document.getElementById('confirmMessage');
		const iconEl = document.getElementById('confirmIcon');
		const okBtn = document.getElementById('confirmOkBtn');

		titleEl.textContent = title;
		messageEl.textContent = message;

		// Set icon and button based on type
		let iconSvg = '';
		let iconClass = '';
		let btnClass = '';
		switch (type) {
			case 'danger':
				iconClass = 'bg-cyber-danger/20';
				iconSvg =
					'<svg class="w-5 h-5 text-cyber-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>';
				btnClass = 'bg-cyber-danger text-white';
				break;
			case 'warning':
				iconClass = 'bg-cyber-warning/20';
				iconSvg =
					'<svg class="w-5 h-5 text-cyber-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>';
				btnClass = 'bg-cyber-warning text-cyber-bg';
				break;
			default:
				iconClass = 'bg-cyber-accent/20';
				iconSvg =
					'<svg class="w-5 h-5 text-cyber-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>';
				btnClass = 'bg-cyber-accent text-cyber-bg';
		}

		iconEl.className = `w-10 h-10 rounded-lg flex items-center justify-center ${iconClass}`;
		iconEl.innerHTML = iconSvg;
		okBtn.className = `px-4 py-2 font-semibold rounded-lg hover:opacity-90 transition-all text-sm ${btnClass}`;

		modal.style.display = 'flex';
		document.body.style.overflow = 'hidden';
	});
}

function closeConfirm(result) {
	const modal = document.getElementById('customConfirmModal');
	modal.style.display = 'none';
	document.body.style.overflow = '';

	if (confirmResolve) {
		confirmResolve(result);
		confirmResolve = null;
	}
}

// ===========================================
// HTTP STATUS CODES MODAL
// ===========================================

function generateHttpCodesTable(context = 'normal') {
	const codes = [
		{
			code: '200',
			name: 'OK',
			normal: 'Request succeeded - <strong class="text-cyber-danger">VULNERABLE</strong> (attack passed)',
			falsePositive: '<strong class="text-cyber-success">GOOD</strong> - Legitimate request allowed',
			httpManip: '<strong class="text-cyber-danger">BYPASS</strong> - Manipulation succeeded, WAF did not block',
			bg: 'bg-cyber-danger/5',
		},
		{
			code: '201',
			name: 'Created',
			normal: 'Resource created - <strong class="text-cyber-danger">VULNERABLE</strong>',
			falsePositive: '<strong class="text-cyber-success">GOOD</strong> - Resource created successfully',
			httpManip: 'Resource created - <strong class="text-cyber-danger">BYPASS</strong>',
			bg: 'bg-cyber-danger/5',
		},
		{
			code: '204',
			name: 'No Content',
			normal: 'Success with no content - <strong class="text-cyber-danger">VULNERABLE</strong>',
			falsePositive: '<strong class="text-cyber-success">GOOD</strong> - Request processed successfully',
			httpManip: 'Success with no content - <strong class="text-cyber-danger">BYPASS</strong>',
			bg: 'bg-cyber-danger/5',
		},
		{
			code: '301',
			name: 'Moved Permanently',
			normal: 'Permanent redirect - Check if WAF block page or normal redirect',
			falsePositive: 'Permanent redirect - Check if legitimate or WAF block',
			httpManip: 'Permanent redirect - Check if WAF block page or normal redirect',
			bg: 'bg-orange-500/5',
		},
		{
			code: '302',
			name: 'Found',
			normal: 'Temporary redirect - Check Location header for block page',
			falsePositive: 'Temporary redirect - Investigate if unnecessary',
			httpManip: 'Temporary redirect - May indicate WAF redirecting to block page',
			bg: 'bg-orange-500/5',
		},
		{
			code: '307',
			name: 'Temporary Redirect',
			normal: 'Temporary redirect (method preserved) - Investigate',
			falsePositive: 'Temporary redirect - May be normal or WAF-related',
			httpManip: 'Temporary redirect (method preserved) - Investigate',
			bg: 'bg-orange-500/5',
		},
		{
			code: '308',
			name: 'Permanent Redirect',
			normal: 'Permanent redirect (method preserved) - Investigate',
			falsePositive: 'Permanent redirect - Investigate',
			httpManip: 'Permanent redirect (method preserved) - Investigate',
			bg: 'bg-orange-500/5',
		},
		{
			code: '403',
			name: 'Forbidden',
			normal: '<strong class="text-cyber-success">PROTECTED</strong> - WAF blocked the attack',
			falsePositive: '<strong class="text-cyber-danger">FALSE POSITIVE</strong> - Legitimate request blocked',
			httpManip: '<strong class="text-cyber-success">PROTECTED</strong> - WAF detected and blocked the manipulation',
			bg: 'bg-cyber-success/5',
		},
		{
			code: '404',
			name: 'Not Found',
			normal: 'Resource not found - May indicate WAF blocking or normal 404',
			falsePositive: 'Resource not found - May be normal or WAF blocking',
			httpManip: 'Resource not found - May indicate WAF blocking',
			bg: 'bg-orange-500/5',
		},
		{
			code: '405',
			name: 'Method Not Allowed',
			normal: 'HTTP method not allowed - May indicate protection',
			falsePositive: 'HTTP method not allowed - May indicate over-protection',
			httpManip: 'HTTP method not allowed - May indicate protection',
			bg: 'bg-orange-500/5',
		},
		{
			code: '406',
			name: 'Not Acceptable',
			normal: 'Server cannot produce acceptable response - Often WAF-related',
			falsePositive: 'Server cannot produce acceptable response - Often WAF-related',
			httpManip: 'Server cannot produce acceptable response - Often WAF-related',
			bg: 'bg-orange-500/5',
		},
		{
			code: '429',
			name: 'Too Many Requests',
			normal: 'Rate limiting - WAF may be throttling requests',
			falsePositive: 'Rate limiting - May be too aggressive for legitimate traffic',
			httpManip: 'Rate limiting - WAF may be throttling manipulation attempts',
			bg: 'bg-orange-500/5',
		},
		{
			code: '500',
			name: 'Internal Server Error',
			normal: 'Server error - May indicate WAF blocking or application error',
			falsePositive: 'Server error - May indicate WAF blocking or application issue',
			httpManip: 'Server error - May indicate WAF blocking or application error',
			bg: 'bg-orange-500/5',
		},
		{
			code: '502',
			name: 'Bad Gateway',
			normal: 'Gateway error - Network or WAF infrastructure issue',
			falsePositive: 'Gateway error - Network or infrastructure issue',
			httpManip: 'Gateway error - Network or infrastructure issue',
			bg: 'bg-orange-500/5',
		},
		{
			code: '503',
			name: 'Service Unavailable',
			normal: 'Service unavailable - May indicate WAF blocking or maintenance',
			falsePositive: 'Service unavailable - May indicate WAF blocking or maintenance',
			httpManip: 'Service unavailable - May indicate WAF blocking or maintenance',
			bg: 'bg-orange-500/5',
		},
		{
			code: 'ERR',
			name: 'Error',
			normal: 'Network/connection error - Request failed to complete',
			falsePositive: 'Network/connection error - Request failed to complete',
			httpManip: 'Network/connection error - Request failed to complete',
			bg: 'bg-orange-500/5',
		},
	];

	const contextLabels = {
		normal: 'WAF Context',
		falsePositive: 'False Positive Context',
		httpManip: 'HTTP Manipulation Context',
	};

	let html = `<table class="w-full text-xs border-collapse">
		<thead>
			<tr class="bg-cyber-elevated/50">
				<th class="px-3 py-2 text-left border border-cyber-accent/20 text-gray-300 font-bold">Code</th>
				<th class="px-3 py-2 text-left border border-cyber-accent/20 text-gray-300 font-bold">Name</th>
				<th class="px-3 py-2 text-left border border-cyber-accent/20 text-gray-300 font-bold">Meaning (${contextLabels[context] || contextLabels.normal})</th>
			</tr>
		</thead>
		<tbody class="text-gray-400">`;

	codes.forEach((item) => {
		const meaning = item[context] || item.normal;
		const codeColor =
			item.code === '403'
				? 'text-cyber-success'
				: item.code === '200' || item.code === '201' || item.code === '204'
					? 'text-cyber-danger'
					: 'text-orange-400';

		html += `<tr class="${item.bg}">
			<td class="px-3 py-2 border border-cyber-accent/20 font-mono font-bold ${codeColor}">${item.code}</td>
			<td class="px-3 py-2 border border-cyber-accent/20">${item.name}</td>
			<td class="px-3 py-2 border border-cyber-accent/20">${meaning}</td>
		</tr>`;
	});

	html += `</tbody></table>`;
	return html;
}

function showHttpCodesModal(context = 'normal') {
	const modal = document.getElementById('httpCodesModal');
	const titleEl = document.getElementById('httpCodesTitle');
	const contentEl = document.getElementById('httpCodesTableContent');

	const contextTitles = {
		normal: 'HTTP Status Codes Reference - Security Test',
		falsePositive: 'HTTP Status Codes Reference - False Positive Test',
		httpManip: 'HTTP Status Codes Reference - HTTP Manipulation Test',
	};

	titleEl.textContent = contextTitles[context] || contextTitles.normal;
	contentEl.innerHTML = generateHttpCodesTable(context);

	modal.style.display = 'flex';
	document.body.style.overflow = 'hidden';
}

function closeHttpCodesModal() {
	const modal = document.getElementById('httpCodesModal');
	modal.style.display = 'none';
	document.body.style.overflow = '';
}

// Handle Escape key for modals
document.addEventListener('keydown', (e) => {
	if (e.key === 'Escape') {
		const alertModal = document.getElementById('customAlertModal');
		const confirmModal = document.getElementById('customConfirmModal');

		if (alertModal && alertModal.style.display === 'flex') {
			closeAlert();
		}
		if (confirmModal && confirmModal.style.display === 'flex') {
			closeConfirm(false);
		}
	}
});

// ===========================================

function getStatusClass(status, is_redirect, falsePositiveMode = false) {
	const codeNum = parseInt(status, 10);
	if (!isNaN(codeNum) && (is_redirect || codeNum === 405)) return 'status-redirect';

	if (falsePositiveMode) {
		// In false positive mode: 2xx = good (green), 403 = bad (red), 5xx = bad
		if (!isNaN(codeNum) && codeNum >= 200 && codeNum < 300) return 'status-green';
		if (codeNum === 403 || (!isNaN(codeNum) && codeNum >= 500 && codeNum < 600)) return 'status-red';
	} else {
		// Normal mode: 403 = good (green), 200 = bad (red)
		if (codeNum === 403) return 'status-green';
		if (!isNaN(codeNum) && ((codeNum >= 200 && codeNum < 300) || (codeNum >= 500 && codeNum < 600))) return 'status-red';
	}

	if (!isNaN(codeNum) && codeNum >= 400 && codeNum < 500) return 'status-orange';
	return 'status-gray';
}

function renderAnalyticsCards(results, falsePositiveMode = false) {
	if (!results || !results.length) return '';

	const totalTests = results.length;
	const bypassedTests = results.filter((r) => {
		const s = parseInt(String(r.status), 10);
		if (falsePositiveMode) {
			// In FP mode: 403 = false positive (bad)
			return s === 403;
		}
		// Normal mode: 200/500 = bypassed (bad)
		return s === 200 || s === 500;
	}).length;
	const bypassRate = totalTests > 0 ? (bypassedTests / totalTests) * 100 : 0;
	const wafEffectiveness = Math.max(0, 100 - bypassRate);

	// Response time stats
	let totalTime = 0,
		slowCount = 0,
		minTime = Infinity,
		maxTime = 0;
	for (const r of results) {
		const rt = r.responseTime || 0;
		totalTime += rt;
		if (rt >= SLOW_RESPONSE_THRESHOLD) slowCount++;
		if (rt < minTime) minTime = rt;
		if (rt > maxTime) maxTime = rt;
	}
	const avgTime = Math.round(totalTime / totalTests);
	if (minTime === Infinity) minTime = 0;

	// Risk level
	let riskLevel;
	if (bypassRate > 75) riskLevel = 'Critical';
	else if (bypassRate > 50) riskLevel = 'High';
	else if (bypassRate > 25) riskLevel = 'Medium';
	else riskLevel = 'Low';

	const riskColors = {
		Critical: 'bg-cyber-danger/15 border-cyber-danger/30 text-cyber-danger',
		High: 'bg-cyber-warning/15 border-cyber-warning/30 text-cyber-warning',
		Medium: 'bg-blue-500/15 border-blue-500/30 text-blue-400',
		Low: 'bg-cyber-success/15 border-cyber-success/30 text-cyber-success',
	};
	const riskStyle = riskColors[riskLevel] || riskColors['Low'];

	// Avg time color
	let avgColor = 'text-cyber-success';
	if (avgTime >= SLOW_RESPONSE_THRESHOLD) avgColor = 'text-red-400';
	else if (avgTime >= 1000) avgColor = 'text-orange-400';
	else if (avgTime >= 500) avgColor = 'text-yellow-400';

	return `<div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
		<div class="bg-cyber-card border border-cyber-accent/20 rounded-xl p-4 text-center">
			<div class="text-2xl font-bold text-white mb-1">${totalTests}</div>
			<div class="text-[10px] text-gray-400 uppercase tracking-wider">Total Tests</div>
		</div>
		<div class="bg-cyber-card border ${bypassedTests > 0 ? 'border-cyber-danger/30' : 'border-cyber-success/30'} rounded-xl p-4 text-center">
			<div class="text-2xl font-bold ${bypassedTests > 0 ? 'text-cyber-danger' : 'text-cyber-success'} mb-1">${bypassedTests}</div>
			<div class="text-[10px] text-gray-400 uppercase tracking-wider">${falsePositiveMode ? 'False Positives' : 'Bypassed'}</div>
		</div>
		<div class="bg-cyber-card border border-cyber-accent/20 rounded-xl p-4 text-center">
			<div class="text-2xl font-bold ${wafEffectiveness < 75 ? 'text-cyber-warning' : 'text-cyber-success'} mb-1">${Math.round(wafEffectiveness)}%</div>
			<div class="text-[10px] text-gray-400 uppercase tracking-wider">${falsePositiveMode ? 'WAF Accuracy' : 'WAF Effectiveness'}</div>
		</div>
		<div class="bg-cyber-card border ${riskStyle} rounded-xl p-4 text-center">
			<div class="text-lg font-bold mb-1">${riskLevel}</div>
			<div class="text-[10px] text-gray-400 uppercase tracking-wider">Risk Level</div>
		</div>
		<div class="bg-cyber-card border border-cyber-accent/20 rounded-xl p-2 text-center">
			<div class="text-base font-bold ${avgColor} font-mono">${avgTime}<span class="text-[10px] font-normal">ms</span></div>
			<div class="text-[9px] text-gray-400 uppercase tracking-wide">Avg Response</div>
		</div>
		<div class="bg-cyber-card border border-cyan-500/20 rounded-xl p-2 text-center">
			<div class="text-base font-bold text-cyan-400 font-mono">${minTime}<span class="text-[10px] font-normal">ms</span></div>
			<div class="text-[9px] text-gray-400 uppercase tracking-wide">Fastest</div>
		</div>
		<div class="bg-cyber-card border border-purple-500/20 rounded-xl p-2 text-center">
			<div class="text-base font-bold text-purple-400 font-mono">${maxTime}<span class="text-[10px] font-normal">ms</span></div>
			<div class="text-[9px] text-gray-400 uppercase tracking-wide">Slowest</div>
		</div>
		<div class="bg-cyber-card border ${slowCount > 0 ? 'border-orange-500/30' : 'border-gray-500/20'} rounded-xl p-2 text-center">
			<div class="text-base font-bold ${slowCount > 0 ? 'text-orange-400' : 'text-gray-500'} font-mono">${slowCount}</div>
			<div class="text-[9px] text-gray-400 uppercase tracking-wide">Slow (>${SLOW_RESPONSE_THRESHOLD / 1000}s)</div>
		</div>
	</div>`;
}

function renderSummary(results, falsePositiveMode = false) {
	if (!results || !results.length) return '';
	const statusCounter = {};
	let totalResponseTime = 0;
	let slowRequestCount = 0;
	let minTime = Infinity;
	let maxTime = 0;

	for (const r of results) {
		statusCounter[r.status] = (statusCounter[r.status] || 0) + 1;
		const rt = r.responseTime || 0;
		totalResponseTime += rt;
		if (rt >= SLOW_RESPONSE_THRESHOLD) slowRequestCount++;
		if (rt < minTime) minTime = rt;
		if (rt > maxTime) maxTime = rt;
	}

	const totalRequests = results.length;
	const avgTime = totalRequests > 0 ? Math.round(totalResponseTime / totalRequests) : 0;
	if (minTime === Infinity) minTime = 0;

	// Test analytics
	const bypassedTests = results.filter((r) => {
		const s = parseInt(String(r.status), 10);
		if (falsePositiveMode) {
			return s === 403;
		}
		return s === 200 || s === 500;
	}).length;
	const bypassRate = totalRequests > 0 ? (bypassedTests / totalRequests) * 100 : 0;
	const wafEffectiveness = Math.max(0, 100 - bypassRate);
	let riskLevel;
	if (bypassRate > 75) riskLevel = 'Critical';
	else if (bypassRate > 50) riskLevel = 'High';
	else if (bypassRate > 25) riskLevel = 'Medium';
	else riskLevel = 'Low';

	const riskColors = {
		Critical: 'bg-cyber-danger/15 border-cyber-danger/30 text-cyber-danger',
		High: 'bg-cyber-warning/15 border-cyber-warning/30 text-cyber-warning',
		Medium: 'bg-blue-500/15 border-blue-500/30 text-blue-400',
		Low: 'bg-cyber-success/15 border-cyber-success/30 text-cyber-success',
	};
	const riskStyle = riskColors[riskLevel] || riskColors['Low'];

	// Avg time color
	let avgColor = 'text-cyber-success';
	let avgBg = 'bg-cyber-success/15 border-cyber-success/30';
	if (avgTime >= SLOW_RESPONSE_THRESHOLD) {
		avgColor = 'text-red-400';
		avgBg = 'bg-red-500/15 border-red-500/30';
	} else if (avgTime >= 1000) {
		avgColor = 'text-orange-400';
		avgBg = 'bg-orange-500/15 border-orange-500/30';
	} else if (avgTime >= 500) {
		avgColor = 'text-yellow-400';
		avgBg = 'bg-yellow-500/15 border-yellow-500/30';
	}

	let html = `<div class="bg-cyber-card border border-cyber-accent/20 rounded-xl p-4 mb-4">
		<div class="flex items-center justify-between mb-3">
			<h4 class="text-sm font-bold text-white uppercase tracking-wider">Results Summary</h4>
			<span class="text-xs text-gray-400">${totalRequests} total tests</span>
		</div>

		<!-- Test Results + Response Time Stats -->
		<div class="grid grid-cols-4 gap-2 mb-2">
			<div class="p-2.5 rounded-lg border ${riskStyle} text-center">
				<div class="text-lg font-bold mb-0.5">${riskLevel}</div>
				<div class="text-[10px] text-gray-400 uppercase tracking-wide">Risk Level</div>
			</div>
			<div class="p-2.5 rounded-lg border bg-cyber-accent/10 border-cyber-accent/20 text-center">
				<div class="text-lg font-bold ${wafEffectiveness < 75 ? 'text-cyber-warning' : 'text-cyber-success'} font-mono">${Math.round(wafEffectiveness)}%</div>
				<div class="text-[10px] text-gray-400 uppercase tracking-wide">${falsePositiveMode ? 'WAF Accuracy' : 'WAF Effectiveness'}</div>
			</div>
			<div class="p-2.5 rounded-lg border bg-cyber-elevated/50 border-gray-600/30 text-center">
				<div class="text-lg font-bold text-white font-mono">${totalRequests}</div>
				<div class="text-[10px] text-gray-400 uppercase tracking-wide">Total Tests</div>
			</div>
			<div class="p-2.5 rounded-lg border ${bypassedTests > 0 ? 'bg-cyber-danger/15 border-cyber-danger/30' : 'bg-cyber-success/15 border-cyber-success/30'} text-center">
				<div class="text-lg font-bold ${bypassedTests > 0 ? 'text-cyber-danger' : 'text-cyber-success'} font-mono">${bypassedTests}</div>
				<div class="text-[10px] text-gray-400 uppercase tracking-wide">${falsePositiveMode ? 'False Positives' : 'Bypassed'}</div>
			</div>
		</div>
		<div class="grid grid-cols-4 gap-2 mb-3">
			<div class="p-1.5 rounded-lg border ${avgBg} text-center">
				<div class="text-sm font-bold ${avgColor} font-mono">${avgTime}<span class="text-[9px] font-normal">ms</span></div>
				<div class="text-[9px] text-gray-400 uppercase tracking-wide">Avg Response</div>
			</div>
			<div class="p-1.5 rounded-lg border bg-cyan-500/10 border-cyan-500/20 text-center">
				<div class="text-sm font-bold text-cyan-400 font-mono">${minTime}<span class="text-[9px] font-normal">ms</span></div>
				<div class="text-[9px] text-gray-400 uppercase tracking-wide">Fastest</div>
			</div>
			<div class="p-1.5 rounded-lg border bg-purple-500/10 border-purple-500/20 text-center">
				<div class="text-sm font-bold text-purple-400 font-mono">${maxTime}<span class="text-[9px] font-normal">ms</span></div>
				<div class="text-[9px] text-gray-400 uppercase tracking-wide">Slowest</div>
			</div>
			<div class="p-1.5 rounded-lg border ${slowRequestCount > 0 ? 'bg-orange-500/15 border-orange-500/30' : 'bg-gray-500/10 border-gray-500/20'} text-center">
				<div class="text-sm font-bold ${slowRequestCount > 0 ? 'text-orange-400' : 'text-gray-500'} font-mono">${slowRequestCount}</div>
				<div class="text-[9px] text-gray-400 uppercase tracking-wide">Slow (>${SLOW_RESPONSE_THRESHOLD / 1000}s)</div>
			</div>
		</div>

		<!-- Status Filter -->
		<h5 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Filter by Status Code</h5>
		<div class="flex flex-wrap gap-2 items-center">
			<label class="inline-flex items-center gap-2 px-3 py-1.5 bg-cyber-elevated/50 rounded-lg cursor-pointer hover:bg-cyber-elevated transition-colors border border-cyber-accent/20">
				<input type="checkbox" id="statusSelectAll" checked class="w-3.5 h-3.5 accent-cyber-accent shrink-0" />
				<span class="text-xs font-semibold text-white">All</span>
				<span class="px-1.5 py-0.5 bg-cyber-accent/20 text-cyber-accent text-[10px] font-bold rounded">${totalRequests}</span>
			</label>`;

	const sortedCodes = Object.keys(statusCounter).sort();
	for (const code of sortedCodes) {
		const percent = totalRequests ? (statusCounter[code] / totalRequests) * 100 : 0;
		const codeNum = parseInt(code, 10);
		let colorClass = 'bg-gray-500';
		let textClass = 'text-gray-400';
		let dotColor = 'bg-gray-400';
		let pillBg = 'bg-gray-500/15 border-gray-500/30';

		if (falsePositiveMode) {
			if (codeNum >= 200 && codeNum < 300) {
				colorClass = 'bg-cyber-success';
				textClass = 'text-cyber-success';
				dotColor = 'bg-cyber-success';
				pillBg = 'bg-cyber-success/10 border-cyber-success/30';
			} else if (codeNum === 403) {
				colorClass = 'bg-cyber-danger';
				textClass = 'text-cyber-danger';
				dotColor = 'bg-cyber-danger';
				pillBg = 'bg-cyber-danger/10 border-cyber-danger/30';
			} else if (codeNum >= 300 && codeNum < 400) {
				colorClass = 'bg-orange-500';
				textClass = 'text-orange-400';
				dotColor = 'bg-orange-400';
				pillBg = 'bg-orange-500/10 border-orange-500/30';
			} else if (codeNum >= 400 && codeNum < 500) {
				colorClass = 'bg-cyber-warning';
				textClass = 'text-cyber-warning';
				dotColor = 'bg-cyber-warning';
				pillBg = 'bg-cyber-warning/10 border-cyber-warning/30';
			}
		} else {
			if (codeNum === 403) {
				colorClass = 'bg-cyber-success';
				textClass = 'text-cyber-success';
				dotColor = 'bg-cyber-success';
				pillBg = 'bg-cyber-success/10 border-cyber-success/30';
			} else if (codeNum >= 200 && codeNum < 300) {
				colorClass = 'bg-cyber-danger';
				textClass = 'text-cyber-danger';
				dotColor = 'bg-cyber-danger';
				pillBg = 'bg-cyber-danger/10 border-cyber-danger/30';
			} else if (codeNum >= 300 && codeNum < 400) {
				colorClass = 'bg-orange-500';
				textClass = 'text-orange-400';
				dotColor = 'bg-orange-400';
				pillBg = 'bg-orange-500/10 border-orange-500/30';
			} else if (codeNum >= 400 && codeNum < 500) {
				colorClass = 'bg-cyber-warning';
				textClass = 'text-cyber-warning';
				dotColor = 'bg-cyber-warning';
				pillBg = 'bg-cyber-warning/10 border-cyber-warning/30';
			}
		}

		html += `
			<label class="inline-flex items-center gap-2 px-3 py-1.5 ${pillBg} rounded-lg cursor-pointer hover:brightness-125 transition-all border">
				<input type="checkbox" class="status-filter-checkbox w-3.5 h-3.5 accent-cyber-accent shrink-0" data-status="${code}" checked />
				<span class="w-2 h-2 rounded-full ${dotColor} shrink-0"></span>
				<span class="text-xs font-bold ${textClass}">${code}</span>
				<span class="text-[10px] text-gray-500">${percent.toFixed(0)}%</span>
				<span class="px-1.5 py-0.5 ${colorClass}/20 ${textClass} text-[10px] font-bold rounded">${statusCounter[code]}</span>
			</label>`;
	}

	html += `</div></div>`;
	return html;
}

// Slow response threshold in ms
const SLOW_RESPONSE_THRESHOLD = 2000;

function renderResultRow(r, falsePositiveMode = false) {
	const statusStr = String(r.status);
	const isError = statusStr === 'ERR' || statusStr === 'error' || statusStr === 'Error';
	const codeNum = isError ? NaN : parseInt(statusStr, 10);
	let statusBg = 'bg-gray-500/20 text-gray-400';
	let payloadClass = '';
	let rowBgColor = '';
	let borderColor = '';

	if (isError || isNaN(codeNum)) {
		statusBg = 'bg-orange-500/20 text-orange-400';
		rowBgColor = 'rgba(249, 115, 22, 0.2)';
		borderColor = '#f97316';
	} else if (falsePositiveMode) {
		if (codeNum >= 200 && codeNum < 300) {
			statusBg = 'bg-cyber-success/20 text-cyber-success';
			payloadClass = 'text-cyber-success';
			rowBgColor = 'rgba(34, 197, 94, 0.2)';
			borderColor = '#22c55e';
		} else if (codeNum === 403) {
			statusBg = 'bg-cyber-danger/20 text-cyber-danger';
			rowBgColor = 'rgba(239, 68, 68, 0.2)';
			borderColor = '#ef4444';
		} else if (codeNum >= 300 && codeNum < 400) {
			statusBg = 'bg-cyber-warning/20 text-cyber-warning';
			rowBgColor = 'rgba(249, 115, 22, 0.2)';
			borderColor = '#f97316';
		} else if (codeNum >= 400 && codeNum < 500 && codeNum !== 403) {
			statusBg = 'bg-cyber-warning/20 text-cyber-warning';
			rowBgColor = 'rgba(249, 115, 22, 0.2)';
			borderColor = '#f97316';
		} else if (codeNum >= 500 && codeNum < 600) {
			statusBg = 'bg-cyber-danger/20 text-cyber-danger';
			rowBgColor = 'rgba(239, 68, 68, 0.2)';
			borderColor = '#ef4444';
		} else {
			rowBgColor = 'rgba(107, 114, 128, 0.1)';
			borderColor = '#6b7280';
		}
	} else {
		if (codeNum === 403) {
			statusBg = 'bg-cyber-success/20 text-cyber-success';
			payloadClass = 'text-cyber-success';
			rowBgColor = 'rgba(34, 197, 94, 0.2)';
			borderColor = '#22c55e';
		} else if (codeNum >= 200 && codeNum < 300) {
			statusBg = 'bg-cyber-danger/20 text-cyber-danger';
			rowBgColor = 'rgba(239, 68, 68, 0.2)';
			borderColor = '#ef4444';
		} else if (codeNum >= 300 && codeNum < 400) {
			statusBg = 'bg-cyber-warning/20 text-cyber-warning';
			rowBgColor = 'rgba(249, 115, 22, 0.2)';
			borderColor = '#f97316';
		} else if (codeNum >= 400 && codeNum < 500 && codeNum !== 403) {
			statusBg = 'bg-cyber-warning/20 text-cyber-warning';
			rowBgColor = 'rgba(249, 115, 22, 0.2)';
			borderColor = '#f97316';
		} else {
			rowBgColor = 'rgba(107, 114, 128, 0.1)';
			borderColor = '#6b7280';
		}
	}

	const responseTime = r.responseTime || 0;
	const isSlow = responseTime >= SLOW_RESPONSE_THRESHOLD;
	const rowStyle = `background-color: ${rowBgColor}; border-left: 4px solid ${borderColor};`;

	let statusTooltip = '';
	let statusDisplay = r.status;
	if (!isError && !isNaN(codeNum) && codeNum >= 300 && codeNum < 400) {
		statusTooltip = `title="Redirect (${codeNum}): The server redirected this request."`;
		statusDisplay = `${r.status}`;
	}

	// Response time display with slow indicator
	let timeHtml;
	if (isSlow) {
		timeHtml = `<span class="text-orange-400 font-semibold">${responseTime}ms</span> <span class="inline-flex items-center gap-0.5 ml-1 px-1.5 py-0.5 bg-orange-500/20 text-orange-400 text-[10px] font-bold rounded border border-orange-500/30" title="Response time exceeds ${SLOW_RESPONSE_THRESHOLD}ms">SLOW</span>`;
	} else {
		timeHtml = `${responseTime}ms`;
	}

	return `
		<tr data-status="${r.status}" style="${rowStyle}" class="hover:brightness-110 transition-all">
			<td class="px-4 py-2.5 text-gray-300">${escapeHtml(r.category)}</td>
			<td class="px-4 py-2.5 text-center">
				<span class="px-2 py-0.5 bg-cyber-accent/10 text-cyber-accent text-xs font-mono rounded">${r.method}</span>
			</td>
			<td class="px-4 py-2.5 text-center">
				<span class="px-2 py-0.5 ${statusBg} text-xs font-bold rounded cursor-pointer hover:brightness-125 transition-all" onclick="showHttpCodesModal()" ${statusTooltip}>${statusDisplay}</span>
			</td>
			<td class="px-4 py-2.5 text-center text-xs text-gray-500 whitespace-nowrap">${timeHtml}</td>
			<td class="px-4 py-2.5">
				<code class="text-xs font-mono ${payloadClass} bg-cyber-bg/50 px-2 py-1 rounded break-all">${escapeHtml(r.payload)}</code>
			</td>
		</tr>`;
}

/**
 * Renders the live results shell (header banner + empty table) used during streaming.
 * Rows are appended to #liveResultsBody as they arrive.
 */
function renderReportHeader(falsePositiveMode = false) {
	let html = '';

	if (falsePositiveMode) {
		html += `<div class="flex items-center justify-between mb-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
			<div class="flex items-center gap-3">
				<div class="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
					<svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
					</svg>
				</div>
				<div>
					<h3 class="text-sm font-bold text-blue-400">False Positive Test</h3>
					<p class="text-xs text-blue-300/70">Testing if legitimate traffic is being blocked by the WAF</p>
				</div>
			</div>
		</div>`;
	} else {
		html += `<div class="flex items-center justify-between mb-4 p-4 bg-cyber-card border border-cyber-accent/30 rounded-xl">
			<div class="flex items-center gap-3">
				<div class="w-10 h-10 rounded-lg bg-cyber-accent/20 flex items-center justify-center">
					<svg class="w-5 h-5 text-cyber-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
					</svg>
				</div>
				<div>
					<h3 class="text-sm font-bold text-cyber-accent">Security Test In Progress...</h3>
					<p class="text-xs text-gray-400" id="liveTestCounter">0 tests completed</p>
				</div>
			</div>
		</div>`;
	}

	// Live results table
	html += `<div class="bg-cyber-card border border-cyber-accent/20 rounded-xl overflow-hidden">
		<div id="liveResultsScroller" class="overflow-x-auto" style="max-height: 70vh; overflow-y: auto;">
			<table class="w-full text-sm" id="resultsTable">
				<thead class="sticky top-0 z-10">
					<tr class="bg-cyber-elevated/50 border-b border-cyber-accent/20">
						<th class="px-5 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Category</th>
						<th class="px-4 py-3 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">Method</th>
						<th class="px-4 py-3 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
						<th class="px-4 py-3 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">Time</th>
						<th class="px-5 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Payload</th>
					</tr>
				</thead>
				<tbody id="liveResultsBody" class="divide-y divide-cyber-accent/10">
				</tbody>
			</table>
		</div>
	</div>`;

	return html;
}

function renderReport(results, falsePositiveMode = false) {
	if (!results || results.length === 0) return '';

	let html = '';

	// Add visual indicator for test mode with explanation
	if (falsePositiveMode) {
		html += `<div class="flex items-center justify-between mb-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
			<div class="flex items-center gap-3">
				<div class="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
					<svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
					</svg>
				</div>
				<div>
					<h3 class="text-sm font-bold text-blue-400">False Positive Test</h3>
					<p class="text-xs text-blue-300/70">Testing if legitimate traffic is being blocked by the WAF</p>
				</div>
			</div>
			<div class="flex items-center gap-4 text-xs">
				<span class="flex items-center gap-2 px-3 py-1.5 bg-cyber-success/20 rounded-lg">
					<span class="w-2 h-2 rounded-full bg-cyber-success"></span>
					<span class="text-cyber-success font-medium">200 = Allowed</span>
				</span>
				<span class="flex items-center gap-2 px-3 py-1.5 bg-cyber-danger/20 rounded-lg">
					<span class="w-2 h-2 rounded-full bg-cyber-danger"></span>
					<span class="text-cyber-danger font-medium">403 = Blocked</span>
				</span>
				<span class="flex items-center gap-2 px-3 py-1.5 bg-orange-500/20 rounded-lg">
					<span class="w-2 h-2 rounded-full bg-orange-500"></span>
					<span class="text-orange-400 font-medium">3xx = Redirect</span>
				</span>
				<button onclick="showHttpCodesModal('falsePositive')" class="px-3 py-1.5 bg-cyber-accent/10 hover:bg-cyber-accent/20 text-cyber-accent text-xs font-medium rounded-lg transition-all border border-cyber-accent/30 hover:border-cyber-accent">
					Show all HTTP codes
				</button>
			</div>
		</div>
		<div class="mb-4 p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
			<p class="text-xs text-gray-300 leading-relaxed">
				<strong class="text-blue-400">What is a False Positive Test?</strong> This test uses <strong class="text-white">legitimate, safe payloads</strong> to check if your WAF is blocking normal traffic.
				If you see <strong class="text-cyber-danger">403 (red)</strong>, it means legitimate requests are being blocked - this is a <strong class="text-cyber-danger">false positive</strong> and should be investigated.
				<strong class="text-orange-400">Status 3xx (orange)</strong> means the server redirected the request. This could be a normal redirect or the WAF redirecting to a block page. Check the redirect location to determine if legitimate traffic is being redirected unnecessarily.
			</p>
		</div>`;
	} else {
		html += `<div class="flex items-center justify-between mb-4 p-4 bg-cyber-card border border-cyber-accent/30 rounded-xl">
			<div class="flex items-center gap-3">
				<div class="w-10 h-10 rounded-lg bg-cyber-accent/20 flex items-center justify-center">
					<svg class="w-5 h-5 text-cyber-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
					</svg>
				</div>
				<div>
					<h3 class="text-sm font-bold text-cyber-accent">Security Test Complete</h3>
					<p class="text-xs text-gray-400">WAF protection analysis results</p>
				</div>
			</div>
			<div class="flex items-center gap-4 text-xs">
				<span class="flex items-center gap-2 px-3 py-1.5 bg-cyber-success/20 rounded-lg">
					<span class="w-2 h-2 rounded-full bg-cyber-success"></span>
					<span class="text-cyber-success font-medium">403 = Protected</span>
				</span>
				<span class="flex items-center gap-2 px-3 py-1.5 bg-cyber-danger/20 rounded-lg">
					<span class="w-2 h-2 rounded-full bg-cyber-danger"></span>
					<span class="text-cyber-danger font-medium">200 = Vulnerable</span>
				</span>
				<span class="flex items-center gap-2 px-3 py-1.5 bg-orange-500/20 rounded-lg">
					<span class="w-2 h-2 rounded-full bg-orange-500"></span>
					<span class="text-orange-400 font-medium">3xx = Redirect</span>
				</span>
				<button onclick="showHttpCodesModal('normal')" class="px-3 py-1.5 bg-cyber-accent/10 hover:bg-cyber-accent/20 text-cyber-accent text-xs font-medium rounded-lg transition-all border border-cyber-accent/30 hover:border-cyber-accent">
					Show all HTTP codes
				</button>
			</div>
		</div>
		<div class="mb-4 p-3 bg-cyber-accent/5 border border-cyber-accent/20 rounded-lg">
			<p class="text-xs text-gray-300 leading-relaxed">
				<strong class="text-cyber-accent">What are these tests?</strong> This test sends <strong class="text-white">malicious payloads</strong> (SQL Injection, XSS, etc.) to check if your WAF blocks them.
				<strong class="text-cyber-success">Status 403 (green)</strong> means the WAF detected and blocked the attack.
				<strong class="text-cyber-danger">Status 200 (red)</strong> means the attack succeeded - your application is <strong class="text-cyber-danger">vulnerable</strong> and the WAF did not protect it.
				<strong class="text-orange-400">Status 3xx (orange)</strong> means the server redirected the request. This could indicate the WAF is redirecting to a block page (good), or the server is redirecting normally (requires investigation). Check the redirect location to determine if it's a block page or a normal redirect.
			</p>
		</div>`;
	}

	// Add WAF detection info if available
	if (results.length > 0 && results[0].wafDetected) {
		html += `<div class="flex items-center gap-3 mb-4 p-3 bg-cyber-accent/10 border border-cyber-accent/30 rounded-lg">
			<svg class="w-5 h-5 text-cyber-accent shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
			</svg>
			<span class="text-sm text-gray-300"><strong class="text-cyber-accent">WAF Detected:</strong> ${results[0].wafType}</span>
			<span class="text-xs text-gray-500">(Auto-detection)</span>
		</div>`;
	}

	html += renderSummary(results, falsePositiveMode);

	// Results table with modern design
	html += `<div class="bg-cyber-card border border-cyber-accent/20 rounded-xl overflow-hidden">
		<div class="overflow-x-auto">
			<table class="w-full text-sm" id="resultsTable">
				<thead>
					<tr class="bg-cyber-elevated/50 border-b border-cyber-accent/20">
						<th class="px-5 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Category</th>
						<th class="px-4 py-3 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">Method</th>
						<th class="px-4 py-3 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
						<th class="px-4 py-3 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">Time</th>
						<th class="px-5 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Payload</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-cyber-accent/10">`;

	for (const r of results) {
		html += renderResultRow(r, falsePositiveMode);
	}

	html += `</tbody></table></div></div>`;

	setTimeout(() => {
		filterResultsTableByStatus();
		const all = document.querySelectorAll('.status-filter-checkbox');
		const checkedCount = Array.from(all).filter((cb) => cb.checked).length;
		const selectAll = document.getElementById('statusSelectAll');
		if (selectAll) {
			selectAll.checked = checkedCount === all.length;
		}
	}, 0);
	return html;
}

// --- PAYLOAD CATEGORIES LOGIC ---
// Categories are loaded dynamically from GitHub via the backend
let PAYLOAD_CATEGORIES = [];
let payloadCategoriesLoaded = false;
let payloadLoadRetries = 0;
const PAYLOAD_MAX_AUTO_RETRIES = 3;

async function loadPayloadCategories() {
	const container = document.getElementById('categoryCheckboxes');
	if (container) {
		container.innerHTML = `<div class="py-4" id="payloadLoadingIndicator">
			${cyberLoader({ size: 'sm', color: 'text-cyber-accent', text: 'Loading payloads from GitHub...', inline: true })}
		</div>`;
	}
	try {
		// Check loading status first
		const statusResp = await fetch('/api/payloads/status');
		const status = await statusResp.json();

		if (!status.loaded) {
			// Wait a bit and retry - backend is still loading from GitHub
			await new Promise((r) => setTimeout(r, 2000));
		}

		const resp = await fetch('/api/payloads');
		if (!resp.ok) throw new Error(`Failed to load payloads (HTTP ${resp.status})`);
		const data = await resp.json();

		if (!data || Object.keys(data).length === 0) {
			throw new Error('Empty payload data received');
		}

		PAYLOAD_CATEGORIES = Object.keys(data);
		payloadCategoriesLoaded = true;
		payloadLoadRetries = 0;
		console.log(`Loaded ${PAYLOAD_CATEGORIES.length} payload categories from GitHub`);
		renderCategoryCheckboxes();

		// Update loading indicator with success
		const indicator = document.getElementById('payloadLoadingIndicator');
		if (indicator) indicator.remove();
	} catch (e) {
		console.error('Failed to load payload categories:', e);
		payloadLoadRetries++;

		if (payloadLoadRetries <= PAYLOAD_MAX_AUTO_RETRIES) {
			// Auto-retry with increasing delay
			const delay = payloadLoadRetries * 2000;
			if (container) {
				container.innerHTML = `<div class="py-4" id="payloadLoadingIndicator">
					${cyberLoader({ size: 'sm', color: 'text-cyber-warning', text: `Retry ${payloadLoadRetries}/${PAYLOAD_MAX_AUTO_RETRIES}...`, inline: true })}
				</div>`;
			}
			setTimeout(loadPayloadCategories, delay);
		} else {
			// Show error with retry button
			showPayloadLoadError(e.message);
		}
	}
}

function showPayloadLoadError(errorMsg) {
	const container = document.getElementById('categoryCheckboxes');
	if (!container) return;
	container.innerHTML = `<div class="text-center py-4 px-3">
		<svg class="w-8 h-8 text-cyber-danger mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
		</svg>
		<p class="text-xs text-cyber-danger font-semibold mb-1">Failed to load payloads</p>
		<p class="text-[10px] text-gray-500 mb-3">${errorMsg || 'Connection to GitHub failed'}</p>
		<button type="button" onclick="retryLoadPayloads()"
				class="px-4 py-2 bg-cyber-accent/20 border border-cyber-accent/40 rounded-lg text-xs font-bold text-cyber-accent hover:bg-cyber-accent/30 transition-all">
			<svg class="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
			</svg>
			Retry
		</button>
	</div>`;
}

function retryLoadPayloads() {
	payloadLoadRetries = 0;
	loadPayloadCategories();
}

function renderCategoryCheckboxes() {
	const container = document.getElementById('categoryCheckboxes');
	if (!container) return;
	// Remove loading indicator if present
	const indicator = document.getElementById('payloadLoadingIndicator');
	if (indicator) indicator.remove();

	if (PAYLOAD_CATEGORIES.length === 0) {
		container.innerHTML = '<div class="text-center py-3 text-gray-400">No categories loaded yet...</div>';
		return;
	}
	container.innerHTML = '';
	const defaultChecked = ['SQL Injection', 'XSS'];
	PAYLOAD_CATEGORIES.forEach((cat, idx) => {
		const id = 'cat_' + idx;
		const div = document.createElement('div');
		div.className = 'form-check';
		div.innerHTML = `<input class="form-check-input" type="checkbox" value="${cat}" id="${id}"${defaultChecked.includes(cat) ? ' checked' : ''}>
      <label class="form-check-label" for="${id}">${cat}</label>`;
		container.appendChild(div);
	});
}

function highlightCategoryCheckboxesByResults(results, falsePositiveMode = false) {
	// В режиме false positive: выделяем категории где есть 403 (плохо)
	// В обычном режиме: выделяем категории где есть 200 (плохо)
	const categoriesWithBadStatus = new Set();
	if (Array.isArray(results)) {
		results.forEach((r) => {
			if (falsePositiveMode) {
				if (r.status === 403 || r.status === '403') {
					categoriesWithBadStatus.add(r.category);
				}
			} else {
				if (r.status === 200 || r.status === '200') {
					categoriesWithBadStatus.add(r.category);
				}
			}
		});
	}
	// Пробегаем по чекбоксам и выделяем нужные label
	const categoryCheckboxes = document.querySelectorAll('#categoryCheckboxes input[type=checkbox]');
	categoryCheckboxes.forEach((cb) => {
		const label = cb.parentElement.querySelector('.form-check-label');
		if (!label) return;
		if (categoriesWithBadStatus.has(cb.value)) {
			label.classList.add('category-label-danger');
		} else {
			label.classList.remove('category-label-danger');
		}
	});
}

// --- Toggle payload template section within Advanced Settings ---
function updatePayloadTemplateSection() {
	const methodPOST = document.getElementById('methodPOST');
	const methodPUT = document.getElementById('methodPUT');
	const section = document.getElementById('payloadTemplateSection');
	if (!section) return;
	if ((methodPOST && methodPOST.checked) || (methodPUT && methodPUT.checked)) {
		section.style.display = '';
	} else {
		section.style.display = 'none';
	}
}

// --- Switch between Target and Advanced tabs ---
function switchConfigTab(tab) {
	const tabTarget = document.getElementById('tabTarget');
	const tabAdvanced = document.getElementById('tabAdvanced');
	const panelTarget = document.getElementById('panelTarget');
	const panelAdvanced = document.getElementById('panelAdvanced');

	if (!tabTarget || !tabAdvanced || !panelTarget || !panelAdvanced) return;

	if (tab === 'target') {
		// Activate Target tab
		tabTarget.classList.add('border-cyber-accent', 'text-cyber-accent');
		tabTarget.classList.remove('border-transparent', 'text-gray-400');
		tabAdvanced.classList.remove('border-cyber-accent', 'text-cyber-accent');
		tabAdvanced.classList.add('border-transparent', 'text-gray-400');
		panelTarget.style.display = 'block';
		panelAdvanced.style.display = 'none';
	} else {
		// Activate Advanced tab
		tabAdvanced.classList.add('border-cyber-accent', 'text-cyber-accent');
		tabAdvanced.classList.remove('border-transparent', 'text-gray-400');
		tabTarget.classList.remove('border-cyber-accent', 'text-cyber-accent');
		tabTarget.classList.add('border-transparent', 'text-gray-400');
		panelTarget.style.display = 'none';
		panelAdvanced.style.display = 'block';
	}
}

// Update description text - deprecated, kept for compatibility
function updateDescriptionText() {
	// No longer needed as description was removed from UI
}

// Progress bar helper functions
let progressInterval = null;
let progressAnimationValue = 0;

function showProgress() {
	const progressBar = document.getElementById('progressBar');
	if (progressBar) {
		progressBar.classList.remove('hidden');
	}
	// Reset slow warning
	const slowWarningEl = document.getElementById('progressSlowWarning');
	if (slowWarningEl) {
		slowWarningEl.textContent = '';
		slowWarningEl.classList.add('hidden');
	}
	// Start indeterminate animation
	startIndeterminateProgress();
}

function hideProgress() {
	const progressBar = document.getElementById('progressBar');
	if (progressBar) {
		progressBar.classList.add('hidden');
	}
	stopIndeterminateProgress();
}

function startIndeterminateProgress() {
	stopIndeterminateProgress();
	progressAnimationValue = 0;
	const progressFill = document.getElementById('progressFill');
	if (progressFill) {
		progressFill.style.transition = 'width 0.3s ease-out';
	}
}

function stopIndeterminateProgress() {
	if (progressInterval) {
		clearInterval(progressInterval);
		progressInterval = null;
	}
}

function updateProgress(current, total, category = '', text = 'Running tests...', batch = 0) {
	stopIndeterminateProgress();

	// Calculate percent, allow 100% when current >= total
	const percent = total > 0 ? Math.min(Math.round((current / total) * 100), 100) : 0;

	const progressFill = document.getElementById('progressFill');
	const progressPercent = document.getElementById('progressPercent');
	const progressText = document.getElementById('progressText');
	const progressCategory = document.getElementById('progressCategory');
	const progressCount = document.getElementById('progressCount');

	if (progressFill) {
		progressFill.style.transition = 'width 0.5s ease-out';
		progressFill.style.width = `${percent}%`;
	}
	if (progressPercent) progressPercent.textContent = `${percent}%`;
	if (progressText) progressText.textContent = text;
	if (progressCategory) progressCategory.textContent = category || 'Processing...';
	if (progressCount) {
		const totalText = total > 0 ? ` / ${total}` : '';
		progressCount.textContent = `${current}${totalText} tests`;
	}
}

function finalizeProgress() {
	const progressFill = document.getElementById('progressFill');
	const progressPercent = document.getElementById('progressPercent');
	const progressText = document.getElementById('progressText');
	const progressCategory = document.getElementById('progressCategory');

	if (progressFill) {
		progressFill.style.transition = 'width 0.3s ease-out';
		progressFill.style.width = '100%';
	}
	if (progressPercent) progressPercent.textContent = '100%';
	if (progressText) progressText.textContent = 'Tests completed!';
	if (progressCategory) progressCategory.textContent = 'Complete';
}

async function fetchResults() {
	// Close mobile drawer if open
	closeMobileDrawer();

	const btn = document.getElementById('checkBtn');
	btn.disabled = true;
	const oldText = btn.textContent;
	btn.textContent = 'Testing...';
	const urlInput = document.getElementById('url');
	const url = normalizeUrl(urlInput.value);

	// Update the input field with normalized URL if it was changed
	if (url !== urlInput.value) {
		urlInput.value = url;
	}

	// Show progress bar
	showProgress();
	updateProgress(0, 0, 'Initializing...', 'Preparing tests...');

	// Create test session
	const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
	const startTime = new Date().toISOString();

	// Collect selected methods from method checkboxes
	const methodCheckboxes = document.querySelectorAll('.methods-grid input[type=checkbox]');
	const selectedMethods = Array.from(methodCheckboxes)
		.filter((cb) => cb.checked)
		.map((cb) => cb.value);

	// Ensure at least one method is selected
	if (selectedMethods.length === 0) {
		showAlert('Please select at least one HTTP method', 'No Method Selected', 'warning');
		btn.disabled = false;
		btn.textContent = oldText;
		return;
	}
	// Ensure payloads are loaded from GitHub
	if (!payloadCategoriesLoaded || PAYLOAD_CATEGORIES.length === 0) {
		showAlert('Payloads are still loading from GitHub. Please wait a moment and try again.', 'Payloads Loading', 'warning');
		btn.disabled = false;
		btn.textContent = oldText;
		return;
	}
	// Follow redirect
	const followRedirect = document.getElementById('followRedirect')?.checked ? true : false;
	// False positive test
	const falsePositiveTest = document.getElementById('falsePositiveTest')?.checked ? true : false;
	// Case sensitive test
	const caseSensitiveTest = document.getElementById('caseSensitiveTest')?.checked ? true : false;
	// Enhanced payloads
	const enhancedPayloads = document.getElementById('enhancedPayloads')?.checked ? true : false;
	// Use advanced WAF bypass payloads
	const useAdvancedPayloads = document.getElementById('useAdvancedPayloadsCheckbox')?.checked ? true : false;
	// Auto detect WAF
	const autoDetectWAF = document.getElementById('autoDetectWAF')?.checked ? true : false;
	// Use encoding variations
	const useEncodingVariations = document.getElementById('useEncodingVariations')?.checked ? true : false;
	// HTTP Manipulation
	const httpManipulation = document.getElementById('httpManipulation')?.checked ? true : false;
	// Collect selected categories
	const categoryCheckboxes = document.querySelectorAll('#categoryCheckboxes input[type=checkbox]');
	const selectedCategories = Array.from(categoryCheckboxes)
		.filter((cb) => cb.checked)
		.map((cb) => cb.value);
	// --- Сохраняем в localStorage ---
	localStorage.setItem('wafchecker_url', url);
	localStorage.setItem('wafchecker_methods', JSON.stringify(selectedMethods));
	localStorage.setItem('wafchecker_categories', JSON.stringify(selectedCategories));
	localStorage.setItem('wafchecker_followRedirect', followRedirect ? '1' : '0');
	localStorage.setItem('wafchecker_falsePositiveTest', falsePositiveTest ? '1' : '0');
	localStorage.setItem('wafchecker_caseSensitiveTest', caseSensitiveTest ? '1' : '0');
	localStorage.setItem('wafchecker_enhancedPayloads', enhancedPayloads ? '1' : '0');
	localStorage.setItem('wafchecker_useAdvancedPayloads', useAdvancedPayloads ? '1' : '0');
	localStorage.setItem('wafchecker_autoDetectWAF', autoDetectWAF ? '1' : '0');
	localStorage.setItem('wafchecker_useEncodingVariations', useEncodingVariations ? '1' : '0');
	localStorage.setItem('wafchecker_httpManipulation', httpManipulation ? '1' : '0');
	// --- Получаем шаблон и заголовки ---\n
	let payloadTemplate = '';
	const templateEl = document.getElementById('payloadTemplate');
	if (templateEl) {
		payloadTemplate = templateEl.value;
		localStorage.setItem('wafchecker_payloadTemplate', payloadTemplate);
	}

	let customHeaders = '';
	const headersEl = document.getElementById('customHeaders');
	if (headersEl) {
		customHeaders = headersEl.value;
		localStorage.setItem('wafchecker_customHeaders', customHeaders);
	}
	let allResults = [];
	let detectedWAFType = window.detectedWAF || null;
	let wafDetection = null;

	// Auto-detect WAF first if enabled
	if (autoDetectWAF && !detectedWAFType) {
		updateProgress(0, 0, 'Detecting WAF...', 'Auto-detecting WAF...');
		try {
			const wafResponse = await fetch(`/api/waf-detect?url=${encodeURIComponent(url)}`);
			if (wafResponse.ok) {
				const wafData = await wafResponse.json();
				if (wafData.detection && wafData.detection.detected) {
					detectedWAFType = wafData.detection.wafType;
					window.detectedWAF = detectedWAFType;
					wafDetection = wafData.detection;
					showWAFPanel(wafData);
				}
			}
		} catch (error) {
			console.warn('WAF detection failed, continuing with regular test:', error);
		}
	}

	// Get custom payloads from localStorage
	let customPayloadsData = {};
	try {
		const stored = localStorage.getItem('wafchecker_customPayloads');
		if (stored) {
			customPayloadsData = JSON.parse(stored);
		}
	} catch (e) {
		console.warn('Failed to load custom payloads:', e);
	}

	// Use streaming API for real-time progress
	const totalCategories = selectedCategories.length;
	let estimatedTotalTests = totalCategories * selectedMethods.length * 5; // Initial estimate
	let completedTests = 0;
	let currentCategory = '';
	let slowCount = 0;

	updateProgress(0, estimatedTotalTests, `Starting ${totalCategories} categories...`, 'Initializing tests...', 0);

	// Prepare live results table in the DOM
	const resultsDiv = document.getElementById('results');
	resultsDiv.innerHTML = renderReportHeader(falsePositiveTest);
	resultsDiv.scrollIntoView({ behavior: 'smooth' });

	// Get the live tbody and scrollable container to append rows into
	const liveTbody = document.getElementById('liveResultsBody');
	const liveCounterEl = document.getElementById('liveTestCounter');
	const liveScroller = document.getElementById('liveResultsScroller');

	try {
		// Use streaming endpoint
		const params = new URLSearchParams({
			url,
			methods: selectedMethods.join(','),
			categories: selectedCategories.join(','),
			followRedirect: followRedirect ? '1' : '0',
			falsePositiveTest: falsePositiveTest ? '1' : '0',
			caseSensitiveTest: caseSensitiveTest ? '1' : '0',
			enhancedPayloads: enhancedPayloads ? '1' : '0',
			useAdvancedPayloads: useAdvancedPayloads ? '1' : '0',
			autoDetectWAF: autoDetectWAF ? '1' : '0',
			useEncodingVariations: useEncodingVariations ? '1' : '0',
			httpManipulation: httpManipulation ? '1' : '0',
			detectedWAF: detectedWAFType || '',
		});

		const response = await fetch(`/api/check-stream?${params.toString()}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				payloadTemplate,
				customHeaders,
				detectedWAF: detectedWAFType,
				customPayloads: customPayloadsData,
			}),
		});

		if (!response.ok) {
			throw new Error(`Stream request failed: ${response.status}`);
		}

		const reader = response.body.getReader();
		const decoder = new TextDecoder();
		let buffer = '';
		let streamComplete = false;

		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			buffer += decoder.decode(value, { stream: true });
			const lines = buffer.split('\n');
			buffer = lines.pop() || ''; // Keep incomplete line in buffer

			for (const line of lines) {
				if (!line.trim()) continue;
				if (line.startsWith('data: ')) {
					try {
						const data = JSON.parse(line.slice(6));

						if (data.type === 'total') {
							estimatedTotalTests = data.count;
							updateProgress(0, estimatedTotalTests, 'Starting tests...', 'Initializing...', 0);
						} else if (data.type === 'result') {
							allResults.push(data.result);
							completedTests = data.completed;

							// Track slow responses
							const rt = data.result.responseTime || 0;
							if (rt >= SLOW_RESPONSE_THRESHOLD) slowCount++;

							// Update current category from result
							if (data.result.category && data.result.category !== currentCategory) {
								currentCategory = data.result.category;
							}

							// Append row to live table
							if (liveTbody) {
								liveTbody.insertAdjacentHTML('beforeend', renderResultRow(data.result, falsePositiveTest));
								// Auto-scroll the table container to show latest result
								if (liveScroller) {
									liveScroller.scrollTop = liveScroller.scrollHeight;
								}
							}

							// Update live counter (clean, no slow warning here)
							if (liveCounterEl) {
								liveCounterEl.textContent = `${completedTests} / ${estimatedTotalTests} tests completed`;
							}

							// Update slow warning in progress bar
							const slowWarningEl = document.getElementById('progressSlowWarning');
							if (slowWarningEl) {
								if (slowCount > 0) {
									slowWarningEl.textContent = `${slowCount} slow response${slowCount > 1 ? 's' : ''} (>${SLOW_RESPONSE_THRESHOLD}ms)`;
									slowWarningEl.classList.remove('hidden');
								}
							}

							// Update progress bar
							updateProgress(
								completedTests,
								estimatedTotalTests,
								currentCategory || 'Processing...',
								`${completedTests} tests completed`,
								0,
							);
						} else if (data.type === 'waf-detected') {
							if (data.waf && data.waf.detected) {
								detectedWAFType = data.waf.wafType;
								window.detectedWAF = detectedWAFType;
							}
						} else if (data.type === 'complete') {
							streamComplete = true;
							break;
						} else if (data.type === 'error') {
							throw new Error(data.message || 'Unknown error');
						}
					} catch (e) {
						console.error('Error parsing SSE data:', e, line);
					}
				}
			}

			if (streamComplete) break;
		}

		// Finalize progress
		updateProgress(completedTests, completedTests, 'Complete!', 'All tests completed!');

		// Keep slow warning visible in progress bar at completion
		const slowWarningEl = document.getElementById('progressSlowWarning');
		if (slowWarningEl && slowCount > 0) {
			slowWarningEl.textContent = `${slowCount} slow response${slowCount > 1 ? 's' : ''} (>${SLOW_RESPONSE_THRESHOLD}ms)`;
			slowWarningEl.classList.remove('hidden');
		}

		const endTime = new Date().toISOString();

		// Create test session object
		currentTestSession = {
			id: sessionId,
			url,
			startTime,
			endTime,
			totalTests: allResults.length,
			results: allResults,
			wafDetection,
			settings: {
				methods: selectedMethods,
				categories: selectedCategories,
				followRedirect,
				falsePositiveTest,
				caseSensitiveTest,
				enhancedPayloads,
				useAdvancedPayloads,
				autoDetectWAF,
				useEncodingVariations,
				httpManipulation,
			},
		};

		// Short delay to show 100% before hiding
		await new Promise((resolve) => setTimeout(resolve, 500));
		hideProgress();

		// Now render the final full report (replaces live table with summary + filters + table)
		document.getElementById('results').innerHTML = renderReport(allResults, falsePositiveTest);
		highlightCategoryCheckboxesByResults(allResults, falsePositiveTest);

		// Save to scan history
		saveScanToHistory(currentTestSession);

		// Show export controls
		showExportControls();
	} finally {
		btn.disabled = false;
		btn.textContent = oldText;
		hideProgress();
	}
}

function restoreStateFromLocalStorage() {
	// URL
	const url = localStorage.getItem('wafchecker_url');
	if (url) {
		const urlInput = document.getElementById('url');
		if (urlInput) urlInput.value = url;
	}
	// Methods
	const methods = localStorage.getItem('wafchecker_methods');
	if (methods) {
		try {
			const arr = JSON.parse(methods);
			const methodCheckboxes = document.querySelectorAll('.methods-grid input[type=checkbox]');
			methodCheckboxes.forEach((cb) => {
				cb.checked = arr.includes(cb.value);
			});
		} catch {}
	}
	// Follow redirect
	const followRedirect = localStorage.getItem('wafchecker_followRedirect');
	if (followRedirect !== null) {
		const el = document.getElementById('followRedirect');
		if (el) el.checked = !!parseInt(followRedirect, 10);
	}

	// False positive test
	const falsePositiveTest = localStorage.getItem('wafchecker_falsePositiveTest');
	if (falsePositiveTest !== null) {
		const el = document.getElementById('falsePositiveTest');
		if (el) {
			el.checked = !!parseInt(falsePositiveTest, 10);
		}
	}

	// Case sensitive test
	const caseSensitiveTest = localStorage.getItem('wafchecker_caseSensitiveTest');
	if (caseSensitiveTest !== null) {
		const el = document.getElementById('caseSensitiveTest');
		if (el) {
			el.checked = caseSensitiveTest === '1';
		}
	}

	// Enhanced payloads
	const enhancedPayloads = localStorage.getItem('wafchecker_enhancedPayloads');
	if (enhancedPayloads !== null) {
		const el = document.getElementById('enhancedPayloads');
		if (el) {
			el.checked = enhancedPayloads === '1';
		}
	}

	// Auto detect WAF
	const autoDetectWAF = localStorage.getItem('wafchecker_autoDetectWAF');
	if (autoDetectWAF !== null) {
		const el = document.getElementById('autoDetectWAF');
		if (el) {
			el.checked = autoDetectWAF === '1';
		}
	}

	// HTTP Manipulation
	const httpManipulation = localStorage.getItem('wafchecker_httpManipulation');
	if (httpManipulation !== null) {
		const el = document.getElementById('httpManipulation');
		if (el) {
			el.checked = httpManipulation === '1';
		}
	}

	// Categories
	const categories = localStorage.getItem('wafchecker_categories');
	if (categories) {
		try {
			const arr = JSON.parse(categories);
			const categoryCheckboxes = document.querySelectorAll('#categoryCheckboxes input[type=checkbox]');
			categoryCheckboxes.forEach((cb) => {
				cb.checked = arr.includes(cb.value);
			});
		} catch {}
	}
	// Payload template
	const payloadTemplate = localStorage.getItem('wafchecker_payloadTemplate');
	if (payloadTemplate) {
		const templateEl = document.getElementById('payloadTemplate');
		if (templateEl) templateEl.value = payloadTemplate;
	}

	// Custom headers
	const customHeaders = localStorage.getItem('wafchecker_customHeaders');
	if (customHeaders) {
		const headersEl = document.getElementById('customHeaders');
		if (headersEl) headersEl.value = customHeaders;
	}
}

// WAF Detection functionality
async function detectWAF() {
	// Close mobile drawer if open
	closeMobileDrawer();

	const btn = document.getElementById('detectWafBtn');
	const urlInput = document.getElementById('url');
	const url = normalizeUrl(urlInput.value);

	// Update the input field with normalized URL if it was changed
	if (url !== urlInput.value) {
		urlInput.value = url;
	}

	if (!url) {
		showAlert('Please enter a URL first', 'Missing URL', 'warning');
		return;
	}

	btn.disabled = true;
	const oldText = btn.textContent;
	btn.textContent = 'Detecting...';

	try {
		const response = await fetch(`/api/waf-detect?url=${encodeURIComponent(url)}`);
		const data = await response.json();

		if (response.ok) {
			displayWAFDetectionResults(data);
			showWAFPanel(data);
		} else {
			showAlert(`WAF Detection failed: ${data.error || 'Unknown error'}`, 'Error', 'error');
		}
	} catch (error) {
		console.error('WAF Detection error:', error);
		showAlert('WAF Detection failed. Please check the console for details.', 'Error', 'error');
	} finally {
		btn.disabled = false;
		btn.textContent = oldText;
	}
}

function displayWAFDetectionResults(data) {
	const resultsDiv = document.getElementById('results');
	const det = data.detection || {};
	const isBlocking = det.isActivelyBlocking === true;
	const isDefaultSecurity = det.hasDefaultSecurity === true;
	const infraName = det.infrastructure || null;

	let html = `<div class="bg-cyber-card border border-cyber-accent/30 rounded-xl overflow-hidden mb-4">
		<div class="flex items-center gap-3 p-4 border-b border-cyber-accent/20 bg-cyber-accent/10">
			<div class="w-10 h-10 rounded-lg bg-cyber-accent/20 flex items-center justify-center">
				<svg class="w-5 h-5 text-cyber-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
				</svg>
			</div>
			<div>
				<h3 class="text-sm font-bold text-cyber-accent">WAF Detection Results</h3>
				<p class="text-xs text-gray-400">Three-phase detection: passive + active + evasion confirmation</p>
			</div>
		</div>

		<div class="p-4">
			<!-- Explanation Section -->
			<div class="mb-4 p-3 bg-cyber-accent/5 border border-cyber-accent/20 rounded-lg">
				<p class="text-xs text-gray-300 leading-relaxed mb-2">
					<strong class="text-cyber-accent">How does detection work?</strong> Three phases are used to avoid false positives:
				</p>
				<ul class="text-xs text-gray-400 space-y-1 ml-4 list-disc">
					<li><strong class="text-white">Phase 1 — Passive</strong>: A clean request identifies the CDN/infrastructure via response headers</li>
					<li><strong class="text-white">Phase 2 — Active</strong>: Obvious attack payloads (SQLi, XSS, LFI) are sent and responses compared against the baseline</li>
					<li><strong class="text-white">Phase 3 — Evasion</strong>: If probes are blocked, obfuscated payloads (comment injection, alternative syntax) are sent to distinguish default CDN security from active WAF rules</li>
				</ul>
				<p class="text-xs text-gray-400 mt-2 italic">
					A WAF is confirmed as "actively configured" only when evasion probes are also blocked, indicating custom rules beyond default CDN protection.
				</p>
			</div>`;

	// Baseline vs Probe status indicator
	if (det.baselineStatus !== undefined) {
		const baseStatus = det.baselineStatus;
		const prbStatus = det.probeStatus !== undefined ? det.probeStatus : baseStatus;
		const statusChanged = baseStatus !== prbStatus;

		html += `<div class="mb-4 p-3 bg-cyber-bg/50 border border-gray-600/30 rounded-lg">
			<p class="text-xs font-bold text-gray-300 mb-2">Request Comparison</p>
			<div class="flex items-center gap-3 flex-wrap">
				<div class="flex items-center gap-2">
					<span class="text-xs text-gray-400">Clean request:</span>
					<span class="px-2 py-0.5 rounded text-xs font-mono font-bold ${baseStatus < 400 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}">${baseStatus}</span>
				</div>
				<svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
				<div class="flex items-center gap-2">
					<span class="text-xs text-gray-400">With payload:</span>
					<span class="px-2 py-0.5 rounded text-xs font-mono font-bold ${prbStatus < 400 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}">${prbStatus}</span>
				</div>
				${
					statusChanged
						? '<span class="ml-2 px-2 py-0.5 rounded text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30">BLOCKED</span>'
						: '<span class="ml-2 px-2 py-0.5 rounded text-xs font-bold bg-gray-500/20 text-gray-400 border border-gray-500/30">NOT BLOCKED</span>'
				}
			</div>
		</div>`;
	}

	// Detection results — 4 possible states:
	// 1. isBlocking: WAF with active rules (evasion probes also blocked) → RED
	// 2. isDefaultSecurity: CDN default security only (evasion probes passed) → ORANGE
	// 3. detected but not blocking: CDN present, nothing blocked → CYAN
	// 4. not detected: no signatures found → GREEN
	if (det.detected) {
		if (isBlocking) {
			// Case 1: Active WAF rules confirmed — RED alert
			html += `<div class="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
				<div class="flex items-center gap-3 mb-2">
					<svg class="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
					</svg>
					<div>
						<h4 class="text-sm font-bold text-red-400">WAF Actively Blocking: ${escapeHtml(det.wafType)}</h4>
						<p class="text-xs text-gray-400">Confidence: <strong class="text-white">${det.confidence}%</strong> — Active WAF rules confirmed (evasion probes also blocked)</p>
					</div>
				</div>`;

			if (infraName && infraName !== det.wafType) {
				html += `<p class="text-xs text-gray-400 mb-2">Infrastructure: <strong class="text-cyan-400">${escapeHtml(infraName)}</strong> (CDN), blocking WAF: <strong class="text-red-400">${escapeHtml(det.wafType)}</strong></p>`;
			}
		} else if (isDefaultSecurity) {
			// Case 2: CDN default security only — ORANGE/YELLOW alert
			html += `<div class="mb-4 p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
				<div class="flex items-center gap-3 mb-2">
					<svg class="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
					</svg>
					<div>
						<h4 class="text-sm font-bold text-orange-400">CDN Default Security: ${escapeHtml(det.wafType)}</h4>
						<p class="text-xs text-gray-400">Confidence: <strong class="text-white">${det.confidence}%</strong> — <strong class="text-orange-400">No active WAF rules</strong></p>
					</div>
				</div>
				<p class="text-xs text-gray-400 mb-2">The target uses <strong class="text-orange-400">${escapeHtml(det.wafType)}</strong> as CDN/proxy. Obvious attack payloads are blocked by <strong>standard CDN protection</strong>, but evasion techniques pass through.</p>
				<p class="text-xs text-gray-400 italic">This indicates default security settings — no custom WAF rules are configured. This is normal behavior for most CDN providers.</p>`;
		} else {
			// Case 3: CDN/infra detected but NOT blocking at all — CYAN/info
			html += `<div class="mb-4 p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
				<div class="flex items-center gap-3 mb-2">
					<svg class="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
					</svg>
					<div>
						<h4 class="text-sm font-bold text-cyan-400">CDN/Infrastructure Detected: ${escapeHtml(det.wafType)}</h4>
						<p class="text-xs text-gray-400">Confidence: <strong class="text-white">${det.confidence}%</strong> — <strong class="text-green-400">Probes were NOT blocked</strong></p>
					</div>
				</div>
				<p class="text-xs text-gray-400">The target uses <strong class="text-cyan-400">${escapeHtml(det.wafType)}</strong> as CDN/proxy, but neither basic nor advanced attack payloads are blocked.</p>`;
		}

		if (det.evidence && det.evidence.length > 0) {
			html += `<div class="mt-3">
				<p class="text-xs font-bold text-gray-300 mb-2">Evidence:</p>
				<ul class="space-y-1">`;
			det.evidence.forEach((evidence) => {
				const isInfra =
					evidence.includes('infrastructure') ||
					evidence.includes('clean response') ||
					evidence.includes('default') ||
					evidence.includes('CDN');
				const isEvasion = evidence.includes('vasion') || evidence.includes('passed through');
				let codeClass = 'bg-cyber-bg/50 text-gray-300';
				if (isEvasion) codeClass = 'bg-orange-900/30 text-orange-300';
				else if (isInfra) codeClass = 'bg-cyan-900/30 text-cyan-300';
				html += `<li class="text-xs text-gray-400"><code class="${codeClass} px-2 py-0.5 rounded">${escapeHtml(evidence)}</code></li>`;
			});
			html += `</ul></div>`;
		}

		if (isBlocking && det.suggestedBypassTechniques && det.suggestedBypassTechniques.length > 0) {
			html += `<div class="mt-3">
				<p class="text-xs font-bold text-cyber-warning mb-2">Suggested Bypass Techniques:</p>
				<ul class="space-y-1">`;
			det.suggestedBypassTechniques.forEach((technique) => {
				html += `<li class="text-xs text-gray-400">&bull; ${escapeHtml(technique)}</li>`;
			});
			html += `</ul></div>`;
		}

		html += `</div>`;
	} else {
		// Case 4: Nothing detected
		html += `<div class="mb-4 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
			<div class="flex items-center gap-3">
				<svg class="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
				</svg>
				<div>
					<p class="text-sm font-bold text-green-400">No WAF detected</p>
					<p class="text-xs text-gray-400">No WAF/CDN signatures found and probes were not blocked</p>
				</div>
			</div>
		</div>`;
	}

	// Bypass opportunities
	if (data.bypassOpportunities) {
		html += `<div class="mb-4">
			<p class="text-xs font-bold text-gray-300 mb-3">Bypass Opportunities:</p>
			<div class="grid grid-cols-2 gap-2">`;

		const opportunities = [
			{ key: 'httpMethodsBypass', label: 'HTTP Method Bypass', icon: '🔀' },
			{ key: 'headerBypass', label: 'Header Bypass', icon: '📋' },
			{ key: 'encodingBypass', label: 'Encoding Bypass', icon: '🔤' },
			{ key: 'parameterPollution', label: 'Parameter Pollution', icon: '🔁' },
		];

		opportunities.forEach((opp) => {
			const status = data.bypassOpportunities[opp.key];
			const bgClass = status ? 'bg-cyber-warning/20 border-cyber-warning/30' : 'bg-gray-500/10 border-gray-500/20';
			const textClass = status ? 'text-cyber-warning' : 'text-gray-500';
			const statusText = status ? 'Possible' : 'Not detected';

			html += `<div class="p-2 border rounded-lg ${bgClass}">
				<div class="flex items-center gap-2">
					<span class="text-xs">${opp.icon}</span>
					<span class="text-xs font-bold ${textClass}">${opp.label}</span>
				</div>
				<p class="text-xs text-gray-400 mt-1">${statusText}</p>
			</div>`;
		});

		html += `</div></div>`;
	}

	html += `</div></div>`;
	resultsDiv.innerHTML = html;
	// Hide export controls (not relevant for WAF detection)
	const exportControls = document.getElementById('exportControls');
	if (exportControls) exportControls.style.display = 'none';
}

function showWAFPanel(data) {
	const panel = document.getElementById('wafDetectionPanel');
	const resultsDiv = document.getElementById('wafDetectionResults');

	if (!panel || !resultsDiv) return;

	let html = '';
	const det = data.detection;

	if (det && det.detected) {
		if (det.isActivelyBlocking) {
			// Active WAF — red badge
			html = `<div class="d-flex align-items-center justify-content-between">
				<div>
					<strong>${det.wafType}</strong> detected
					<span class="badge bg-danger ms-2">${det.confidence}% confidence</span>
					<span class="badge bg-danger ms-1">WAF Active</span>
				</div>
			</div>`;
			window.detectedWAF = det.wafType;

			// Auto-enable advanced payloads if active WAF detected
			const advancedCheckbox = document.getElementById('useAdvancedPayloadsCheckbox');
			if (advancedCheckbox) {
				advancedCheckbox.checked = true;
			}
		} else if (det.hasDefaultSecurity) {
			// Default CDN security — orange badge
			html = `<div class="d-flex align-items-center justify-content-between">
				<div>
					<strong>${det.wafType}</strong> detected
					<span class="badge bg-warning text-dark ms-2">${det.confidence}% confidence</span>
					<span class="badge bg-warning text-dark ms-1">Default Security</span>
				</div>
			</div>`;
			window.detectedWAF = null; // Not a real WAF
		} else {
			// CDN detected, not blocking — info badge
			html = `<div class="d-flex align-items-center justify-content-between">
				<div>
					<strong>${det.wafType}</strong> detected
					<span class="badge bg-info ms-2">${det.confidence}% confidence</span>
					<span class="badge bg-info ms-1">CDN Only</span>
				</div>
			</div>`;
			window.detectedWAF = null;
		}
	} else {
		html = '<div>No WAF detected with high confidence</div>';
		window.detectedWAF = null;
	}

	resultsDiv.innerHTML = html;
	panel.style.display = 'block';
}

function hideWAFPanel() {
	const panel = document.getElementById('wafDetectionPanel');
	if (panel) {
		panel.style.display = 'none';
	}
}

function useAdvancedPayloads() {
	const checkbox = document.getElementById('useAdvancedPayloadsCheckbox');
	const encodingCheckbox = document.getElementById('useEncodingVariations');

	if (checkbox) checkbox.checked = true;
	if (encodingCheckbox) encodingCheckbox.checked = true;

	showAlert('Advanced payloads enabled! Run the test to see WAF-specific bypass techniques.', 'Success', 'success');
}

function clearWAFResults() {
	const resultsDiv = document.getElementById('results');
	const wafCards = resultsDiv.querySelectorAll('.card:has(.card-header h3:contains("WAF Detection"))');
	wafCards.forEach((card) => card.remove());

	hideWAFPanel();
	window.detectedWAF = null;
}

// HTTP Manipulation Testing
async function testHTTPManipulation() {
	// Close mobile drawer if open
	closeMobileDrawer();

	const btn = document.getElementById('httpManipulationBtn');
	const urlInput = document.getElementById('url');
	const url = normalizeUrl(urlInput.value);

	// Update the input field with normalized URL if it was changed
	if (url !== urlInput.value) {
		urlInput.value = url;
	}

	if (!url) {
		showAlert('Please enter a URL first', 'Missing URL', 'warning');
		return;
	}

	btn.disabled = true;
	const oldText = btn.textContent;
	btn.textContent = 'Testing...';

	try {
		const response = await fetch(`/api/http-manipulation?url=${encodeURIComponent(url)}`);
		const data = await response.json();

		if (response.ok) {
			displayHTTPManipulationResults(data);
		} else {
			showAlert(`HTTP Manipulation test failed: ${data.error || 'Unknown error'}`, 'Error', 'error');
		}
	} catch (error) {
		console.error('HTTP Manipulation test error:', error);
		showAlert('HTTP Manipulation test failed. Please check the console for details.', 'Error', 'error');
	} finally {
		btn.disabled = false;
		btn.textContent = oldText;
	}
}

function displayHTTPManipulationResults(data) {
	const resultsDiv = document.getElementById('results');

	let html = `<div class="flex items-center justify-between mb-4 p-4 bg-cyber-card border border-cyber-warning/30 rounded-xl">
		<div class="flex items-center gap-3">
			<div class="w-10 h-10 rounded-lg bg-cyber-warning/20 flex items-center justify-center">
				<svg class="w-5 h-5 text-cyber-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/>
				</svg>
			</div>
			<div>
				<h3 class="text-sm font-bold text-cyber-warning">HTTP Manipulation Test</h3>
				<p class="text-xs text-gray-400">Testing WAF bypass via protocol manipulation</p>
			</div>
		</div>
		<div class="flex items-center gap-4 text-xs">
			<span class="flex items-center gap-2 px-3 py-1.5 bg-cyber-success/20 rounded-lg">
				<span class="w-2 h-2 rounded-full bg-cyber-success"></span>
				<span class="text-cyber-success font-medium">403 = Protected</span>
			</span>
			<span class="flex items-center gap-2 px-3 py-1.5 bg-cyber-danger/20 rounded-lg">
				<span class="w-2 h-2 rounded-full bg-cyber-danger"></span>
				<span class="text-cyber-danger font-medium">200 = Bypass</span>
			</span>
			<button onclick="showHttpCodesModal('httpManip')" class="px-3 py-1.5 bg-cyber-accent/10 hover:bg-cyber-accent/20 text-cyber-accent text-xs font-medium rounded-lg transition-all border border-cyber-accent/30 hover:border-cyber-accent">
				Show all HTTP codes
			</button>
		</div>
	</div>
	<div class="mb-4 p-3 bg-cyber-warning/5 border border-cyber-warning/20 rounded-lg">
		<p class="text-xs text-gray-300 leading-relaxed">
			<strong class="text-cyber-warning">What is HTTP Manipulation?</strong> This test checks if your WAF can be <strong class="text-cyber-danger">bypassed</strong> by manipulating the HTTP protocol instead of using malicious payloads.
			It tests techniques like <strong class="text-white">HTTP Verb Tampering</strong> (using non-standard methods like PATCH, TRACE), <strong class="text-white">Parameter Pollution</strong> (sending duplicate parameters), and <strong class="text-white">Content-Type Confusion</strong>.
			<strong class="text-cyber-success">Status 403 (green)</strong> means the WAF blocked the manipulation.
			<strong class="text-cyber-danger">Status 200 (red)</strong> means the request succeeded - the WAF can be <strong class="text-cyber-danger">bypassed</strong> with this technique.
		</p>
	</div>

	<div class="bg-cyber-card border border-cyber-warning/30 rounded-xl overflow-hidden mb-4">`;

	if (data.results && data.results.length > 0) {
		html += `<div class="overflow-x-auto">
			<table class="w-full text-sm">
				<thead>
					<tr class="bg-cyber-elevated/50 border-b border-cyber-accent/20">
						<th class="px-5 py-3 text-left text-xs font-bold text-gray-400 uppercase">Technique</th>
						<th class="px-4 py-3 text-center text-xs font-bold text-gray-400 uppercase">Method</th>
						<th class="px-4 py-3 text-center text-xs font-bold text-gray-400 uppercase">Status</th>
						<th class="px-4 py-3 text-center text-xs font-bold text-gray-400 uppercase">Result</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-cyber-accent/10">`;

		data.results.forEach((result) => {
			const statusStr = String(result.status);
			const isError = statusStr === 'ERR' || statusStr === 'error' || statusStr === 'Error';
			const codeNum = isError ? NaN : parseInt(statusStr, 10);
			let statusBg = 'bg-gray-500/20 text-gray-400';
			let rowBgColor = '';
			let borderColor = '';

			// Handle errors first (orange)
			if (isError || isNaN(codeNum)) {
				statusBg = 'bg-orange-500/20 text-orange-400';
				rowBgColor = 'rgba(249, 115, 22, 0.2)'; // orange-500 with 20% opacity
				borderColor = '#f97316'; // orange-500
			} else if (codeNum >= 200 && codeNum < 300) {
				statusBg = 'bg-cyber-danger/20 text-cyber-danger';
				// For HTTP manipulation, 200 = bypass = red
				rowBgColor = 'rgba(239, 68, 68, 0.2)'; // red-500 with 20% opacity
				borderColor = '#ef4444'; // red-500
			} else if (codeNum === 403) {
				statusBg = 'bg-cyber-success/20 text-cyber-success';
				// 403 = blocked = green
				rowBgColor = 'rgba(34, 197, 94, 0.2)'; // green-500 with 20% opacity
				borderColor = '#22c55e'; // green-500
			} else if (codeNum >= 300 && codeNum < 400) {
				statusBg = 'bg-cyber-warning/20 text-cyber-warning';
				rowBgColor = 'rgba(249, 115, 22, 0.2)'; // orange-500 with 20% opacity
				borderColor = '#f97316'; // orange-500
			} else if (codeNum >= 400 && codeNum < 500 && codeNum !== 403) {
				statusBg = 'bg-cyber-warning/20 text-cyber-warning';
				rowBgColor = 'rgba(249, 115, 22, 0.2)'; // orange-500 with 20% opacity
				borderColor = '#f97316'; // orange-500
			} else {
				rowBgColor = 'rgba(107, 114, 128, 0.1)'; // gray-500 with 10% opacity
				borderColor = '#6b7280'; // gray-500
			}

			// Determine if bypass occurred based on status code
			// For HTTP manipulation: 200 = potential bypass, 403 = blocked, others = error/redirect
			let resultText;
			let resultBg;

			if (!isError && !isNaN(codeNum)) {
				if (codeNum >= 200 && codeNum < 300) {
					// Status 200 = request succeeded = potential bypass
					resultText = 'Potential Bypass';
					resultBg = 'bg-cyber-warning/20 text-cyber-warning';
					// Already set to red above
				} else if (codeNum === 403) {
					// Status 403 = WAF blocked = good
					resultText = 'Blocked';
					resultBg = 'bg-cyber-success/20 text-cyber-success';
					// Already set to green above
				} else if (codeNum >= 300 && codeNum < 400) {
					// Redirect
					resultText = 'Redirect';
					resultBg = 'bg-orange-500/20 text-orange-400';
				} else if (codeNum >= 400 && codeNum < 500) {
					// Other 4xx errors
					resultText = 'Error';
					resultBg = 'bg-orange-500/20 text-orange-400';
				} else {
					resultText = 'Unknown';
					resultBg = 'bg-gray-500/20 text-gray-400';
				}
			} else {
				// Error case
				resultText = 'Error';
				resultBg = 'bg-orange-500/20 text-orange-400';
			}

			const rowStyle = `background-color: ${rowBgColor}; border-left: 4px solid ${borderColor};`;
			const methodDisplay = result.method && result.method !== 'undefined' ? result.method : result.technique || 'N/A';
			html += `<tr style="${rowStyle}" class="hover:brightness-110 transition-all">
				<td class="px-4 py-2.5 text-gray-300">${escapeHtml(result.testType || result.technique || 'Unknown')}</td>
				<td class="px-4 py-2.5 text-center">
					<span class="px-2 py-0.5 bg-cyber-accent/10 text-cyber-accent text-xs font-mono rounded">${escapeHtml(methodDisplay)}</span>
				</td>
				<td class="px-4 py-2.5 text-center">
					<span class="px-2 py-0.5 ${statusBg} text-xs font-bold rounded cursor-pointer hover:brightness-125 transition-all" onclick="showHttpCodesModal('httpManip')">${result.status}</span>
				</td>
				<td class="px-4 py-2.5 text-center">
					<span class="px-2 py-1 ${resultBg} text-xs font-bold rounded">${resultText}</span>
				</td>
			</tr>`;
		});

		html += '</tbody></table></div>';
	} else {
		html += `<div class="p-4 text-center text-gray-400 text-sm">No HTTP manipulation tests performed.</div>`;
	}

	html += '</div>';
	resultsDiv.innerHTML = html;
	// Hide export controls (not relevant for HTTP manipulation)
	const exportControls = document.getElementById('exportControls');
	if (exportControls) exportControls.style.display = 'none';
}

// HTTP Manipulation Testing functionality
async function testHTTPManipulation() {
	// Close mobile drawer if open
	closeMobileDrawer();

	const btn = document.getElementById('httpManipulationBtn');
	const url = normalizeUrl(document.getElementById('url').value);

	if (!url) {
		showAlert('Please enter a URL first', 'Missing URL', 'warning');
		return;
	}

	btn.disabled = true;
	const oldText = btn.textContent;
	btn.textContent = 'Testing...';

	try {
		const response = await fetch(`/api/http-manipulation?url=${encodeURIComponent(url)}`);
		const data = await response.json();

		if (response.ok) {
			displayHTTPManipulationResults(data);
		} else {
			showAlert(`HTTP Manipulation test failed: ${data.error || 'Unknown error'}`, 'Error', 'error');
		}
	} catch (error) {
		console.error('HTTP Manipulation test error:', error);
		showAlert('HTTP Manipulation test failed. Please check the console for details.', 'Error', 'error');
	} finally {
		btn.disabled = false;
		btn.textContent = oldText;
	}
}

// Toggle all categories - switches between all selected and none selected
function toggleAllCategories() {
	const checkboxes = document.querySelectorAll('#categoryCheckboxes input[type=checkbox]');
	const allChecked = Array.from(checkboxes).every((cb) => cb.checked);
	const toggleBtn = document.getElementById('toggleAllCategoriesBtn');

	checkboxes.forEach((cb) => {
		cb.checked = !allChecked;
	});

	// Update button icon
	if (toggleBtn) {
		const svg = toggleBtn.querySelector('svg');
		if (svg) {
			if (allChecked) {
				// Show "select all" icon (list with checks)
				svg.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>';
			} else {
				// Show "deselect all" icon (X marks)
				svg.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>';
			}
		}
	}
}

// =============================================
// API DOCUMENTATION PANEL (slide-down)
// =============================================
let _apiPanelOpen = false;

function showAPIDocsModal() {
	openAPIPanel();
}

function openAPIPanel() {
	const panel = document.getElementById('apiDocsPanel');
	const sheet = document.getElementById('apiDocsSheet');
	const backdrop = document.getElementById('apiDocsBackdrop');
	if (!panel || !sheet) return;
	if (_apiPanelOpen) return;
	_apiPanelOpen = true;

	// Hide main header and disclaimer so only API panel is visible
	document.body.classList.add('api-panel-open');

	// Render content first
	renderAPIDocsContent();

	// Show container
	panel.style.visibility = 'visible';
	document.body.style.overflow = 'hidden';

	// Trigger animation on next frame
	requestAnimationFrame(() => {
		sheet.style.transform = 'translateY(0)';
		if (backdrop) backdrop.style.background = 'rgba(0,0,0,.55)';
	});
}

function closeAPIPanel() {
	const panel = document.getElementById('apiDocsPanel');
	const sheet = document.getElementById('apiDocsSheet');
	const backdrop = document.getElementById('apiDocsBackdrop');
	if (!panel || !sheet || !_apiPanelOpen) return;
	_apiPanelOpen = false;

	// Restore main header and disclaimer
	document.body.classList.remove('api-panel-open');

	// Animate out
	sheet.style.transform = 'translateY(-100%)';
	if (backdrop) backdrop.style.background = 'rgba(0,0,0,0)';

	// Hide after animation
	setTimeout(() => {
		if (!_apiPanelOpen) {
			panel.style.visibility = 'hidden';
			document.body.style.overflow = '';
		}
	}, 400);
}

// Close on Escape key
document.addEventListener('keydown', function (e) {
	if (e.key === 'Escape' && _apiPanelOpen) closeAPIPanel();
});

function renderAPIDocsContent() {
	const body = document.getElementById('apiDocsBody');
	if (!body) return;

	const baseUrl = window.location.origin + '/api/v1';

	const endpoints = [
		{
			id: 'waf-checker',
			path: '/waf-checker',
			color: '#00d9ff',
			label: 'WAF Checker',
			icon: '🛡️',
			desc: 'Run WAF payload tests with all advanced options: method selection, payload categories, encoding variations, auto WAF detection and bypass adaptation.',
			params: [
				{ name: 'url', required: true, type: 'string', desc: 'Target URL' },
				{
					name: 'methods',
					required: false,
					type: 'string',
					desc: 'HTTP methods (comma-separated)',
					default: 'GET',
					example: 'GET,POST,PUT',
				},
				{ name: 'categories', required: false, type: 'string', desc: 'Payload categories to test (comma-separated)' },
				{ name: 'page', required: false, type: 'number', desc: 'Pagination (50 results/page)', default: '0' },
				{ name: 'followRedirect', required: false, type: '0|1', desc: 'Follow HTTP redirects' },
				{ name: 'falsePositiveTest', required: false, type: '0|1', desc: 'Include false-positive control payloads' },
				{ name: 'caseSensitiveTest', required: false, type: '0|1', desc: 'Test case-sensitivity of WAF rules' },
				{ name: 'enhancedPayloads', required: false, type: '0|1', desc: 'Enhanced payload set with encoding variations' },
				{ name: 'advancedPayloads', required: false, type: '0|1', desc: 'Advanced WAF bypass payloads' },
				{ name: 'autoDetectWAF', required: false, type: '0|1', desc: 'Auto-detect WAF and adapt payloads' },
				{ name: 'encodingVariations', required: false, type: '0|1', desc: 'URL, double-URL, Unicode encoding' },
				{ name: 'httpManipulation', required: false, type: '0|1', desc: 'Verb tampering, param pollution, etc.' },
				{ name: 'detectedWAF', required: false, type: 'string', desc: 'Pre-detected WAF name for adaptation' },
				{ name: 'payloadTemplate', required: false, type: 'string', desc: 'Custom JSON body (use {{payload}})' },
				{ name: 'headers', required: false, type: 'string', desc: 'Custom HTTP headers' },
			],
			curlSuffix: '&methods=GET,POST&followRedirect=1',
		},
		{
			id: 'recon',
			path: '/recon',
			color: '#10b981',
			label: 'Full Recon',
			icon: '🔍',
			desc: 'Comprehensive reconnaissance: DNS records, WHOIS/RDAP, technologies, SSL/TLS, subdomains, reverse IP, security headers.',
			params: [{ name: 'url', required: true, type: 'string', desc: 'Target URL' }],
		},
		{
			id: 'security-headers',
			path: '/security-headers',
			color: '#a855f7',
			label: 'Security Headers',
			icon: '🔒',
			desc: 'Audit HTTP security headers with individual grades, missing headers detection and actionable recommendations.',
			params: [{ name: 'url', required: true, type: 'string', desc: 'Target URL' }],
		},
		{
			id: 'speedtest',
			path: '/speedtest',
			color: '#f59e0b',
			label: 'Speed Test',
			icon: '⚡',
			desc: 'Performance analysis: DNS/TTFB timing, estimated Core Web Vitals, resource breakdown, Lighthouse-style scores and optimization advice.',
			params: [{ name: 'url', required: true, type: 'string', desc: 'Target URL' }],
		},
		{
			id: 'seo',
			path: '/seo',
			color: '#84cc16',
			label: 'SEO Audit',
			icon: '📊',
			desc: 'Full SEO audit: meta tags, headings, internal/external links, sitemap, robots.txt, structured data, accessibility, keyword density.',
			params: [{ name: 'url', required: true, type: 'string', desc: 'Target URL' }],
		},
		{
			id: 'http-manipulation',
			path: '/http-manipulation',
			color: '#ef4444',
			label: 'HTTP Manipulation',
			icon: '🧪',
			desc: 'Test HTTP manipulation techniques: verb tampering, parameter pollution, content-type confusion, host header injection.',
			params: [{ name: 'url', required: true, type: 'string', desc: 'Target URL' }],
		},
	];

	let html = `<div style="max-width:960px;margin:0 auto;padding:1.5rem 1.25rem">`;
	/* ── Hero ── */
	html += `
	<div style="text-align:center;margin-bottom:1.25rem">
		<h1 style="font-size:1.4rem;font-weight:800;color:#e5e7eb;margin:0 0 .35rem">Public API</h1>
		<p style="font-size:.75rem;color:#6b7280;max-width:480px;margin:0 auto">All tools via REST. JSON, no auth, rate-limited.</p>
	</div>`;
	/* ── TOP: Rate Limit, Auth, Format + Error codes ── */
	html += `
	<div style="background:linear-gradient(145deg,#0f1419 0%,#0a0e12 100%);border:1px solid rgba(0,217,255,.08);border-radius:12px;padding:1rem 1.25rem;margin-bottom:1.5rem">
		<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1rem;margin-bottom:1rem">
			<div style="display:flex;align-items:flex-start;gap:10px">
				<div style="width:28px;height:28px;border-radius:8px;background:rgba(245,158,11,.12);border:1px solid rgba(245,158,11,.25);flex-shrink:0;display:flex;align-items:center;justify-content:center">
					<svg style="width:14px;height:14px;color:#f59e0b" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
				</div>
				<div>
					<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#6b7280;margin-bottom:4px">Rate Limit</div>
					<div style="font-size:1.1rem;font-weight:800;color:#f59e0b;line-height:1.2">1 req/min/IP</div>
					<div style="font-size:10px;color:#4b5563;margin-top:4px">Headers: <code style="color:#6b7280;font-size:9px">X-RateLimit-Limit</code> &bull; <code style="color:#6b7280;font-size:9px">Remaining</code> &bull; <code style="color:#6b7280;font-size:9px">Reset</code></div>
				</div>
			</div>
			<div style="display:flex;align-items:flex-start;gap:10px">
				<div style="width:28px;height:28px;border-radius:8px;background:rgba(16,185,129,.12);border:1px solid rgba(16,185,129,.25);flex-shrink:0;display:flex;align-items:center;justify-content:center">
					<svg style="width:14px;height:14px;color:#10b981" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"/></svg>
				</div>
				<div>
					<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#6b7280;margin-bottom:4px">Auth</div>
					<div style="font-size:.8rem;color:#d1d5db;line-height:1.4">No key needed. <span style="color:#10b981;font-weight:600">Public API</span>. URL auto-normalized.</div>
				</div>
			</div>
			<div style="display:flex;align-items:flex-start;gap:10px">
				<div style="width:28px;height:28px;border-radius:8px;background:rgba(6,182,212,.12);border:1px solid rgba(6,182,212,.25);flex-shrink:0;display:flex;align-items:center;justify-content:center">
					<svg style="width:14px;height:14px;color:#06b6d4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
				</div>
				<div>
					<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#6b7280;margin-bottom:4px">Format</div>
					<div style="font-size:.8rem;color:#d1d5db;line-height:1.4"><code style="color:#06b6d4;font-weight:600">JSON</code>. Use <code style="color:#6b7280">jq .</code> or <code style="color:#6b7280">-o file.json</code></div>
				</div>
			</div>
		</div>
		<div style="border-top:1px solid rgba(255,255,255,.06);padding-top:10px;display:flex;flex-wrap:wrap;align-items:center;gap:8px">
			<span style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#4b5563;margin-right:4px">Errors</span>
			${[
				{ code: '400', color: '#f59e0b', label: 'Bad param' },
				{ code: '404', color: '#f59e0b', label: 'Not found' },
				{ code: '429', color: '#ef4444', label: 'Rate limit' },
				{ code: '500', color: '#ef4444', label: 'Server error' },
				{ code: '502', color: '#ef4444', label: 'Unreachable' },
			]
				.map(
					(
						e,
					) => `<span style="display:inline-flex;align-items:center;gap:6px;background:rgba(0,0,0,.25);border:1px solid ${e.color}22;border-radius:6px;padding:4px 10px;font-size:11px">
				<code style="font-weight:700;font-family:monospace;color:${e.color}">${e.code}</code>
				<span style="color:#9ca3af">${e.label}</span>
			</span>`,
				)
				.join('')}
		</div>
	</div>`;

	/* ── Target URL input ── */
	html += `
	<div style="background:#111720;border:1px solid rgba(0,217,255,.12);border-radius:10px;padding:12px 16px;margin-bottom:1.5rem;display:flex;align-items:center;gap:10px;flex-wrap:wrap">
		<label style="font-size:.65rem;text-transform:uppercase;letter-spacing:.08em;color:#4b5563;font-weight:700;white-space:nowrap">Target</label>
		<div style="flex:1;min-width:180px">
			<input id="apiDocsDomain" type="text" value="https://example.com" spellcheck="false"
				style="width:100%;background:#0b0f15;border:1px solid rgba(0,217,255,.18);border-radius:6px;padding:7px 12px;font-family:monospace;font-size:.82rem;color:#00d9ff;outline:none;transition:border-color .2s"
				onfocus="this.style.borderColor='rgba(0,217,255,.5)'" onblur="this.style.borderColor='rgba(0,217,255,.18)'"
				oninput="updateApiExamples()" />
		</div>
		<span style="font-size:.6rem;color:#374151;white-space:nowrap">&#x2190; modifies all curl below</span>
	</div>`;

	/* ── Base URL ── */
	html += `
	<div style="display:flex;align-items:center;gap:8px;margin-bottom:1.5rem;font-size:.72rem">
		<span style="color:#4b5563">Base URL</span>
		<code style="color:#00d9ff;font-family:monospace;background:#0d1117;border:1px solid rgba(0,217,255,.12);padding:4px 10px;border-radius:6px">${baseUrl}</code>
	</div>`;

	/* ── Endpoints ── */
	for (const ep of endpoints) {
		const suffix = ep.curlSuffix || '';
		const hasAdvanced = ep.params.length > 1;

		html += `
		<div style="background:#0d1117;border:1px solid ${ep.color}20;border-radius:10px;overflow:hidden;margin-bottom:12px" id="ep-${ep.id}">
			<!-- Header row -->
			<div style="display:flex;align-items:center;padding:10px 16px;gap:10px;background:${ep.color}06">
				<span style="font-size:13px">${ep.icon}</span>
				<span style="background:${ep.color}15;color:${ep.color};font-size:10px;font-weight:700;font-family:monospace;padding:2px 7px;border-radius:4px">GET</span>
				<code style="font-size:.8rem;color:#e5e7eb;font-weight:600;font-family:monospace">/api/v1${ep.path}</code>
				<span style="margin-left:auto;font-size:.68rem;color:#4b5563;font-weight:600">${ep.label}</span>
			</div>
			<!-- Body -->
			<div style="padding:12px 16px 14px">
				<p style="font-size:.73rem;color:#6b7280;margin:0 0 10px;line-height:1.5">${ep.desc}</p>`;

		/* ── Parameters table ── */
		if (hasAdvanced) {
			html += `
				<details style="margin-bottom:10px">
					<summary style="font-size:.65rem;text-transform:uppercase;letter-spacing:.06em;color:#4b5563;font-weight:700;cursor:pointer;padding:4px 0;user-select:none">
						Parameters <span style="color:#374151">(${ep.params.length})</span>
					</summary>
					<div style="margin-top:6px;border:1px solid #1e293b;border-radius:8px;overflow:hidden;background:#080c12">
						<table style="width:100%;border-collapse:collapse;font-size:.7rem">
							<thead><tr style="border-bottom:1px solid #1e293b">
								<th style="text-align:left;padding:6px 10px;color:#4b5563;font-weight:600">Param</th>
								<th style="text-align:left;padding:6px 10px;color:#4b5563;font-weight:600">Type</th>
								<th style="text-align:left;padding:6px 10px;color:#4b5563;font-weight:600">Description</th>
							</tr></thead>
							<tbody>
								${ep.params
									.map(
										(p) => `<tr style="border-bottom:1px solid #1e293b10">
									<td style="padding:5px 10px;white-space:nowrap"><code style="color:${p.required ? '#00d9ff' : '#6b7280'};font-weight:${p.required ? '600' : '400'}">${p.name}</code>${p.required ? '<span style="color:#ef4444;font-size:8px;margin-left:3px">*</span>' : ''}</td>
									<td style="padding:5px 10px;color:#374151;font-family:monospace;font-size:.65rem">${p.type}</td>
									<td style="padding:5px 10px;color:#6b7280">${p.desc}${p.default ? ` <span style="color:#374151">(default: ${p.default})</span>` : ''}</td>
								</tr>`,
									)
									.join('')}
							</tbody>
						</table>
					</div>
				</details>`;
		} else {
			html += `
				<div style="font-size:.65rem;color:#4b5563;margin-bottom:10px">
					Parameter: <code style="color:#00d9ff;font-weight:600">url</code><span style="color:#ef4444;font-size:8px;margin-left:2px">*</span> <span style="color:#374151">(string)</span>
				</div>`;
		}

		/* ── cURL block ── */
		html += `
				<div style="background:#080c12;border:1px solid #1e293b;border-radius:8px;overflow:hidden">
					<div style="display:flex;align-items:center;justify-content:space-between;padding:5px 12px;border-bottom:1px solid #1e293b40">
						<span style="font-size:9px;color:#374151;font-family:monospace;text-transform:uppercase;letter-spacing:.05em">curl</span>
						<span class="copy-icon" style="cursor:pointer;color:#374151;transition:color .15s" onmouseenter="this.style.color='#9ca3af'" onmouseleave="this.style.color='#374151'" onclick="copyApiCmd(this,'${ep.path}','${suffix.replace(/'/g, "\\'")}')">
							<svg style="width:13px;height:13px" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" stroke-width="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke-width="2"/></svg>
						</span>
					</div>
					<div style="padding:8px 14px;font-family:monospace;font-size:.76rem;overflow-x:auto;white-space:nowrap;line-height:1.7">
						<span style="color:#374151">$ </span><span style="color:#9ca3af">curl</span> <span style="color:#4b5563">"</span><span style="color:#6b7280">${baseUrl}${ep.path}?url=</span><span class="api-target-url" style="color:#00d9ff">https://example.com</span><span style="color:#6b7280">${suffix}</span><span style="color:#4b5563">"</span>
					</div>
				</div>
			</div>
		</div>`;
	}

	/* ── Footer ── */
	html += `
	<div style="text-align:center;padding:.8rem 0 2rem;border-top:1px solid #1e293b20">
		<span style="font-size:.62rem;color:#374151">JSON docs: <code style="color:#4b5563;background:#111720;padding:2px 8px;border-radius:4px">curl ${baseUrl}/docs | jq .</code></span>
	</div>`;

	html += `</div>`;
	body.innerHTML = html;
}

function updateApiExamples() {
	const input = document.getElementById('apiDocsDomain');
	if (!input) return;
	const val = input.value.trim() || 'https://example.com';
	document.querySelectorAll('.api-target-url').forEach((el) => {
		el.textContent = val;
	});
}

function copyApiCmd(iconEl, path, suffix) {
	const baseUrl = window.location.origin + '/api/v1';
	const domain = (document.getElementById('apiDocsDomain')?.value || 'https://example.com').trim();
	const cmd = `curl "${baseUrl}${path}?url=${encodeURIComponent(domain)}${suffix || ''}"`;
	navigator.clipboard.writeText(cmd).then(() => {
		const orig = iconEl.innerHTML;
		iconEl.innerHTML =
			'<svg style="width:13px;height:13px;color:#10b981" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>';
		setTimeout(() => {
			iconEl.innerHTML = orig;
		}, 1200);
	});
}

function copyToClipboard(el, text) {
	navigator.clipboard.writeText(text).then(() => {
		const icon = el.querySelector('.copy-icon');
		if (icon) {
			const original = icon.innerHTML;
			icon.innerHTML =
				'<svg class="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>';
			setTimeout(() => {
				icon.innerHTML = original;
			}, 1500);
		}
	});
}

// Store original homepage content for goHome()
let _homePlaceholderHTML = '';

function goHome() {
	const resultsDiv = document.getElementById('results');
	if (resultsDiv && _homePlaceholderHTML) {
		resultsDiv.innerHTML = _homePlaceholderHTML;
	}
	// Reset progress bar
	const progressContainer = document.getElementById('progressContainer');
	if (progressContainer) progressContainer.style.display = 'none';
	window.scrollTo(0, 0);
}

// Initialize application
function initApp() {
	// Save the original homepage placeholder
	const homeResults = document.getElementById('results');
	if (homeResults) _homePlaceholderHTML = homeResults.innerHTML;

	// Force dark theme
	document.body.setAttribute('data-theme', 'dark');
	// Load payload categories dynamically from GitHub (via backend)
	loadPayloadCategories();
	// --- Enter в поле URL ---
	const urlInput = document.getElementById('url');
	if (urlInput) {
		urlInput.addEventListener('keydown', function (e) {
			if (e.key === 'Enter') {
				e.preventDefault();
				fetchResults();
			}
		});
	}
	// --- Восстановить состояние ---
	restoreStateFromLocalStorage();

	// Update description based on false positive test state
	updateDescriptionText();
	// --- Toggle payload template section on method change ---
	const methodCheckboxes = document.querySelectorAll('.methods-grid input[type=checkbox]');
	methodCheckboxes.forEach((cb) => {
		cb.addEventListener('change', updatePayloadTemplateSection);
	});
	updatePayloadTemplateSection();

	// Делегированный обработчик на #results
	const resultsDiv = document.getElementById('results');
	if (resultsDiv) {
		resultsDiv.addEventListener('change', function (e) {
			const target = e.target;
			// Select all statuses
			if (target && target.id === 'statusSelectAll') {
				const checked = target.checked;
				document.querySelectorAll('.status-filter-checkbox').forEach((cb) => {
					cb.checked = checked;
				});
				filterResultsTableByStatus();
			}
			// Обычные чекбоксы статусов
			if (target && target.classList.contains('status-filter-checkbox')) {
				// Если хотя бы один снят — select all снимается, если все включены — включается
				const all = document.querySelectorAll('.status-filter-checkbox');
				const checkedCount = Array.from(all).filter((cb) => cb.checked).length;
				const selectAll = document.getElementById('statusSelectAll');
				if (selectAll) {
					selectAll.checked = checkedCount === all.length;
				}
				filterResultsTableByStatus();
			}
		});
	}
}

// =============================================
// Mobile Drawer (slide-in panel)
// =============================================
function toggleMobileDrawer() {
	const aside = document.querySelector('aside');
	const overlay = document.getElementById('drawerOverlay');
	const isOpen = aside.classList.contains('drawer-open');
	if (isOpen) {
		closeMobileDrawer();
	} else {
		aside.classList.add('drawer-open');
		overlay.classList.add('active');
		document.body.classList.add('drawer-is-open');
	}
}

function closeMobileDrawer() {
	const aside = document.querySelector('aside');
	const overlay = document.getElementById('drawerOverlay');
	aside.classList.remove('drawer-open');
	overlay.classList.remove('active');
	document.body.classList.remove('drawer-is-open');
}

// Payload config: go back from editor to categories list (mobile)
function configGoBack() {
	const container = document.querySelector('#testConfigModal .modal-body > div');
	if (container) container.classList.remove('config-editing');
	// Update category list to reflect any changes
	renderConfigCategoryList();
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);

// Function to toggle help content
function toggleHelp(helpId) {
	const helpElement = document.getElementById(helpId);
	if (helpElement) {
		helpElement.style.display = helpElement.style.display === 'none' ? 'block' : 'none';
	}
}

function filterResultsTableByStatus() {
	const checkedStatuses = Array.from(document.querySelectorAll('.status-filter-checkbox:checked')).map((cb) =>
		cb.getAttribute('data-status'),
	);
	const rows = document.querySelectorAll('#resultsTable tr[data-status]');
	rows.forEach((row) => {
		if (checkedStatuses.includes(row.getAttribute('data-status'))) {
			row.style.display = '';
		} else {
			row.style.display = 'none';
		}
	});
}

// Global variables for test session and batch testing
let currentTestSession = null;
let currentBatchJob = null;
let batchPollInterval = null;

// Global variables for recon/audit data (for exports)
let lastSecurityHeadersData = null;
let lastDNSReconData = null; // kept for backward compat
let lastFullReconData = null;
let lastSpeedTestData = null;
let lastSEOData = null;

// Enhanced reporting and analytics functions
function showExportControls() {
	const exportControls = document.getElementById('exportControls');
	if (exportControls && currentTestSession) {
		exportControls.style.display = 'block';
	}
}

function hideExportControls() {
	const exportControls = document.getElementById('exportControls');
	if (exportControls) {
		exportControls.style.display = 'none';
	}
}

function exportResults(format) {
	if (!currentTestSession) {
		showAlert('No test results to export', 'Warning', 'warning');
		return;
	}

	try {
		switch (format) {
			case 'json':
				exportAsJSON(currentTestSession, true);
				break;
			case 'csv':
				exportAsCSV(currentTestSession.results);
				break;
			case 'pdf':
				exportAsHTMLReport(currentTestSession);
				break;
			default:
				showAlert('Unknown export format', 'Error', 'error');
		}
	} catch (error) {
		console.error('Export failed:', error);
		showAlert('Export failed. Please check the console for details.', 'Error', 'error');
	}
}

function exportAsJSON(session, includeAnalysis) {
	const exportData = {
		...session,
		exportedAt: new Date().toISOString(),
		version: '1.0.0',
	};

	if (includeAnalysis) {
		const vulnerabilityScores = generateVulnerabilityScores(session.results, session.settings.falsePositiveTest);
		const executiveSummary = generateExecutiveSummary(session.results, vulnerabilityScores, session.wafDetection, session.settings.falsePositiveTest);

		exportData.analysis = {
			vulnerabilityScores,
			executiveSummary,
		};
	}

	const content = JSON.stringify(exportData, null, 2);
	const filename = generateFilename(session.url, 'json');
	downloadFile(content, filename, 'application/json');
}

function exportAsCSV(results) {
	if (results.length === 0) {
		showAlert('No results to export', 'Warning', 'warning');
		return;
	}

	const headers = [
		'Category',
		'Method',
		'Status',
		'Response Time (ms)',
		'Payload',
		'Is Redirect',
		'WAF Detected',
		'WAF Type',
		'Timestamp',
		'URL',
	];

	// Compute response time stats for summary rows
	let totalTime = 0,
		slowCount = 0,
		minTime = Infinity,
		maxTime = 0;
	for (const r of results) {
		const rt = r.responseTime || 0;
		totalTime += rt;
		if (rt >= SLOW_RESPONSE_THRESHOLD) slowCount++;
		if (rt < minTime) minTime = rt;
		if (rt > maxTime) maxTime = rt;
	}
	if (minTime === Infinity) minTime = 0;
	const avgTime = results.length > 0 ? Math.round(totalTime / results.length) : 0;

	const csvRows = [
		headers.join(','),
		...results.map((result) =>
			[
				`"${result.category}"`,
				`"${result.method}"`,
				result.status,
				result.responseTime || 0,
				`"${result.payload.replace(/"/g, '""')}"`,
				result.is_redirect || false,
				result.wafDetected || false,
				`"${result.wafType || ''}"`,
				`"${result.timestamp || ''}"`,
				`"${result.url || ''}"`,
			].join(','),
		),
		'',
		'"--- Results Summary ---"',
		`"Risk Level","${(() => {
			const isFP = currentTestSession?.settings?.falsePositiveTest;
			const bypassed = results.filter((r) => isFP ? (r.status === 403 || r.status === '403') : (r.status === 200 || r.status === '200' || r.status === 500 || r.status === '500')).length;
			const rate = results.length > 0 ? (bypassed / results.length) * 100 : 0;
			if (rate > 75) return 'Critical';
			if (rate > 50) return 'High';
			if (rate > 25) return 'Medium';
			return 'Low';
		})()} "`,
		`"${currentTestSession?.settings?.falsePositiveTest ? 'WAF Accuracy' : 'WAF Effectiveness'} (%)",${(() => {
			const isFP = currentTestSession?.settings?.falsePositiveTest;
			const bypassed = results.filter((r) => isFP ? (r.status === 403 || r.status === '403') : (r.status === 200 || r.status === '200' || r.status === 500 || r.status === '500')).length;
			return results.length > 0 ? Math.round((100 - (bypassed / results.length) * 100) * 100) / 100 : 100;
		})()}`,
		`"Total Tests",${results.length}`,
		`"${currentTestSession?.settings?.falsePositiveTest ? 'False Positives' : 'Bypassed'}",${(() => {
			const isFP = currentTestSession?.settings?.falsePositiveTest;
			return results.filter((r) => isFP ? (r.status === 403 || r.status === '403') : (r.status === 200 || r.status === '200' || r.status === 500 || r.status === '500')).length;
		})()}`,
		'',
		'"--- Response Time Summary ---"',
		`"Avg Response Time (ms)",${avgTime}`,
		`"Min Response Time (ms)",${minTime}`,
		`"Max Response Time (ms)",${maxTime}`,
		`"Slow Requests (>${SLOW_RESPONSE_THRESHOLD}ms)",${slowCount}`,
	];

	const content = csvRows.join('\n');
	const filename = generateFilename(currentTestSession?.url || 'results', 'csv');
	downloadFile(content, filename, 'text/csv');
}

function exportAsHTMLReport(session) {
	const vulnerabilityScores = generateVulnerabilityScores(session.results, session.settings.falsePositiveTest);
	const executiveSummary = generateExecutiveSummary(session.results, vulnerabilityScores, session.wafDetection, session.settings.falsePositiveTest);

	const html = generateHTMLReport(session, vulnerabilityScores, executiveSummary, session.settings.falsePositiveTest);
	const filename = generateFilename(session.url, 'html');
	downloadFile(html, filename, 'text/html');

	showAlert("HTML report downloaded. Use your browser's Print to PDF feature to create a PDF.", 'Success', 'success');
}

function generateHTMLReport(session, vulnerabilityScores, executiveSummary, falsePositiveMode = false) {
	const getRiskColor = (risk) => {
		switch (risk) {
			case 'Critical':
				return '#ff3860';
			case 'High':
				return '#ffb347';
			case 'Medium':
				return '#60a5fa';
			case 'Low':
				return '#00ff9d';
			default:
				return '#6b7280';
		}
	};

	const getStatusColor = (status, falsePositiveMode = false) => {
		const statusStr = String(status);
		const codeNum = parseInt(statusStr, 10);

		if (isNaN(codeNum)) {
			return 'rgba(249, 115, 22, 0.2)'; // Orange for errors
		}

		if (falsePositiveMode) {
			if (codeNum >= 200 && codeNum < 300) {
				return 'rgba(34, 197, 94, 0.2)'; // Green for allowed
			} else if (codeNum === 403) {
				return 'rgba(239, 68, 68, 0.2)'; // Red for blocked
			}
		} else {
			if (codeNum === 403) {
				return 'rgba(34, 197, 94, 0.2)'; // Green for protected
			} else if (codeNum >= 200 && codeNum < 300) {
				return 'rgba(239, 68, 68, 0.2)'; // Red for vulnerable
			}
		}

		if (codeNum >= 300 && codeNum < 400) {
			return 'rgba(249, 115, 22, 0.2)'; // Orange for redirects
		}

		return 'rgba(107, 114, 128, 0.1)'; // Gray for others
	};

	const getStatusBorderColor = (status, falsePositiveMode = false) => {
		const statusStr = String(status);
		const codeNum = parseInt(statusStr, 10);

		if (isNaN(codeNum)) {
			return '#f97316'; // Orange
		}

		if (falsePositiveMode) {
			if (codeNum >= 200 && codeNum < 300) {
				return '#22c55e'; // Green
			} else if (codeNum === 403) {
				return '#ef4444'; // Red
			}
		} else {
			if (codeNum === 403) {
				return '#22c55e'; // Green
			} else if (codeNum >= 200 && codeNum < 300) {
				return '#ef4444'; // Red
			}
		}

		if (codeNum >= 300 && codeNum < 400) {
			return '#f97316'; // Orange
		}

		return '#6b7280'; // Gray
	};

	const startDate = new Date(session.startTime);
	const endDate = new Date(session.endTime);
	const dateStr = startDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
	const startTimeStr = startDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
	const endTimeStr = endDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
	const duration = Math.round((endDate - startDate) / 1000);

	return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WAF Security Assessment Report</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Outfit', system-ui, -apple-system, sans-serif;
            background: linear-gradient(135deg, #0a0e14 0%, #0f1629 50%, #0a0e14 100%);
            color: #e5e7eb;
            padding: 40px 20px;
            line-height: 1.6;
        }
        .container { max-width: 1400px; margin: 0 auto; }
        .header {
            background: linear-gradient(135deg, #161b22 0%, #1c2128 100%);
            border: 1px solid rgba(0, 217, 255, 0.3);
            border-radius: 16px;
            padding: 40px;
            margin-bottom: 30px;
            text-align: center;
        }
        .header h1 {
            font-size: 32px;
            font-weight: 700;
            color: #00d9ff;
            margin-bottom: 20px;
        }
        .header-info {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-top: 30px;
            text-align: left;
        }
        .info-item {
            background: rgba(0, 217, 255, 0.05);
            padding: 15px;
            border-radius: 8px;
            border: 1px solid rgba(0, 217, 255, 0.2);
        }
        .info-label {
            font-size: 12px;
            color: #9ca3af;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 5px;
        }
        .info-value {
            font-size: 14px;
            color: #ffffff;
            font-weight: 500;
            font-family: 'JetBrains Mono', monospace;
        }
        .card {
            background: #161b22;
            border: 1px solid rgba(0, 217, 255, 0.3);
            border-radius: 16px;
            padding: 30px;
            margin-bottom: 30px;
        }
        .card-title {
            font-size: 20px;
            font-weight: 700;
            color: #00d9ff;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 30px 0;
        }
        .metric-card {
            background: rgba(0, 217, 255, 0.05);
            border: 1px solid rgba(0, 217, 255, 0.2);
            border-radius: 12px;
            padding: 20px;
            text-align: center;
        }
        .metric-value {
            font-size: 36px;
            font-weight: 700;
            color: #00d9ff;
            margin-bottom: 8px;
        }
        .metric-label {
            font-size: 12px;
            color: #9ca3af;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .risk-badge {
            display: inline-block;
            padding: 8px 20px;
            border-radius: 8px;
            font-weight: 700;
            font-size: 16px;
            color: white;
            background-color: ${getRiskColor(executiveSummary.riskLevel)};
            margin: 20px 0;
        }
        .table-wrapper {
            overflow-x: auto;
            margin: 20px 0;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 14px;
        }
        thead {
            background: rgba(0, 217, 255, 0.1);
        }
        th {
            padding: 15px;
            text-align: left;
            font-weight: 700;
            color: #9ca3af;
            text-transform: uppercase;
            font-size: 12px;
            letter-spacing: 0.5px;
            border-bottom: 2px solid rgba(0, 217, 255, 0.3);
        }
        td {
            padding: 12px 15px;
            border-bottom: 1px solid rgba(0, 217, 255, 0.1);
            color: #e5e7eb;
        }
        tbody tr:hover {
            background: rgba(0, 217, 255, 0.05);
        }
        .severity-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 6px;
            font-weight: 700;
            font-size: 12px;
        }
        .severity-critical { background: rgba(255, 56, 96, 0.2); color: #ff3860; }
        .severity-high { background: rgba(255, 179, 71, 0.2); color: #ffb347; }
        .severity-medium { background: rgba(96, 165, 250, 0.2); color: #60a5fa; }
        .severity-low { background: rgba(0, 255, 157, 0.2); color: #00ff9d; }
        .recommendations {
            background: rgba(0, 217, 255, 0.05);
            border-left: 4px solid #00d9ff;
            padding: 25px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .recommendations ol {
            margin-left: 20px;
            color: #d1d5db;
        }
        .recommendations li {
            margin: 10px 0;
            line-height: 1.8;
        }
        .results-section {
            margin-top: 40px;
        }
        .result-row {
            border-left: 4px solid;
            transition: all 0.2s;
        }
        .status-code {
            font-family: 'JetBrains Mono', monospace;
            font-weight: 700;
            padding: 4px 8px;
            border-radius: 4px;
            display: inline-block;
        }
        .payload {
            font-family: 'JetBrains Mono', monospace;
            font-size: 12px;
            color: #9ca3af;
            word-break: break-all;
            max-width: 500px;
        }
        .footer {
            text-align: center;
            margin-top: 60px;
            padding-top: 30px;
            border-top: 1px solid rgba(0, 217, 255, 0.2);
            color: #6b7280;
            font-size: 12px;
        }
        @media print {
            body { background: #0a0e14; }
            .page-break { page-break-before: always; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🛡️ WAF Security Assessment Report</h1>
            <div class="header-info">
                <div class="info-item">
                    <div class="info-label">Target URL</div>
                    <div class="info-value">${escapeHtml(session.url)}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Test Date</div>
                    <div class="info-value">${dateStr}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Test Time</div>
                    <div class="info-value">${startTimeStr} - ${endTimeStr}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Duration</div>
                    <div class="info-value">${duration} seconds</div>
                </div>
            </div>
        </div>

        <div class="card">
            <h2 class="card-title">📊 Executive Summary</h2>
            <div style="text-align: center;">
                <span class="risk-badge">${executiveSummary.riskLevel} Risk Level</span>
            </div>
            <div class="metrics-grid">
                <div class="metric-card" style="border-color: ${getRiskColor(executiveSummary.riskLevel)}40; background: ${getRiskColor(executiveSummary.riskLevel)}15;">
                    <div class="metric-value" style="font-size: 28px; color: ${getRiskColor(executiveSummary.riskLevel)}">${executiveSummary.riskLevel}</div>
                    <div class="metric-label">Risk Level</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value" style="color: ${executiveSummary.wafEffectiveness < 75 ? '#ffb347' : '#00ff9d'}">${executiveSummary.wafEffectiveness}%</div>
                    <div class="metric-label">${falsePositiveMode ? 'WAF Accuracy' : 'WAF Effectiveness'}</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${executiveSummary.totalTests}</div>
                    <div class="metric-label">Total Tests</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value" style="color: ${executiveSummary.bypassedTests > 0 ? '#ff3860' : '#00ff9d'}">${executiveSummary.bypassedTests}</div>
                    <div class="metric-label">${falsePositiveMode ? 'False Positives' : 'Bypassed'}</div>
                </div>
            </div>
            ${(() => {
							const results = session.results || [];
							let totalTime = 0,
								slowCount = 0,
								minT = Infinity,
								maxT = 0;
							for (const r of results) {
								const rt = r.responseTime || 0;
								totalTime += rt;
								if (rt >= 2000) slowCount++;
								if (rt < minT) minT = rt;
								if (rt > maxT) maxT = rt;
							}
							const avgT = results.length > 0 ? Math.round(totalTime / results.length) : 0;
							if (minT === Infinity) minT = 0;
							const avgColor = avgT >= 2000 ? '#ff3860' : avgT >= 1000 ? '#ffb347' : avgT >= 500 ? '#eab308' : '#00ff9d';
							return `
            <div class="metrics-grid" style="margin-top: 0;">
                <div class="metric-card">
                    <div class="metric-value" style="font-size: 28px; color: ${avgColor}">${avgT}<span style="font-size: 14px; font-weight: 400;">ms</span></div>
                    <div class="metric-label">Avg Response Time</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value" style="font-size: 28px; color: #00d9ff;">${minT}<span style="font-size: 14px; font-weight: 400;">ms</span></div>
                    <div class="metric-label">Fastest</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value" style="font-size: 28px; color: #a78bfa;">${maxT}<span style="font-size: 14px; font-weight: 400;">ms</span></div>
                    <div class="metric-label">Slowest</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value" style="font-size: 28px; color: ${slowCount > 0 ? '#ffb347' : '#6b7280'};">${slowCount}</div>
                    <div class="metric-label">Slow Requests (&gt;2s)</div>
                </div>
            </div>`;
						})()}
        </div>

        ${
					session.wafDetection?.detected
						? `
        <div class="card">
            <h2 class="card-title">🔍 WAF Detection</h2>
            <div class="info-item" style="max-width: 500px;">
                <div class="info-label">Detected WAF</div>
                <div class="info-value">${escapeHtml(session.wafDetection.wafType)}</div>
            </div>
            <div class="info-item" style="max-width: 500px; margin-top: 15px;">
                <div class="info-label">Confidence</div>
                <div class="info-value">${session.wafDetection.confidence}%</div>
            </div>
        </div>
        `
						: ''
				}

        <div class="card">
            <h2 class="card-title">📋 Vulnerability Assessment</h2>
            <div class="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>Category</th>
                            <th>Severity</th>
                            <th>Score</th>
                            <th>${falsePositiveMode ? 'FP Rate' : 'Bypass Rate'}</th>
                            <th>Tests (${falsePositiveMode ? 'False Pos.' : 'Bypassed'}/Total)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${vulnerabilityScores
													.map(
														(vuln) => `
                        <tr>
                            <td><strong>${escapeHtml(vuln.category)}</strong></td>
                            <td><span class="severity-badge severity-${vuln.severity.toLowerCase()}">${vuln.severity}</span></td>
                            <td>${vuln.score}/100</td>
                            <td style="color: ${vuln.bypassRate > 50 ? '#ff3860' : vuln.bypassRate > 20 ? '#ffb347' : '#00ff9d'}; font-weight: 700;">${vuln.bypassRate}%</td>
                            <td>${vuln.bypassedCount}/${vuln.totalCount}</td>
                        </tr>
                        `,
													)
													.join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <div class="card">
            <h2 class="card-title">💡 Recommendations</h2>
            <div class="recommendations">
                <ol>
                    ${executiveSummary.recommendations.map((rec) => `<li>${escapeHtml(rec)}</li>`).join('')}
                </ol>
            </div>
        </div>

        <div class="card results-section">
            <h2 class="card-title">📝 Detailed Test Results</h2>
            <p style="color: #9ca3af; margin-bottom: 20px; font-size: 14px;">
                Complete list of all ${session.results.length} test requests executed during the security assessment.
            </p>
            <div class="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th style="width: 20%;">Category</th>
                            <th style="width: 10%;">Method</th>
                            <th style="width: 10%;">Status</th>
                            <th style="width: 10%;">Time</th>
                            <th style="width: 50%;">Payload</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${session.results
													.map((result) => {
														const statusStr = String(result.status);
														const bgColor = getStatusColor(statusStr, falsePositiveMode);
														const borderColor = getStatusBorderColor(statusStr, falsePositiveMode);
														const statusClass =
															statusStr === '403'
																? 'text-cyber-success'
																: statusStr === '200' || statusStr === '201' || statusStr === '204'
																	? 'text-cyber-danger'
																	: 'text-orange-400';
														return `
                        <tr class="result-row" style="background-color: ${bgColor}; border-left-color: ${borderColor};">
                            <td><strong>${escapeHtml(result.category || 'N/A')}</strong></td>
                            <td style="font-family: 'JetBrains Mono', monospace; color: #00d9ff;">${escapeHtml(result.method || 'N/A')}</td>
                            <td><span class="status-code" style="color: ${statusClass === 'text-cyber-success' ? '#00ff9d' : statusClass === 'text-cyber-danger' ? '#ff3860' : '#ffb347'};">${escapeHtml(statusStr)}</span></td>
                            <td style="color: ${(result.responseTime || 0) >= 2000 ? '#ffb347' : '#9ca3af'}; font-weight: ${(result.responseTime || 0) >= 2000 ? '700' : '400'};">${result.responseTime || 0}ms${(result.responseTime || 0) >= 2000 ? ' <span style="background: rgba(255,179,71,0.2); color: #ffb347; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 700;">SLOW</span>' : ''}</td>
                            <td><span class="payload">${escapeHtml(result.payload || 'N/A')}</span></td>
                        </tr>
                        `;
													})
													.join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <div class="footer">
            <p>Generated by WAF-CHECKER.COM by <a href="https://mickaelasseline.com" style="color: #00d9ff; text-decoration: none;">Mickael Asseline</a> • ${new Date().toLocaleString()}</p>
        </div>
    </div>
</body>
</html>
    `;
}

function generateVulnerabilityScores(results, falsePositiveMode = false) {
	const categoryStats = new Map();

	results.forEach((result) => {
		const category = result.category;
		const stats = categoryStats.get(category) || { total: 0, bypassed: 0 };
		stats.total++;

		const isBypassed = falsePositiveMode
			? result.status === 403 || result.status === '403'
			: result.status === 200 || result.status === '200';

		if (isBypassed) {
			stats.bypassed++;
		}

		categoryStats.set(category, stats);
	});

	const scores = [];
	categoryStats.forEach((stats, category) => {
		const bypassRate = stats.total > 0 ? (stats.bypassed / stats.total) * 100 : 0;

		let severity, score;
		if (bypassRate >= 75) {
			severity = 'Critical';
			score = 90 + ((bypassRate - 75) / 25) * 10;
		} else if (bypassRate >= 50) {
			severity = 'High';
			score = 70 + ((bypassRate - 50) / 25) * 20;
		} else if (bypassRate >= 25) {
			severity = 'Medium';
			score = 40 + ((bypassRate - 25) / 25) * 30;
		} else {
			severity = 'Low';
			score = (bypassRate / 25) * 40;
		}

		scores.push({
			category,
			severity,
			score: Math.round(score),
			bypassedCount: stats.bypassed,
			totalCount: stats.total,
			bypassRate: Math.round(bypassRate * 100) / 100,
		});
	});

	return scores.sort((a, b) => b.score - a.score);
}

function generateExecutiveSummary(results, vulnerabilityScores, wafDetection, falsePositiveMode = false) {
	const totalTests = results.length;
	const bypassedTests = results.filter((r) => {
		if (falsePositiveMode) {
			return r.status === 403 || r.status === '403';
		}
		return r.status === 200 || r.status === '200' || r.status === 500 || r.status === '500';
	}).length;
	const bypassRate = totalTests > 0 ? (bypassedTests / totalTests) * 100 : 0;
	const wafEffectiveness = Math.max(0, 100 - bypassRate);

	const criticalVulnerabilities = vulnerabilityScores.filter((v) => v.severity === 'Critical').length;
	const highVulnerabilities = vulnerabilityScores.filter((v) => v.severity === 'High').length;
	const mediumVulnerabilities = vulnerabilityScores.filter((v) => v.severity === 'Medium').length;
	const lowVulnerabilities = vulnerabilityScores.filter((v) => v.severity === 'Low').length;

	let riskLevel, overallScore;
	if (criticalVulnerabilities > 0 || bypassRate > 75) {
		riskLevel = 'Critical';
		overallScore = 10;
	} else if (highVulnerabilities > 0 || bypassRate > 50) {
		riskLevel = 'High';
		overallScore = 30;
	} else if (mediumVulnerabilities > 0 || bypassRate > 25) {
		riskLevel = 'Medium';
		overallScore = 60;
	} else {
		riskLevel = 'Low';
		overallScore = 90;
	}

	const recommendations = [];
	if (falsePositiveMode) {
		if (bypassRate > 50) {
			recommendations.push('WAF is blocking too much legitimate traffic - review and relax rules');
		}
		if (criticalVulnerabilities > 0) {
			recommendations.push('Critical false positive rate detected - immediate rule review needed');
		}
		vulnerabilityScores.slice(0, 3).forEach((vuln) => {
			if (vuln.severity === 'Critical' || vuln.severity === 'High') {
				recommendations.push(`Review WAF rules for ${vuln.category} - high false positive rate`);
			}
		});
		if (recommendations.length === 0) {
			recommendations.push('WAF has a low false positive rate - legitimate traffic flows normally');
		}
	} else {
		if (criticalVulnerabilities > 0) {
			recommendations.push('Immediately review and update WAF rules for critical vulnerabilities');
		}
		if (bypassRate > 50) {
			recommendations.push('WAF configuration needs significant improvement');
		}
		if (!wafDetection?.detected) {
			recommendations.push('Consider implementing a Web Application Firewall');
		}
		vulnerabilityScores.slice(0, 3).forEach((vuln) => {
			if (vuln.severity === 'Critical' || vuln.severity === 'High') {
				recommendations.push(`Strengthen protection against ${vuln.category} attacks`);
			}
		});
		if (recommendations.length === 0) {
			recommendations.push('WAF is performing well, continue monitoring');
		}
	}

	// Response time stats
	let totalTime = 0,
		slowCount = 0,
		minTime = Infinity,
		maxTime = 0;
	for (const r of results) {
		const rt = r.responseTime || 0;
		totalTime += rt;
		if (rt >= SLOW_RESPONSE_THRESHOLD) slowCount++;
		if (rt < minTime) minTime = rt;
		if (rt > maxTime) maxTime = rt;
	}
	if (minTime === Infinity) minTime = 0;
	const avgResponseTime = totalTests > 0 ? Math.round(totalTime / totalTests) : 0;

	return {
		riskLevel,
		wafEffectiveness: Math.round(wafEffectiveness * 100) / 100,
		totalTests,
		bypassedTests,
		overallScore,
		bypassRate: Math.round(bypassRate * 100) / 100,
		criticalVulnerabilities,
		highVulnerabilities,
		mediumVulnerabilities,
		lowVulnerabilities,
		recommendations: recommendations.slice(0, 5),
		responseTimeStats: {
			avgResponseTime,
			minResponseTime: minTime,
			maxResponseTime: maxTime,
			slowRequests: slowCount,
			slowThresholdMs: SLOW_RESPONSE_THRESHOLD,
		},
	};
}

function showAnalytics() {
	if (!currentTestSession) {
		showAlert('No test results to analyze', 'Warning', 'warning');
		return;
	}

	const vulnerabilityScores = generateVulnerabilityScores(currentTestSession.results, currentTestSession.settings.falsePositiveTest);
	const executiveSummary = generateExecutiveSummary(currentTestSession.results, vulnerabilityScores, currentTestSession.wafDetection, currentTestSession.settings.falsePositiveTest);

	const modal = document.getElementById('analyticsModal');
	const content = document.getElementById('analyticsContent');

	if (!modal || !content) return;

	content.innerHTML = generateAnalyticsHTML(currentTestSession, vulnerabilityScores, executiveSummary, currentTestSession.settings.falsePositiveTest);
	modal.style.display = 'flex';
	document.body.style.overflow = 'hidden';
}

function hideAnalytics() {
	const modal = document.getElementById('analyticsModal');
	if (modal) {
		modal.style.display = 'none';
		document.body.style.overflow = '';
	}
}

async function exportAnalyticsScreenshot(event) {
	const content = document.getElementById('analyticsContent');
	if (!content) {
		showAlert('No analytics content to export', 'Warning', 'warning');
		return;
	}

	let btn = null;
	let oldText = '';

	try {
		// Show loading state
		if (event && event.target) {
			btn = event.target.closest('button');
			if (btn) {
				oldText = btn.innerHTML;
				btn.innerHTML = cyberLoader({ size: 'sm', text: 'Exporting...', inline: true });
				btn.disabled = true;
			}
		}

		// Wait a moment for any animations to complete
		await new Promise((resolve) => setTimeout(resolve, 300));

		// Create a wrapper for better capture
		const wrapper = document.createElement('div');
		const contentWidth = Math.max(content.scrollWidth || 1200, 1200);
		wrapper.style.cssText = `
			background: linear-gradient(135deg, #0a0e1a 0%, #0f1629 50%, #0a0e1a 100%);
			padding: 40px;
			width: ${contentWidth + 80}px;
			position: fixed;
			left: 0;
			top: 0;
			visibility: hidden;
			font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
			z-index: -9999;
		`;

		// Add header to screenshot
		const header = document.createElement('div');
		const now = new Date();
		const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
		const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
		header.innerHTML = `
			<div style="display: flex; align-items: center; gap: 15px; margin-bottom: 25px; padding-bottom: 20px; border-bottom: 2px solid rgba(0, 255, 255, 0.3);">
				<div style="width: 50px; height: 50px; background: rgba(0, 255, 255, 0.2); border-radius: 12px; display: flex; align-items: center; justify-content: center;">
					<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#00ffff" stroke-width="2">
						<path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
					</svg>
				</div>
				<div>
					<div style="font-size: 22px; font-weight: bold; color: white; font-family: system-ui, -apple-system, sans-serif; margin-bottom: 4px;">WAF Security Analytics</div>
					<div style="font-size: 13px; color: #9ca3af; font-family: system-ui, -apple-system, sans-serif;">Generated by WAF-CHECKER.COM • ${dateStr} at ${timeStr}</div>
				</div>
			</div>
		`;
		wrapper.appendChild(header);

		// Clone the content
		const clone = content.cloneNode(true);
		clone.style.cssText = `
			max-width: 100%;
			width: ${contentWidth}px;
			margin: 0 auto;
		`;

		// Ensure all computed styles are applied for screenshot
		wrapper.appendChild(clone);

		// Add footer
		const footer = document.createElement('div');
		footer.innerHTML = `
			<div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid rgba(0, 255, 255, 0.2); text-align: center;">
				<span style="font-size: 12px; color: #6b7280; font-family: system-ui, -apple-system, sans-serif;">WAF-CHECKER.COM by Mickael Asseline</span>
			</div>
		`;
		wrapper.appendChild(footer);

		document.body.appendChild(wrapper);

		// Wait for layout to settle and ensure fonts are loaded
		await new Promise((resolve) => setTimeout(resolve, 500));

		// Make wrapper visible temporarily for capture
		wrapper.style.visibility = 'visible';
		wrapper.style.position = 'fixed';
		wrapper.style.left = '0';
		wrapper.style.top = '0';

		// Force a reflow to ensure all styles are computed
		const height = wrapper.offsetHeight;
		const width = wrapper.offsetWidth;

		// Capture the wrapper
		const canvas = await html2canvas(wrapper, {
			backgroundColor: '#0a0e1a',
			scale: 2,
			useCORS: true,
			logging: false,
			allowTaint: true,
			width: width,
			height: height,
			foreignObjectRendering: true,
			onclone: (clonedDoc) => {
				// Apply computed styles to cloned elements
				const clonedWrapper = clonedDoc.body.querySelector('div');
				if (clonedWrapper) {
					clonedWrapper.style.position = 'relative';
					clonedWrapper.style.left = '0';
					clonedWrapper.style.top = '0';
					clonedWrapper.style.visibility = 'visible';
				}
			},
		});

		// Remove wrapper
		document.body.removeChild(wrapper);

		// Convert to blob
		canvas.toBlob(async (blob) => {
			if (!blob) {
				throw new Error('Failed to create blob from canvas');
			}

			// Download the file
			const url = URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = url;

			// Generate filename with timestamp
			const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
			let hostname = 'analytics';
			try {
				hostname = new URL(currentTestSession?.url || '').hostname.replace(/[^a-zA-Z0-9.-]/g, '_');
			} catch {}
			link.download = `waf-analytics_${hostname}_${timestamp}.png`;

			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(url);

			// Copy to clipboard
			let clipboardSuccess = false;
			try {
				// Check if ClipboardItem is supported
				if (typeof ClipboardItem !== 'undefined' && navigator.clipboard && navigator.clipboard.write) {
					// Create clipboard item with blob promise
					const clipboardItem = new ClipboardItem({ 'image/png': Promise.resolve(blob) });
					await navigator.clipboard.write([clipboardItem]);
					clipboardSuccess = true;
				} else {
					throw new Error('ClipboardItem not supported');
				}
			} catch (clipboardError) {
				console.warn('Clipboard copy failed:', clipboardError);
				// ClipboardItem might not be supported, that's okay
			}

			// Restore button
			if (btn) {
				btn.innerHTML = oldText;
				btn.disabled = false;
			}

			// Show success message
			if (clipboardSuccess) {
				showAlert('Analytics screenshot exported and copied to clipboard!', 'Success', 'success');
			} else {
				showAlert('Analytics screenshot exported successfully! (Clipboard copy requires HTTPS)', 'Success', 'success');
			}
		}, 'image/png');
	} catch (error) {
		console.error('Screenshot export failed:', error);
		showAlert(`Failed to export screenshot: ${error.message}`, 'Error', 'error');

		// Restore button
		if (btn) {
			btn.innerHTML = oldText;
			btn.disabled = false;
		}
	}
}

function generateAnalyticsHTML(session, vulnerabilityScores, summary, falsePositiveMode = false) {
	// Format date and time
	const startDate = new Date(session.startTime);
	const endDate = new Date(session.endTime);
	const dateStr = startDate.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
	const startTimeStr = startDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
	const endTimeStr = endDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
	const duration = Math.round((endDate - startDate) / 1000);

	// Risk level styling
	const riskColors = {
		Critical: 'bg-cyber-danger/20 text-cyber-danger border-cyber-danger/30',
		High: 'bg-cyber-warning/20 text-cyber-warning border-cyber-warning/30',
		Medium: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
		Low: 'bg-cyber-success/20 text-cyber-success border-cyber-success/30',
	};
	const riskStyle = riskColors[summary.riskLevel] || riskColors['Low'];

	return `
		<!-- Test Info Header -->
		<div class="bg-cyber-card border border-cyber-accent/20 rounded-xl p-4 mb-4">
			<div class="flex items-center gap-3 mb-3">
				<div class="w-10 h-10 rounded-lg bg-cyber-accent/20 flex items-center justify-center">
					<svg class="w-5 h-5 text-cyber-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
					</svg>
				</div>
				<div>
					<h3 class="text-sm font-bold text-white">Security Analysis Report</h3>
					<p class="text-xs text-gray-400">Detailed vulnerability assessment</p>
				</div>
			</div>
			<div class="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
				<div class="bg-cyber-elevated/50 rounded-lg p-3">
					<div class="text-gray-400 mb-1">Target URL</div>
					<div class="text-cyber-accent font-mono truncate" title="${escapeHtml(session.url)}">${escapeHtml(session.url)}</div>
				</div>
				<div class="bg-cyber-elevated/50 rounded-lg p-3">
					<div class="text-gray-400 mb-1">Date</div>
					<div class="text-white font-medium">${dateStr}</div>
				</div>
				<div class="bg-cyber-elevated/50 rounded-lg p-3">
					<div class="text-gray-400 mb-1">Time</div>
					<div class="text-white font-medium">${startTimeStr} - ${endTimeStr} <span class="text-gray-500">(${duration}s)</span></div>
				</div>
			</div>
		</div>

		<!-- Stats Grid -->
		<div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
			<div class="bg-cyber-card border ${riskStyle} rounded-xl p-4 text-center">
				<div class="text-lg font-bold mb-1">${summary.riskLevel}</div>
				<div class="text-xs text-gray-400 uppercase tracking-wider">Risk Level</div>
			</div>
			<div class="bg-cyber-card border border-cyber-accent/20 rounded-xl p-4 text-center">
				<div class="text-2xl font-bold ${summary.wafEffectiveness < 75 ? 'text-cyber-warning' : 'text-cyber-success'} mb-1">${summary.wafEffectiveness}%</div>
				<div class="text-xs text-gray-400 uppercase tracking-wider">${falsePositiveMode ? 'WAF Accuracy' : 'WAF Effectiveness'}</div>
			</div>
			<div class="bg-cyber-card border border-cyber-accent/20 rounded-xl p-4 text-center">
				<div class="text-2xl font-bold text-white mb-1">${summary.totalTests}</div>
				<div class="text-xs text-gray-400 uppercase tracking-wider">Total Tests</div>
			</div>
			<div class="bg-cyber-card border ${summary.bypassedTests > 0 ? 'border-cyber-danger/30' : 'border-cyber-success/30'} rounded-xl p-4 text-center">
				<div class="text-2xl font-bold ${summary.bypassedTests > 0 ? 'text-cyber-danger' : 'text-cyber-success'} mb-1">${summary.bypassedTests}</div>
				<div class="text-xs text-gray-400 uppercase tracking-wider">${falsePositiveMode ? 'False Positives' : 'Bypassed'}</div>
			</div>
		</div>

		<!-- Response Time Stats -->
		${(() => {
			const rts = summary.responseTimeStats || {};
			const avg = rts.avgResponseTime || 0;
			const min = rts.minResponseTime || 0;
			const max = rts.maxResponseTime || 0;
			const slow = rts.slowRequests || 0;
			const threshold = rts.slowThresholdMs || 2000;
			let avgColor = 'text-cyber-success';
			if (avg >= threshold) avgColor = 'text-red-400';
			else if (avg >= 1000) avgColor = 'text-orange-400';
			else if (avg >= 500) avgColor = 'text-yellow-400';
			return `<div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
			<div class="bg-cyber-card border border-cyber-accent/20 rounded-xl p-2 text-center">
				<div class="text-base font-bold ${avgColor} font-mono">${avg}<span class="text-[10px] font-normal">ms</span></div>
				<div class="text-[9px] text-gray-400 uppercase tracking-wide">Avg Response</div>
			</div>
			<div class="bg-cyber-card border border-cyan-500/20 rounded-xl p-2 text-center">
				<div class="text-base font-bold text-cyan-400 font-mono">${min}<span class="text-[10px] font-normal">ms</span></div>
				<div class="text-[9px] text-gray-400 uppercase tracking-wide">Fastest</div>
			</div>
			<div class="bg-cyber-card border border-purple-500/20 rounded-xl p-2 text-center">
				<div class="text-base font-bold text-purple-400 font-mono">${max}<span class="text-[10px] font-normal">ms</span></div>
				<div class="text-[9px] text-gray-400 uppercase tracking-wide">Slowest</div>
			</div>
			<div class="bg-cyber-card border ${slow > 0 ? 'border-orange-500/30' : 'border-gray-500/20'} rounded-xl p-2 text-center">
				<div class="text-base font-bold ${slow > 0 ? 'text-orange-400' : 'text-gray-500'} font-mono">${slow}</div>
				<div class="text-[9px] text-gray-400 uppercase tracking-wide">Slow (>${threshold / 1000}s)</div>
			</div>
		</div>`;
		})()}

		<!-- Two Column Layout -->
		<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
			<!-- Vulnerability Breakdown -->
			<div class="bg-cyber-card border border-cyber-accent/20 rounded-xl overflow-hidden">
				<div class="px-4 py-3 border-b border-cyber-accent/20 bg-cyber-elevated/30">
					<h4 class="text-sm font-bold text-white">Vulnerability Breakdown</h4>
				</div>
				<div class="p-4 space-y-3">
					<div class="flex items-center justify-between">
						<span class="text-sm text-gray-300">Critical</span>
						<span class="px-2 py-0.5 bg-cyber-danger/20 text-cyber-danger text-xs font-bold rounded">${summary.criticalVulnerabilities}</span>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-sm text-gray-300">High</span>
						<span class="px-2 py-0.5 bg-cyber-warning/20 text-cyber-warning text-xs font-bold rounded">${summary.highVulnerabilities}</span>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-sm text-gray-300">Medium</span>
						<span class="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs font-bold rounded">${summary.mediumVulnerabilities}</span>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-sm text-gray-300">Low</span>
						<span class="px-2 py-0.5 bg-cyber-success/20 text-cyber-success text-xs font-bold rounded">${summary.lowVulnerabilities}</span>
					</div>
				</div>
			</div>

			<!-- Recommendations -->
			<div class="bg-cyber-card border border-cyber-accent/20 rounded-xl overflow-hidden">
				<div class="px-4 py-3 border-b border-cyber-accent/20 bg-cyber-elevated/30">
					<h4 class="text-sm font-bold text-white">Recommendations</h4>
				</div>
				<div class="p-4">
					<ul class="space-y-2">
						${summary.recommendations
							.map(
								(rec) => `
							<li class="flex items-start gap-2 text-xs text-gray-300">
								<svg class="w-4 h-4 text-cyber-accent shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
								</svg>
								${rec}
							</li>
						`,
							)
							.join('')}
					</ul>
				</div>
			</div>
		</div>

		<!-- Category Analysis Table -->
		<div class="bg-cyber-card border border-cyber-accent/20 rounded-xl overflow-hidden">
			<div class="px-4 py-3 border-b border-cyber-accent/20 bg-cyber-elevated/30">
				<h4 class="text-sm font-bold text-white">Category Analysis</h4>
			</div>
			<div class="overflow-x-auto">
				<table class="w-full text-sm" style="table-layout: fixed; width: 100%;">
					<colgroup>
						<col style="width: 40%;">
						<col style="width: 20%;">
						<col style="width: 20%;">
						<col style="width: 20%;">
					</colgroup>
					<thead>
						<tr class="border-b border-cyber-accent/20 bg-cyber-elevated/20">
							<th class="px-5 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider" style="text-align: left;">Category</th>
							<th class="px-4 py-3 text-center text-xs font-bold text-gray-400 uppercase tracking-wider" style="text-align: center;">Severity</th>
							<th class="px-4 py-3 text-center text-xs font-bold text-gray-400 uppercase tracking-wider" style="text-align: center;">Score</th>
							<th class="px-4 py-3 text-center text-xs font-bold text-gray-400 uppercase tracking-wider" style="text-align: center;">Bypass Rate</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-cyber-accent/10">
						${vulnerabilityScores
							.map((vuln) => {
								const severityColors = {
									Critical: 'bg-cyber-danger/20 text-cyber-danger',
									High: 'bg-cyber-warning/20 text-cyber-warning',
									Medium: 'bg-blue-500/20 text-blue-400',
									Low: 'bg-cyber-success/20 text-cyber-success',
								};
								const sevStyle = severityColors[vuln.severity] || severityColors['Low'];
								const bypassColor =
									vuln.bypassRate > 50 ? 'text-cyber-danger' : vuln.bypassRate > 20 ? 'text-cyber-warning' : 'text-cyber-success';
								return `
								<tr class="hover:bg-cyber-elevated/30 transition-colors">
									<td class="px-4 py-2.5 text-gray-300" style="text-align: left; word-wrap: break-word;">${escapeHtml(vuln.category)}</td>
									<td class="px-4 py-2.5 text-center" style="text-align: center;">
										<span class="px-2 py-0.5 ${sevStyle} text-xs font-bold rounded">${vuln.severity}</span>
									</td>
									<td class="px-4 py-2.5 text-center text-gray-300" style="text-align: center;">${vuln.score}/100</td>
									<td class="px-4 py-2.5 text-center font-bold ${bypassColor}" style="text-align: center;">${vuln.bypassRate}%</td>
								</tr>
							`;
							})
							.join('')}
					</tbody>
				</table>
			</div>
		</div>
	`;
}

function downloadFile(content, filename, mimeType) {
	const blob = new Blob([content], { type: mimeType });
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
}

function generateFilename(baseUrl, extension) {
	const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
	let hostname;
	try {
		hostname = new URL(baseUrl).hostname.replace(/[^a-zA-Z0-9.-]/g, '_');
	} catch {
		hostname = 'results';
	}
	return `waf-report_${hostname}_${timestamp}.${extension}`;
}

// =============================================
// Export for Recon / Headers / DNS features
// =============================================
function _getReconData(type) {
	if (type === 'headers') return lastSecurityHeadersData;
	if (type === 'dns') return lastDNSReconData;
	if (type === 'recon') return lastFullReconData;
	if (type === 'speed') return lastSpeedTestData;
	if (type === 'seo') return lastSEOData;
	return null;
}

function _getReconLabel(type) {
	if (type === 'headers') return 'security-headers';
	if (type === 'dns') return 'dns-whois';
	if (type === 'recon') return 'full-recon';
	if (type === 'speed') return 'speed-test';
	if (type === 'seo') return 'seo-audit';
	return 'export';
}

function exportReconJSON(type) {
	const data = _getReconData(type);
	if (!data) {
		showAlert('No data to export. Run the scan first.', 'Warning', 'warning');
		return;
	}
	const label = _getReconLabel(type);
	const hostname = data.hostname || data.url || 'unknown';
	const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
	const exportData = { exportedAt: new Date().toISOString(), tool: 'WAF-CHECKER.COM', type: label, ...data };
	const content = JSON.stringify(exportData, null, 2);
	const hname = hostname.replace(/^https?:\/\//, '').replace(/[^a-zA-Z0-9.-]/g, '_');
	downloadFile(content, `${label}_${hname}_${timestamp}.json`, 'application/json');
}

function exportReconHTML(type) {
	const data = _getReconData(type);
	if (!data) {
		showAlert('No data to export. Run the scan first.', 'Warning', 'warning');
		return;
	}

	const resultsDiv = document.getElementById('results');
	if (!resultsDiv) return;

	const label = _getReconLabel(type);
	const titleMap = { headers: 'Security Headers Audit', recon: 'Full Reconnaissance' };
	const title = titleMap[type] || label;
	const hostname = data.hostname || data.url || 'unknown';
	const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
	const hname = hostname.replace(/^https?:\/\//, '').replace(/[^a-zA-Z0-9.-]/g, '_');
	const now = new Date();
	const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
	const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

	// Clone results and clean up for export
	const cloneDiv = resultsDiv.cloneNode(true);
	// Remove export buttons from clone
	cloneDiv.querySelectorAll('button').forEach((btn) => {
		const txt = btn.textContent || '';
		if (txt.includes('JSON') || txt.includes('HTML') || btn.title === 'Screenshot') btn.remove();
	});
	// Open all <details> elements
	cloneDiv.querySelectorAll('details').forEach((d) => d.setAttribute('open', ''));
	// Remove max-height constraints so all content is visible
	cloneDiv.querySelectorAll('[class*="max-h-"]').forEach((el) => {
		el.style.maxHeight = 'none';
		el.style.overflow = 'visible';
	});
	// Remove tooltip icons
	cloneDiv.querySelectorAll('.recon-tip').forEach((el) => el.remove());

	// Collect all inline <style> blocks and the Tailwind CSS
	let inlineStyles = '';
	for (const el of document.querySelectorAll('style')) {
		inlineStyles += el.textContent + '\n';
	}
	// Try to grab the Tailwind CSS (loaded via <link>)
	let tailwindCSS = '';
	for (const link of document.querySelectorAll('link[rel="stylesheet"]')) {
		try {
			const sheet = link.sheet;
			if (sheet) {
				const rules = Array.from(sheet.cssRules)
					.map((r) => r.cssText)
					.join('\n');
				tailwindCSS += rules + '\n';
			}
		} catch (e) {
			// CORS — skip external sheets that can't be read
		}
	}

	const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)} — ${escapeHtml(hostname)} — WAF-CHECKER.COM</title>
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
    <style>
        /* Tailwind + App styles */
        ${tailwindCSS}
        ${inlineStyles}

        /* Report overrides */
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Outfit', system-ui, -apple-system, sans-serif;
            background: linear-gradient(135deg, #0a0e14 0%, #0f1629 50%, #0a0e14 100%);
            color: #e5e7eb;
            padding: 40px 20px;
            line-height: 1.6;
        }
        .report-container { max-width: 1200px; margin: 0 auto; }
        .report-header {
            background: linear-gradient(135deg, #161b22 0%, #1c2128 100%);
            border: 1px solid rgba(0, 217, 255, 0.3);
            border-radius: 16px;
            padding: 40px;
            margin-bottom: 30px;
            text-align: center;
        }
        .report-header h1 { font-size: 28px; font-weight: 700; color: #00d9ff; margin-bottom: 8px; }
        .report-header .subtitle { font-size: 14px; color: #9ca3af; margin-bottom: 20px; }
        .report-header-info {
            display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px; margin-top: 25px; text-align: left;
        }
        .report-info-item {
            background: rgba(0, 217, 255, 0.05); padding: 12px; border-radius: 8px;
            border: 1px solid rgba(0, 217, 255, 0.2);
        }
        .report-info-label { font-size: 10px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
        .report-info-value { font-size: 13px; color: #ffffff; font-weight: 500; font-family: 'JetBrains Mono', monospace; word-break: break-all; }
        .report-footer {
            margin-top: 40px; padding-top: 20px;
            border-top: 1px solid rgba(0, 217, 255, 0.15);
            text-align: center; font-size: 12px; color: #6b7280;
        }
        /* Ensure all content visible in report */
        [class*="max-h-"] { max-height: none !important; overflow: visible !important; }
        details[open] summary ~ * { display: block; }
        details { border-radius: 12px; overflow: visible; margin-bottom: 16px; }
        .cyber-loader, .cyber-loader-inline, .recon-tip { display: none !important; }
        a { color: #00d9ff; text-decoration: none; }
        a:hover { text-decoration: underline; }
        img { max-width: 100%; height: auto; }
        code { font-family: 'JetBrains Mono', monospace; }
    </style>
</head>
<body>
    <div class="report-container">
        <div class="report-header">
            <h1>${escapeHtml(title)}</h1>
            <div class="subtitle">WAF-CHECKER.COM &mdash; Security Assessment Report</div>
            <div class="report-header-info">
                <div class="report-info-item">
                    <div class="report-info-label">Target</div>
                    <div class="report-info-value">${escapeHtml(hostname)}</div>
                </div>
                <div class="report-info-item">
                    <div class="report-info-label">Date</div>
                    <div class="report-info-value">${dateStr}</div>
                </div>
                <div class="report-info-item">
                    <div class="report-info-label">Time</div>
                    <div class="report-info-value">${timeStr}</div>
                </div>
                ${data.responseTime ? `<div class="report-info-item"><div class="report-info-label">Response Time</div><div class="report-info-value">${data.responseTime}ms</div></div>` : ''}
                ${data.grade ? `<div class="report-info-item"><div class="report-info-label">Security Grade</div><div class="report-info-value" style="font-size:24px;font-weight:700;color:${data.score >= 80 ? '#00ff9d' : data.score >= 50 ? '#ffb347' : '#ff3860'}">${data.grade}</div></div>` : ''}
            </div>
        </div>
        <div style="margin-top:30px;">
            ${cloneDiv.innerHTML}
        </div>
        <div class="report-footer">WAF-CHECKER.COM by Mickael Asseline &mdash; ${dateStr} at ${timeStr}</div>
    </div>
</body>
</html>`;
	downloadFile(html, `${label}_${hname}_${timestamp}.html`, 'text/html');
	showAlert('HTML report downloaded successfully.', 'Export', 'success');
}

async function exportReconScreenshot(event) {
	const content = document.getElementById('results');
	if (!content || !content.innerHTML.trim()) {
		showAlert('No results to capture.', 'Warning', 'warning');
		return;
	}

	let btn = null;
	let oldText = '';

	try {
		// Show loading state on button
		if (event && event.target) {
			btn = event.target.closest('button');
			if (btn) {
				oldText = btn.innerHTML;
				btn.innerHTML = cyberLoader({ size: 'sm', text: 'Capturing...', inline: true });
				btn.disabled = true;
			}
		}

		// Ensure html2canvas is loaded
		if (typeof html2canvas === 'undefined') {
			const script = document.createElement('script');
			script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
			document.head.appendChild(script);
			await new Promise((resolve, reject) => {
				script.onload = resolve;
				script.onerror = reject;
			});
		}

		await new Promise((resolve) => setTimeout(resolve, 300));

		// Clone content first and prepare it
		const clone = content.cloneNode(true);

		// Remove export buttons from clone
		clone.querySelectorAll('button').forEach((b) => {
			const txt = b.textContent || '';
			if (txt.includes('JSON') || txt.includes('HTML') || b.title === 'Screenshot') b.remove();
		});

		// Expand all scrollable containers (max-h-*) so nothing is clipped
		clone.querySelectorAll('[class*="max-h-"]').forEach((el) => {
			el.style.maxHeight = 'none';
			el.style.overflow = 'visible';
		});

		// Open all <details> elements
		clone.querySelectorAll('details').forEach((d) => d.setAttribute('open', ''));

		// Remove overflow-hidden that clips content
		clone.querySelectorAll('.overflow-hidden').forEach((el) => {
			el.style.overflow = 'visible';
		});

		// Remove tooltip icons (not useful in screenshot)
		clone.querySelectorAll('.recon-tip').forEach((el) => el.remove());

		// Create a temporary measuring container to find the real needed width
		const measurer = document.createElement('div');
		measurer.style.cssText = `
			position: fixed; left: 0; top: 0; visibility: hidden; z-index: -9999;
			width: auto; min-width: 1200px; max-width: none;
			padding: 40px;
			font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		`;
		measurer.appendChild(clone.cloneNode(true));
		document.body.appendChild(measurer);
		await new Promise((r) => setTimeout(r, 200));
		const measuredWidth = Math.max(measurer.scrollWidth, 1200);
		document.body.removeChild(measurer);

		// Create wrapper with the correct measured width
		const wrapper = document.createElement('div');
		wrapper.style.cssText = `
			background: linear-gradient(135deg, #0a0e1a 0%, #0f1629 50%, #0a0e1a 100%);
			padding: 40px;
			width: ${measuredWidth + 80}px;
			position: fixed;
			left: 0;
			top: 0;
			visibility: hidden;
			font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
			z-index: -9999;
		`;

		// Add header
		const header = document.createElement('div');
		const now = new Date();
		const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
		const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
		header.innerHTML = `
			<div style="display: flex; align-items: center; gap: 15px; margin-bottom: 25px; padding-bottom: 20px; border-bottom: 2px solid rgba(0, 255, 255, 0.3);">
				<div style="width: 50px; height: 50px; background: rgba(0, 255, 255, 0.2); border-radius: 12px; display: flex; align-items: center; justify-content: center;">
					<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#00ffff" stroke-width="2">
						<path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
					</svg>
				</div>
				<div>
					<div style="font-size: 22px; font-weight: bold; color: white; font-family: system-ui, -apple-system, sans-serif; margin-bottom: 4px;">WAF-CHECKER.COM</div>
					<div style="font-size: 13px; color: #9ca3af; font-family: system-ui, -apple-system, sans-serif;">Generated by WAF-CHECKER.COM &bull; ${dateStr} at ${timeStr}</div>
				</div>
			</div>
		`;
		wrapper.appendChild(header);

		// Set clone width
		clone.style.cssText = `max-width: 100%; width: ${measuredWidth}px; margin: 0 auto;`;
		wrapper.appendChild(clone);

		// Footer
		const footer = document.createElement('div');
		footer.innerHTML = `
			<div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid rgba(0, 255, 255, 0.2); text-align: center;">
				<span style="font-size: 12px; color: #6b7280; font-family: system-ui, -apple-system, sans-serif;">WAF-CHECKER.COM by Mickael Asseline</span>
			</div>
		`;
		wrapper.appendChild(footer);

		document.body.appendChild(wrapper);

		// Wait for layout to settle and images to load
		await new Promise((resolve) => setTimeout(resolve, 800));

		// Make wrapper visible for capture
		wrapper.style.visibility = 'visible';
		wrapper.style.position = 'fixed';
		wrapper.style.left = '0';
		wrapper.style.top = '0';

		// Force reflow
		const height = wrapper.offsetHeight;
		const width = wrapper.offsetWidth;

		// Capture the wrapper
		const canvas = await html2canvas(wrapper, {
			backgroundColor: '#0a0e1a',
			scale: 2,
			useCORS: true,
			logging: false,
			allowTaint: true,
			width: width,
			height: height,
			foreignObjectRendering: false,
			onclone: (clonedDoc) => {
				const clonedWrapper = clonedDoc.body.querySelector('div');
				if (clonedWrapper) {
					clonedWrapper.style.position = 'relative';
					clonedWrapper.style.left = '0';
					clonedWrapper.style.top = '0';
					clonedWrapper.style.visibility = 'visible';
				}
				// Ensure all scrollable areas are expanded in the html2canvas clone too
				clonedDoc.querySelectorAll('[class*="max-h-"]').forEach((el) => {
					el.style.maxHeight = 'none';
					el.style.overflow = 'visible';
				});
				clonedDoc.querySelectorAll('.overflow-hidden').forEach((el) => {
					el.style.overflow = 'visible';
				});
				clonedDoc.querySelectorAll('details').forEach((d) => d.setAttribute('open', ''));

				// Fix conic-gradient circles for html2canvas (may not support conic-gradient)
				// Replace with simple bordered circles with the value
				clonedDoc.querySelectorAll('[style*="conic-gradient"]').forEach((el) => {
					const innerDiv = el.querySelector('div');
					const span = innerDiv ? innerDiv.querySelector('span') : el.querySelector('span');
					const color = span ? span.style.color || '#10b981' : '#10b981';
					const val = span ? span.textContent.trim() : '';
					el.style.cssText = `width:56px;height:56px;border-radius:50%;border:3px solid ${color};display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.3);margin:0 auto;`;
					el.innerHTML = `<span style="font-size:15px;font-weight:800;color:${color};font-family:system-ui,sans-serif">${val}</span>`;
				});
			},
		});

		document.body.removeChild(wrapper);

		// Convert to blob and download + clipboard
		canvas.toBlob(async (blob) => {
			if (!blob) {
				throw new Error('Failed to create blob from canvas');
			}

			const url = URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = url;
			const ts = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
			let hname = 'scan';
			try {
				hname = new URL(document.getElementById('url')?.value || '').hostname.replace(/[^a-zA-Z0-9.-]/g, '_');
			} catch {}
			link.download = `waf-scan_${hname}_${ts}.png`;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(url);

			// Try clipboard copy
			let clipboardSuccess = false;
			try {
				if (typeof ClipboardItem !== 'undefined' && navigator.clipboard && navigator.clipboard.write) {
					const clipboardItem = new ClipboardItem({ 'image/png': Promise.resolve(blob) });
					await navigator.clipboard.write([clipboardItem]);
					clipboardSuccess = true;
				}
			} catch (clipErr) {
				console.warn('Clipboard copy failed:', clipErr);
			}

			if (btn) {
				btn.innerHTML = oldText;
				btn.disabled = false;
			}

			if (clipboardSuccess) {
				showAlert('Screenshot exported and copied to clipboard!', 'Export', 'success');
			} else {
				showAlert('Screenshot exported successfully!', 'Export', 'success');
			}
		}, 'image/png');
	} catch (error) {
		console.error('Screenshot export failed:', error);
		showAlert(`Failed to export screenshot: ${error.message}`, 'Error', 'error');
		if (btn) {
			btn.innerHTML = oldText;
			btn.disabled = false;
		}
	}
}

// Batch Testing Functions
function showBatchModal() {
	const modal = new bootstrap.Modal(document.getElementById('batchModal'));
	modal.show();

	// Reset modal state
	document.getElementById('batchProgress').style.display = 'none';
	document.getElementById('batchResults').style.display = 'none';
	document.getElementById('startBatchBtn').style.display = 'inline-block';
	document.getElementById('stopBatchBtn').style.display = 'none';
	document.getElementById('exportBatchBtn').style.display = 'none';

	// Load sample URLs if empty
	const urlsTextarea = document.getElementById('batchUrls');
	if (!urlsTextarea.value.trim()) {
		urlsTextarea.value = 'https://httpbin.org/get\nhttps://jsonplaceholder.typicode.com/posts/1\nhttps://httpbin.org/status/200';
	}

	// Add real-time URL validation feedback
	urlsTextarea.addEventListener('input', function () {
		validateBatchUrls();
	});
}

async function startBatchTest() {
	const urlsText = document.getElementById('batchUrls').value;
	const maxConcurrent = parseInt(document.getElementById('batchMaxConcurrent').value);
	const delay = parseInt(document.getElementById('batchDelay').value);
	const inheritSettings = document.getElementById('batchInheritSettings').checked;

	// Parse and validate URLs
	const allLines = urlsText
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => line.length > 0);

	if (allLines.length === 0) {
		showAlert('Please enter at least one URL', 'Warning', 'warning');
		return;
	}

	// Validate URLs client-side
	const validUrls = [];
	const invalidUrls = [];

	allLines.forEach((line) => {
		try {
			// Normalize URL by adding https:// if no scheme is present
			const normalizedUrl = normalizeUrl(line);

			const url = new URL(normalizedUrl);
			if (url.protocol === 'http:' || url.protocol === 'https:') {
				validUrls.push(normalizedUrl);
			} else {
				invalidUrls.push(`${line} (unsupported protocol: ${url.protocol})`);
			}
		} catch (error) {
			invalidUrls.push(`${line} (invalid URL format)`);
		}
	});

	// Show validation results
	if (invalidUrls.length > 0) {
		const message = `Found ${invalidUrls.length} invalid URL(s):\n\n${invalidUrls.slice(0, 5).join('\n')}${
			invalidUrls.length > 5 ? `\n... and ${invalidUrls.length - 5} more` : ''
		}\n\nContinue with ${validUrls.length} valid URLs?`;

		const confirmed = await showConfirm(message, 'Invalid URLs Found', 'warning');
		if (!confirmed) {
			return;
		}
	}

	if (validUrls.length === 0) {
		showAlert('No valid URLs found. Please check your input.', 'Error', 'error');
		return;
	}

	if (validUrls.length > 100) {
		showAlert('Maximum 100 URLs allowed for batch testing', 'Warning', 'warning');
		return;
	}

	const urls = validUrls;

	// Prepare batch configuration
	const config = {
		maxConcurrent,
		delayBetweenRequests: delay,
	};

	if (inheritSettings) {
		const methodCheckboxes = document.querySelectorAll('.http-methods input[type=checkbox]');
		const selectedMethods = Array.from(methodCheckboxes)
			.filter((cb) => cb.checked)
			.map((cb) => cb.value);

		const categoryCheckboxes = document.querySelectorAll('#categoryCheckboxes input[type=checkbox]');
		const selectedCategories = Array.from(categoryCheckboxes)
			.filter((cb) => cb.checked)
			.map((cb) => cb.value);

		config.methods = selectedMethods;
		config.categories = selectedCategories;
		config.followRedirect = document.getElementById('followRedirect')?.checked || false;
		config.falsePositiveTest = document.getElementById('falsePositiveTest')?.checked || false;
		config.caseSensitiveTest = document.getElementById('caseSensitiveTest')?.checked || false;
		config.enhancedPayloads = document.getElementById('enhancedPayloads')?.checked || false;
		config.useAdvancedPayloads = document.getElementById('useAdvancedPayloadsCheckbox')?.checked || false;
		config.autoDetectWAF = document.getElementById('autoDetectWAF')?.checked || false;
		config.useEncodingVariations = document.getElementById('useEncodingVariations')?.checked || false;
		config.httpManipulation = document.getElementById('httpManipulation')?.checked || false;
		config.payloadTemplate = document.getElementById('payloadTemplate')?.value || '';
		config.customHeaders = document.getElementById('customHeaders')?.value || '';
	} else {
		config.methods = ['GET'];
		config.categories = ['SQL Injection', 'XSS'];
		config.followRedirect = false;
		config.falsePositiveTest = false;
		config.caseSensitiveTest = false;
		config.enhancedPayloads = false;
		config.useAdvancedPayloads = false;
		config.autoDetectWAF = false;
		config.useEncodingVariations = false;
		config.httpManipulation = false;
	}

	try {
		// Initialize client-side batch processing
		currentBatchJob = {
			urls: urls,
			config: config,
			results: [],
			currentIndex: 0,
			completedCount: 0,
			startTime: new Date().toISOString(),
			status: 'running',
		};

		// Update UI
		document.getElementById('batchProgress').style.display = 'block';
		document.getElementById('startBatchBtn').style.display = 'none';
		document.getElementById('stopBatchBtn').style.display = 'inline-block';
		document.getElementById('batchTotal').textContent = urls.length;

		// Reset progress display
		document.getElementById('batchProgressText').textContent = '0%';
		document.getElementById('batchProgressBar').style.width = '0%';
		document.getElementById('batchProgressBar').classList.add('progress-bar-animated');
		document.getElementById('batchCurrentUrl').textContent = 'Starting...';
		document.getElementById('batchCompleted').textContent = '0';
		document.getElementById('batchETA').textContent = 'Calculating...';

		// Start client-side batch processing
		startClientSideBatchProcessing();

		console.log(`Started client-side batch test with ${urls.length} URLs`);
	} catch (error) {
		console.error('Batch test failed:', error);

		// Show a more user-friendly error message
		const errorLines = error.message.split('\n');
		const mainError = errorLines[0];
		const details = errorLines.slice(1).join('\n');

		let alertMessage = `Failed to start batch test: ${mainError}`;
		if (details.trim()) {
			alertMessage += `\n\nDetails:${details}`;
		}

		showAlert(alertMessage, 'Batch Test Complete', 'success');

		// Reset UI state
		document.getElementById('batchProgress').style.display = 'none';
		document.getElementById('startBatchBtn').style.display = 'inline-block';
		document.getElementById('stopBatchBtn').style.display = 'none';
	}
}

async function stopBatchTest() {
	if (!currentBatchJob) return;

	try {
		// Stop client-side processing
		if (currentBatchJob) {
			currentBatchJob.status = 'stopped';
		}

		if (batchPollInterval) {
			clearInterval(batchPollInterval);
			batchPollInterval = null;
		}

		document.getElementById('startBatchBtn').style.display = 'inline-block';
		document.getElementById('stopBatchBtn').style.display = 'none';

		console.log('Batch test stopped by user');
	} catch (error) {
		console.error('Failed to stop batch test:', error);
	}
}

async function startClientSideBatchProcessing() {
	if (!currentBatchJob || currentBatchJob.status !== 'running') return;

	const { urls, config } = currentBatchJob;
	const delay = config.delayBetweenRequests || 1000;

	// Process URLs sequentially with delay
	for (let i = 0; i < urls.length && currentBatchJob.status === 'running'; i++) {
		const url = urls[i];
		currentBatchJob.currentIndex = i;

		// Update current URL display
		updateBatchProgress(url, i, urls.length);

		try {
			// Test single URL
			const result = await testSingleUrlClient(url, config);

			if (currentBatchJob.status === 'running') {
				currentBatchJob.results.push({
					url: url,
					success: true,
					results: result,
					timestamp: new Date().toISOString(),
					totalTests: result.length,
					bypassedTests: result.filter((r) => r.status === 200 || r.status === '200').length,
					bypassRate:
						result.length > 0 ? Math.round((result.filter((r) => r.status === 200 || r.status === '200').length / result.length) * 100) : 0,
				});

				currentBatchJob.completedCount++;
			}
		} catch (error) {
			console.error(`Error testing URL ${url}:`, error);

			if (currentBatchJob.status === 'running') {
				currentBatchJob.results.push({
					url: url,
					success: false,
					error: error.message,
					timestamp: new Date().toISOString(),
					totalTests: 0,
					bypassedTests: 0,
					bypassRate: 0,
				});

				currentBatchJob.completedCount++;
			}
		}

		// Apply delay between requests (except for the last one)
		if (i < urls.length - 1 && delay > 0 && currentBatchJob.status === 'running') {
			await new Promise((resolve) => setTimeout(resolve, delay));
		}
	}

	// Mark as completed
	if (currentBatchJob.status === 'running') {
		currentBatchJob.status = 'completed';
		finalizeBatchTest();
	}
}

function updateBatchProgress(currentUrl, completed, total) {
	const progress = Math.round((completed / total) * 100);

	const progressText = document.getElementById('batchProgressText');
	const progressBar = document.getElementById('batchProgressBar');
	const currentUrlElement = document.getElementById('batchCurrentUrl');
	const completedElement = document.getElementById('batchCompleted');
	const eta = document.getElementById('batchETA');

	if (progressText) progressText.textContent = `${progress}%`;
	if (progressBar) {
		progressBar.style.width = `${progress}%`;
		if (progress > 0) {
			progressBar.classList.remove('bg-secondary');
			progressBar.classList.add('bg-primary');
		}
	}
	if (currentUrlElement) {
		const displayUrl = currentUrl.length > 50 ? currentUrl.substring(0, 47) + '...' : currentUrl;
		currentUrlElement.textContent = displayUrl;
		currentUrlElement.title = currentUrl;
	}
	if (completedElement) completedElement.textContent = completed;

	// Calculate ETA
	if (completed > 0 && currentBatchJob) {
		const elapsed = Date.now() - new Date(currentBatchJob.startTime).getTime();
		const avgTimePerUrl = elapsed / completed;
		const remaining = (total - completed) * avgTimePerUrl;
		const delayTime = (total - completed - 1) * (currentBatchJob.config.delayBetweenRequests || 0);
		const totalRemaining = remaining + delayTime;

		if (eta) eta.textContent = formatDuration(totalRemaining);
	}
}

async function testSingleUrlClient(url, config) {
	const methods = config.methods || ['GET'];
	const categories = config.categories || ['SQL Injection', 'XSS'];

	// Get custom payloads from localStorage
	let customPayloadsData = {};
	try {
		const stored = localStorage.getItem('wafchecker_customPayloads');
		if (stored) {
			customPayloadsData = JSON.parse(stored);
		}
	} catch (e) {
		console.warn('Failed to load custom payloads:', e);
	}

	let allResults = [];
	let page = 0;

	while (true) {
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

		const response = await fetch(`/api/check?${params.toString()}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				payloadTemplate: config.payloadTemplate || '',
				customHeaders: config.customHeaders || '',
				customPayloads: customPayloadsData,
			}),
		});

		if (!response.ok) break;

		const results = await response.json();
		if (!results || !results.length) break;

		allResults = allResults.concat(results);
		page++;

		// Limit results to prevent memory issues
		if (allResults.length > 1000) break;
	}

	return allResults;
}

function finalizeBatchTest() {
	if (!currentBatchJob) return;

	// Update UI
	const startBtn = document.getElementById('startBatchBtn');
	const stopBtn = document.getElementById('stopBatchBtn');
	const exportBtn = document.getElementById('exportBatchBtn');

	if (startBtn) startBtn.style.display = 'inline-block';
	if (stopBtn) stopBtn.style.display = 'none';
	if (exportBtn) exportBtn.style.display = 'inline-block';

	// Final progress update
	const progressText = document.getElementById('batchProgressText');
	const progressBar = document.getElementById('batchProgressBar');
	const currentUrl = document.getElementById('batchCurrentUrl');
	const eta = document.getElementById('batchETA');

	if (progressText) progressText.textContent = '100%';
	if (progressBar) {
		progressBar.style.width = '100%';
		progressBar.classList.remove('progress-bar-animated', 'bg-primary');
		progressBar.classList.add(currentBatchJob.status === 'completed' ? 'bg-success' : 'bg-warning');
	}
	if (currentUrl) {
		currentUrl.textContent =
			currentBatchJob.status === 'completed'
				? 'All tests completed'
				: currentBatchJob.status === 'stopped'
					? 'Test stopped by user'
					: 'Test completed with errors';
	}
	if (eta) eta.textContent = 'Done';

	// Show results
	displayBatchResults({
		status: currentBatchJob.status,
		results: currentBatchJob.results,
		totalUrls: currentBatchJob.urls.length,
		completedUrls: currentBatchJob.completedCount,
		progress: 100,
	});

	console.log(`Batch test ${currentBatchJob.status}:`, currentBatchJob.results);
}

function displayBatchResults(job) {
	const resultsDiv = document.getElementById('batchResults');
	const summaryDiv = document.getElementById('batchSummary');

	if (!resultsDiv || !summaryDiv) return;

	const successful = job.results.filter((r) => r.success);
	const failed = job.results.filter((r) => !r.success);

	let html = `
		<div class="row">
			<div class="col-md-3">
				<div class="text-center">
					<div class="h4 text-primary">${job.totalUrls}</div>
					<small>Total URLs</small>
				</div>
			</div>
			<div class="col-md-3">
				<div class="text-center">
					<div class="h4 text-success">${successful.length}</div>
					<small>Successful</small>
				</div>
			</div>
			<div class="col-md-3">
				<div class="text-center">
					<div class="h4 text-danger">${failed.length}</div>
					<small>Failed</small>
				</div>
			</div>
			<div class="col-md-3">
				<div class="text-center">
					<div class="h4 text-info">${job.progress}%</div>
					<small>Progress</small>
				</div>
			</div>
		</div>
	`;

	if (successful.length > 0) {
		const avgBypassRate = successful.reduce((sum, r) => sum + (r.bypassRate || 0), 0) / successful.length;
		html += `<div class="mt-3"><strong>Average Bypass Rate:</strong> ${Math.round(avgBypassRate * 100) / 100}%</div>`;
	}

	summaryDiv.innerHTML = html;
	resultsDiv.style.display = 'block';
}

function exportBatchResults() {
	if (!currentBatchJob || !currentBatchJob.results) {
		showAlert('No batch results to export', 'Warning', 'warning');
		return;
	}

	const summary = generateBatchSummary(currentBatchJob.results);
	const exportData = {
		summary,
		results: currentBatchJob.results,
		exportedAt: new Date().toISOString(),
		version: '1.0.0',
	};

	const content = JSON.stringify(exportData, null, 2);
	const filename = `batch-results_${new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19)}.json`;
	downloadFile(content, filename, 'application/json');
}

function generateBatchSummary(results) {
	const successful = results.filter((r) => r.success);
	const failed = results.filter((r) => !r.success);

	const totalTestCases = successful.reduce((sum, r) => sum + (r.results?.length || 0), 0);
	const avgBypassRate = successful.length > 0 ? successful.reduce((sum, r) => sum + (r.bypassRate || 0), 0) / successful.length : 0;

	return {
		totalUrls: results.length,
		successfulTests: successful.length,
		failedTests: failed.length,
		totalTestCases,
		averageBypassRate: Math.round(avgBypassRate * 100) / 100,
	};
}

function formatDuration(milliseconds) {
	const seconds = Math.floor(milliseconds / 1000);
	const minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);

	if (hours > 0) {
		return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
	} else if (minutes > 0) {
		return `${minutes}m ${seconds % 60}s`;
	} else {
		return `${seconds}s`;
	}
}

function validateBatchUrls() {
	const urlsText = document.getElementById('batchUrls').value;
	const lines = urlsText
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => line.length > 0);

	let validCount = 0;
	let invalidCount = 0;

	lines.forEach((line) => {
		try {
			// Normalize URL by adding https:// if no scheme is present
			const normalizedUrl = normalizeUrl(line);
			new URL(normalizedUrl);
			validCount++;
		} catch (error) {
			invalidCount++;
		}
	});

	// Update UI with validation status
	const startBtn = document.getElementById('startBatchBtn');
	if (startBtn) {
		if (validCount === 0 && lines.length > 0) {
			startBtn.disabled = true;
			startBtn.textContent = 'No Valid URLs';
		} else if (validCount > 100) {
			startBtn.disabled = true;
			startBtn.textContent = `Too Many URLs (${validCount}/100)`;
		} else {
			startBtn.disabled = false;
			startBtn.textContent = validCount > 0 ? `Start Batch Test (${validCount} URLs)` : 'Start Batch Test';
		}
	}

	// Show validation summary
	const urlsTextarea = document.getElementById('batchUrls');
	if (urlsTextarea && lines.length > 0) {
		if (invalidCount > 0) {
			urlsTextarea.style.borderColor = '#ffc107';
			urlsTextarea.title = `${validCount} valid, ${invalidCount} invalid URLs`;
		} else {
			urlsTextarea.style.borderColor = '#198754';
			urlsTextarea.title = `${validCount} valid URLs`;
		}
	} else if (urlsTextarea) {
		urlsTextarea.style.borderColor = '';
		urlsTextarea.title = '';
	}
}

// ===========================================
// TEST CONFIGURATION MODAL
// ===========================================

let testConfigModal = null;
let currentEditingCategory = null;
let customPayloads = {};
let defaultPayloads = {};
let defaultPayloadsLoaded = false;

// Initialize custom payloads from localStorage
function initCustomPayloads() {
	const stored = localStorage.getItem('wafchecker_customPayloads');
	if (stored) {
		try {
			customPayloads = JSON.parse(stored);
		} catch (e) {
			customPayloads = {};
		}
	}
}

// Load default payloads from server
async function loadDefaultPayloads() {
	if (defaultPayloadsLoaded) return;

	try {
		const response = await fetch('/api/payloads');
		if (!response.ok) throw new Error(`HTTP ${response.status}`);
		const data = await response.json();
		if (!data || Object.keys(data).length === 0) throw new Error('Empty data');
		defaultPayloads = data;
		defaultPayloadsLoaded = true;

		// Update PAYLOAD_CATEGORIES with any new categories from server
		const serverCategories = Object.keys(defaultPayloads);
		serverCategories.forEach((cat) => {
			if (!PAYLOAD_CATEGORIES.includes(cat)) {
				PAYLOAD_CATEGORIES.push(cat);
			}
		});
	} catch (e) {
		console.error('Failed to load default payloads:', e);
		showAlert(
			'Failed to load payloads from GitHub. Click "Retry" in the Attack Categories panel to try again.',
			'Payload Loading Error',
			'warning',
		);
	}
}

// Show test configuration modal
async function showTestConfigModal() {
	initCustomPayloads();

	// Show modal first with loading state
	if (!testConfigModal) {
		testConfigModal = new bootstrap.Modal(document.getElementById('testConfigModal'));
	}

	testConfigModal.show();

	// Reset mobile navigation to categories list
	const configContainer = document.querySelector('#testConfigModal .modal-body > div');
	if (configContainer) configContainer.classList.remove('config-editing');

	// Show loading state
	const categoryList = document.getElementById('configCategoryList');
	if (categoryList) {
		categoryList.innerHTML = `<div class="py-6">${cyberLoader({ size: 'md', color: 'text-gray-400', text: 'Loading payloads...' })}</div>`;
	}

	// Load default payloads from server
	await loadDefaultPayloads();

	renderConfigCategoryList();
	showEditorEmpty();
	updateCustomCount();
}

// Render category list in sidebar
function renderConfigCategoryList() {
	const container = document.getElementById('configCategoryList');
	if (!container) return;

	// Combine default payloads, PAYLOAD_CATEGORIES and custom categories
	const allCategories = new Set([...Object.keys(defaultPayloads), ...PAYLOAD_CATEGORIES, ...Object.keys(customPayloads)]);

	let html = '';
	allCategories.forEach((cat) => {
		const hasDefault = defaultPayloads[cat] !== undefined;
		const isCustom = customPayloads[cat] !== undefined;
		const isDeleted = isCustom && customPayloads[cat]?._deleted;
		const isModified = isCustom && hasDefault && !isDeleted;
		const isNew = isCustom && !hasDefault;

		// Count payloads
		let payloadCount = 0;
		if (isCustom && !isDeleted) {
			payloadCount = (customPayloads[cat].payloads?.length || 0) + (customPayloads[cat].falsePayloads?.length || 0);
		} else if (hasDefault && !isDeleted) {
			payloadCount = (defaultPayloads[cat].payloads?.length || 0) + (defaultPayloads[cat].falsePayloads?.length || 0);
		}

		let badge = '';
		if (isDeleted) {
			badge = '<span class="ml-auto px-1.5 py-0.5 text-[10px] bg-cyber-danger/20 text-cyber-danger rounded">DEL</span>';
		} else if (isNew) {
			badge = '<span class="ml-auto px-1.5 py-0.5 text-[10px] bg-cyber-success/20 text-cyber-success rounded">NEW</span>';
		} else if (isModified) {
			badge = '<span class="ml-auto px-1.5 py-0.5 text-[10px] bg-cyber-warning/20 text-cyber-warning rounded">MOD</span>';
		} else {
			badge = `<span class="ml-auto px-1.5 py-0.5 text-[10px] bg-gray-600/50 text-gray-400 rounded">${payloadCount}</span>`;
		}

		const isActive = currentEditingCategory === cat;
		html += `
			<button type="button" onclick="selectCategory('${escapeHtml(cat)}')"
					class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-all ${isActive ? 'bg-cyber-accent/20 text-cyber-accent border border-cyber-accent/50' : 'text-gray-300 hover:bg-cyber-elevated hover:text-white'}">
				<span class="truncate flex-1">${escapeHtml(cat)}</span>
				${badge}
			</button>
		`;
	});

	container.innerHTML = html;
}

// Show empty editor state
function showEditorEmpty() {
	currentEditingCategory = null;
	document.getElementById('configEditorEmpty').style.display = 'flex';
	document.getElementById('configEditor').style.display = 'none';
	// Mobile: go back to categories list
	const container = document.querySelector('#testConfigModal .modal-body > div');
	if (container) container.classList.remove('config-editing');
}

// Switch between Attack and False Positive payload tabs
function switchPayloadTab(tab) {
	const tabAttack = document.getElementById('tabAttackPayloads');
	const tabFalse = document.getElementById('tabFalsePayloads');
	const panelAttack = document.getElementById('panelAttackPayloads');
	const panelFalse = document.getElementById('panelFalsePayloads');

	if (!tabAttack || !tabFalse || !panelAttack || !panelFalse) return;

	if (tab === 'attack') {
		tabAttack.classList.add('border-cyber-accent', 'text-cyber-accent');
		tabAttack.classList.remove('border-transparent', 'text-gray-400');
		tabFalse.classList.remove('border-blue-400', 'text-blue-400');
		tabFalse.classList.add('border-transparent', 'text-gray-400');
		panelAttack.style.display = 'flex';
		panelFalse.style.display = 'none';
	} else {
		tabFalse.classList.add('border-blue-400', 'text-blue-400');
		tabFalse.classList.remove('border-transparent', 'text-gray-400');
		tabAttack.classList.remove('border-cyber-accent', 'text-cyber-accent');
		tabAttack.classList.add('border-transparent', 'text-gray-400');
		panelAttack.style.display = 'none';
		panelFalse.style.display = 'flex';
	}
}

// Update payload counts in tabs
function updatePayloadCounts(attackCount, falseCount) {
	const attackCountEl = document.getElementById('attackPayloadCount');
	const falseCountEl = document.getElementById('falsePayloadCount');

	if (attackCountEl) attackCountEl.textContent = attackCount;
	if (falseCountEl) falseCountEl.textContent = falseCount;
}

// Select and edit a category
function selectCategory(categoryName, activeTab = 'attack') {
	currentEditingCategory = categoryName;

	document.getElementById('configEditorEmpty').style.display = 'none';
	document.getElementById('configEditor').style.display = 'flex';

	// Mobile: switch to editor screen
	const container = document.querySelector('#testConfigModal .modal-body > div');
	if (container) container.classList.add('config-editing');

	// Update category name input
	document.getElementById('configCategoryName').value = categoryName;

	// Update badge
	const badge = document.getElementById('configCategoryBadge');
	const resetBtn = document.getElementById('configResetBtn');
	const deleteBtn = document.getElementById('configDeleteBtn');

	const hasDefault = defaultPayloads[categoryName] !== undefined;
	const isCustom = customPayloads[categoryName] !== undefined;

	if (isCustom && customPayloads[categoryName]?._deleted) {
		badge.textContent = 'Deleted';
		badge.className = 'px-2 py-0.5 text-xs rounded-full bg-cyber-danger/20 text-cyber-danger';
		resetBtn.style.display = '';
		deleteBtn.style.display = 'none';
	} else if (isCustom && hasDefault) {
		badge.textContent = 'Modified';
		badge.className = 'px-2 py-0.5 text-xs rounded-full bg-cyber-warning/20 text-cyber-warning';
		resetBtn.style.display = '';
		deleteBtn.style.display = '';
	} else if (isCustom) {
		badge.textContent = 'Custom';
		badge.className = 'px-2 py-0.5 text-xs rounded-full bg-cyber-success/20 text-cyber-success';
		resetBtn.style.display = 'none';
		deleteBtn.style.display = '';
	} else {
		badge.textContent = 'Default';
		badge.className = 'px-2 py-0.5 text-xs rounded-full bg-cyber-accent/20 text-cyber-accent';
		resetBtn.style.display = 'none';
		deleteBtn.style.display = '';
	}

	// Get payloads - prioritize custom, fallback to default
	let attackPayloads = [];
	let falsePayloads = [];

	if (isCustom) {
		// Use custom payloads if they exist
		attackPayloads = customPayloads[categoryName].payloads || [];
		falsePayloads = customPayloads[categoryName].falsePayloads || [];
	} else if (hasDefault) {
		// Use default payloads from server
		attackPayloads = defaultPayloads[categoryName].payloads || [];
		falsePayloads = defaultPayloads[categoryName].falsePayloads || [];
	}

	// All payloads are now editable
	renderPayloadList('configAttackPayloads', attackPayloads, 'attack', !isCustom);
	renderPayloadList('configFalsePayloads', falsePayloads, 'false', !isCustom);

	// Update payload counts in tabs
	updatePayloadCounts(attackPayloads.length, falsePayloads.length);

	// Switch to the specified tab (default: attack)
	switchPayloadTab(activeTab);

	// Update sidebar selection
	renderConfigCategoryList();
}

// Render payload list - all payloads are now editable
function renderPayloadList(containerId, payloads, type, isDefault = false) {
	const container = document.getElementById(containerId);
	if (!container) return;

	if (payloads.length === 0) {
		container.innerHTML = `
			<div class="text-center py-4 text-gray-500 text-sm">
				No ${type === 'attack' ? 'attack' : 'false positive'} payloads defined.
				<br><span class="text-xs">Click "+ Add Payload" to create one.</span>
			</div>
		`;
		return;
	}

	// Check if this category is modified (has custom payloads)
	const isModified = !isDefault;
	const borderClass = isModified ? 'border-cyber-warning/50' : 'border-cyber-accent/20';

	let html = '';

	payloads.forEach((payload, index) => {
		html += `
			<div class="flex items-center gap-2">
				<input type="text" value="${escapeHtml(payload)}"
					   onfocus="enableEditMode('${type}', ${index})"
					   onchange="updatePayloadValue('${type}', ${index}, this.value)"
					   class="flex-1 bg-cyber-elevated border ${borderClass} rounded px-3 py-2 text-sm font-mono text-gray-100 focus:border-cyber-accent focus:ring-1 focus:ring-cyber-accent/30 outline-none" />
				<button type="button" onclick="removePayload('${type}', ${index})"
						class="shrink-0 p-2 text-cyber-danger/60 hover:text-cyber-danger hover:bg-cyber-danger/20 rounded transition-all" title="Remove payload">
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
					</svg>
				</button>
			</div>
		`;
	});

	container.innerHTML = html;
}

// Enable edit mode when clicking on a default payload
function enableEditMode(type, index) {
	if (!currentEditingCategory) return;

	// If this is still showing default payloads, copy to custom first
	if (!customPayloads[currentEditingCategory]) {
		initCustomFromDefault(currentEditingCategory);
		renderConfigCategoryList();
	}
}

// Initialize custom payloads from default if not exists
function initCustomFromDefault(categoryName) {
	if (customPayloads[categoryName]) return; // Already customized

	const defaultData = defaultPayloads[categoryName];
	customPayloads[categoryName] = {
		type: defaultData?.type || 'ParamCheck',
		payloads: defaultData?.payloads ? [...defaultData.payloads] : [],
		falsePayloads: defaultData?.falsePayloads ? [...defaultData.falsePayloads] : [],
	};
}

// Add new payload
function addPayload(type) {
	if (!currentEditingCategory) return;

	// Initialize from default if this is a default category being customized
	initCustomFromDefault(currentEditingCategory);

	const key = type === 'attack' ? 'payloads' : 'falsePayloads';
	if (!customPayloads[currentEditingCategory][key]) {
		customPayloads[currentEditingCategory][key] = [];
	}

	customPayloads[currentEditingCategory][key].push('');
	selectCategory(currentEditingCategory);
	updateCustomCount();
}

// Copy a default payload to custom list for editing
function copyPayloadToCustom(type, payload) {
	if (!currentEditingCategory) return;

	// Initialize from default
	initCustomFromDefault(currentEditingCategory);

	// The payload is already copied when we initialized from default
	// Just refresh the view to show editable state
	selectCategory(currentEditingCategory);
	updateCustomCount();
}

// Update payload value
function updatePayloadValue(type, index, value) {
	if (!currentEditingCategory) return;

	// Copy to custom first if not already
	if (!customPayloads[currentEditingCategory]) {
		initCustomFromDefault(currentEditingCategory);
		renderConfigCategoryList();
	}

	const key = type === 'attack' ? 'payloads' : 'falsePayloads';
	if (customPayloads[currentEditingCategory][key]) {
		customPayloads[currentEditingCategory][key][index] = value;
	}
}

// Remove payload
function removePayload(type, index) {
	if (!currentEditingCategory) return;

	// Copy to custom first if not already
	if (!customPayloads[currentEditingCategory]) {
		initCustomFromDefault(currentEditingCategory);
	}

	const key = type === 'attack' ? 'payloads' : 'falsePayloads';
	if (customPayloads[currentEditingCategory][key]) {
		customPayloads[currentEditingCategory][key].splice(index, 1);
		// Refresh the category but stay on the same tab
		selectCategory(currentEditingCategory, type);
		updateCustomCount();
	}
}

// Add new category
function addNewCategory() {
	const name = prompt('Enter new category name:');
	if (!name || name.trim() === '') return;

	const trimmedName = name.trim();

	// Check if category already exists
	if (defaultPayloads[trimmedName] || customPayloads[trimmedName]) {
		showAlert('A category with this name already exists.', 'Error', 'error');
		return;
	}

	customPayloads[trimmedName] = {
		type: 'ParamCheck',
		payloads: [],
		falsePayloads: [],
	};

	renderConfigCategoryList();
	selectCategory(trimmedName);
	updateCustomCount();
}

// Delete category (works for all categories)
async function deleteCategory() {
	if (!currentEditingCategory) return;

	const hasDefault = defaultPayloads[currentEditingCategory] !== undefined;

	if (hasDefault) {
		const confirmed = await showConfirm(
			`Delete "${currentEditingCategory}"?\n\nThis will hide this default category from tests. You can restore it by resetting all payloads.`,
			'Delete Category',
			'danger',
		);
		if (!confirmed) return;
		// Mark as deleted by setting empty payloads
		customPayloads[currentEditingCategory] = {
			type: defaultPayloads[currentEditingCategory]?.type || 'ParamCheck',
			payloads: [],
			falsePayloads: [],
			_deleted: true,
		};
	} else {
		const confirmed = await showConfirm(`Are you sure you want to delete "${currentEditingCategory}"?`, 'Delete Category', 'danger');
		if (!confirmed) return;
		delete customPayloads[currentEditingCategory];
	}

	renderConfigCategoryList();
	showEditorEmpty();
	updateCustomCount();
}

// Reset category to default
async function resetCategoryToDefault() {
	if (!currentEditingCategory) return;

	const confirmed = await showConfirm(`Reset "${currentEditingCategory}" to default payloads?`, 'Reset Category', 'warning');
	if (!confirmed) return;

	delete customPayloads[currentEditingCategory];
	localStorage.setItem('wafchecker_customPayloads', JSON.stringify(customPayloads));
	renderConfigCategoryList();
	selectCategory(currentEditingCategory);
	updateCustomCount();
}

// Reset ALL payloads to defaults
async function resetAllPayloads() {
	const confirmed = await showConfirm(
		'Reset ALL payloads to defaults?\n\nThis will remove all your customizations, modifications, and custom categories.',
		'Reset All Payloads',
		'danger',
	);
	if (!confirmed) return;

	customPayloads = {};
	localStorage.setItem('wafchecker_customPayloads', JSON.stringify(customPayloads));
	renderConfigCategoryList();
	showEditorEmpty();
	updateCustomCount();
	showAlert('All payloads have been reset to defaults.', 'Success', 'success');
}

// Update custom payload count
function updateCustomCount() {
	const countEl = document.getElementById('configCustomCount');
	if (!countEl) return;

	let total = 0;
	Object.values(customPayloads).forEach((cat) => {
		total += (cat.payloads?.length || 0) + (cat.falsePayloads?.length || 0);
	});

	countEl.textContent = total;
}

// Save test configuration
function saveTestConfig() {
	// Update category name if changed
	if (currentEditingCategory) {
		const newName = document.getElementById('configCategoryName').value.trim();
		if (newName && newName !== currentEditingCategory && customPayloads[currentEditingCategory]) {
			customPayloads[newName] = customPayloads[currentEditingCategory];
			delete customPayloads[currentEditingCategory];
			currentEditingCategory = newName;
		}
	}

	// Clean up empty payloads
	Object.keys(customPayloads).forEach((cat) => {
		if (customPayloads[cat].payloads) {
			customPayloads[cat].payloads = customPayloads[cat].payloads.filter((p) => p.trim() !== '');
		}
		if (customPayloads[cat].falsePayloads) {
			customPayloads[cat].falsePayloads = customPayloads[cat].falsePayloads.filter((p) => p.trim() !== '');
		}

		// Remove category if empty and not a modification
		if (
			!PAYLOAD_CATEGORIES.includes(cat) &&
			(!customPayloads[cat].payloads || customPayloads[cat].payloads.length === 0) &&
			(!customPayloads[cat].falsePayloads || customPayloads[cat].falsePayloads.length === 0)
		) {
			delete customPayloads[cat];
		}
	});

	// Save to localStorage
	localStorage.setItem('wafchecker_customPayloads', JSON.stringify(customPayloads));

	// Update category checkboxes in main UI
	updateCategoryCheckboxesWithCustom();

	// Show success message
	showAlert('Configuration saved successfully!', 'Success', 'success');

	if (testConfigModal) {
		testConfigModal.hide();
	}
}

// Update category checkboxes to include custom categories
function updateCategoryCheckboxesWithCustom() {
	const container = document.getElementById('categoryCheckboxes');
	if (!container) return;

	// Get all categories (default + custom)
	const defaultCats = Object.keys(defaultPayloads);
	const allCategories = [...new Set([...PAYLOAD_CATEGORIES, ...defaultCats, ...Object.keys(customPayloads)])];

	container.innerHTML = '';
	const defaultChecked = ['SQL Injection', 'XSS'];

	allCategories.forEach((cat, idx) => {
		const id = 'cat_' + idx;
		const hasDefault = defaultPayloads[cat] !== undefined || PAYLOAD_CATEGORIES.includes(cat);
		const isCustom = customPayloads[cat] !== undefined && !hasDefault;
		const isModified = customPayloads[cat] !== undefined && hasDefault;

		let label = cat;
		if (isCustom) {
			label += ' <span class="text-cyber-success text-[10px]">(custom)</span>';
		} else if (isModified) {
			label += ' <span class="text-cyber-warning text-[10px]">(mod)</span>';
		}

		const div = document.createElement('div');
		div.className = 'form-check';
		div.innerHTML = `<input class="form-check-input" type="checkbox" value="${cat}" id="${id}"${defaultChecked.includes(cat) ? ' checked' : ''}>
      <label class="form-check-label" for="${id}">${label}</label>`;
		container.appendChild(div);
	});
}

// Export custom payloads
function exportCustomPayloads() {
	// Export ALL payloads (defaults merged with customs)
	const allPayloads = {};

	// Start with all default payloads
	for (const [cat, data] of Object.entries(defaultPayloads)) {
		allPayloads[cat] = {
			type: data.type || 'ParamCheck',
			payloads: [...(data.payloads || [])],
			falsePayloads: [...(data.falsePayloads || [])],
		};
	}

	// Override with custom payloads (including deleted ones)
	for (const [cat, data] of Object.entries(customPayloads)) {
		if (data._deleted) {
			// Category was deleted - mark it
			allPayloads[cat] = { ...data };
		} else {
			allPayloads[cat] = {
				type: data.type || 'ParamCheck',
				payloads: [...(data.payloads || [])],
				falsePayloads: [...(data.falsePayloads || [])],
			};
		}
	}

	const exportData = {
		version: '2.0',
		exportedAt: new Date().toISOString(),
		payloads: allPayloads,
	};

	// Convert to YAML
	const yamlStr = jsyaml.dump(exportData, {
		indent: 2,
		lineWidth: -1,
		quotingType: '"',
		forceQuotes: false,
		skipInvalid: false,
	});

	const blob = new Blob([yamlStr], { type: 'text/yaml' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = 'waf-checker-payloads.yaml';
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}

// Import custom payloads
function importCustomPayloads() {
	document.getElementById('importPayloadsInput').click();
}

// Handle file import
function handlePayloadsImport(event) {
	const file = event.target.files[0];
	if (!file) return;

	const reader = new FileReader();
	reader.onload = async function (e) {
		try {
			const fileContent = e.target.result;
			const fileName = file.name.toLowerCase();
			let imported;

			// Detect format and parse accordingly
			if (fileName.endsWith('.yaml') || fileName.endsWith('.yml')) {
				// Parse YAML
				if (typeof jsyaml === 'undefined') {
					throw new Error('YAML parser not loaded. Please refresh the page.');
				}
				imported = jsyaml.load(fileContent);
			} else if (fileName.endsWith('.json')) {
				// Parse JSON (backward compatibility)
				imported = JSON.parse(fileContent);
			} else {
				// Try to auto-detect: if it starts with { or [, it's JSON, otherwise try YAML
				const trimmed = fileContent.trim();
				if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
					imported = JSON.parse(fileContent);
				} else {
					if (typeof jsyaml === 'undefined') {
						throw new Error('YAML parser not loaded. Please refresh the page.');
					}
					imported = jsyaml.load(fileContent);
				}
			}

			// Validate structure
			if (typeof imported !== 'object' || imported === null) {
				throw new Error('Invalid format: expected an object');
			}

			// Handle new format (v2.0) with wrapper
			let payloadsData = imported;
			if (imported.version && imported.payloads) {
				payloadsData = imported.payloads;
			}

			// Ask user what to do
			const replaceAll = await showConfirm(
				'Replace all payloads?\n\nOK = Replace all (recommended)\nCancel = Merge with existing',
				'Import Mode',
			);

			if (replaceAll) {
				// Replace mode - clear all custom payloads and import
				customPayloads = {};
			}

			// Import payloads
			Object.keys(payloadsData).forEach((cat) => {
				const data = payloadsData[cat];
				if (data.payloads !== undefined || data.falsePayloads !== undefined) {
					// Check if this differs from default
					const defaultData = defaultPayloads[cat];
					const isDifferentFromDefault =
						!defaultData ||
						JSON.stringify(data.payloads) !== JSON.stringify(defaultData.payloads) ||
						JSON.stringify(data.falsePayloads) !== JSON.stringify(defaultData.falsePayloads) ||
						data._deleted;

					if (isDifferentFromDefault) {
						customPayloads[cat] = {
							type: data.type || 'ParamCheck',
							payloads: data.payloads || [],
							falsePayloads: data.falsePayloads || [],
							...(data._deleted ? { _deleted: true } : {}),
						};
					}
				}
			});

			localStorage.setItem('wafchecker_customPayloads', JSON.stringify(customPayloads));
			renderConfigCategoryList();
			updateCustomCount();
			showEditorEmpty();
			showAlert('Payloads imported successfully!', 'Success', 'success');
		} catch (err) {
			showAlert('Failed to import: Invalid format\n' + err.message, 'Error', 'error');
		}
	};
	reader.readAsText(file);

	// Reset input
	event.target.value = '';
}

// Override renderCategoryCheckboxes to include custom categories
const originalRenderCategoryCheckboxes = renderCategoryCheckboxes;
renderCategoryCheckboxes = function () {
	initCustomPayloads();
	updateCategoryCheckboxesWithCustom();
};

// =============================================
// FEATURE: Security Headers Audit
// =============================================
async function runSecurityHeaders() {
	const urlInput = document.getElementById('url');
	const url = normalizeUrl(urlInput.value);
	if (!url) {
		showAlert('Please enter a target URL first.', 'Missing URL', 'warning');
		return;
	}
	if (url !== urlInput.value) urlInput.value = url;

	const resultsDiv = document.getElementById('results');
	resultsDiv.innerHTML = `<div class="flex items-center justify-center h-full py-16">
		${cyberLoader({ size: 'lg', color: 'text-cyber-accent', text: `Running Security Headers Audit...`, subtext: escapeHtml(url) })}
	</div>`;

	try {
		const resp = await fetch(`/api/security-headers?url=${encodeURIComponent(url)}`);
		const data = await resp.json();
		if (!resp.ok) throw new Error(data.message || data.error || `HTTP ${resp.status}`);
		displaySecurityHeadersResults(data);
	} catch (e) {
		resultsDiv.innerHTML = `<div class="text-center py-10"><p class="text-cyber-danger font-bold">Security Headers Audit Failed</p><p class="text-gray-400 text-sm mt-2">${escapeHtml(e.message)}</p></div>`;
	}
}

function displaySecurityHeadersResults(data) {
	lastSecurityHeadersData = data;
	const resultsDiv = document.getElementById('results');
	const gradeColors = {
		'A+': 'text-cyber-success',
		A: 'text-cyber-success',
		B: 'text-yellow-400',
		C: 'text-orange-400',
		D: 'text-cyber-danger',
		F: 'text-red-500',
	};
	const gradeColor = gradeColors[data.grade] || 'text-gray-400';
	const severityColors = {
		critical: 'text-red-400 bg-red-500/10 border-red-500/30',
		high: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
		medium: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
		low: 'text-gray-400 bg-gray-500/10 border-gray-500/30',
	};

	let html = `<div class="p-4">
		<!-- Header -->
		<div class="flex items-center justify-between mb-4 p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl">
			<div class="flex items-center gap-3">
				<div class="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
					<svg class="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
					</svg>
				</div>
				<div>
					<h3 class="text-sm font-bold text-purple-400">Security Headers Audit</h3>
					<p class="text-xs text-gray-400">${escapeHtml(data.url)} &mdash; ${data.responseTime}ms</p>
				</div>
			</div>
			<div class="flex items-center gap-3">
				<div class="flex items-center gap-1">
					<button onclick="exportReconJSON('headers')" class="text-[10px] bg-cyber-elevated border border-purple-500/30 text-purple-400 px-2 py-0.5 rounded hover:bg-purple-500/20 transition-all font-medium" title="Export JSON">JSON</button>
					<button onclick="exportReconHTML('headers')" class="text-[10px] bg-cyber-elevated border border-purple-500/30 text-purple-400 px-2 py-0.5 rounded hover:bg-purple-500/20 transition-all font-medium" title="Export HTML">HTML</button>
					<button onclick="exportReconScreenshot(event)" class="text-[10px] bg-cyber-elevated border border-purple-500/30 text-purple-400 px-1.5 py-0.5 rounded hover:bg-purple-500/20 transition-all" title="Screenshot">
						<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
					</button>
				</div>
				<div class="text-center">
					<div class="text-3xl font-black ${gradeColor}">${data.grade}</div>
					<div class="text-[10px] text-gray-500 uppercase">Score: ${data.score}/100</div>
				</div>
			</div>
		</div>

		<!-- Score bar -->
		<div class="mb-4">
			<div class="h-2 bg-cyber-elevated rounded-full overflow-hidden">
				<div class="h-full rounded-full transition-all ${data.score >= 70 ? 'bg-cyber-success' : data.score >= 40 ? 'bg-yellow-500' : 'bg-cyber-danger'}" style="width: ${data.score}%"></div>
			</div>
		</div>

		<!-- Summary cards -->
		<div class="grid grid-cols-3 gap-3 mb-4">
			<div class="bg-cyber-success/10 border border-cyber-success/30 rounded-xl p-3 text-center">
				<div class="text-xl font-bold text-cyber-success">${data.present.length}</div>
				<div class="text-[10px] text-gray-400 uppercase">Present</div>
			</div>
			<div class="bg-cyber-danger/10 border border-cyber-danger/30 rounded-xl p-3 text-center">
				<div class="text-xl font-bold text-cyber-danger">${data.missing.length}</div>
				<div class="text-[10px] text-gray-400 uppercase">Missing</div>
			</div>
			<div class="bg-orange-500/10 border border-orange-500/30 rounded-xl p-3 text-center">
				<div class="text-xl font-bold text-orange-400">${data.informationDisclosure.length}</div>
				<div class="text-[10px] text-gray-400 uppercase">Info Leak</div>
			</div>
		</div>`;

	// Missing headers (most important)
	if (data.missing.length > 0) {
		html += `<div class="bg-cyber-card border border-cyber-danger/20 rounded-xl overflow-hidden mb-4">
			<div class="px-4 py-3 border-b border-cyber-danger/20 bg-cyber-danger/5">
				<h4 class="text-sm font-bold text-cyber-danger uppercase tracking-wider">Missing Headers</h4>
			</div>
			<div class="divide-y divide-cyber-accent/10">`;
		for (const h of data.missing) {
			const sc = severityColors[h.severity] || severityColors.low;
			html += `<div class="px-4 py-3">
				<div class="flex items-center justify-between mb-1">
					<code class="text-xs font-mono text-white font-bold">${escapeHtml(h.header)}</code>
					<span class="text-[10px] px-2 py-0.5 rounded border ${sc} font-bold uppercase">${h.severity}</span>
				</div>
				<p class="text-[11px] text-gray-400 mb-1.5">${escapeHtml(h.description)}</p>
				<p class="text-[10px] text-cyber-accent"><span class="font-bold">Fix:</span> ${escapeHtml(h.recommendation)}</p>
			</div>`;
		}
		html += `</div></div>`;
	}

	// Present headers
	if (data.present.length > 0) {
		html += `<div class="bg-cyber-card border border-cyber-success/20 rounded-xl overflow-hidden mb-4">
			<div class="px-4 py-3 border-b border-cyber-success/20 bg-cyber-success/5">
				<h4 class="text-sm font-bold text-cyber-success uppercase tracking-wider">Present Headers</h4>
			</div>
			<div class="divide-y divide-cyber-accent/10">`;
		for (const h of data.present) {
			html += `<div class="px-4 py-3">
				<div class="flex items-center justify-between mb-1">
					<code class="text-xs font-mono text-white font-bold">${escapeHtml(h.header)}</code>
					<span class="text-[10px] px-2 py-0.5 rounded bg-cyber-success/10 border border-cyber-success/30 text-cyber-success font-bold">OK</span>
				</div>
				<code class="text-[10px] text-gray-500 font-mono break-all">${escapeHtml(h.value)}</code>
			</div>`;
		}
		html += `</div></div>`;
	}

	// Information disclosure
	if (data.informationDisclosure.length > 0) {
		html += `<div class="bg-cyber-card border border-orange-500/20 rounded-xl overflow-hidden mb-4">
			<div class="px-4 py-3 border-b border-orange-500/20 bg-orange-500/5">
				<h4 class="text-sm font-bold text-orange-400 uppercase tracking-wider">Information Disclosure</h4>
			</div>
			<div class="divide-y divide-cyber-accent/10">`;
		for (const h of data.informationDisclosure) {
			html += `<div class="px-4 py-3 flex items-center justify-between">
				<code class="text-xs font-mono text-orange-400">${escapeHtml(h.header)}</code>
				<code class="text-xs font-mono text-gray-400">${escapeHtml(h.value)}</code>
			</div>`;
		}
		html += `</div></div>`;
	}

	html += `</div>`;
	resultsDiv.innerHTML = html;
}

// DNS Recon is now merged into Full Recon — see displayFullReconResults

function displayDNSReconResults(data) {
	// Legacy — redirect to full recon display
	lastDNSReconData = data;
	const resultsDiv = document.getElementById('results');

	let html = `<div class="p-4">
		<!-- Header -->
		<div class="flex items-center justify-between mb-4 p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-xl">
			<div class="flex items-center gap-3">
				<div class="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
					<svg class="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/>
					</svg>
				</div>
				<div>
					<h3 class="text-sm font-bold text-cyan-400">Target Intelligence</h3>
					<p class="text-xs text-gray-400">DNS Reconnaissance & WHOIS — <span class="text-white font-mono">${escapeHtml(data.hostname)}</span></p>
				</div>
			</div>
			<div class="flex items-center gap-1">
				<button onclick="exportReconJSON('dns')" class="text-[10px] bg-cyber-elevated border border-cyan-500/30 text-cyan-400 px-2 py-0.5 rounded hover:bg-cyan-500/20 transition-all font-medium" title="Export JSON">JSON</button>
				<button onclick="exportReconHTML('dns')" class="text-[10px] bg-cyber-elevated border border-cyan-500/30 text-cyan-400 px-2 py-0.5 rounded hover:bg-cyan-500/20 transition-all font-medium" title="Export HTML">HTML</button>
				<button onclick="exportReconScreenshot(event)" class="text-[10px] bg-cyber-elevated border border-cyan-500/30 text-cyan-400 px-1.5 py-0.5 rounded hover:bg-cyan-500/20 transition-all" title="Screenshot">
					<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
				</button>
			</div>
		</div>

		<!-- IP Addresses -->
		<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
			<div class="bg-cyber-card border border-cyber-accent/20 rounded-xl overflow-hidden">
				<div class="px-4 py-2.5 border-b border-cyber-accent/20 bg-cyber-elevated/30">
					<h4 class="text-xs font-bold text-cyber-accent uppercase tracking-wider">IPv4 Addresses</h4>
				</div>
				<div class="p-3 space-y-1">
					${data.ipAddresses.length > 0 ? data.ipAddresses.map((ip) => `<code class="block text-sm font-mono text-white">${escapeHtml(ip)}</code>`).join('') : '<span class="text-xs text-gray-500">None found</span>'}
				</div>
			</div>
			<div class="bg-cyber-card border border-cyber-accent/20 rounded-xl overflow-hidden">
				<div class="px-4 py-2.5 border-b border-cyber-accent/20 bg-cyber-elevated/30">
					<h4 class="text-xs font-bold text-cyber-accent uppercase tracking-wider">IPv6 Addresses</h4>
				</div>
				<div class="p-3 space-y-1">
					${data.ipv6Addresses.length > 0 ? data.ipv6Addresses.map((ip) => `<code class="block text-xs font-mono text-white break-all">${escapeHtml(ip)}</code>`).join('') : '<span class="text-xs text-gray-500">None found</span>'}
				</div>
			</div>
		</div>`;

	// Domain WHOIS (RDAP) — legacy (DNS Recon merged into Full Recon)
	if (data.domainWhois) {
		// Redirect to Full Recon display for consistency
	}

	// Infrastructure detection
	if (data.infrastructure && data.infrastructure.length > 0) {
		html += `<div class="bg-cyber-card border border-purple-500/20 rounded-xl overflow-hidden mb-4">
			<div class="px-4 py-2.5 border-b border-purple-500/20 bg-purple-500/5">
				<h4 class="text-xs font-bold text-purple-400 uppercase tracking-wider">Detected Infrastructure</h4>
			</div>
			<div class="p-3 space-y-2">`;
		for (const infra of data.infrastructure) {
			html += `<div class="flex items-center gap-3 px-3 py-2 bg-cyber-elevated/50 rounded-lg">
				<span class="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">${escapeHtml(infra.type)}</span>
				<span class="text-sm font-bold text-white">${escapeHtml(infra.provider)}</span>
				<span class="text-[10px] text-gray-500 ml-auto">${escapeHtml(infra.evidence)}</span>
			</div>`;
		}
		html += `</div></div>`;
	}

	// WHOIS data
	if (data.whois && data.whois.status === 'success') {
		const w = data.whois;
		html += `<div class="bg-cyber-card border border-cyber-accent/20 rounded-xl overflow-hidden mb-4">
			<div class="px-4 py-2.5 border-b border-cyber-accent/20 bg-cyber-elevated/30">
				<h4 class="text-xs font-bold text-cyber-accent uppercase tracking-wider">IP WHOIS — ${escapeHtml(w.query)}</h4>
			</div>
			<div class="grid grid-cols-2 gap-px bg-cyber-accent/10">
				<div class="bg-cyber-card p-3"><span class="text-[10px] text-gray-500 uppercase block">ISP</span><span class="text-sm text-white">${escapeHtml(w.isp || 'N/A')}</span></div>
				<div class="bg-cyber-card p-3"><span class="text-[10px] text-gray-500 uppercase block">Organization</span><span class="text-sm text-white">${escapeHtml(w.org || 'N/A')}</span></div>
				<div class="bg-cyber-card p-3"><span class="text-[10px] text-gray-500 uppercase block">AS Number</span><span class="text-sm text-white font-mono">${escapeHtml(w.as || 'N/A')}</span></div>
				<div class="bg-cyber-card p-3"><span class="text-[10px] text-gray-500 uppercase block">AS Name</span><span class="text-sm text-white">${escapeHtml(w.asname || 'N/A')}</span></div>
				<div class="bg-cyber-card p-3"><span class="text-[10px] text-gray-500 uppercase block">Country</span><span class="text-sm text-white">${escapeHtml(w.country || 'N/A')} (${escapeHtml(w.countryCode || '')})</span></div>
				<div class="bg-cyber-card p-3"><span class="text-[10px] text-gray-500 uppercase block">City</span><span class="text-sm text-white">${escapeHtml(w.city || 'N/A')}, ${escapeHtml(w.regionName || '')}</span></div>
				<div class="bg-cyber-card p-3"><span class="text-[10px] text-gray-500 uppercase block">Reverse DNS (PTR)</span><span class="text-xs font-mono break-all ${data.reverseDns ? 'text-cyan-400' : 'text-gray-600'}">${escapeHtml(data.reverseDns || w.reverse || 'N/A')}</span></div>
				<div class="bg-cyber-card p-3"><span class="text-[10px] text-gray-500 uppercase block">Timezone</span><span class="text-sm text-white">${escapeHtml(w.timezone || 'N/A')}</span></div>
			</div>
		</div>`;
	}

	// Nameservers
	if (data.nameservers && data.nameservers.length > 0) {
		html += `<div class="bg-cyber-card border border-cyber-accent/20 rounded-xl overflow-hidden mb-4">
			<div class="px-4 py-2.5 border-b border-cyber-accent/20 bg-cyber-elevated/30">
				<h4 class="text-xs font-bold text-cyber-accent uppercase tracking-wider">Nameservers</h4>
			</div>
			<div class="p-3 space-y-1">
				${data.nameservers.map((ns) => `<code class="block text-sm font-mono text-white">${escapeHtml(ns)}</code>`).join('')}
			</div>
		</div>`;
	}

	// Mail servers
	if (data.mailServers && data.mailServers.length > 0) {
		html += `<div class="bg-cyber-card border border-cyber-accent/20 rounded-xl overflow-hidden mb-4">
			<div class="px-4 py-2.5 border-b border-cyber-accent/20 bg-cyber-elevated/30">
				<h4 class="text-xs font-bold text-cyber-accent uppercase tracking-wider">Mail Servers (MX)</h4>
			</div>
			<div class="p-3 space-y-1">
				${data.mailServers.map((mx) => `<div class="flex items-center gap-3"><span class="text-[10px] text-gray-500 font-mono w-8">P:${mx.priority}</span><code class="text-sm font-mono text-white">${escapeHtml(mx.server)}</code></div>`).join('')}
			</div>
		</div>`;
	}

	// Email security
	if (data.emailSecurity) {
		const es = data.emailSecurity;
		html += `<div class="bg-cyber-card border border-cyber-accent/20 rounded-xl overflow-hidden mb-4">
			<div class="px-4 py-2.5 border-b border-cyber-accent/20 bg-cyber-elevated/30">
				<h4 class="text-xs font-bold text-cyber-accent uppercase tracking-wider">Email Security</h4>
			</div>
			<div class="p-3 space-y-2">
				<div class="flex items-center gap-2">
					<span class="w-2 h-2 rounded-full ${es.hasSPF ? 'bg-cyber-success' : 'bg-cyber-danger'}"></span>
					<span class="text-xs ${es.hasSPF ? 'text-cyber-success' : 'text-cyber-danger'} font-bold">SPF</span>
					<code class="text-[10px] text-gray-500 font-mono ml-2 break-all">${es.spf ? escapeHtml(es.spf) : 'Not configured'}</code>
				</div>
				<div class="flex items-center gap-2">
					<span class="w-2 h-2 rounded-full ${es.hasDMARC ? 'bg-cyber-success' : 'bg-cyber-danger'}"></span>
					<span class="text-xs ${es.hasDMARC ? 'text-cyber-success' : 'text-cyber-danger'} font-bold">DMARC</span>
					<code class="text-[10px] text-gray-500 font-mono ml-2 break-all">${es.dmarc ? escapeHtml(es.dmarc) : 'Not configured'}</code>
				</div>
			</div>
		</div>`;
	}

	// TXT Records
	if (data.txtRecords && data.txtRecords.length > 0) {
		html += `<details open class="bg-cyber-card border border-cyber-accent/20 rounded-xl overflow-hidden mb-4">
			<summary class="px-4 py-2.5 bg-cyber-elevated/30 cursor-pointer text-xs font-bold text-gray-400 uppercase tracking-wider hover:text-white transition-colors">
				TXT Records (${data.txtRecords.length})
			</summary>
			<div class="p-3 space-y-1 max-h-48 overflow-y-auto">
				${data.txtRecords.map((txt) => `<code class="block text-[10px] font-mono text-gray-400 break-all py-1 border-b border-cyber-accent/5">${escapeHtml(txt)}</code>`).join('')}
			</div>
		</details>`;
	}

	// Subdomains
	if (data.subdomains && data.subdomains.length > 0) {
		const stats = data.subdomainStats || {};
		html += `<div class="bg-cyber-card border border-emerald-500/20 rounded-xl overflow-hidden mb-4">
			<div class="px-4 py-2.5 border-b border-emerald-500/20 bg-emerald-500/5 flex items-center justify-between">
				<h4 class="text-xs font-bold text-emerald-400 uppercase tracking-wider">Discovered Subdomains (${data.subdomains.length})</h4>
				<div class="flex gap-2">
					${stats.fromCT ? `<span class="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/30 font-bold">CT: ${stats.fromCT}</span>` : ''}
					${stats.fromDNS ? `<span class="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold">DNS: ${stats.fromDNS}</span>` : ''}
				</div>
			</div>
			<div class="max-h-80 overflow-y-auto divide-y divide-cyber-accent/10">`;
		for (const sub of data.subdomains) {
			const srcColor =
				sub.source === 'DNS + CT'
					? 'text-purple-400 bg-purple-500/10 border-purple-500/30'
					: sub.source === 'DNS'
						? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
						: 'text-blue-400 bg-blue-500/10 border-blue-500/30';
			html += `<div class="flex items-center justify-between px-4 py-1.5 hover:bg-cyber-elevated/30 transition-colors">
				<div class="flex items-center gap-2 min-w-0">
					<span class="w-1.5 h-1.5 rounded-full ${sub.ip ? 'bg-emerald-400' : 'bg-gray-600'} flex-shrink-0"></span>
					<code class="text-xs font-mono text-white whitespace-nowrap">${escapeHtml(sub.name)}</code>
				</div>
				<div class="flex items-center gap-2 flex-shrink-0 ml-2">
					${sub.ip ? `<code class="text-[10px] font-mono text-gray-400 whitespace-nowrap">${escapeHtml(sub.ip)}</code>` : '<span class="text-[10px] text-gray-600 whitespace-nowrap">no A record</span>'}
					<span class="text-[8px] px-1 py-0.5 rounded border ${srcColor} font-bold whitespace-nowrap">${escapeHtml(sub.source)}</span>
				</div>
			</div>`;
		}
		html += `</div></div>`;
	} else if (data.subdomains) {
		html += `<div class="bg-cyber-card border border-gray-500/20 rounded-xl p-4 mb-4 text-center">
			<p class="text-gray-500 text-xs">No subdomains discovered via Certificate Transparency or DNS brute-force</p>
		</div>`;
	}

	// Reverse IP (other domains on same IP) — at the end
	if (data.reverseIpDomains && data.reverseIpDomains.length > 0) {
		const domains = data.reverseIpDomains;
		const targetHost = data.hostname?.toLowerCase() || '';
		const otherDomains = domains.filter((d) => d !== targetHost);
		html += `<div class="bg-cyber-card border border-amber-500/20 rounded-xl overflow-hidden mb-4">
			<div class="px-4 py-2.5 border-b border-amber-500/20 bg-amber-500/5 flex items-center justify-between">
				<h4 class="text-xs font-bold text-amber-400 uppercase tracking-wider">Reverse IP — Shared Hosting (${otherDomains.length} domain${otherDomains.length > 1 ? 's' : ''})</h4>
				${data.ipAddresses?.[0] ? `<code class="text-[10px] font-mono text-gray-500">${escapeHtml(data.ipAddresses[0])}</code>` : ''}
			</div>
			<div class="max-h-64 overflow-y-auto divide-y divide-amber-500/10">`;
		for (const domain of otherDomains) {
			html += `<div class="flex items-center justify-between px-4 py-1.5 hover:bg-cyber-elevated/30 transition-colors">
				<div class="flex items-center gap-2 min-w-0">
					<span class="w-1.5 h-1.5 rounded-full bg-gray-600 flex-shrink-0"></span>
					<code class="text-xs font-mono text-white whitespace-nowrap">${escapeHtml(domain)}</code>
				</div>
				<a href="https://${escapeHtml(domain)}" target="_blank" rel="noopener" class="text-[10px] text-gray-600 hover:text-cyan-400 transition-colors flex-shrink-0 ml-2">
					<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
				</a>
			</div>`;
		}
		html += `</div></div>`;
	}

	html += `</div>`;
	resultsDiv.innerHTML = html;
}

// =============================================
// FEATURE: Scan History (localStorage)
// =============================================
const SCAN_HISTORY_KEY = 'wafchecker_scan_history';
const SCAN_HISTORY_MAX = 50;

function saveScanToHistory(session) {
	if (!session || !session.url || !session.results || session.results.length === 0) return;

	const history = getScanHistory();
	const totalTests = session.results.length;
	const isFP = session.settings?.falsePositiveTest;
	const bypassed = session.results.filter((r) => {
		const s = parseInt(String(r.status), 10);
		if (isFP) return s === 403;
		return s === 200 || s === 500;
	}).length;
	const bypassRate = totalTests > 0 ? Math.round((bypassed / totalTests) * 100) : 0;
	const effectiveness = 100 - bypassRate;

	// Response time stats
	let totalTime = 0,
		minTime = Infinity,
		maxTime = 0;
	for (const r of session.results) {
		const rt = r.responseTime || 0;
		totalTime += rt;
		if (rt < minTime) minTime = rt;
		if (rt > maxTime) maxTime = rt;
	}
	if (minTime === Infinity) minTime = 0;
	const avgTime = totalTests > 0 ? Math.round(totalTime / totalTests) : 0;

	const entry = {
		id: `scan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
		url: session.url,
		timestamp: new Date().toISOString(),
		totalTests,
		bypassed,
		bypassRate,
		effectiveness,
		avgResponseTime: avgTime,
		minResponseTime: minTime,
		maxResponseTime: maxTime,
		falsePositiveTest: isFP || false,
		categories: [...new Set(session.results.map((r) => r.category))],
		methods: [...new Set(session.results.map((r) => r.method))],
	};

	history.unshift(entry);
	// Keep only the latest N entries
	if (history.length > SCAN_HISTORY_MAX) history.length = SCAN_HISTORY_MAX;

	try {
		localStorage.setItem(SCAN_HISTORY_KEY, JSON.stringify(history));
	} catch (e) {
		console.error('Failed to save scan history:', e);
	}
}

function getScanHistory() {
	try {
		const stored = localStorage.getItem(SCAN_HISTORY_KEY);
		return stored ? JSON.parse(stored) : [];
	} catch {
		return [];
	}
}

function showScanHistory() {
	const history = getScanHistory();
	const resultsDiv = document.getElementById('results');

	let html = `<div class="p-4">
		<!-- Header -->
		<div class="flex items-center justify-between mb-4 p-4 bg-gray-500/10 border border-gray-500/30 rounded-xl">
			<div class="flex items-center gap-3">
				<div class="w-10 h-10 rounded-lg bg-gray-500/20 flex items-center justify-center">
					<svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
					</svg>
				</div>
				<div>
					<h3 class="text-sm font-bold text-white">Scan History</h3>
					<p class="text-xs text-gray-400">${history.length} scan${history.length !== 1 ? 's' : ''} recorded</p>
				</div>
			</div>
			${history.length > 0 ? `<button onclick="clearScanHistory()" class="px-3 py-1.5 bg-cyber-danger/10 border border-cyber-danger/30 rounded-lg text-xs text-cyber-danger font-bold hover:bg-cyber-danger/20 transition-all">Clear All</button>` : ''}
		</div>`;

	if (history.length === 0) {
		html += `<div class="text-center py-16">
			<svg class="w-12 h-12 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
			</svg>
			<p class="text-gray-500 font-semibold">No scan history yet</p>
			<p class="text-gray-600 text-sm mt-1">Run your first security test to see results here.</p>
		</div>`;
	} else {
		html += `<div class="space-y-3">`;
		for (const scan of history) {
			const date = new Date(scan.timestamp);
			const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
			const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
			const effColor = scan.effectiveness >= 75 ? 'text-cyber-success' : scan.effectiveness >= 50 ? 'text-yellow-400' : 'text-cyber-danger';
			const riskLevel = scan.bypassRate > 75 ? 'Critical' : scan.bypassRate > 50 ? 'High' : scan.bypassRate > 25 ? 'Medium' : 'Low';
			const riskColors = {
				Critical: 'text-red-400 bg-red-500/10 border-red-500/30',
				High: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
				Medium: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
				Low: 'text-cyber-success bg-cyber-success/10 border-cyber-success/30',
			};

			html += `<div class="bg-cyber-card border border-cyber-accent/20 rounded-xl p-4 hover:border-cyber-accent/40 transition-all">
				<div class="flex items-center justify-between mb-3">
					<div>
						<div class="text-sm font-bold text-white font-mono">${escapeHtml(scan.url)}</div>
						<div class="text-[10px] text-gray-500">${dateStr} at ${timeStr}</div>
					</div>
					<span class="px-2 py-0.5 text-[10px] font-bold uppercase rounded border ${riskColors[riskLevel]}">${riskLevel}</span>
				</div>
				<div class="grid grid-cols-5 gap-2">
					<div class="text-center">
						<div class="text-sm font-bold ${effColor} font-mono">${scan.effectiveness}%</div>
						<div class="text-[9px] text-gray-500 uppercase">WAF Eff.</div>
					</div>
					<div class="text-center">
						<div class="text-sm font-bold text-white font-mono">${scan.totalTests}</div>
						<div class="text-[9px] text-gray-500 uppercase">Tests</div>
					</div>
					<div class="text-center">
						<div class="text-sm font-bold ${scan.bypassed > 0 ? 'text-cyber-danger' : 'text-cyber-success'} font-mono">${scan.bypassed}</div>
						<div class="text-[9px] text-gray-500 uppercase">${scan.falsePositiveTest ? 'False Pos.' : 'Bypassed'}</div>
					</div>
					<div class="text-center">
						<div class="text-sm font-bold text-cyan-400 font-mono">${scan.avgResponseTime}ms</div>
						<div class="text-[9px] text-gray-500 uppercase">Avg Time</div>
					</div>
					<div class="text-center">
						<div class="text-sm font-bold text-gray-400 font-mono">${scan.categories.length}</div>
						<div class="text-[9px] text-gray-500 uppercase">Categories</div>
					</div>
				</div>
			</div>`;
		}
		html += `</div>`;
	}

	html += `</div>`;
	resultsDiv.innerHTML = html;
}

async function clearScanHistory() {
	const confirmed = await showConfirm('Clear all scan history? This cannot be undone.', 'Clear History', 'danger');
	if (!confirmed) return;
	localStorage.removeItem(SCAN_HISTORY_KEY);
	showScanHistory();
}

// =============================================
// Recon tooltip helper (global fixed tooltip)
// =============================================
function reconTip(tip) {
	return `<span class="recon-tip ml-1" data-tip="${tip.replace(/"/g, '&quot;')}" onmouseenter="showReconTip(this)" onmouseleave="hideReconTip()"><svg class="w-3.5 h-3.5 text-gray-600 hover:text-cyan-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke-width="2"/><path stroke-width="2" stroke-linecap="round" d="M12 16v-4m0-4h.01"/></svg></span>`;
}
function showReconTip(el) {
	const tt = document.getElementById('reconTooltip');
	if (!tt) return;
	tt.textContent = el.getAttribute('data-tip');
	const r = el.getBoundingClientRect();
	tt.style.left = Math.min(r.left + r.width / 2 - 140, window.innerWidth - 290) + 'px';
	tt.style.left = Math.max(8, parseFloat(tt.style.left)) + 'px';
	tt.style.top = r.bottom + 8 + 'px';
	tt.classList.add('visible');
}
function hideReconTip() {
	const tt = document.getElementById('reconTooltip');
	if (tt) tt.classList.remove('visible');
}

// =============================================
// FEATURE: SEO Audit
// =============================================
async function runSEOTest() {
	const urlInput = document.getElementById('url');
	const url = normalizeUrl(urlInput.value);
	if (!url) {
		showAlert('Please enter a target URL first.', 'Missing URL', 'warning');
		return;
	}
	if (url !== urlInput.value) urlInput.value = url;

	const resultsDiv = document.getElementById('results');
	resultsDiv.innerHTML = `<div class="flex items-center justify-center h-full py-16">
		${cyberLoader({ size: 'lg', color: 'text-lime-400', text: 'Running SEO Audit...', subtext: 'Meta tags, sitemap, pages, structured data, links... (max ~25s)' })}
	</div>`;

	try {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 30000);
		const resp = await fetch(`/api/seo?url=${encodeURIComponent(url)}`, { signal: controller.signal });
		clearTimeout(timeout);
		const data = await resp.json();
		if (!resp.ok) throw new Error(data.message || data.error || `HTTP ${resp.status}`);
		displaySEOResults(data);
	} catch (e) {
		const msg = e.name === 'AbortError' ? 'Request timed out.' : e.message;
		resultsDiv.innerHTML = `<div class="text-center py-10"><p class="text-cyber-danger font-bold">SEO Audit Failed</p><p class="text-gray-400 text-sm mt-2">${escapeHtml(msg)}</p><button onclick="runSEOTest()" class="mt-4 px-4 py-2 bg-lime-500/20 border border-lime-500/50 text-lime-400 rounded-lg hover:bg-lime-500/30 transition-all text-sm">Retry</button></div>`;
	}
}

function displaySEOResults(data) {
	lastSEOData = data;
	const resultsDiv = document.getElementById('results');

	// Score colors
	const scoreHex =
		data.score >= 90
			? { text: '#34d399', border: 'rgba(16,185,129,0.3)', bg: 'rgba(16,185,129,0.1)' }
			: data.score >= 80
				? { text: '#22d3ee', border: 'rgba(6,182,212,0.3)', bg: 'rgba(6,182,212,0.1)' }
				: data.score >= 70
					? { text: '#facc15', border: 'rgba(234,179,8,0.3)', bg: 'rgba(234,179,8,0.1)' }
					: data.score >= 50
						? { text: '#fb923c', border: 'rgba(249,115,22,0.3)', bg: 'rgba(249,115,22,0.1)' }
						: { text: '#f87171', border: 'rgba(239,68,68,0.3)', bg: 'rgba(239,68,68,0.1)' };

	const passIcon =
		'<svg style="width:14px;height:14px;color:#10b981;flex-shrink:0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>';
	const failIcon =
		'<svg style="width:14px;height:14px;color:#ef4444;flex-shrink:0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>';

	const catColors = {
		'Meta Tags': '#60a5fa',
		Technical: '#a78bfa',
		Indexability: '#34d399',
		Content: '#fbbf24',
		Links: '#22d3ee',
		Social: '#f472b6',
		Performance: '#fb923c',
		International: '#2dd4bf',
		URL: '#c084fc',
		Accessibility: '#38bdf8',
	};

	let html = `<div class="p-4">
		<!-- Header -->
		<div class="flex items-center justify-between mb-4 p-4" style="background:rgba(132,204,22,0.1);border:1px solid rgba(132,204,22,0.3);border-radius:12px">
			<div class="flex items-center gap-3">
				<div style="width:40px;height:40px;border-radius:8px;background:rgba(132,204,22,0.2);display:flex;align-items:center;justify-content:center">
					<svg class="w-5 h-5" style="color:#a3e635" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
				</div>
				<div>
					<h3 style="font-size:14px;font-weight:700;color:#a3e635">SEO Audit</h3>
					<p class="text-xs text-gray-400"><span class="font-mono text-white">${escapeHtml(data.hostname)}</span> &mdash; ${data.responseTime}ms</p>
				</div>
			</div>
			<div class="flex items-center gap-1">
				<button onclick="exportReconJSON('seo')" style="font-size:10px;background:#1c2128;border:1px solid rgba(132,204,22,0.3);color:#a3e635;padding:2px 8px;border-radius:4px;cursor:pointer">JSON</button>
				<button onclick="exportReconHTML('seo')" style="font-size:10px;background:#1c2128;border:1px solid rgba(132,204,22,0.3);color:#a3e635;padding:2px 8px;border-radius:4px;cursor:pointer">HTML</button>
				<button onclick="exportReconScreenshot(event)" style="font-size:10px;background:#1c2128;border:1px solid rgba(132,204,22,0.3);color:#a3e635;padding:2px 6px;border-radius:4px;cursor:pointer" title="Screenshot">
					<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
				</button>
			</div>
		</div>

		<!-- Score Card -->
		<div class="bg-cyber-card rounded-xl overflow-hidden mb-4" style="border:1px solid rgba(132,204,22,0.2)">
			<div class="px-4 py-3 flex items-center justify-between">
				<div class="flex items-center gap-4">
					<div style="width:64px;height:64px;border-radius:12px;border:2px solid ${scoreHex.border};background:${scoreHex.bg};display:flex;align-items:center;justify-content:center">
						<span style="font-size:1.5rem;font-weight:900;color:${scoreHex.text}">${data.grade}</span>
					</div>
					<div>
						<div class="text-sm text-white font-bold">SEO Score: <span style="color:${scoreHex.text}">${data.score}/100</span></div>
						<div class="text-xs text-gray-500 mt-0.5">${data.checks.filter((c) => c.pass).length}/${data.checks.length} checks passed</div>
					</div>
				</div>
				<div class="text-right text-[10px] text-gray-500">
					<div>Status: <span class="text-white font-mono">${data.statusCode}</span></div>
					<div>${data.isHTTPS ? '<span style="color:#10b981">HTTPS</span>' : '<span style="color:#ef4444">HTTP only</span>'}</div>
				</div>
			</div>
			<div class="px-4 pb-3">
				<div style="width:100%;background:rgba(55,65,81,0.5);border-radius:9999px;height:10px">
					<div style="width:${data.score}%;background:${scoreHex.text};height:10px;border-radius:9999px;transition:width 0.5s"></div>
				</div>
			</div>
		</div>

		<!-- Category Scores (horizontal bars) -->
		<div class="bg-cyber-card rounded-xl overflow-hidden mb-4" style="border:1px solid rgba(132,204,22,0.2)">
			<div class="px-4 py-2.5" style="border-bottom:1px solid rgba(132,204,22,0.2);background:rgba(132,204,22,0.05)">
				<h4 style="font-size:11px;font-weight:700;color:#a3e635;text-transform:uppercase;letter-spacing:0.05em">Score by Category</h4>
			</div>
			<div class="p-4 space-y-2">`;

	// Compute per-category scores as horizontal bars
	if (data.checksByCategory) {
		for (const [cat, arr] of Object.entries(data.checksByCategory)) {
			const catChecks = arr;
			const totalW = catChecks.reduce((s, c) => s + c.weight, 0);
			const earnedW = catChecks.filter((c) => c.pass).reduce((s, c) => s + c.weight, 0);
			const catScore = Math.round((earnedW / totalW) * 100);
			const passed = catChecks.filter((c) => c.pass).length;
			const barColor = catScore >= 90 ? '#10b981' : catScore >= 50 ? '#f97316' : '#ef4444';
			const accent = catColors[cat] || '#9ca3af';
			html += `<div class="flex items-center gap-3">
				<span style="font-size:10px;font-weight:600;color:${accent};width:100px;flex-shrink:0">${cat}</span>
				<div style="flex:1;background:rgba(55,65,81,0.4);border-radius:9999px;height:8px;overflow:hidden">
					<div style="width:${catScore}%;background:${barColor};height:8px;border-radius:9999px"></div>
				</div>
				<span style="font-size:11px;font-weight:800;color:${barColor};width:36px;text-align:right;font-family:monospace">${catScore}%</span>
				<span style="font-size:9px;color:#6b7280;width:30px;text-align:right">${passed}/${catChecks.length}</span>
			</div>`;
		}
	}
	html += `</div></div>`;

	// ---- Meta Tags Section ----
	const m = data.meta;
	html += `<div class="bg-cyber-card rounded-xl overflow-hidden mb-4" style="border:1px solid rgba(59,130,246,0.2)">
		<div class="px-4 py-2.5" style="border-bottom:1px solid rgba(59,130,246,0.2);background:rgba(59,130,246,0.05)">
			<h4 style="font-size:11px;font-weight:700;color:#60a5fa;text-transform:uppercase;letter-spacing:0.05em">Meta Tags</h4>
		</div>
		<div class="divide-y divide-blue-500/10">
			<div class="px-4 py-2 flex items-start gap-2">${m.title ? passIcon : failIcon}<div class="flex-1"><span class="text-xs text-white font-semibold">Title</span><div style="font-size:11px;color:#9ca3af;margin-top:2px">${m.title ? escapeHtml(m.title) : '<span style="color:#ef4444">Missing</span>'}</div>${m.title ? '<div style="font-size:9px;color:#6b7280;margin-top:1px">' + m.titleLength + ' characters' + (m.titleLength > 60 ? ' <span style="color:#f97316">(too long)</span>' : m.titleLength < 10 ? ' <span style="color:#f97316">(too short)</span>' : ' <span style="color:#10b981">(optimal)</span>') + '</div>' : ''}</div></div>
			<div class="px-4 py-2 flex items-start gap-2">${m.metaDescription ? passIcon : failIcon}<div class="flex-1"><span class="text-xs text-white font-semibold">Meta Description</span><div style="font-size:11px;color:#9ca3af;margin-top:2px">${m.metaDescription ? escapeHtml(m.metaDescription.substring(0, 160)) : '<span style="color:#ef4444">Missing</span>'}</div>${m.metaDescription ? '<div style="font-size:9px;color:#6b7280;margin-top:1px">' + m.descriptionLength + ' characters' + (m.descriptionLength > 160 ? ' <span style="color:#f97316">(too long)</span>' : m.descriptionLength < 50 ? ' <span style="color:#f97316">(too short)</span>' : ' <span style="color:#10b981">(optimal)</span>') + '</div>' : ''}</div></div>
			<div class="px-4 py-2 flex items-center gap-2">${m.viewport ? passIcon : failIcon}<span class="text-xs text-white">Viewport</span><span style="font-size:10px;color:#6b7280;margin-left:auto;font-family:monospace">${m.viewport ? escapeHtml(m.viewport.substring(0, 60)) : 'Missing'}</span></div>
			<div class="px-4 py-2 flex items-center gap-2">${m.canonical ? passIcon : failIcon}<span class="text-xs text-white">Canonical</span><span style="font-size:10px;color:#6b7280;margin-left:auto;font-family:monospace;max-width:60%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${m.canonical ? escapeHtml(m.canonical) : 'Missing'}</span></div>
			<div class="px-4 py-2 flex items-center gap-2">${m.lang ? passIcon : failIcon}<span class="text-xs text-white">Language</span><span style="font-size:10px;color:#6b7280;margin-left:auto;font-family:monospace">${m.lang || 'Missing'}</span></div>
			<div class="px-4 py-2 flex items-center gap-2">${m.charset ? passIcon : failIcon}<span class="text-xs text-white">Charset</span><span style="font-size:10px;color:#6b7280;margin-left:auto;font-family:monospace">${m.charset || 'Missing'}</span></div>
			<div class="px-4 py-2 flex items-center gap-2">${m.favicon ? passIcon : failIcon}<span class="text-xs text-white">Favicon</span><span style="font-size:10px;color:#6b7280;margin-left:auto">${m.favicon ? 'Found' : 'Missing'}</span></div>
			<div class="px-4 py-2 flex items-center gap-2">${m.hasDoctype ? passIcon : failIcon}<span class="text-xs text-white">DOCTYPE</span><span style="font-size:10px;color:#6b7280;margin-left:auto">${m.hasDoctype ? 'Present' : 'Missing'}</span></div>
			${m.robotsMeta ? '<div class="px-4 py-2 flex items-center gap-2"><svg style="width:14px;height:14px;color:#f97316;flex-shrink:0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01"/></svg><span class="text-xs text-white">Robots Meta</span><span style="font-size:10px;color:#f97316;margin-left:auto;font-family:monospace">' + escapeHtml(m.robotsMeta) + '</span></div>' : ''}
		</div>
	</div>`;

	// ---- Headings Structure ----
	if (data.content.headings && data.content.headings.length > 0) {
		html += `<details open class="bg-cyber-card rounded-xl overflow-hidden mb-4" style="border:1px solid rgba(245,158,11,0.2)">
			<summary class="px-4 py-2.5 cursor-pointer" style="border-bottom:1px solid rgba(245,158,11,0.2);background:rgba(245,158,11,0.05)">
				<span style="font-size:11px;font-weight:700;color:#fbbf24;text-transform:uppercase;letter-spacing:0.05em">Heading Structure (${data.content.headings.length})</span>
			</summary>
			<div class="divide-y divide-yellow-500/10 max-h-[300px] overflow-y-auto">`;
		for (const h of data.content.headings.slice(0, 40)) {
			const level = parseInt(h.tag[1]);
			const indent = (level - 1) * 16;
			const tagColor = level === 1 ? '#fbbf24' : level === 2 ? '#fb923c' : '#9ca3af';
			html += `<div class="px-4 py-1.5 flex items-center gap-2">
				<span style="font-size:9px;font-weight:700;padding:1px 5px;border-radius:3px;background:${tagColor}22;color:${tagColor};min-width:24px;text-align:center">${h.tag}</span>
				<span style="font-size:11px;color:#d1d5db;margin-left:${indent}px">${escapeHtml(h.text.substring(0, 80))}</span>
			</div>`;
		}
		html += `</div></details>`;
	}

	// ---- Content Analysis ----
	html += `<div class="bg-cyber-card rounded-xl overflow-hidden mb-4" style="border:1px solid rgba(245,158,11,0.2)">
		<div class="px-4 py-2.5" style="border-bottom:1px solid rgba(245,158,11,0.2);background:rgba(245,158,11,0.05)">
			<h4 style="font-size:11px;font-weight:700;color:#fbbf24;text-transform:uppercase;letter-spacing:0.05em">Content Analysis</h4>
		</div>
		<div class="grid grid-cols-2 md:grid-cols-4 gap-px" style="background:rgba(245,158,11,0.1)">
			<div class="bg-cyber-card p-3 text-center">
				<span style="font-size:20px;font-weight:900;color:${data.content.wordCount >= 300 ? '#10b981' : '#f97316'}">${data.content.wordCount}</span>
				<span style="font-size:9px;color:#6b7280;display:block;text-transform:uppercase">Words</span>
			</div>
			<div class="bg-cyber-card p-3 text-center">
				<span style="font-size:20px;font-weight:900;color:white">${data.content.imagesTotal}</span>
				<span style="font-size:9px;color:#6b7280;display:block;text-transform:uppercase">Images</span>
			</div>
			<div class="bg-cyber-card p-3 text-center">
				<span style="font-size:20px;font-weight:900;color:${data.content.imagesWithoutAlt === 0 ? '#10b981' : '#ef4444'}">${data.content.imagesWithoutAlt}</span>
				<span style="font-size:9px;color:#6b7280;display:block;text-transform:uppercase">Imgs no alt</span>
			</div>
			<div class="bg-cyber-card p-3 text-center">
				<span style="font-size:20px;font-weight:900;color:white">${data.content.headings.length}</span>
				<span style="font-size:9px;color:#6b7280;display:block;text-transform:uppercase">Headings</span>
			</div>
		</div>
	</div>`;

	// ---- Keywords ----
	if (data.topKeywords && data.topKeywords.length > 0) {
		const maxCount = data.topKeywords[0].count;
		html += `<details open class="bg-cyber-card rounded-xl overflow-hidden mb-4" style="border:1px solid rgba(192,132,252,0.2)">
			<summary class="px-4 py-2.5 cursor-pointer" style="border-bottom:1px solid rgba(192,132,252,0.2);background:rgba(192,132,252,0.05)">
				<span style="font-size:11px;font-weight:700;color:#c084fc;text-transform:uppercase;letter-spacing:0.05em">Top Keywords (${data.topKeywords.length})</span>
			</summary>
			<div class="p-4">
				<div class="flex flex-wrap gap-2 mb-3">`;
		for (const kw of data.topKeywords.slice(0, 15)) {
			const opacity = 0.3 + (kw.count / maxCount) * 0.7;
			html += `<span style="font-size:11px;padding:3px 10px;border-radius:9999px;background:rgba(192,132,252,${(opacity * 0.2).toFixed(2)});color:#c084fc;border:1px solid rgba(192,132,252,${(opacity * 0.4).toFixed(2)});font-weight:${kw.count >= maxCount * 0.5 ? '700' : '500'}">${escapeHtml(kw.word)} <span style="font-size:9px;color:#9ca3af">${kw.count}x (${kw.density}%)</span></span>`;
		}
		html += `</div>`;
		// Top 5 as table
		html += `<div class="divide-y divide-purple-500/10">`;
		for (const kw of data.topKeywords.slice(0, 8)) {
			const barW = Math.max(3, (kw.count / maxCount) * 100);
			html += `<div class="py-1 flex items-center gap-2">
				<span style="font-size:11px;font-weight:600;color:#d1d5db;width:100px">${escapeHtml(kw.word)}</span>
				<div style="flex:1;background:rgba(55,65,81,0.3);border-radius:9999px;height:6px;overflow:hidden"><div style="width:${barW}%;background:#c084fc;height:6px;border-radius:9999px;opacity:0.7"></div></div>
				<span style="font-size:10px;font-family:monospace;color:#9ca3af;width:30px;text-align:right">${kw.count}</span>
				<span style="font-size:9px;color:#6b7280;width:40px;text-align:right">${kw.density}%</span>
			</div>`;
		}
		html += `</div></div></details>`;
	}

	// ---- Readability ----
	if (data.readability) {
		const r = data.readability;
		const readColor = r.level === 'Easy' ? '#10b981' : r.level === 'Medium' ? '#eab308' : r.level === 'Hard' ? '#f97316' : '#ef4444';
		html += `<div class="bg-cyber-card rounded-xl overflow-hidden mb-4" style="border:1px solid rgba(245,158,11,0.2)">
			<div class="px-4 py-2.5" style="border-bottom:1px solid rgba(245,158,11,0.2);background:rgba(245,158,11,0.05)">
				<h4 style="font-size:11px;font-weight:700;color:#fbbf24;text-transform:uppercase;letter-spacing:0.05em">Readability</h4>
			</div>
			<div class="grid grid-cols-2 md:grid-cols-5 gap-px" style="background:rgba(245,158,11,0.1)">
				<div class="bg-cyber-card p-3 text-center">
					<span style="font-size:16px;font-weight:900;color:${readColor}">${r.level}</span>
					<span style="font-size:9px;color:#6b7280;display:block;text-transform:uppercase">Level</span>
				</div>
				<div class="bg-cyber-card p-3 text-center">
					<span style="font-size:16px;font-weight:900;color:white">${r.readabilityIndex}</span>
					<span style="font-size:9px;color:#6b7280;display:block;text-transform:uppercase">ARI Score</span>
				</div>
				<div class="bg-cyber-card p-3 text-center">
					<span style="font-size:16px;font-weight:900;color:white">${r.avgSentenceLength}</span>
					<span style="font-size:9px;color:#6b7280;display:block;text-transform:uppercase">Words/Sentence</span>
				</div>
				<div class="bg-cyber-card p-3 text-center">
					<span style="font-size:16px;font-weight:900;color:white">${r.avgWordLength}</span>
					<span style="font-size:9px;color:#6b7280;display:block;text-transform:uppercase">Avg Word Len</span>
				</div>
				<div class="bg-cyber-card p-3 text-center">
					<span style="font-size:16px;font-weight:900;color:white">${r.sentenceCount}</span>
					<span style="font-size:9px;color:#6b7280;display:block;text-transform:uppercase">Sentences</span>
				</div>
			</div>
		</div>`;
	}

	// ---- URL Analysis ----
	if (data.urlAnalysis) {
		const u = data.urlAnalysis;
		html += `<div class="bg-cyber-card rounded-xl overflow-hidden mb-4" style="border:1px solid rgba(192,132,252,0.2)">
			<div class="px-4 py-2.5" style="border-bottom:1px solid rgba(192,132,252,0.2);background:rgba(192,132,252,0.05)">
				<h4 style="font-size:11px;font-weight:700;color:#c084fc;text-transform:uppercase;letter-spacing:0.05em">URL Analysis</h4>
			</div>
			<div class="p-3">
				<div style="font-size:11px;font-family:monospace;color:#22d3ee;padding:6px 10px;background:rgba(0,0,0,0.2);border-radius:6px;margin-bottom:10px;word-break:break-all">${escapeHtml(data.finalUrl)}</div>
				<div class="grid grid-cols-2 md:grid-cols-4 gap-2">
					<div class="flex items-center gap-1.5">${u.length <= 100 ? passIcon : failIcon}<span style="font-size:10px;color:#d1d5db">Length: ${u.length}</span></div>
					<div class="flex items-center gap-1.5">${!u.hasUppercase ? passIcon : failIcon}<span style="font-size:10px;color:#d1d5db">${u.hasUppercase ? 'Has uppercase' : 'Lowercase'}</span></div>
					<div class="flex items-center gap-1.5">${!u.hasUnderscore ? passIcon : failIcon}<span style="font-size:10px;color:#d1d5db">${u.hasUnderscore ? 'Has underscores' : 'No underscores'}</span></div>
					<div class="flex items-center gap-1.5">${!u.hasSpecialChars ? passIcon : failIcon}<span style="font-size:10px;color:#d1d5db">${u.hasSpecialChars ? 'Special chars' : 'Clean chars'}</span></div>
					<div class="flex items-center gap-1.5"><span style="font-size:10px;color:#9ca3af">Depth: <span style="color:#d1d5db">${u.depth}</span></span></div>
					<div class="flex items-center gap-1.5"><span style="font-size:10px;color:#9ca3af">${u.isClean ? '<span style="color:#10b981;font-weight:700">SEO-Friendly URL</span>' : '<span style="color:#f97316">Could be improved</span>'}</span></div>
				</div>
			</div>
		</div>`;
	}

	// ---- Page Size & Performance ----
	if (data.pageSize) {
		const ps = data.pageSize;
		const fmtKB = (b) => (b / 1024).toFixed(1) + ' KB';
		html += `<div class="bg-cyber-card rounded-xl overflow-hidden mb-4" style="border:1px solid rgba(249,115,22,0.2)">
			<div class="px-4 py-2.5" style="border-bottom:1px solid rgba(249,115,22,0.2);background:rgba(249,115,22,0.05)">
				<h4 style="font-size:11px;font-weight:700;color:#fb923c;text-transform:uppercase;letter-spacing:0.05em">Page Weight & Resources</h4>
			</div>
			<div class="grid grid-cols-2 md:grid-cols-4 gap-px" style="background:rgba(249,115,22,0.1)">
				<div class="bg-cyber-card p-3 text-center">
					<span style="font-size:16px;font-weight:900;color:${ps.htmlSize < 102400 ? '#10b981' : '#f97316'}">${fmtKB(ps.htmlSize)}</span>
					<span style="font-size:9px;color:#6b7280;display:block;text-transform:uppercase">HTML Size</span>
				</div>
				<div class="bg-cyber-card p-3 text-center">
					<span style="font-size:16px;font-weight:900;color:${ps.textToHtmlRatio >= 10 ? '#10b981' : '#f97316'}">${ps.textToHtmlRatio}%</span>
					<span style="font-size:9px;color:#6b7280;display:block;text-transform:uppercase">Text/HTML Ratio</span>
				</div>
				<div class="bg-cyber-card p-3 text-center">
					<span style="font-size:16px;font-weight:900;color:white">${data.content.externalCSS}</span>
					<span style="font-size:9px;color:#6b7280;display:block;text-transform:uppercase">CSS Files</span>
				</div>
				<div class="bg-cyber-card p-3 text-center">
					<span style="font-size:16px;font-weight:900;color:white">${data.content.externalJS}</span>
					<span style="font-size:9px;color:#6b7280;display:block;text-transform:uppercase">JS Files</span>
				</div>
			</div>
			<div class="px-4 py-2 grid grid-cols-2 gap-2">
				<div style="font-size:10px;color:#9ca3af">Inline styles: <span style="color:#d1d5db;font-weight:600">${data.content.inlineStyles}</span></div>
				<div style="font-size:10px;color:#9ca3af">Inline scripts: <span style="color:#d1d5db;font-weight:600">${data.content.inlineScripts}</span></div>
				${data.resourceHints ? '<div style="font-size:10px;color:#9ca3af">Preconnect: <span style="color:#d1d5db;font-weight:600">' + data.resourceHints.preconnect.length + '</span></div>' : ''}
				${data.resourceHints ? '<div style="font-size:10px;color:#9ca3af">Preload: <span style="color:#d1d5db;font-weight:600">' + data.resourceHints.preload.length + '</span></div>' : ''}
			</div>
		</div>`;
	}

	// ---- Redirect & Mixed Content ----
	if (
		data.wasRedirected ||
		(data.mixedContent && data.mixedContent.length > 0) ||
		(data.deprecatedTags && data.deprecatedTags.length > 0)
	) {
		html += `<div class="bg-cyber-card rounded-xl overflow-hidden mb-4" style="border:1px solid rgba(239,68,68,0.2)">
			<div class="px-4 py-2.5" style="border-bottom:1px solid rgba(239,68,68,0.2);background:rgba(239,68,68,0.05)">
				<h4 style="font-size:11px;font-weight:700;color:#f87171;text-transform:uppercase;letter-spacing:0.05em">Issues & Warnings</h4>
			</div>
			<div class="divide-y divide-red-500/10">`;
		if (data.wasRedirected) {
			html += `<div class="px-4 py-2 flex items-center gap-2"><svg style="width:14px;height:14px;color:#f97316;flex-shrink:0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg><span style="font-size:11px;color:#fb923c">Redirect detected</span><span style="font-size:10px;font-family:monospace;color:#6b7280;margin-left:auto;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:60%">${escapeHtml(data.redirectTarget || '')}</span></div>`;
		}
		if (data.mixedContent && data.mixedContent.length > 0) {
			html += `<div class="px-4 py-2 flex items-center gap-2">${failIcon}<span style="font-size:11px;color:#f87171">${data.mixedContent.length} mixed content resource(s) (HTTP on HTTPS)</span></div>`;
		}
		if (data.deprecatedTags && data.deprecatedTags.length > 0) {
			html += `<div class="px-4 py-2 flex items-center gap-2">${failIcon}<span style="font-size:11px;color:#f87171">Deprecated HTML tags: <span style="font-family:monospace">${data.deprecatedTags.join(', ')}</span></span></div>`;
		}
		html += `</div></div>`;
	}

	// ---- Accessibility ----
	if (data.accessibility) {
		const a = data.accessibility;
		html += `<div class="bg-cyber-card rounded-xl overflow-hidden mb-4" style="border:1px solid rgba(56,189,248,0.2)">
			<div class="px-4 py-2.5" style="border-bottom:1px solid rgba(56,189,248,0.2);background:rgba(56,189,248,0.05)">
				<h4 style="font-size:11px;font-weight:700;color:#38bdf8;text-transform:uppercase;letter-spacing:0.05em">Accessibility</h4>
			</div>
			<div class="divide-y divide-sky-500/10">
				<div class="px-4 py-2 flex items-center gap-2">${a.hasLang ? passIcon : failIcon}<span style="font-size:11px;color:#d1d5db">HTML lang attribute</span></div>
				<div class="px-4 py-2 flex items-center gap-2">${a.hasSkipNav ? passIcon : failIcon}<span style="font-size:11px;color:#d1d5db">Skip navigation link</span></div>
				<div class="px-4 py-2 flex items-center gap-2">${a.hasAriaLandmarks ? passIcon : failIcon}<span style="font-size:11px;color:#d1d5db">ARIA landmarks / semantic HTML5</span></div>
				<div class="px-4 py-2 flex items-center gap-2">${a.formsHaveLabels ? passIcon : failIcon}<span style="font-size:11px;color:#d1d5db">Form labels</span></div>
				<div class="px-4 py-2 flex items-center gap-2"><span style="font-size:11px;color:#9ca3af">ARIA attributes: <span style="color:#d1d5db;font-weight:600">${a.ariaAttributes}</span></span><span style="font-size:11px;color:#9ca3af;margin-left:16px">role attributes: <span style="color:#d1d5db;font-weight:600">${a.roleAttributes}</span></span></div>
			</div>
		</div>`;
	}

	// ---- HTTP Headers (SEO-relevant) ----
	if (data.seoHeaders) {
		html += `<details class="bg-cyber-card rounded-xl overflow-hidden mb-4" style="border:1px solid rgba(139,92,246,0.2)">
			<summary class="px-4 py-2.5 cursor-pointer" style="border-bottom:1px solid rgba(139,92,246,0.2);background:rgba(139,92,246,0.05)">
				<span style="font-size:11px;font-weight:700;color:#a78bfa;text-transform:uppercase;letter-spacing:0.05em">HTTP Response Headers</span>
			</summary>
			<div class="divide-y divide-violet-500/10">`;
		for (const [key, val] of Object.entries(data.seoHeaders)) {
			if (val) {
				html += `<div class="px-4 py-1.5 flex items-center gap-2">
					<span style="font-size:10px;color:#a78bfa;font-weight:600;width:160px;flex-shrink:0">${escapeHtml(key)}</span>
					<span style="font-size:10px;font-family:monospace;color:#9ca3af;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(String(val).substring(0, 100))}</span>
				</div>`;
			}
		}
		html += `</div></details>`;
	}

	// ---- Open Graph & Twitter Cards ----
	const og = data.openGraph;
	const tw = data.twitterCard;
	const hasOG = og.title || og.description || og.image;
	const hasTW = tw.card || tw.title;
	html += `<div class="bg-cyber-card rounded-xl overflow-hidden mb-4" style="border:1px solid rgba(236,72,153,0.2)">
		<div class="px-4 py-2.5" style="border-bottom:1px solid rgba(236,72,153,0.2);background:rgba(236,72,153,0.05)">
			<h4 style="font-size:11px;font-weight:700;color:#f472b6;text-transform:uppercase;letter-spacing:0.05em">Social Preview</h4>
		</div>
		<div class="p-4">
			<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
				<!-- OG Preview -->
				<div style="border:1px solid rgba(59,130,246,0.2);border-radius:8px;overflow:hidden;background:rgba(0,0,0,0.2)">
					<div style="padding:8px 12px;border-bottom:1px solid rgba(59,130,246,0.1);background:rgba(59,130,246,0.05)">
						<span style="font-size:10px;font-weight:700;color:#60a5fa;text-transform:uppercase">Open Graph</span>
					</div>
					${og.image ? '<img src="' + escapeHtml(og.image) + '" style="width:100%;max-height:120px;object-fit:cover" onerror="this.style.display=\'none\'" />' : ''}
					<div style="padding:8px 12px">
						<div style="font-size:12px;font-weight:700;color:white">${og.title ? escapeHtml(og.title) : '<span style="color:#6b7280">No og:title</span>'}</div>
						<div style="font-size:10px;color:#9ca3af;margin-top:2px">${og.description ? escapeHtml(og.description.substring(0, 100)) : '<span style="color:#6b7280">No og:description</span>'}</div>
						${og.siteName ? '<div style="font-size:9px;color:#6b7280;margin-top:4px">' + escapeHtml(og.siteName) + '</div>' : ''}
					</div>
				</div>
				<!-- Twitter Preview -->
				<div style="border:1px solid rgba(6,182,212,0.2);border-radius:8px;overflow:hidden;background:rgba(0,0,0,0.2)">
					<div style="padding:8px 12px;border-bottom:1px solid rgba(6,182,212,0.1);background:rgba(6,182,212,0.05)">
						<span style="font-size:10px;font-weight:700;color:#22d3ee;text-transform:uppercase">Twitter Card</span>
						${tw.card ? '<span style="font-size:9px;color:#6b7280;margin-left:8px">(' + escapeHtml(tw.card) + ')</span>' : ''}
					</div>
					${tw.image ? '<img src="' + escapeHtml(tw.image) + '" style="width:100%;max-height:120px;object-fit:cover" onerror="this.style.display=\'none\'" />' : ''}
					<div style="padding:8px 12px">
						<div style="font-size:12px;font-weight:700;color:white">${tw.title ? escapeHtml(tw.title) : '<span style="color:#6b7280">No twitter:title</span>'}</div>
						<div style="font-size:10px;color:#9ca3af;margin-top:2px">${tw.description ? escapeHtml(tw.description.substring(0, 100)) : '<span style="color:#6b7280">No twitter:description</span>'}</div>
					</div>
				</div>
			</div>
		</div>
	</div>`;

	// ---- Structured Data ----
	html += `<div class="bg-cyber-card rounded-xl overflow-hidden mb-4" style="border:1px solid rgba(139,92,246,0.2)">
		<div class="px-4 py-2.5" style="border-bottom:1px solid rgba(139,92,246,0.2);background:rgba(139,92,246,0.05)">
			<h4 style="font-size:11px;font-weight:700;color:#a78bfa;text-transform:uppercase;letter-spacing:0.05em">Structured Data (JSON-LD)</h4>
		</div>`;
	if (data.structuredData.length > 0) {
		html += `<div class="divide-y divide-violet-500/10">`;
		for (const sd of data.structuredData) {
			html += `<div class="px-4 py-2 flex items-center gap-2">${passIcon}
				<span style="font-size:9px;font-weight:700;padding:2px 6px;border-radius:4px;background:rgba(139,92,246,0.15);color:#a78bfa;border:1px solid rgba(139,92,246,0.3)">${escapeHtml(sd.type)}</span>
				<span style="font-size:10px;color:#6b7280;font-family:monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1">${escapeHtml(sd.summary.substring(0, 120))}</span>
			</div>`;
		}
		html += `</div>`;
	} else {
		html += `<div class="px-4 py-3 flex items-center gap-2">${failIcon}<span style="font-size:11px;color:#9ca3af">No structured data (JSON-LD) found — consider adding Schema.org markup</span></div>`;
	}
	html += `</div>`;

	// ---- Robots.txt ----
	html += `<div class="bg-cyber-card rounded-xl overflow-hidden mb-4" style="border:1px solid rgba(16,185,129,0.2)">
		<div class="px-4 py-2.5" style="border-bottom:1px solid rgba(16,185,129,0.2);background:rgba(16,185,129,0.05)">
			<h4 style="font-size:11px;font-weight:700;color:#34d399;text-transform:uppercase;letter-spacing:0.05em">Robots.txt</h4>
		</div>`;
	if (data.robots.exists) {
		html += `<div class="p-4 space-y-2">
			<div class="flex items-center gap-2">${passIcon}<span class="text-xs text-white font-semibold">robots.txt found</span></div>`;
		if (data.robots.userAgents.length > 0) {
			html += `<div style="font-size:10px;color:#9ca3af"><span style="color:#6b7280">User-Agents: </span>${data.robots.userAgents.map((u) => '<span style="font-family:monospace;color:#d1d5db">' + escapeHtml(u) + '</span>').join(', ')}</div>`;
		}
		if (data.robots.disallowedPaths.length > 0) {
			html += `<details><summary style="font-size:10px;color:#f97316;cursor:pointer">${data.robots.disallowedPaths.length} disallowed paths</summary><div style="padding:8px 0;font-size:10px;font-family:monospace;color:#9ca3af">${data.robots.disallowedPaths.map((p) => escapeHtml(p)).join('<br>')}</div></details>`;
		}
		if (data.robots.sitemapUrls.length > 0) {
			html += `<div style="font-size:10px;color:#9ca3af"><span style="color:#6b7280">Sitemaps in robots.txt: </span>${data.robots.sitemapUrls.map((u) => '<span style="font-family:monospace;color:#22d3ee">' + escapeHtml(u) + '</span>').join('<br>')}</div>`;
		}
		if (data.robots.crawlDelay !== null) {
			html += `<div style="font-size:10px;color:#f97316">Crawl-delay: ${data.robots.crawlDelay}s</div>`;
		}
		html += `</div>`;
	} else {
		html += `<div class="px-4 py-3 flex items-center gap-2">${failIcon}<span style="font-size:11px;color:#9ca3af">No robots.txt found</span></div>`;
	}
	html += `</div>`;

	// ---- Sitemap ----
	html += `<div class="bg-cyber-card rounded-xl overflow-hidden mb-4" style="border:1px solid rgba(16,185,129,0.2)">
		<div class="px-4 py-2.5" style="border-bottom:1px solid rgba(16,185,129,0.2);background:rgba(16,185,129,0.05)">
			<h4 style="font-size:11px;font-weight:700;color:#34d399;text-transform:uppercase;letter-spacing:0.05em">Sitemap</h4>
		</div>`;
	if (data.sitemap.exists) {
		html += `<div class="p-4 space-y-2">
			<div class="flex items-center gap-2">${passIcon}<span class="text-xs text-white font-semibold">Sitemap found</span><span style="font-size:9px;font-weight:700;padding:2px 6px;border-radius:4px;background:rgba(16,185,129,0.15);color:#34d399;border:1px solid rgba(16,185,129,0.3)">${escapeHtml(data.sitemap.format || 'XML')}</span></div>
			<div style="font-size:11px;color:#9ca3af"><span style="font-weight:700;color:white">${data.sitemap.urls}</span> URLs indexed</div>`;
		if (data.sitemap.lastmod) {
			html += `<div style="font-size:10px;color:#6b7280">Last modified: <span style="color:#d1d5db">${escapeHtml(data.sitemap.lastmod)}</span></div>`;
		}
		if (data.sitemap.nestedSitemaps.length > 0) {
			html += `<details><summary style="font-size:10px;color:#22d3ee;cursor:pointer">${data.sitemap.nestedSitemaps.length} nested sitemaps</summary><div style="padding:8px 0;font-size:9px;font-family:monospace;color:#6b7280;word-break:break-all">${data.sitemap.nestedSitemaps.map((u) => escapeHtml(u)).join('<br>')}</div></details>`;
		}
		if (data.sitemap.sampleUrls.length > 0) {
			html += `<details><summary style="font-size:10px;color:#9ca3af;cursor:pointer">Sample URLs (${data.sitemap.sampleUrls.length})</summary><div style="padding:8px 0;font-size:9px;font-family:monospace;color:#6b7280;word-break:break-all">${data.sitemap.sampleUrls.map((u) => escapeHtml(u)).join('<br>')}</div></details>`;
		}
		html += `</div>`;
	} else {
		html += `<div class="px-4 py-3 flex items-center gap-2">${failIcon}<span style="font-size:11px;color:#9ca3af">No sitemap found — create a sitemap.xml for better search engine crawling</span></div>`;
	}
	html += `</div>`;

	// ---- Links Analysis ----
	html += `<div class="bg-cyber-card rounded-xl overflow-hidden mb-4" style="border:1px solid rgba(6,182,212,0.2)">
		<div class="px-4 py-2.5" style="border-bottom:1px solid rgba(6,182,212,0.2);background:rgba(6,182,212,0.05)">
			<h4 style="font-size:11px;font-weight:700;color:#22d3ee;text-transform:uppercase;letter-spacing:0.05em">Links Analysis</h4>
		</div>
		<div class="grid grid-cols-3 md:grid-cols-6 gap-px" style="background:rgba(6,182,212,0.1)">
			<div class="bg-cyber-card p-3 text-center">
				<span style="font-size:18px;font-weight:900;color:white">${data.links.internalCount}</span>
				<span style="font-size:8px;color:#6b7280;display:block;text-transform:uppercase">Internal</span>
			</div>
			<div class="bg-cyber-card p-3 text-center">
				<span style="font-size:18px;font-weight:900;color:white">${data.links.externalCount}</span>
				<span style="font-size:8px;color:#6b7280;display:block;text-transform:uppercase">External</span>
			</div>
			<div class="bg-cyber-card p-3 text-center">
				<span style="font-size:18px;font-weight:900;color:${(data.links.nofollowInternal || 0) > 0 ? '#f97316' : '#10b981'}">${data.links.nofollowInternal || 0}</span>
				<span style="font-size:8px;color:#6b7280;display:block;text-transform:uppercase">Nofollow Int.</span>
			</div>
			<div class="bg-cyber-card p-3 text-center">
				<span style="font-size:18px;font-weight:900;color:white">${data.links.nofollowExternal || 0}</span>
				<span style="font-size:8px;color:#6b7280;display:block;text-transform:uppercase">Nofollow Ext.</span>
			</div>
			<div class="bg-cyber-card p-3 text-center">
				<span style="font-size:18px;font-weight:900;color:${(data.links.emptyLinks || 0) > 0 ? '#ef4444' : '#10b981'}">${data.links.emptyLinks || 0}</span>
				<span style="font-size:8px;color:#6b7280;display:block;text-transform:uppercase">Empty Text</span>
			</div>
			<div class="bg-cyber-card p-3 text-center">
				<span style="font-size:18px;font-weight:900;color:white">${data.links.internalCount + data.links.externalCount}</span>
				<span style="font-size:8px;color:#6b7280;display:block;text-transform:uppercase">Total</span>
			</div>
		</div>`;
	if (data.links.internalLinks.length > 0) {
		html += `<details><summary class="px-4 py-2 cursor-pointer" style="font-size:10px;color:#22d3ee;background:rgba(6,182,212,0.03)">Internal links (${data.links.internalLinks.length})</summary>
			<div class="divide-y divide-cyan-500/5 max-h-[200px] overflow-y-auto">`;
		for (const l of data.links.internalLinks.slice(0, 30)) {
			html += `<div class="px-4 py-1 flex items-center gap-2">
				<span style="font-size:10px;font-family:monospace;color:#22d3ee;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(l.url)}</span>
				<span style="font-size:9px;color:#6b7280;flex-shrink:0">${escapeHtml(l.text.substring(0, 40)) || '<em>empty</em>'}</span>
				${l.nofollow ? '<span style="font-size:8px;color:#f97316;font-weight:700">nofollow</span>' : ''}
			</div>`;
		}
		html += `</div></details>`;
	}
	if (data.links.externalLinks.length > 0) {
		html += `<details><summary class="px-4 py-2 cursor-pointer" style="font-size:10px;color:#fb923c;background:rgba(249,115,22,0.03)">External links (${data.links.externalLinks.length})</summary>
			<div class="divide-y divide-orange-500/5 max-h-[200px] overflow-y-auto">`;
		for (const l of data.links.externalLinks.slice(0, 20)) {
			html += `<div class="px-4 py-1 flex items-center gap-2">
				<span style="font-size:10px;font-family:monospace;color:#fb923c;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(l.url)}</span>
				${l.nofollow ? '<span style="font-size:8px;color:#f97316;font-weight:700">nofollow</span>' : ''}
				${l.hasTarget ? '<span style="font-size:8px;color:#6b7280">_blank</span>' : ''}
			</div>`;
		}
		html += `</div></details>`;
	}
	html += `</div>`;

	// ---- Crawled Pages ----
	if (data.crawledPages && data.crawledPages.length > 0) {
		html += `<details open class="bg-cyber-card rounded-xl overflow-hidden mb-4" style="border:1px solid rgba(132,204,22,0.2)">
			<summary class="px-4 py-2.5 cursor-pointer" style="border-bottom:1px solid rgba(132,204,22,0.2);background:rgba(132,204,22,0.05)">
				<span style="font-size:11px;font-weight:700;color:#a3e635;text-transform:uppercase;letter-spacing:0.05em">Page Analysis (${data.crawledPages.length} pages crawled)</span>
			</summary>
			<div class="divide-y divide-lime-500/10">`;
		for (const page of data.crawledPages) {
			const issueCount = page.issues.length;
			const pageColor = issueCount === 0 ? '#10b981' : issueCount <= 2 ? '#f97316' : '#ef4444';
			html += `<div class="px-4 py-2.5">
				<div class="flex items-center gap-2 mb-1">
					<span style="font-size:9px;font-weight:700;padding:1px 5px;border-radius:3px;background:${page.statusCode === 200 ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'};color:${page.statusCode === 200 ? '#10b981' : '#ef4444'}">${page.statusCode}</span>
					<span style="font-size:11px;font-family:monospace;color:#d1d5db;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1">${escapeHtml(page.url)}</span>
					<span style="font-size:9px;color:${pageColor};font-weight:700">${issueCount === 0 ? 'OK' : issueCount + ' issue' + (issueCount > 1 ? 's' : '')}</span>
				</div>`;
			if (page.title)
				html += `<div style="font-size:10px;color:#9ca3af">Title: <span style="color:#d1d5db">${escapeHtml(page.title.substring(0, 60))}</span></div>`;
			if (page.h1)
				html += `<div style="font-size:10px;color:#9ca3af">H1: <span style="color:#d1d5db">${escapeHtml(page.h1.substring(0, 60))}</span></div>`;
			html += `<div style="font-size:9px;color:#6b7280">${page.wordCount} words</div>`;
			if (page.issues.length > 0) {
				html += `<div class="flex flex-wrap gap-1 mt-1">`;
				for (const iss of page.issues) {
					html += `<span style="font-size:8px;font-weight:700;padding:1px 4px;border-radius:3px;background:rgba(239,68,68,0.15);color:#f87171;border:1px solid rgba(239,68,68,0.3)">${escapeHtml(iss)}</span>`;
				}
				html += `</div>`;
			}
			html += `</div>`;
		}
		html += `</div></details>`;
	}

	// ---- Hreflang ----
	if (data.hreflangs && data.hreflangs.length > 0) {
		html += `<div class="bg-cyber-card rounded-xl overflow-hidden mb-4" style="border:1px solid rgba(20,184,166,0.2)">
			<div class="px-4 py-2.5" style="border-bottom:1px solid rgba(20,184,166,0.2);background:rgba(20,184,166,0.05)">
				<h4 style="font-size:11px;font-weight:700;color:#2dd4bf;text-transform:uppercase;letter-spacing:0.05em">Hreflang Tags (${data.hreflangs.length})</h4>
			</div>
			<div class="divide-y divide-teal-500/10">`;
		for (const h of data.hreflangs) {
			html += `<div class="px-4 py-1.5 flex items-center gap-2">
				<span style="font-size:9px;font-weight:700;padding:2px 6px;border-radius:4px;background:rgba(20,184,166,0.15);color:#2dd4bf;border:1px solid rgba(20,184,166,0.3)">${escapeHtml(h.lang)}</span>
				<span style="font-size:10px;font-family:monospace;color:#9ca3af;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1">${escapeHtml(h.url)}</span>
			</div>`;
		}
		html += `</div></div>`;
	}

	// ---- Social Links ----
	if (data.socialLinks && data.socialLinks.length > 0) {
		html += `<div class="bg-cyber-card rounded-xl overflow-hidden mb-4" style="border:1px solid rgba(236,72,153,0.2)">
			<div class="px-4 py-2.5" style="border-bottom:1px solid rgba(236,72,153,0.2);background:rgba(236,72,153,0.05)">
				<h4 style="font-size:11px;font-weight:700;color:#f472b6;text-transform:uppercase;letter-spacing:0.05em">Social Media Links (${data.socialLinks.length})</h4>
			</div>
			<div class="p-3 flex flex-wrap gap-2">`;
		for (const sl of data.socialLinks) {
			html += `<span style="font-size:10px;padding:3px 8px;border-radius:6px;background:rgba(236,72,153,0.1);color:#f472b6;border:1px solid rgba(236,72,153,0.2)">${escapeHtml(sl.name)}</span>`;
		}
		html += `</div></div>`;
	}

	// ---- Detailed Check Results ----
	html += `<details open class="bg-cyber-card rounded-xl overflow-hidden mb-4" style="border:1px solid rgba(132,204,22,0.2)">
		<summary class="px-4 py-2.5 cursor-pointer" style="border-bottom:1px solid rgba(132,204,22,0.2);background:rgba(132,204,22,0.05)">
			<span style="font-size:11px;font-weight:700;color:#a3e635;text-transform:uppercase;letter-spacing:0.05em">All Checks (${data.checks.filter((c) => c.pass).length}/${data.checks.length} passed)</span>
		</summary>`;
	if (data.checksByCategory) {
		for (const [cat, arr] of Object.entries(data.checksByCategory)) {
			const cc = catColors[cat] || '#9ca3af';
			const catChecks = arr;
			const passed = catChecks.filter((c) => c.pass).length;
			html += `<div style="border-bottom:1px solid rgba(132,204,22,0.08)">
				<div class="px-4 py-2 flex items-center justify-between" style="background:rgba(0,0,0,0.15)">
					<span style="font-size:10px;font-weight:700;color:${cc};text-transform:uppercase">${cat}</span>
					<span style="font-size:10px;font-family:monospace;color:${passed === catChecks.length ? '#10b981' : '#f97316'}">${passed}/${catChecks.length}</span>
				</div>
				<div class="divide-y divide-gray-700/30">`;
			for (const c of catChecks) {
				html += `<div class="px-4 py-1.5 flex items-center gap-2">${c.pass ? passIcon : failIcon}<span style="font-size:11px;color:${c.pass ? '#d1d5db' : '#f87171'}">${escapeHtml(c.label)}</span><span style="font-size:9px;color:#6b7280;margin-left:auto;max-width:50%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:right">${escapeHtml(c.detail.substring(0, 80))}</span></div>`;
			}
			html += `</div></div>`;
		}
	}
	html += `</details>`;

	// Footer
	html += `<div class="text-center text-[10px] text-gray-600 mt-2">
		Tested at ${new Date(data.timestamp).toLocaleString()}
	</div>`;

	html += `</div>`;
	resultsDiv.innerHTML = html;
}

// =============================================
// FEATURE: Speed Test
// =============================================
async function runSpeedTest() {
	const urlInput = document.getElementById('url');
	const url = normalizeUrl(urlInput.value);
	if (!url) {
		showAlert('Please enter a target URL first.', 'Missing URL', 'warning');
		return;
	}
	if (url !== urlInput.value) urlInput.value = url;

	const resultsDiv = document.getElementById('results');
	resultsDiv.innerHTML = `<div class="flex items-center justify-center h-full py-16">
		${cyberLoader({ size: 'lg', color: 'text-amber-400', text: 'Running Speed Test...', subtext: 'Fetching page & resources, analyzing performance... (max ~25s)' })}
	</div>`;

	try {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 30000);
		const resp = await fetch(`/api/speedtest?url=${encodeURIComponent(url)}`, { signal: controller.signal });
		clearTimeout(timeout);
		const data = await resp.json();
		if (!resp.ok) throw new Error(data.message || data.error || `HTTP ${resp.status}`);
		displaySpeedTestResults(data);
	} catch (e) {
		const msg = e.name === 'AbortError' ? 'Request timed out.' : e.message;
		resultsDiv.innerHTML = `<div class="text-center py-10"><p class="text-cyber-danger font-bold">Speed Test Failed</p><p class="text-gray-400 text-sm mt-2">${escapeHtml(msg)}</p><button onclick="runSpeedTest()" class="mt-4 px-4 py-2 bg-amber-500/20 border border-amber-500/50 text-amber-400 rounded-lg hover:bg-amber-500/30 transition-all text-sm">Retry</button></div>`;
	}
}

function displaySpeedTestResults(data) {
	lastSpeedTestData = data;
	const resultsDiv = document.getElementById('results');

	const fmtSize = (bytes) => {
		if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
		if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB';
		return bytes + ' B';
	};
	const fmtMs = (ms) => (ms !== null && ms !== undefined ? ms + 'ms' : 'N/A');
	// Grade colors as hex for inline styles (html2canvas compatible)
	const gradeHex =
		data.score >= 90
			? { text: '#34d399', border: 'rgba(16,185,129,0.3)', bg: 'rgba(16,185,129,0.1)' }
			: data.score >= 80
				? { text: '#22d3ee', border: 'rgba(6,182,212,0.3)', bg: 'rgba(6,182,212,0.1)' }
				: data.score >= 70
					? { text: '#facc15', border: 'rgba(234,179,8,0.3)', bg: 'rgba(234,179,8,0.1)' }
					: data.score >= 50
						? { text: '#fb923c', border: 'rgba(249,115,22,0.3)', bg: 'rgba(249,115,22,0.1)' }
						: { text: '#f87171', border: 'rgba(239,68,68,0.3)', bg: 'rgba(239,68,68,0.1)' };
	const barHex = (val, good, ok) => (val <= good ? '#10b981' : val <= ok ? '#eab308' : '#ef4444');
	const pctBar = (val, max, good, ok) =>
		`<div style="width:100%;background:rgba(55,65,81,0.5);border-radius:9999px;height:6px;margin-top:4px"><div style="width:${Math.min(100, (val / max) * 100)}%;background:${barHex(val, good, ok)};height:6px;border-radius:9999px"></div></div>`;

	let html = `<div class="p-4">
		<!-- Header -->
		<div class="flex items-center justify-between mb-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
			<div class="flex items-center gap-3">
				<div class="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
					<svg class="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
				</div>
				<div>
					<h3 class="text-sm font-bold text-amber-400">Speed Test</h3>
					<p class="text-xs text-gray-400"><span class="font-mono text-white">${escapeHtml(data.hostname)}</span> &mdash; ${fmtMs(data.timing.total)}</p>
				</div>
			</div>
			<div class="flex items-center gap-1">
				<button onclick="exportReconJSON('speed')" class="text-[10px] bg-cyber-elevated border border-amber-500/30 text-amber-400 px-2 py-0.5 rounded hover:bg-amber-500/20 transition-all font-medium">JSON</button>
				<button onclick="exportReconHTML('speed')" class="text-[10px] bg-cyber-elevated border border-amber-500/30 text-amber-400 px-2 py-0.5 rounded hover:bg-amber-500/20 transition-all font-medium">HTML</button>
				<button onclick="exportReconScreenshot(event)" class="text-[10px] bg-cyber-elevated border border-amber-500/30 text-amber-400 px-1.5 py-0.5 rounded hover:bg-amber-500/20 transition-all" title="Screenshot">
					<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
				</button>
			</div>
		</div>

		<!-- Score -->
		<div class="bg-cyber-card border border-amber-500/20 rounded-xl overflow-hidden mb-4">
			<div class="px-4 py-3 flex items-center justify-between">
				<div class="flex items-center gap-4">
					<div style="width:64px;height:64px;border-radius:12px;border:2px solid ${gradeHex.border};background:${gradeHex.bg};display:flex;align-items:center;justify-content:center">
						<span style="font-size:1.5rem;font-weight:900;color:${gradeHex.text}">${data.grade}</span>
					</div>
					<div>
						<div class="text-sm text-white font-bold">Performance Score: <span style="color:${gradeHex.text}">${data.score}/100</span></div>
						<div class="text-xs text-gray-500 mt-0.5">${data.penalties.length} issue${data.penalties.length !== 1 ? 's' : ''} detected</div>
					</div>
				</div>
				<div class="text-right text-[10px] text-gray-500">
					<div>Status: <span class="text-white font-mono">${data.statusCode}</span></div>
					${data.redirected ? `<div class="text-yellow-400">Redirected</div>` : ''}
				</div>
			</div>
			<!-- Score bar -->
			<div class="px-4 pb-3">
				<div style="width:100%;background:rgba(55,65,81,0.5);border-radius:9999px;height:10px">
					<div style="width:${data.score}%;background:${data.score >= 90 ? '#10b981' : data.score >= 70 ? '#eab308' : data.score >= 50 ? '#f97316' : '#ef4444'};height:10px;border-radius:9999px;transition:width 0.5s"></div>
				</div>
			</div>
		</div>

	`;

	// === Lighthouse-style Metrics (computed locally) ===
	const lh = data.lighthouse;
	if (lh) {
		const scoreCircle = (label, val) => {
			if (val === null || val === undefined) return '';
			const color = val >= 90 ? '#10b981' : val >= 50 ? '#f97316' : '#ef4444';
			const bgRing = 'rgba(75,85,99,0.3)';
			// Use a conic-gradient CSS circle instead of SVG for html2canvas compatibility
			const pct = Math.round(val);
			return `<div style="text-align:center">
				<div style="position:relative;width:56px;height:56px;margin:0 auto;border-radius:50%;background:conic-gradient(${color} ${pct * 3.6}deg, ${bgRing} ${pct * 3.6}deg);display:flex;align-items:center;justify-content:center">
					<div style="width:44px;height:44px;border-radius:50%;background:#161b22;display:flex;align-items:center;justify-content:center">
						<span style="font-size:15px;font-weight:800;color:${color};font-family:system-ui,sans-serif">${val}</span>
					</div>
				</div>
				<span style="font-size:9px;color:#9ca3af;margin-top:4px;display:block">${label}</span>
			</div>`;
		};

		html += `<div class="bg-cyber-card border border-indigo-500/20 rounded-xl overflow-hidden mb-4">
			<div class="px-4 py-2.5 border-b border-indigo-500/20 bg-indigo-500/5 flex items-center gap-2">
				<svg class="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
				<h4 class="text-xs font-bold text-indigo-400 uppercase tracking-wider">Lighthouse Scores (Estimated)</h4>
				<span class="text-[9px] text-gray-600 ml-1">computed locally</span>
			</div>
			<div class="p-4 flex items-center justify-center gap-8 flex-wrap">
				${scoreCircle('Performance', lh.scores?.performance)}
				${scoreCircle('Accessibility', lh.scores?.accessibility)}
				${scoreCircle('Best Practices', lh.scores?.['best-practices'])}
				${scoreCircle('SEO', lh.scores?.seo)}
			</div>`;

		// Core Web Vitals
		if (lh.webVitals) {
			const wv = lh.webVitals;
			const vitalCard = (label, metric) => {
				if (!metric) return '';
				const color = metric.score >= 0.9 ? '#10b981' : metric.score >= 0.5 ? '#f97316' : '#ef4444';
				return (
					'<div style="background:var(--cyber-card,#161b22);padding:12px;text-align:center">' +
					'<span class="text-[10px] text-gray-500 uppercase" style="display:block">' +
					label +
					'</span>' +
					'<span style="font-size:16px;font-weight:700;font-family:monospace;color:' +
					color +
					'">' +
					escapeHtml(metric.value) +
					'</span>' +
					'</div>'
				);
			};
			html += `<div class="grid grid-cols-3 md:grid-cols-6 gap-px bg-indigo-500/10 border-t border-indigo-500/10">
				${vitalCard('FCP', wv.fcp)}
				${vitalCard('LCP', wv.lcp)}
				${vitalCard('TBT', wv.tbt)}
				${vitalCard('CLS', wv.cls)}
				${vitalCard('Speed Index', wv.si)}
				${vitalCard('TTI', wv.tti)}
			</div>`;
		}

		// Detailed checks (expandable)
		const renderChecks = (title, checks, color) => {
			if (!checks || checks.length === 0) return '';
			const passed = checks.filter((c) => c.pass).length;
			let h = `<details class="border-t border-indigo-500/10">
				<summary class="px-4 py-2 bg-indigo-500/5 cursor-pointer flex items-center justify-between">
					<span class="text-[10px] text-indigo-400 uppercase font-bold">${title}</span>
					<span class="text-[10px] font-mono" style="color:${color}">${passed}/${checks.length}</span>
				</summary>
				<div class="divide-y divide-indigo-500/5">`;
			for (const c of checks) {
				const icon = c.pass
					? '<svg style="width:14px;height:14px;color:#10b981;flex-shrink:0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>'
					: '<svg style="width:14px;height:14px;color:#ef4444;flex-shrink:0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>';
				h += `<div class="px-4 py-1.5 flex items-center gap-2">${icon}<span class="text-[11px] text-gray-400">${escapeHtml(c.label)}</span></div>`;
			}
			h += `</div></details>`;
			return h;
		};
		const accColor = lh.scores.accessibility >= 90 ? '#10b981' : lh.scores.accessibility >= 50 ? '#f97316' : '#ef4444';
		const bpColor = lh.scores['best-practices'] >= 90 ? '#10b981' : lh.scores['best-practices'] >= 50 ? '#f97316' : '#ef4444';
		const seoColor = lh.scores.seo >= 90 ? '#10b981' : lh.scores.seo >= 50 ? '#f97316' : '#ef4444';
		html += renderChecks('Accessibility Checks', lh.accessibilityChecks, accColor);
		html += renderChecks('Best Practices Checks', lh.bestPracticesChecks, bpColor);
		html += renderChecks('SEO Checks', lh.seoChecks, seoColor);

		html += `</div>`;
	}

	html += `
		<!-- Timing Breakdown -->
		<div class="bg-cyber-card border border-amber-500/20 rounded-xl overflow-hidden mb-4">
			<div class="px-4 py-2.5 border-b border-amber-500/20 bg-amber-500/5">
				<h4 class="text-xs font-bold text-amber-400 uppercase tracking-wider">Timing Breakdown</h4>
			</div>
			<div class="grid grid-cols-2 md:grid-cols-4 gap-px bg-amber-500/10">
				<div class="bg-cyber-card p-3">
					<span class="text-[10px] text-gray-500 uppercase block">DNS Lookup</span>
					<span class="text-lg font-mono font-bold" style="color:${barHex(data.timing.dns, 50, 200)}">${fmtMs(data.timing.dns)}</span>
					${pctBar(data.timing.dns, 500, 50, 200)}
				</div>
				<div class="bg-cyber-card p-3">
					<span class="text-[10px] text-gray-500 uppercase block">TTFB</span>
					<span class="text-lg font-mono font-bold" style="color:${barHex(data.timing.ttfb, 200, 600)}">${fmtMs(data.timing.ttfb)}</span>
					${pctBar(data.timing.ttfb, 2000, 200, 600)}
				</div>
				<div class="bg-cyber-card p-3">
					<span class="text-[10px] text-gray-500 uppercase block">Download</span>
					<span class="text-lg font-mono font-bold" style="color:${barHex(data.timing.download, 200, 500)}">${fmtMs(data.timing.download)}</span>
					${pctBar(data.timing.download, 2000, 200, 500)}
				</div>
				<div class="bg-cyber-card p-3">
					<span class="text-[10px] text-gray-500 uppercase block">Total</span>
					<span class="text-lg font-mono font-bold text-white">${fmtMs(data.timing.total)}</span>
					${pctBar(data.timing.total, 5000, 500, 2000)}
				</div>
			</div>
		</div>

		<!-- Size Breakdown -->
		<div class="bg-cyber-card border border-amber-500/20 rounded-xl overflow-hidden mb-4">
			<div class="px-4 py-2.5 border-b border-amber-500/20 bg-amber-500/5">
				<h4 class="text-xs font-bold text-amber-400 uppercase tracking-wider">Size Breakdown</h4>
			</div>
			<div class="p-4">
				<div class="flex items-center justify-between mb-3">
					<span class="text-sm text-white font-bold">Total Page Weight</span>
					<span class="text-sm font-mono font-bold ${data.sizes.total > 3000000 ? 'text-red-400' : data.sizes.total > 1500000 ? 'text-yellow-400' : 'text-emerald-400'}">${fmtSize(data.sizes.total)}</span>
				</div>`;

	// Size bars
	const sizeItems = [
		{ label: 'HTML', size: data.sizes.html, hex: '#3b82f6' },
		{ label: 'JavaScript', size: data.sizes.js, hex: '#eab308' },
		{ label: 'CSS', size: data.sizes.css, hex: '#a855f7' },
		{ label: 'Images', size: data.sizes.images, hex: '#22c55e' },
		{ label: 'Fonts', size: data.sizes.fonts, hex: '#ec4899' },
	].filter((s) => s.size > 0);

	for (const item of sizeItems) {
		const pct = Math.max(1, (item.size / data.sizes.total) * 100);
		html += `<div class="flex items-center gap-3 mb-2">
			<span class="text-[10px] text-gray-400 w-16">${item.label}</span>
			<div style="flex:1;background:rgba(55,65,81,0.3);border-radius:9999px;height:12px;overflow:hidden">
				<div style="width:${pct.toFixed(1)}%;background:${item.hex};height:12px;border-radius:9999px;opacity:0.8"></div>
			</div>
			<span class="text-[10px] font-mono text-gray-300 w-16 text-right">${fmtSize(item.size)}</span>
		</div>`;
	}
	html += `</div></div>`;

	// Resource Counts
	html += `<div class="bg-cyber-card border border-amber-500/20 rounded-xl overflow-hidden mb-4">
		<div class="px-4 py-2.5 border-b border-amber-500/20 bg-amber-500/5">
			<h4 class="text-xs font-bold text-amber-400 uppercase tracking-wider">Resource Counts</h4>
		</div>
		<div class="grid grid-cols-2 md:grid-cols-4 gap-px bg-amber-500/10">
			<div class="bg-cyber-card p-3 text-center">
				<span class="text-2xl font-black text-white">${data.counts.cssFiles}</span>
				<span class="text-[10px] text-gray-500 block uppercase">CSS Files</span>
			</div>
			<div class="bg-cyber-card p-3 text-center">
				<span class="text-2xl font-black text-white">${data.counts.jsFiles}</span>
				<span class="text-[10px] text-gray-500 block uppercase">JS Files</span>
			</div>
			<div class="bg-cyber-card p-3 text-center">
				<span class="text-2xl font-black text-white">${data.counts.images}</span>
				<span class="text-[10px] text-gray-500 block uppercase">Images</span>
			</div>
			<div class="bg-cyber-card p-3 text-center">
				<span class="text-2xl font-black text-white">${data.counts.fonts}</span>
				<span class="text-[10px] text-gray-500 block uppercase">Fonts</span>
			</div>
		</div>
	</div>`;

	// Performance Indicators
	const perf = data.performance;
	const checkIcon = (ok) =>
		ok
			? '<svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>'
			: '<svg class="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>';

	html += `<div class="bg-cyber-card border border-amber-500/20 rounded-xl overflow-hidden mb-4">
		<div class="px-4 py-2.5 border-b border-amber-500/20 bg-amber-500/5">
			<h4 class="text-xs font-bold text-amber-400 uppercase tracking-wider">Performance Indicators</h4>
		</div>
		<div class="grid grid-cols-2 gap-px bg-amber-500/10">
			<div class="bg-cyber-card p-3 flex items-center gap-2">${checkIcon(perf.compressed)}<span class="text-xs text-gray-300">Compression ${perf.compressionType ? '(' + escapeHtml(perf.compressionType) + ')' : ''}</span></div>
			<div class="bg-cyber-card p-3 flex items-center gap-2">${checkIcon(!!perf.cacheControl)}<span class="text-xs text-gray-300">Cache Headers</span></div>
			<div class="bg-cyber-card p-3 flex items-center gap-2">${checkIcon(perf.etag || perf.lastModified)}<span class="text-xs text-gray-300">Validation (ETag/Last-Modified)</span></div>
			<div class="bg-cyber-card p-3 flex items-center gap-2">${checkIcon(perf.http2)}<span class="text-xs text-gray-300">HTTP/2 or HTTP/3</span></div>
			<div class="bg-cyber-card p-3 flex items-center gap-2">${checkIcon(perf.renderBlockingScripts === 0)}<span class="text-xs text-gray-300">No render-blocking scripts ${perf.renderBlockingScripts > 0 ? '<span class="text-red-400 font-mono">(' + perf.renderBlockingScripts + ' blocking)</span>' : ''}</span></div>
			<div class="bg-cyber-card p-3 flex items-center gap-2">${checkIcon(perf.lazyImages > 0 || perf.totalImages <= 3)}<span class="text-xs text-gray-300">Lazy loading ${perf.lazyImages > 0 ? '<span class="text-emerald-400 font-mono">(' + perf.lazyImages + '/' + perf.totalImages + ')</span>' : ''}</span></div>
			<div class="bg-cyber-card p-3 flex items-center gap-2">${checkIcon(perf.modernImages > 0)}<span class="text-xs text-gray-300">Modern images (WebP/AVIF) ${perf.modernImages > 0 ? '<span class="text-emerald-400 font-mono">(' + perf.modernImages + ')</span>' : ''}</span></div>
			<div class="bg-cyber-card p-3 flex items-center gap-2">${checkIcon(perf.hasCriticalCss)}<span class="text-xs text-gray-300">Critical CSS</span></div>
			<div class="bg-cyber-card p-3 flex items-center gap-2">${checkIcon(perf.preloadHints > 0)}<span class="text-xs text-gray-300">Resource Hints ${perf.preloadHints > 0 ? '<span class="text-emerald-400 font-mono">(' + perf.preloadHints + ')</span>' : ''}</span></div>
			<div class="bg-cyber-card p-3 flex items-center gap-2">${checkIcon(perf.asyncScripts > 0 || perf.deferScripts > 0)}<span class="text-xs text-gray-300">Async/Defer Scripts <span class="font-mono text-gray-500">(${perf.asyncScripts}a/${perf.deferScripts}d)</span></span></div>
		</div>
	</div>`;

	// Penalties (issues detected)
	if (data.penalties.length > 0) {
		html += `<div class="bg-cyber-card border border-red-500/20 rounded-xl overflow-hidden mb-4">
			<div class="px-4 py-2.5 border-b border-red-500/20 bg-red-500/5">
				<h4 class="text-xs font-bold text-red-400 uppercase tracking-wider">Issues Detected (−${100 - data.score} points)</h4>
			</div>
			<div class="divide-y divide-red-500/10">`;
		for (const p of data.penalties) {
			html += `<div class="px-4 py-2.5 flex items-center gap-3">
				<span style="font-size:10px;font-family:monospace;font-weight:700;color:#f87171;background:rgba(239,68,68,0.1);padding:2px 6px;border-radius:4px;white-space:nowrap">−${p.points}</span>
				<div>
					<span class="text-xs text-white font-semibold">${escapeHtml(p.rule)}</span>
					<span class="text-[11px] text-gray-500 ml-2">${escapeHtml(p.detail)}</span>
				</div>
			</div>`;
		}
		html += `</div></div>`;
	}

	// Advice section
	if (data.advice.length > 0) {
		const priorityStyles = {
			critical: { bg: 'rgba(239,68,68,0.2)', color: '#f87171', border: 'rgba(239,68,68,0.3)', label: 'CRITICAL' },
			important: { bg: 'rgba(234,179,8,0.2)', color: '#facc15', border: 'rgba(234,179,8,0.3)', label: 'IMPORTANT' },
			suggestion: { bg: 'rgba(6,182,212,0.2)', color: '#22d3ee', border: 'rgba(6,182,212,0.3)', label: 'TIP' },
		};
		html += `<div class="bg-cyber-card border border-emerald-500/20 rounded-xl overflow-hidden mb-4">
			<div class="px-4 py-2.5 border-b border-emerald-500/20 bg-emerald-500/5">
				<h4 class="text-xs font-bold text-emerald-400 uppercase tracking-wider">Optimization Advice (${data.advice.length})</h4>
			</div>
			<div class="divide-y divide-emerald-500/10">`;
		for (const a of data.advice) {
			const s = priorityStyles[a.priority] || priorityStyles.suggestion;
			html += `<div class="px-4 py-3">
				<div class="flex items-start gap-2">
					<span style="font-size:9px;font-weight:700;padding:2px 6px;border-radius:4px;border:1px solid ${s.border};background:${s.bg};color:${s.color};white-space:nowrap;margin-top:2px">${s.label}</span>
					<div>
						<div class="text-xs text-white font-semibold">${escapeHtml(a.title)}</div>
						<div class="text-[11px] text-gray-400 mt-1 leading-relaxed">${escapeHtml(a.description)}</div>
					</div>
				</div>
			</div>`;
		}
		html += `</div></div>`;
	}

	// Resources waterfall (top 15 slowest)
	if (data.resources && data.resources.length > 0) {
		const sorted = [...data.resources].sort((a, b) => b.time - a.time);
		const maxTime = Math.max(...sorted.map((r) => r.time), 1);
		html += `<details open class="bg-cyber-card border border-amber-500/20 rounded-xl overflow-hidden mb-4">
			<summary class="px-4 py-2.5 border-b border-amber-500/20 bg-amber-500/5 cursor-pointer">
				<span class="text-xs font-bold text-amber-400 uppercase tracking-wider">Resource Waterfall (${data.resources.length} resources)</span>
			</summary>
			<div class="divide-y divide-amber-500/10">`;
		const typeColors = {
			css: { hex: '#a855f7', bg: 'rgba(168,85,247,0.13)' },
			js: { hex: '#eab308', bg: 'rgba(234,179,8,0.13)' },
			image: { hex: '#22c55e', bg: 'rgba(34,197,94,0.13)' },
			font: { hex: '#ec4899', bg: 'rgba(236,72,153,0.13)' },
		};
		for (const r of sorted.slice(0, 20)) {
			const barW = Math.max(2, (r.time / maxTime) * 100);
			const tc = typeColors[r.type] || { hex: '#6b7280', bg: 'rgba(107,114,128,0.13)' };
			const shortUrl = r.url.split('/').pop()?.split('?')[0] || r.url;
			html += `<div class="px-4 py-1.5 flex items-center gap-2">
				<span style="font-size:9px;font-weight:700;text-transform:uppercase;padding:2px 4px;border-radius:4px;background:${tc.bg};color:${tc.hex};width:40px;text-align:center;display:inline-block">${r.type}</span>
				<span style="font-size:10px;color:#9ca3af;font-family:monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0" title="${escapeHtml(r.url)}">${escapeHtml(shortUrl.length > 50 ? shortUrl.substring(0, 47) + '...' : shortUrl)}</span>
				<div style="width:96px;background:rgba(55,65,81,0.3);border-radius:9999px;height:6px;flex-shrink:0">
					<div style="width:${barW}%;background:${tc.hex};height:6px;border-radius:9999px;opacity:0.8"></div>
				</div>
				<span style="font-size:10px;font-family:monospace;color:#6b7280;width:48px;text-align:right">${fmtMs(r.time)}</span>
				<span style="font-size:10px;font-family:monospace;color:#4b5563;width:56px;text-align:right">${fmtSize(r.size)}</span>
				${r.compressed ? '<span style="font-size:8px;color:#10b981">gz</span>' : '<span style="font-size:8px;color:rgba(239,68,68,0.5)">raw</span>'}
			</div>`;
		}
		html += `</div></details>`;
	}

	// Server info
	html += `<div class="text-center text-[10px] text-gray-600 mt-2">
		${perf.server ? 'Server: <span class="font-mono text-gray-500">' + escapeHtml(perf.server) + '</span> · ' : ''}
		Tested at ${new Date(data.timestamp).toLocaleString()}
	</div>`;

	html += `</div>`;
	resultsDiv.innerHTML = html;
}

// =============================================
// FEATURE: Full Reconnaissance
// =============================================
async function runFullRecon() {
	const urlInput = document.getElementById('url');
	const url = normalizeUrl(urlInput.value);
	if (!url) {
		showAlert('Please enter a target URL first.', 'Missing URL', 'warning');
		return;
	}
	if (url !== urlInput.value) urlInput.value = url;

	const resultsDiv = document.getElementById('results');
	resultsDiv.innerHTML = `<div class="flex items-center justify-center h-full py-16">
		${cyberLoader({ size: 'lg', color: 'text-emerald-400', text: 'Running Full Reconnaissance...', subtext: 'Technologies, DNS, WHOIS, SSL, subdomains, probes... (max ~30s)' })}
	</div>`;

	try {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 30000);
		const resp = await fetch(`/api/recon?url=${encodeURIComponent(url)}`, { signal: controller.signal });
		clearTimeout(timeout);
		const data = await resp.json();
		if (!resp.ok) throw new Error(data.message || data.error || `HTTP ${resp.status}`);
		displayFullReconResults(data);
	} catch (e) {
		const msg =
			e.name === 'AbortError' ? 'Request timed out after 30 seconds. The target site may be too slow or blocking requests.' : e.message;
		resultsDiv.innerHTML = `<div class="text-center py-10"><p class="text-cyber-danger font-bold">Full Reconnaissance Failed</p><p class="text-gray-400 text-sm mt-2">${escapeHtml(msg)}</p><button onclick="runFullRecon()" class="mt-4 px-4 py-2 bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-all text-sm">Retry</button></div>`;
	}
}

function displayFullReconResults(data) {
	lastFullReconData = data;
	const resultsDiv = document.getElementById('results');
	// Inline style colors for category badges (html2canvas compatible)
	const catColors = {
		CMS: { bg: 'rgba(236,72,153,0.15)', color: '#f472b6', border: 'rgba(236,72,153,0.3)' },
		'CMS/E-commerce': { bg: 'rgba(236,72,153,0.15)', color: '#f472b6', border: 'rgba(236,72,153,0.3)' },
		Framework: { bg: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: 'rgba(59,130,246,0.3)' },
		Frontend: { bg: 'rgba(139,92,246,0.15)', color: '#a78bfa', border: 'rgba(139,92,246,0.3)' },
		Language: { bg: 'rgba(234,179,8,0.15)', color: '#facc15', border: 'rgba(234,179,8,0.3)' },
		'Web Server': { bg: 'rgba(249,115,22,0.15)', color: '#fb923c', border: 'rgba(249,115,22,0.3)' },
		'CDN/WAF': { bg: 'rgba(6,182,212,0.15)', color: '#22d3ee', border: 'rgba(6,182,212,0.3)' },
		CDN: { bg: 'rgba(6,182,212,0.15)', color: '#22d3ee', border: 'rgba(6,182,212,0.3)' },
		Cache: { bg: 'rgba(6,182,212,0.15)', color: '#22d3ee', border: 'rgba(6,182,212,0.3)' },
		Platform: { bg: 'rgba(99,102,241,0.15)', color: '#818cf8', border: 'rgba(99,102,241,0.3)' },
		Analytics: { bg: 'rgba(34,197,94,0.15)', color: '#4ade80', border: 'rgba(34,197,94,0.3)' },
		Security: { bg: 'rgba(239,68,68,0.15)', color: '#f87171', border: 'rgba(239,68,68,0.3)' },
		Generator: { bg: 'rgba(107,114,128,0.15)', color: '#9ca3af', border: 'rgba(107,114,128,0.3)' },
		'Website Builder': { bg: 'rgba(20,184,166,0.15)', color: '#2dd4bf', border: 'rgba(20,184,166,0.3)' },
		'JS Library': { bg: 'rgba(245,158,11,0.15)', color: '#fbbf24', border: 'rgba(245,158,11,0.3)' },
		'E-commerce': { bg: 'rgba(236,72,153,0.15)', color: '#f472b6', border: 'rgba(236,72,153,0.3)' },
		SEO: { bg: 'rgba(132,204,22,0.15)', color: '#a3e635', border: 'rgba(132,204,22,0.3)' },
		Font: { bg: 'rgba(100,116,139,0.15)', color: '#94a3b8', border: 'rgba(100,116,139,0.3)' },
		Chat: { bg: 'rgba(14,165,233,0.15)', color: '#38bdf8', border: 'rgba(14,165,233,0.3)' },
		Marketing: { bg: 'rgba(192,38,211,0.15)', color: '#e879f9', border: 'rgba(192,38,211,0.3)' },
	};
	const defaultCatColor = { bg: 'rgba(107,114,128,0.15)', color: '#9ca3af', border: 'rgba(107,114,128,0.3)' };

	// CMS logos: use real logos from Simple Icons CDN
	const cmsLogos = {
		WordPress: '<img src="https://cdn.simpleicons.org/wordpress/21759b" alt="WordPress" class="w-8 h-8">',
		Drupal: '<img src="https://cdn.simpleicons.org/drupal/0678be" alt="Drupal" class="w-8 h-8">',
		Joomla: '<img src="https://cdn.simpleicons.org/joomla/5091cd" alt="Joomla" class="w-8 h-8">',
		Shopify: '<img src="https://cdn.simpleicons.org/shopify/7ab55c" alt="Shopify" class="w-8 h-8">',
		Magento: '<img src="https://cdn.simpleicons.org/magento/ee672f" alt="Magento" class="w-8 h-8">',
		PrestaShop: '<img src="https://cdn.simpleicons.org/prestashop/df0067" alt="PrestaShop" class="w-8 h-8">',
		Ghost: '<img src="https://cdn.simpleicons.org/ghost/ffffff" alt="Ghost" class="w-8 h-8">',
		TYPO3: '<img src="https://cdn.simpleicons.org/typo3/ff8700" alt="TYPO3" class="w-8 h-8">',
		Wix: '<img src="https://cdn.simpleicons.org/wix/0c6efc" alt="Wix" class="w-8 h-8">',
		Squarespace: '<img src="https://cdn.simpleicons.org/squarespace/ffffff" alt="Squarespace" class="w-8 h-8">',
		Webflow: '<img src="https://cdn.simpleicons.org/webflow/4353ff" alt="Webflow" class="w-8 h-8">',
		Hugo: '<img src="https://cdn.simpleicons.org/hugo/ff4088" alt="Hugo" class="w-8 h-8">',
		'Next.js': '<img src="https://cdn.simpleicons.org/nextdotjs/ffffff" alt="Next.js" class="w-8 h-8">',
		Gatsby: '<img src="https://cdn.simpleicons.org/gatsby/663399" alt="Gatsby" class="w-8 h-8">',
		Nuxt: '<img src="https://cdn.simpleicons.org/nuxtdotjs/00dc82" alt="Nuxt" class="w-8 h-8">',
		Laravel: '<img src="https://cdn.simpleicons.org/laravel/ff2d20" alt="Laravel" class="w-8 h-8">',
		Django: '<img src="https://cdn.simpleicons.org/django/092e20" alt="Django" class="w-8 h-8">',
		'Craft CMS': '<img src="https://cdn.simpleicons.org/craftcms/e5422b" alt="Craft CMS" class="w-8 h-8">',
		Contentful: '<img src="https://cdn.simpleicons.org/contentful/2478cc" alt="Contentful" class="w-8 h-8">',
		Strapi: '<img src="https://cdn.simpleicons.org/strapi/4945ff" alt="Strapi" class="w-8 h-8">',
	};

	let html = `<div class="p-4">
		<!-- Header -->
		<div class="flex items-center justify-between mb-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
			<div class="flex items-center gap-3">
				<div class="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
					<svg class="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
					</svg>
				</div>
				<div>
					<h3 class="text-sm font-bold text-emerald-400">Full Reconnaissance</h3>
					<p class="text-xs text-gray-400"><span class="font-mono text-white">${escapeHtml(data.hostname)}</span> &mdash; ${data.responseTime}ms</p>
				</div>
			</div>
			<div class="flex items-center gap-1">
				<button onclick="exportReconJSON('recon')" class="text-[10px] bg-cyber-elevated border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded hover:bg-emerald-500/20 transition-all font-medium" title="Export JSON">JSON</button>
				<button onclick="exportReconHTML('recon')" class="text-[10px] bg-cyber-elevated border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded hover:bg-emerald-500/20 transition-all font-medium" title="Export HTML">HTML</button>
				<button onclick="exportReconScreenshot(event)" class="text-[10px] bg-cyber-elevated border border-emerald-500/30 text-emerald-400 px-1.5 py-0.5 rounded hover:bg-emerald-500/20 transition-all" title="Screenshot">
					<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
				</button>
			</div>
		</div>

		<!-- Section 1: Page Info -->
		<div class="bg-cyber-card border border-cyber-accent/20 rounded-xl overflow-hidden mb-4">
			<div class="px-4 py-2.5 border-b border-cyber-accent/20 bg-cyber-elevated/30 flex items-center">
				<h4 class="text-xs font-bold text-cyber-accent uppercase tracking-wider">Page Information</h4>
				${reconTip('Basic information extracted from the HTML page: title tag, meta description, HTTP status code, language and canonical URL.')}
			</div>
			<div class="grid grid-cols-2 gap-px bg-cyber-accent/10">
				<div class="bg-cyber-card p-3"><span class="text-[10px] text-gray-500 uppercase block">Title</span><span class="text-sm text-white">${escapeHtml(data.pageInfo?.title || 'N/A')}</span></div>
				<div class="bg-cyber-card p-3"><span class="text-[10px] text-gray-500 uppercase block">Status</span><span class="text-sm text-white font-mono">${data.pageInfo?.statusCode || 'N/A'}</span></div>
				<div class="bg-cyber-card p-3 col-span-2"><span class="text-[10px] text-gray-500 uppercase block">Description</span><span class="text-xs text-gray-300">${escapeHtml(data.pageInfo?.description || 'N/A')}</span></div>
				${data.pageMeta?.language ? `<div class="bg-cyber-card p-3"><span class="text-[10px] text-gray-500 uppercase block">Language</span><span class="text-sm text-white font-mono">${escapeHtml(data.pageMeta.language)}</span></div>` : ''}
				${data.pageMeta?.canonical ? `<div class="bg-cyber-card p-3"><span class="text-[10px] text-gray-500 uppercase block">Canonical</span><span class="text-xs text-gray-300 break-all">${escapeHtml(data.pageMeta.canonical)}</span></div>` : ''}
		</div>
	</div>`;

	// === Section 2: Domain WHOIS (RDAP) ===
	console.log('[WAF-Checker] domainWhois data:', data.domainWhois);
	try {
		if (data.domainWhois) {
			const dw = data.domainWhois;
			const crDate = dw.creationDate ? new Date(dw.creationDate) : null;
			const expDate = dw.expirationDate ? new Date(dw.expirationDate) : null;
			const chgDate = dw.lastChanged ? new Date(dw.lastChanged) : null;
			const dwDaysLeft = expDate ? Math.ceil((expDate.getTime() - Date.now()) / 86400000) : null;
			const expColor =
				dwDaysLeft === null ? 'text-gray-500' : dwDaysLeft > 90 ? 'text-emerald-400' : dwDaysLeft > 30 ? 'text-yellow-400' : 'text-red-400';
			const domAge = crDate ? Math.floor((Date.now() - crDate.getTime()) / (86400000 * 365.25)) : null;
			const fDate = (d) => (d ? d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A');

			// Helper to render a contact card
			const renderContact = (label, contact, iconSvg) => {
				if (!contact) return '';
				const fields = [];
				if (contact.name)
					fields.push({
						icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
						val: contact.name,
						color: '#fff',
						bold: true,
						size: '12px',
					});
				if (contact.org && contact.org !== contact.name)
					fields.push({
						icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
						val: contact.org,
						color: '#d1d5db',
						bold: false,
						size: '11px',
					});
				if (contact.email)
					fields.push({
						icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
						val: contact.email,
						color: '#22d3ee',
						bold: false,
						size: '11px',
						mono: true,
					});
				if (contact.phone)
					fields.push({
						icon: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z',
						val: contact.phone,
						color: '#9ca3af',
						bold: false,
						size: '11px',
						mono: true,
					});
				const loc = [contact.address, contact.country && !contact.address?.includes(contact.country) ? contact.country : null]
					.filter(Boolean)
					.join(', ');
				if (loc)
					fields.push({
						icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z',
						val: loc,
						color: '#6b7280',
						bold: false,
						size: '10px',
					});
				if (fields.length === 0) return '';
				const rowsHtml = fields
					.map(
						(f) =>
							'<div style="display:block;padding:4px 0;border-bottom:1px solid rgba(99,102,241,0.07)">' +
							'<span style="display:inline-block;width:16px;vertical-align:middle;margin-right:6px">' +
							'<svg style="width:12px;height:12px;color:#4b5563" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="' +
							f.icon +
							'"/></svg></span>' +
							'<span style="font-size:' +
							f.size +
							';color:' +
							f.color +
							(f.bold ? ';font-weight:700' : '') +
							(f.mono ? ';font-family:monospace' : '') +
							';word-break:break-all">' +
							escapeHtml(f.val) +
							'</span></div>',
					)
					.join('');
				return (
					'<div style="background:var(--cyber-card,#0d1117);padding:12px">' +
					'<div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">' +
					iconSvg +
					'<span style="font-size:10px;color:rgba(129,140,248,0.8);text-transform:uppercase;font-weight:700;letter-spacing:0.05em">' +
					escapeHtml(label) +
					'</span></div>' +
					rowsHtml +
					'</div>'
				);
			};

			const contactIcons = {
				registrant:
					'<svg class="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>',
				admin:
					'<svg class="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>',
				tech: '<svg class="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>',
				abuse:
					'<svg class="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>',
			};

			html += `<div class="bg-cyber-card border border-indigo-500/20 rounded-xl overflow-hidden mb-4">
			<div class="px-4 py-2.5 border-b border-indigo-500/20 bg-indigo-500/5 flex items-center">
				<h4 class="text-xs font-bold text-indigo-400 uppercase tracking-wider">Domain WHOIS — ${escapeHtml(dw.domainName || data.hostname)}</h4>
				${reconTip('Domain registration data via RDAP: registrar, owner, contacts, dates, status, and DNSSEC.')}
			</div>

			<!-- Registration Info -->
			<div class="grid grid-cols-2 md:grid-cols-4 gap-px bg-indigo-500/10">
				${dw.registrar ? `<div class="bg-cyber-card p-3 col-span-2"><span class="text-[10px] text-gray-500 uppercase block">Registrar</span><span class="text-sm text-white font-bold">${escapeHtml(dw.registrar)}</span></div>` : ''}
				<div class="bg-cyber-card p-3">
					<span class="text-[10px] text-gray-500 uppercase block">Created</span>
					<span class="text-sm text-white font-mono">${fDate(crDate)}</span>
					${domAge !== null ? `<span class="text-[10px] text-gray-500 ml-1">(${domAge}y)</span>` : ''}
				</div>
				<div class="bg-cyber-card p-3">
					<span class="text-[10px] text-gray-500 uppercase block">Expires</span>
					<span class="text-sm font-mono ${expColor}">${fDate(expDate)}</span>
					${dwDaysLeft !== null ? `<span class="text-[10px] ${expColor} ml-1">(${dwDaysLeft > 0 ? dwDaysLeft + 'd' : 'EXPIRED'})</span>` : ''}
				</div>
				${chgDate ? `<div class="bg-cyber-card p-3"><span class="text-[10px] text-gray-500 uppercase block">Last Updated</span><span class="text-sm text-white font-mono">${fDate(chgDate)}</span></div>` : ''}
				<div class="bg-cyber-card p-3">
					<span class="text-[10px] text-gray-500 uppercase block">DNSSEC</span>
					<span class="text-sm font-bold ${dw.dnssec ? 'text-emerald-400' : 'text-gray-500'}">${dw.dnssec ? 'Signed' : 'Unsigned'}</span>
				</div>
			</div>`;

			// Contacts section
			const contactCards = [];
			contactCards.push(renderContact('Registrant (Owner)', dw.registrant, contactIcons.registrant));
			contactCards.push(renderContact('Administrative', dw.adminContact, contactIcons.admin));
			contactCards.push(renderContact('Technical', dw.techContact, contactIcons.tech));
			contactCards.push(renderContact('Abuse', dw.abuseContact, contactIcons.abuse));
			const validContacts = contactCards.filter((c) => c);
			if (validContacts.length > 0) {
				html += `<div class="border-t border-indigo-500/10">
				<div class="px-4 py-2 bg-indigo-500/5">
					<h5 class="text-[10px] font-bold text-indigo-400/70 uppercase tracking-wider">Contacts</h5>
				</div>
				<div class="grid grid-cols-1 md:grid-cols-2 gap-px bg-indigo-500/10">
					${validContacts.join('')}
				</div>
			</div>`;
			}

			if (dw.status && dw.status.length > 0) {
				html += `<div class="px-4 py-2 border-t border-indigo-500/10">
				<span class="text-[10px] text-gray-500 uppercase block mb-1">Domain Status</span>
				<div class="flex flex-wrap gap-1">
					${dw.status
						.map((s) => {
							const isOk = s.includes('ok') || s.includes('active');
							const isLock = s.includes('Lock') || s.includes('Prohibited');
							const color = isOk
								? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
								: isLock
									? 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30'
									: 'text-gray-400 bg-gray-500/10 border-gray-500/30';
							return `<span class="text-[9px] px-1.5 py-0.5 rounded border ${color} font-mono">${escapeHtml(s)}</span>`;
						})
						.join('')}
				</div>
			</div>`;
			}
			html += `</div>`;
		} else {
			// RDAP data unavailable — show fallback
			html += `<div class="bg-cyber-card border border-indigo-500/20 rounded-xl overflow-hidden mb-4">
			<div class="px-4 py-2.5 border-b border-indigo-500/20 bg-indigo-500/5 flex items-center">
				<h4 class="text-xs font-bold text-indigo-400 uppercase tracking-wider">Domain WHOIS</h4>
				${reconTip('Domain registration data via RDAP: registrar, owner, contacts, dates, status, and DNSSEC.')}
			</div>
			<div class="p-4 text-center text-gray-500 text-xs">RDAP data unavailable for this domain (timeout or unsupported TLD)</div>
		</div>`;
		}
	} catch (whoisErr) {
		console.error('[WAF-Checker] Domain WHOIS rendering error:', whoisErr);
		html += `<div class="bg-cyber-card border border-indigo-500/20 rounded-xl overflow-hidden mb-4">
			<div class="px-4 py-2.5 border-b border-indigo-500/20 bg-indigo-500/5 flex items-center">
				<h4 class="text-xs font-bold text-indigo-400 uppercase tracking-wider">Domain WHOIS</h4>
			</div>
			<div class="p-4 text-center text-gray-500 text-xs">Error rendering WHOIS data</div>
		</div>`;
	}

	// === Section 3: SSL / TLS Security ===
	const ssl = data.ssl || {};
	const cert = ssl.certificate;
	const sslChecks = ssl.checks || [];
	const sslGrade = ssl.grade || 'N/A';
	const sslScore = ssl.score || 0;

	const statusBadge = (s) => {
		if (s === 'ok')
			return '<span class="text-[9px] px-1.5 py-0.5 rounded font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 whitespace-nowrap">OK</span>';
		if (s === 'warning')
			return '<span class="text-[9px] px-1.5 py-0.5 rounded font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 whitespace-nowrap">WARNING</span>';
		if (s === 'fail')
			return '<span class="text-[9px] px-1.5 py-0.5 rounded font-bold bg-red-500/20 text-red-400 border border-red-500/30 whitespace-nowrap">FAIL</span>';
		return '<span class="text-[9px] px-1.5 py-0.5 rounded font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 whitespace-nowrap">INFO</span>';
	};

	const gradeColor =
		sslScore >= 90
			? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
			: sslScore >= 70
				? 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10'
				: sslScore >= 50
					? 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10'
					: 'text-red-400 border-red-500/30 bg-red-500/10';

	html += `<div class="bg-cyber-card border border-emerald-500/20 rounded-xl overflow-hidden mb-4">
		<div class="px-4 py-2.5 border-b border-emerald-500/20 bg-emerald-500/5 flex items-center justify-between">
			<div class="flex items-center">
				<h4 class="text-xs font-bold text-emerald-400 uppercase tracking-wider">SSL / TLS Security</h4>
				${reconTip('Comprehensive SSL/TLS security analysis: HTTPS enforcement, HTTP→HTTPS redirect, HSTS policy, certificate details, mixed content detection, and overall security score.')}
			</div>
			<div class="flex items-center gap-2">
				<span class="text-[10px] text-gray-500">${sslScore}/100</span>
				<span class="text-lg font-bold px-2.5 py-0.5 rounded-lg border ${gradeColor}">${sslGrade}</span>
			</div>
		</div>`;

	if (sslChecks.length > 0) {
		html += `<div class="divide-y divide-emerald-500/10">`;
		for (const check of sslChecks) {
			html += `<div class="flex items-center justify-between px-4 py-2 hover:bg-cyber-elevated/30 transition-colors">
				<div class="flex items-center gap-3">
					${statusBadge(check.status)}
					<span class="text-xs text-white font-bold">${escapeHtml(check.test)}</span>
				</div>
				<span class="text-[11px] text-gray-400 text-right max-w-[60%]">${escapeHtml(check.detail)}</span>
			</div>`;
		}
		html += `</div>`;
	}

	if (ssl.tlsInfo?.protocols && ssl.tlsInfo.protocols.length > 0) {
		html += `<div class="border-t border-emerald-500/20">
			<div class="px-4 py-2 bg-emerald-500/5">
				<h5 class="text-[10px] font-bold text-emerald-400/70 uppercase tracking-wider flex items-center">Protocols${reconTip('TLS protocol version support. TLS 1.3 is the latest and most secure. TLS 1.0/1.1 are deprecated and should be disabled. HTTP/3 runs over QUIC and requires TLS 1.3.')}</h5>
			</div>
			<div class="divide-y divide-emerald-500/10">`;
		for (const proto of ssl.tlsInfo.protocols) {
			const badge =
				proto.supported === true
					? '<span class="text-[9px] px-1.5 py-0.5 rounded font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 whitespace-nowrap">SUPPORTED</span>'
					: proto.supported === false
						? '<span class="text-[9px] px-1.5 py-0.5 rounded font-bold bg-red-500/20 text-red-400 border border-red-500/30 whitespace-nowrap">DISABLED</span>'
						: '<span class="text-[9px] px-1.5 py-0.5 rounded font-bold bg-gray-500/20 text-gray-400 border border-gray-500/30 whitespace-nowrap">UNKNOWN</span>';
			const nameColor = proto.name === 'TLS 1.0' || proto.name === 'TLS 1.1' ? 'text-gray-500' : 'text-white';
			html += `<div class="flex items-center justify-between px-4 py-1.5">
				<div class="flex items-center gap-3">
					${badge}
					<span class="text-xs font-bold ${nameColor}">${escapeHtml(proto.name)}</span>
					${proto.name === 'TLS 1.0' || proto.name === 'TLS 1.1' ? '<span class="text-[8px] px-1 py-0.5 rounded bg-red-500/10 text-red-400/70 border border-red-500/20 font-bold">DEPRECATED</span>' : ''}
				</div>
				<span class="text-[10px] text-gray-500 text-right">${escapeHtml(proto.note)}</span>
			</div>`;
		}
		if (ssl.tlsInfo.http3) {
			html += `<div class="flex items-center justify-between px-4 py-1.5">
				<div class="flex items-center gap-3">
					<span class="text-[9px] px-1.5 py-0.5 rounded font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">SUPPORTED</span>
					<span class="text-xs font-bold text-white">HTTP/3 (QUIC)</span>
				</div>
				<span class="text-[10px] text-gray-500">Advertised via Alt-Svc header</span>
			</div>`;
		}
		if (ssl.tlsInfo.http2 && !ssl.tlsInfo.http3) {
			html += `<div class="flex items-center justify-between px-4 py-1.5">
				<div class="flex items-center gap-3">
					<span class="text-[9px] px-1.5 py-0.5 rounded font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">SUPPORTED</span>
					<span class="text-xs font-bold text-white">HTTP/2</span>
				</div>
				<span class="text-[10px] text-gray-500">Detected via ALPN</span>
			</div>`;
		}
		html += `</div></div>`;
	}

	if (cert) {
		const issuerCN = cert.issuer ? (cert.issuer.match(/CN=([^,]+)/)?.[1] || '').trim() : '';
		const issuerOrg = cert.issuer ? (cert.issuer.match(/O=([^,]+)/)?.[1] || '').trim() : '';
		const notAfter = cert.notAfter ? new Date(cert.notAfter) : null;
		const notBefore = cert.notBefore ? new Date(cert.notBefore) : null;
		const certDaysLeft = notAfter ? Math.ceil((notAfter.getTime() - Date.now()) / 86400000) : null;
		const validityColor =
			certDaysLeft === null
				? 'text-gray-600'
				: certDaysLeft > 30
					? 'text-emerald-400'
					: certDaysLeft > 0
						? 'text-yellow-400'
						: 'text-red-400';
		const totalDays = notBefore && notAfter ? Math.ceil((notAfter.getTime() - notBefore.getTime()) / 86400000) : null;

		html += `<div class="border-t border-emerald-500/20">
			<div class="px-4 py-2 bg-emerald-500/5"><h5 class="text-[10px] font-bold text-emerald-400/70 uppercase tracking-wider">Certificate</h5></div>
			<div class="grid grid-cols-2 gap-px bg-emerald-500/5">
				<div class="bg-cyber-card p-3"><span class="text-[10px] text-gray-500 uppercase block">Subject (CN)</span><code class="text-xs text-white font-mono font-bold">${escapeHtml(cert.subject || data.hostname)}</code></div>
				<div class="bg-cyber-card p-3"><span class="text-[10px] text-gray-500 uppercase block">Issuer</span><span class="text-xs text-white font-bold">${escapeHtml(issuerOrg || issuerCN || 'Unknown')}</span>${issuerCN && issuerOrg ? `<div class="text-[10px] text-gray-500 font-mono mt-0.5">CN=${escapeHtml(issuerCN)}</div>` : ''}</div>
				<div class="bg-cyber-card p-3"><span class="text-[10px] text-gray-500 uppercase block">Valid From</span><code class="text-xs text-white font-mono">${notBefore ? notBefore.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}</code></div>
				<div class="bg-cyber-card p-3"><span class="text-[10px] text-gray-500 uppercase block">Valid Until</span><code class="text-xs font-mono ${validityColor}">${notAfter ? notAfter.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}</code>${certDaysLeft !== null ? `<span class="text-[10px] ${validityColor} ml-1">(${certDaysLeft > 0 ? certDaysLeft + 'd left' : 'EXPIRED'})</span>` : ''}</div>
				${ssl.certAlgorithm ? `<div class="bg-cyber-card p-3"><span class="text-[10px] text-gray-500 uppercase block">Key Algorithm</span><span class="text-xs font-bold ${ssl.certAlgorithm === 'ECDSA' ? 'text-emerald-400' : 'text-cyan-400'}">${ssl.certAlgorithm}</span></div>` : ''}
				${totalDays ? `<div class="bg-cyber-card p-3"><span class="text-[10px] text-gray-500 uppercase block">Duration</span><span class="text-xs text-white font-mono">${totalDays} days</span></div>` : ''}
			</div>`;
		if (cert.serialNumber)
			html += `<div class="px-4 py-2 border-t border-emerald-500/10"><span class="text-[10px] text-gray-500 uppercase">Serial Number</span><code class="text-[10px] text-gray-400 font-mono break-all ml-2">${escapeHtml(cert.serialNumber)}</code></div>`;
		if (cert.domains && cert.domains.length > 0)
			html += `<div class="px-4 py-2 border-t border-emerald-500/10"><span class="text-[10px] text-gray-500 uppercase block mb-1">SAN DNS Names (${cert.domains.length})</span><div class="flex flex-wrap gap-1">${cert.domains.map((d) => `<code class="text-[10px] font-mono text-emerald-400/70 px-1.5 py-0.5 bg-emerald-500/10 rounded">${escapeHtml(d)}</code>`).join('')}</div></div>`;
		html += `</div>`;
	}

	if (ssl.mixedContent && ssl.mixedContent.length > 0) {
		html += `<div class="border-t border-red-500/20"><div class="px-4 py-2 bg-red-500/5"><h5 class="text-[10px] font-bold text-red-400/70 uppercase tracking-wider">Mixed Content (${ssl.mixedContent.length})</h5></div><div class="px-4 py-2 space-y-1">${ssl.mixedContent.map((url) => `<code class="block text-[10px] font-mono text-red-400/80 break-all">${escapeHtml(url)}</code>`).join('')}</div></div>`;
	}

	html += `<div class="border-t border-emerald-500/10"><div class="px-4 py-2 flex flex-wrap gap-3">
		${ssl.serverHeader ? `<div class="flex items-center gap-1.5"><span class="text-[10px] text-gray-500">Server:</span><code class="text-[10px] font-mono text-white">${escapeHtml(ssl.serverHeader)}</code></div>` : ''}
		${ssl.tlsInfo?.alpn ? `<div class="flex items-center gap-1.5"><span class="text-[10px] text-gray-500">Alt-Svc:</span><code class="text-[10px] font-mono text-gray-400 break-all">${escapeHtml(ssl.tlsInfo.alpn)}</code></div>` : ''}
	</div></div></div>`;

	// === Section 4: DNS (IP Addresses + Nameservers) ===
	html += `<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
		<div class="bg-cyber-card border border-cyber-accent/20 rounded-xl overflow-hidden">
			<div class="px-4 py-2.5 border-b border-cyber-accent/20 bg-cyber-elevated/30 flex items-center">
				<h4 class="text-xs font-bold text-cyber-accent uppercase tracking-wider">IP Addresses</h4>
				${reconTip('IPv4/IPv6 addresses resolved via DNS A/AAAA records.')}
			</div>
			<div class="p-3 space-y-1">
				${(data.dns?.ipAddresses || []).map((ip) => `<code class="block text-sm font-mono text-white">${escapeHtml(ip)}</code>`).join('') || '<span class="text-xs text-gray-500">None</span>'}
				${(data.dns?.ipv6Addresses || []).length > 0 ? data.dns.ipv6Addresses.map((ip) => `<code class="block text-[10px] font-mono text-gray-400 break-all">${escapeHtml(ip)}</code>`).join('') : ''}
			</div>
		</div>
		<div class="bg-cyber-card border border-cyber-accent/20 rounded-xl overflow-hidden">
			<div class="px-4 py-2.5 border-b border-cyber-accent/20 bg-cyber-elevated/30 flex items-center">
				<h4 class="text-xs font-bold text-cyber-accent uppercase tracking-wider">Nameservers</h4>
				${reconTip('DNS nameservers (NS records) responsible for the domain.')}
			</div>
			<div class="p-3 space-y-1">
				${(data.dns?.nameservers || []).map((ns) => `<code class="block text-sm font-mono text-white">${escapeHtml(ns)}</code>`).join('') || '<span class="text-xs text-gray-500">None</span>'}
			</div>
		</div>
	</div>`;

	// === Section 5: Infrastructure ===
	if (data.infrastructure && data.infrastructure.length > 0) {
		html += `<div class="bg-cyber-card border border-purple-500/20 rounded-xl overflow-hidden mb-4">
			<div class="px-4 py-2.5 border-b border-purple-500/20 bg-purple-500/5 flex items-center">
				<h4 class="text-xs font-bold text-purple-400 uppercase tracking-wider">Infrastructure</h4>
				${reconTip('Hosting infrastructure detected from DNS records: CDN providers, email services, and DNS providers.')}
			</div>
			<div class="p-3 space-y-2">`;
		for (const infra of data.infrastructure) {
			html += `<div class="flex items-center gap-3 px-3 py-2 bg-cyber-elevated/50 rounded-lg">
				<span class="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">${escapeHtml(infra.type)}</span>
				<span class="text-sm font-bold text-white">${escapeHtml(infra.provider)}</span>
			</div>`;
		}
		html += `</div></div>`;
	}

	// === Section 6: IP WHOIS ===
	if (data.whois) {
		const w = data.whois;
		html += `<div class="bg-cyber-card border border-cyber-accent/20 rounded-xl overflow-hidden mb-4">
			<div class="px-4 py-2.5 border-b border-cyber-accent/20 bg-cyber-elevated/30 flex items-center">
				<h4 class="text-xs font-bold text-cyber-accent uppercase tracking-wider">IP WHOIS — ${escapeHtml(w.ip || '')}</h4>
				${reconTip('IP geolocation and ownership: ISP, organization, ASN, and location.')}
			</div>
			<div class="grid grid-cols-2 md:grid-cols-4 gap-px bg-cyber-accent/10">
				<div class="bg-cyber-card p-3"><span class="text-[10px] text-gray-500 uppercase block">ISP</span><span class="text-xs text-white">${escapeHtml(w.isp || 'N/A')}</span></div>
				<div class="bg-cyber-card p-3"><span class="text-[10px] text-gray-500 uppercase block">Org</span><span class="text-xs text-white">${escapeHtml(w.org || 'N/A')}</span></div>
				<div class="bg-cyber-card p-3"><span class="text-[10px] text-gray-500 uppercase block">ASN</span><span class="text-xs text-white font-mono">${escapeHtml(w.asn || 'N/A')}</span></div>
				<div class="bg-cyber-card p-3"><span class="text-[10px] text-gray-500 uppercase block">Location</span><span class="text-xs text-white">${escapeHtml(w.city || '')}${w.city && w.country ? ', ' : ''}${escapeHtml(w.country || 'N/A')}</span></div>
				${data.reverseDns ? `<div class="bg-cyber-card p-3 col-span-2 md:col-span-4"><span class="text-[10px] text-gray-500 uppercase flex items-center">Reverse DNS (PTR)${reconTip('PTR record maps IP back to hostname.')}</span><code class="text-xs font-mono text-cyan-400 mt-0.5 block">${escapeHtml(data.reverseDns)}</code></div>` : ''}
			</div>
		</div>`;
	}

	// === Section 7: Technologies ===
	if (data.technologies && data.technologies.length > 0) {
		html += `<div class="bg-cyber-card border border-emerald-500/20 rounded-xl overflow-hidden mb-4">
			<div class="px-4 py-2.5 border-b border-emerald-500/20 bg-emerald-500/5 flex items-center">
				<h4 class="text-xs font-bold text-emerald-400 uppercase tracking-wider">Detected Technologies (${data.technologies.length})</h4>
				${reconTip('Technologies identified from HTTP headers, HTML patterns, cookies, and CDN/WAF signatures.')}
			</div>
			<div class="p-3 space-y-2">`;
		for (const tech of data.technologies) {
			const cc = catColors[tech.category] || defaultCatColor;
			html += `<div class="flex items-center gap-3 px-3 py-2.5 bg-cyber-elevated/50 rounded-lg">
				<span style="padding:2px 8px;font-size:9px;font-weight:700;text-transform:uppercase;border-radius:4px;border:1px solid ${cc.border};background:${cc.bg};color:${cc.color};white-space:nowrap">${escapeHtml(tech.category)}</span>
				<span class="text-sm font-bold text-white">${escapeHtml(tech.name)}</span>
				<span class="text-[10px] text-gray-500 ml-auto hidden md:block">${escapeHtml(tech.evidence)}</span>
			</div>`;
		}
		html += `</div></div>`;
	}

	// === Section 8: CMS Details ===
	const cms = data.cmsDetails;
	if (cms && (cms.cmsName || cms.plugins?.length > 0 || cms.themes?.length > 0)) {
		html += `<div class="bg-cyber-card border border-pink-500/20 rounded-xl overflow-hidden mb-4">
			<div class="px-4 py-2.5 border-b border-pink-500/20 bg-pink-500/5 flex items-center">
				<h4 class="text-xs font-bold text-pink-400 uppercase tracking-wider">CMS Details</h4>
				${reconTip('CMS detected from HTML patterns, meta generator tag, and resource URLs. Plugins/themes from wp-content paths.')}
			</div>
			<div class="p-3 space-y-3">`;
		if (cms.cmsName) {
			const logo =
				cmsLogos[cms.cmsName] ||
				`<div class="w-8 h-8 rounded-lg bg-pink-500/20 flex items-center justify-center text-pink-400 font-bold text-sm">${escapeHtml(cms.cmsName.charAt(0))}</div>`;
			html += `<div class="flex items-center gap-4 px-4 py-3 bg-gradient-to-r from-pink-500/10 to-purple-500/10 border border-pink-500/20 rounded-xl">
				<div class="flex-shrink-0">${logo}</div>
				<div><div class="text-lg font-bold text-white">${escapeHtml(cms.cmsName)}</div></div>
			</div>`;
		}
		if (data.pageInfo?.generatorFull && data.pageInfo.generatorFull !== data.pageInfo.generator) {
			html += `<div class="px-3 py-2 bg-cyber-elevated/30 rounded-lg"><span class="text-[10px] text-gray-500 uppercase block mb-1">Page Builder / Generator</span><code class="text-[11px] text-gray-400 break-all">${escapeHtml(data.pageInfo.generatorFull)}</code></div>`;
		}
		if (cms.themes && cms.themes.length > 0) {
			html += `<div><div class="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1.5 px-1">Themes (${cms.themes.length})</div><div class="space-y-1">`;
			for (const theme of cms.themes) {
				html += `<div class="flex items-center gap-2 px-3 py-2 bg-cyber-elevated/50 rounded-lg">
					<span class="w-2 h-2 rounded-full ${theme.active ? 'bg-pink-400' : 'bg-gray-600'}"></span>
					<span class="text-sm text-white font-medium">${escapeHtml(theme.name)}</span>
					${theme.version ? `<span class="text-[10px] font-mono text-pink-300/70">${escapeHtml(theme.version)}</span>` : ''}
					${theme.active ? '<span class="text-[9px] px-1.5 py-0.5 rounded bg-pink-500/15 text-pink-400 border border-pink-500/30 font-bold ml-auto">ACTIVE</span>' : ''}
					<span class="text-[10px] text-gray-600 ml-auto font-mono">${escapeHtml(theme.slug)}</span>
				</div>`;
			}
			html += `</div></div>`;
		}
		if (cms.plugins && cms.plugins.length > 0) {
			html += `<div><div class="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1.5 px-1">Plugins / Extensions (${cms.plugins.length})</div><div class="space-y-1">`;
			for (const plugin of cms.plugins) {
				html += `<div class="flex items-center gap-2 px-3 py-1.5 bg-cyber-elevated/50 rounded-lg">
					<span class="w-1.5 h-1.5 rounded-full bg-purple-400/60"></span>
					<span class="text-xs text-white">${escapeHtml(plugin.name)}</span>
					${plugin.version ? `<span class="text-[10px] font-mono text-purple-300/70">${escapeHtml(plugin.version)}</span>` : ''}
					<span class="text-[10px] text-gray-600 ml-auto font-mono">${escapeHtml(plugin.slug)}</span>
				</div>`;
			}
			html += `</div></div>`;
		}
		html += `</div></div>`;
	}

	// === Section 9: JS Libraries ===
	if (data.jsLibraries && data.jsLibraries.length > 0) {
		html += `<div class="bg-cyber-card border border-amber-500/20 rounded-xl overflow-hidden mb-4">
			<div class="px-4 py-2.5 border-b border-amber-500/20 bg-amber-500/5 flex items-center">
				<h4 class="text-xs font-bold text-amber-400 uppercase tracking-wider">JavaScript Libraries (${data.jsLibraries.length})</h4>
				${reconTip('Frontend JS libraries detected from script/CSS file names. Versions extracted from filenames.')}
			</div>
			<div class="p-3 space-y-1">`;
		for (const lib of data.jsLibraries) {
			html += `<div class="flex items-center gap-2 px-3 py-1.5 bg-cyber-elevated/50 rounded-lg">
				<span class="text-xs font-bold text-white">${escapeHtml(lib.name)}</span>
				${lib.version ? `<span class="text-[10px] font-mono text-amber-300/70">${escapeHtml(lib.version)}</span>` : ''}
				<span class="text-[10px] text-gray-600 ml-auto hidden md:block font-mono">${escapeHtml(lib.evidence)}</span>
			</div>`;
		}
		html += `</div></div>`;
	}

	// === Section 10: Security Headers ===
	if (data.securityHeaders) {
		html += `<div class="bg-cyber-card border border-cyber-accent/20 rounded-xl overflow-hidden mb-4">
			<div class="px-4 py-2.5 border-b border-cyber-accent/20 bg-cyber-elevated/30 flex items-center justify-between">
				<div class="flex items-center">
					<h4 class="text-xs font-bold text-cyber-accent uppercase tracking-wider">Security Headers</h4>
					${reconTip('HTTP security headers: CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy.')}
				</div>
				<span class="text-[10px] font-bold ${parseInt(data.securityHeadersScore) >= 4 ? 'text-cyber-success' : parseInt(data.securityHeadersScore) >= 2 ? 'text-yellow-400' : 'text-cyber-danger'}">${data.securityHeadersScore}</span>
			</div>
			<div class="divide-y divide-cyber-accent/10">`;
		for (const [header, value] of Object.entries(data.securityHeaders)) {
			const present = value !== null;
			html += `<div class="flex items-center justify-between px-4 py-1.5 ${present ? 'bg-cyber-success/5' : ''}">
				<code class="text-[11px] font-mono ${present ? 'text-white' : 'text-gray-600'}">${escapeHtml(header)}</code>
				<span class="text-[10px] ${present ? 'text-cyber-success font-bold' : 'text-gray-600'}">${present ? '✓' : '✗'}</span>
			</div>`;
		}
		html += `</div></div>`;
	}

	// === Section 11: Cookies ===
	if (data.cookies && data.cookies.length > 0) {
		html += `<div class="bg-cyber-card border border-cyber-accent/20 rounded-xl overflow-hidden mb-4">
			<div class="px-4 py-2.5 border-b border-cyber-accent/20 bg-cyber-elevated/30 flex items-center">
				<h4 class="text-xs font-bold text-cyber-accent uppercase tracking-wider">Cookies (${data.cookies.length})</h4>
				${reconTip('Cookies set by the server. Secure = HTTPS only. HttpOnly = no JS access. SameSite = CSRF protection.')}
			</div>
			<div class="divide-y divide-cyber-accent/10">`;
		for (const cookie of data.cookies) {
			const hasSecure = cookie.flags.includes('Secure');
			const hasHttpOnly = cookie.flags.includes('HttpOnly');
			html += `<div class="flex items-center justify-between px-4 py-2">
				<code class="text-xs font-mono text-white">${escapeHtml(cookie.name)}</code>
				<div class="flex gap-1">
					${cookie.flags
						.map((f) => {
							const color =
								f === 'Secure'
									? 'text-cyber-success bg-cyber-success/10 border-cyber-success/30'
									: f === 'HttpOnly'
										? 'text-blue-400 bg-blue-500/10 border-blue-500/30'
										: 'text-gray-400 bg-gray-500/10 border-gray-500/30';
							return `<span class="text-[9px] px-1.5 py-0.5 rounded border ${color} font-bold">${escapeHtml(f)}</span>`;
						})
						.join('')}
					${!hasSecure ? '<span class="text-[9px] px-1.5 py-0.5 rounded border text-cyber-danger bg-cyber-danger/10 border-cyber-danger/30 font-bold">No Secure</span>' : ''}
					${!hasHttpOnly ? '<span class="text-[9px] px-1.5 py-0.5 rounded border text-orange-400 bg-orange-500/10 border-orange-500/30 font-bold">No HttpOnly</span>' : ''}
				</div>
			</div>`;
		}
		html += `</div></div>`;
	}

	// === Section 12: Email Security (SPF / DMARC) ===
	if (data.emailSecurity) {
		const es = data.emailSecurity;
		html += `<div class="bg-cyber-card border border-cyan-500/20 rounded-xl overflow-hidden mb-4">
			<div class="px-4 py-2.5 border-b border-cyan-500/20 bg-cyan-500/5 flex items-center">
				<h4 class="text-xs font-bold text-cyan-400 uppercase tracking-wider">Email Security</h4>
				${reconTip('SPF defines which mail servers can send emails for this domain. DMARC policy tells receivers how to handle messages that fail SPF/DKIM checks.')}
			</div>
			<div class="p-3 space-y-2">
				<div class="flex items-center gap-2">
					<span class="w-2 h-2 rounded-full ${es.hasSPF ? 'bg-cyber-success' : 'bg-cyber-danger'}"></span>
					<span class="text-xs ${es.hasSPF ? 'text-cyber-success' : 'text-cyber-danger'} font-bold">SPF</span>
					<code class="text-[10px] text-gray-500 font-mono ml-2 break-all">${es.spf ? escapeHtml(es.spf) : 'Not configured'}</code>
				</div>
				<div class="flex items-center gap-2">
					<span class="w-2 h-2 rounded-full ${es.hasDMARC ? 'bg-cyber-success' : 'bg-cyber-danger'}"></span>
					<span class="text-xs ${es.hasDMARC ? 'text-cyber-success' : 'text-cyber-danger'} font-bold">DMARC</span>
					<code class="text-[10px] text-gray-500 font-mono ml-2 break-all">${es.dmarc ? escapeHtml(es.dmarc) : 'Not configured'}</code>
				</div>
			</div>
		</div>`;
	}

	// === Section 13: Mail Servers (MX) ===
	if (data.mailServers && data.mailServers.length > 0) {
		html += `<div class="bg-cyber-card border border-cyan-500/20 rounded-xl overflow-hidden mb-4">
			<div class="px-4 py-2.5 border-b border-cyan-500/20 bg-cyan-500/5 flex items-center">
				<h4 class="text-xs font-bold text-cyan-400 uppercase tracking-wider">Mail Servers (MX)</h4>
				${reconTip('Mail Exchange records define which servers handle email for the domain. Priority (P) indicates preference — lower = higher priority.')}
			</div>
			<div class="p-3 space-y-1">
				${data.mailServers.map((mx) => `<div class="flex items-center gap-3"><span class="text-[10px] text-gray-500 font-mono w-8">P:${mx.priority}</span><code class="text-sm font-mono text-white">${escapeHtml(mx.server)}</code></div>`).join('')}
			</div>
		</div>`;
	}

	// === Section 14: Open Graph / Social ===
	const ogKeys = data.openGraph ? Object.keys(data.openGraph) : [];
	if (ogKeys.length > 0) {
		html += `<details open class="bg-cyber-card border border-blue-500/20 rounded-xl overflow-hidden mb-4">
			<summary class="px-4 py-2.5 bg-blue-500/5 cursor-pointer text-xs font-bold text-blue-400 uppercase tracking-wider hover:text-blue-300 transition-colors flex items-center">
				Open Graph / Social (${ogKeys.length})
				${reconTip('Open Graph and Twitter Card metadata for social media link previews.')}
			</summary>
			<div class="divide-y divide-blue-500/10">`;
		const ogImage = data.openGraph['og:image'];
		if (ogImage) {
			html += `<div class="p-3 flex items-center gap-3"><img src="${escapeHtml(ogImage)}" alt="OG Image" class="h-16 rounded border border-blue-500/20 object-cover" onerror="this.style.display='none'"/><div class="text-[10px] text-gray-500 break-all">${escapeHtml(ogImage)}</div></div>`;
		}
		for (const [key, value] of Object.entries(data.openGraph)) {
			if (key === 'og:image') continue;
			html += `<div class="flex gap-2 px-4 py-1.5 text-[11px]"><span class="font-mono text-blue-400 font-bold whitespace-nowrap">${escapeHtml(key)}</span><span class="text-gray-400 break-all">${escapeHtml(String(value))}</span></div>`;
		}
		html += `</div></details>`;
	}

	// === Section 15: Feeds + Emails ===
	const feeds = data.pageMeta?.feeds || [];
	const emails = data.pageMeta?.emails || [];
	if (feeds.length > 0 || emails.length > 0) {
		html += `<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">`;
		if (feeds.length > 0) {
			html += `<div class="bg-cyber-card border border-orange-500/20 rounded-xl overflow-hidden">
				<div class="px-4 py-2.5 border-b border-orange-500/20 bg-orange-500/5 flex items-center">
					<h4 class="text-xs font-bold text-orange-400 uppercase tracking-wider">RSS / Atom Feeds (${feeds.length})</h4>
					${reconTip('RSS and Atom feed URLs found in the HTML.')}
				</div>
				<div class="p-3 space-y-1">`;
			for (const feed of feeds) {
				html += `<div class="flex items-center gap-2"><span class="px-1.5 py-0.5 text-[9px] font-bold rounded bg-orange-500/15 text-orange-400 border border-orange-500/30">${escapeHtml(feed.type)}</span><code class="text-[10px] text-gray-400 break-all">${escapeHtml(feed.href)}</code></div>`;
			}
			html += `</div></div>`;
		}
		if (emails.length > 0) {
			html += `<div class="bg-cyber-card border border-yellow-500/20 rounded-xl overflow-hidden">
				<div class="px-4 py-2.5 border-b border-yellow-500/20 bg-yellow-500/5 flex items-center">
					<h4 class="text-xs font-bold text-yellow-400 uppercase tracking-wider">Email Addresses (${emails.length})</h4>
					${reconTip('Email addresses found in the HTML source.')}
				</div>
				<div class="p-3 space-y-1">`;
			for (const email of emails) {
				html += `<code class="block text-xs font-mono text-yellow-300/80">${escapeHtml(email)}</code>`;
			}
			html += `</div></div>`;
		}
		html += `</div>`;
	}

	// === Section 16: Path Probing ===
	if (data.probes && data.probes.length > 0) {
		html += `<div class="bg-cyber-card border border-cyber-accent/20 rounded-xl overflow-hidden mb-4">
			<div class="px-4 py-2.5 border-b border-cyber-accent/20 bg-cyber-elevated/30 flex items-center">
				<h4 class="text-xs font-bold text-cyber-accent uppercase tracking-wider">Path Probing</h4>
				${reconTip('Common paths checked: robots.txt, sitemap.xml, admin panels, security.txt. Green = accessible, gray = not found.')}
			</div>
			<div class="divide-y divide-cyber-accent/10">`;
		for (const probe of data.probes) {
			const statusColor = probe.exists ? 'text-cyber-success' : 'text-gray-600';
			const statusBg = probe.exists ? 'bg-cyber-success/10' : 'bg-gray-500/5';
			html += `<div class="flex items-center justify-between px-4 py-2 ${statusBg}">
				<div class="flex items-center gap-2">
					<span class="w-2 h-2 rounded-full ${probe.exists ? 'bg-cyber-success' : 'bg-gray-600'}"></span>
					<code class="text-xs font-mono ${statusColor}">${escapeHtml(probe.path)}</code>
					<span class="text-[10px] text-gray-500">${escapeHtml(probe.name)}</span>
				</div>
				<span class="text-[10px] font-mono ${probe.exists ? 'text-cyber-success' : 'text-gray-600'}">${probe.status || '—'}</span>
			</div>`;
		}
		html += `</div></div>`;
		for (const probe of data.probes) {
			if (probe.snippet) {
				html += `<div class="bg-cyber-card border border-cyber-accent/20 rounded-xl overflow-hidden mb-4">
					<div class="px-4 py-2.5 border-b border-cyber-accent/20 bg-cyber-elevated/30">
						<h4 class="text-xs font-bold text-cyber-accent uppercase tracking-wider">${escapeHtml(probe.name)} Content</h4>
					</div>
					<pre class="p-3 text-[11px] font-mono text-gray-400 overflow-x-auto max-h-48 overflow-y-auto">${escapeHtml(probe.snippet)}</pre>
				</div>`;
			}
		}
	}

	// === Section 17: TXT Records ===
	if (data.txtRecords && data.txtRecords.length > 0) {
		html += `<details open class="bg-cyber-card border border-cyber-accent/20 rounded-xl overflow-hidden mb-4">
			<summary class="px-4 py-2.5 bg-cyber-elevated/30 cursor-pointer text-xs font-bold text-gray-400 uppercase tracking-wider hover:text-white transition-colors flex items-center">
				TXT Records (${data.txtRecords.length})
				${reconTip('DNS TXT records contain verification tokens, SPF policies, DKIM keys, and other metadata published for the domain.')}
			</summary>
			<div class="p-3 space-y-1 max-h-48 overflow-y-auto">
				${data.txtRecords.map((txt) => `<code class="block text-[10px] font-mono text-gray-400 break-all py-1 border-b border-cyber-accent/5">${escapeHtml(txt)}</code>`).join('')}
			</div>
		</details>`;
	}

	// === Section 18: Discovered Subdomains ===
	if (data.subdomains && data.subdomains.length > 0) {
		const stats = data.subdomainStats || {};
		html += `<div class="bg-cyber-card border border-emerald-500/20 rounded-xl overflow-hidden mb-4">
			<div class="px-4 py-2.5 border-b border-emerald-500/20 bg-emerald-500/5 flex items-center justify-between">
				<div class="flex items-center">
					<h4 class="text-xs font-bold text-emerald-400 uppercase tracking-wider">Discovered Subdomains (${data.subdomains.length})</h4>
					${reconTip('Subdomains found via Certificate Transparency logs (crt.sh) and DNS brute-force of common prefixes (www, mail, api, etc.).')}
				</div>
				<div class="flex gap-2">
					${stats.fromCT ? `<span class="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/30 font-bold">CT: ${stats.fromCT}</span>` : ''}
					${stats.fromDNS ? `<span class="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold">DNS: ${stats.fromDNS}</span>` : ''}
				</div>
			</div>
			<div class="max-h-80 overflow-y-auto divide-y divide-cyber-accent/10">`;
		for (const sub of data.subdomains) {
			const srcColor =
				sub.source === 'DNS + CT'
					? 'text-purple-400 bg-purple-500/10 border-purple-500/30'
					: sub.source === 'DNS'
						? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
						: 'text-blue-400 bg-blue-500/10 border-blue-500/30';
			html += `<div class="flex items-center justify-between px-4 py-1.5 hover:bg-cyber-elevated/30 transition-colors">
				<div class="flex items-center gap-2 min-w-0">
					<span class="w-1.5 h-1.5 rounded-full ${sub.ip ? 'bg-emerald-400' : 'bg-gray-600'} flex-shrink-0"></span>
					<code class="text-xs font-mono text-white whitespace-nowrap">${escapeHtml(sub.name)}</code>
				</div>
				<div class="flex items-center gap-2 flex-shrink-0 ml-2">
					${sub.ip ? `<code class="text-[10px] font-mono text-gray-400 whitespace-nowrap">${escapeHtml(sub.ip)}</code>` : '<span class="text-[10px] text-gray-600 whitespace-nowrap">no A record</span>'}
					<span class="text-[8px] px-1 py-0.5 rounded border ${srcColor} font-bold whitespace-nowrap">${escapeHtml(sub.source)}</span>
				</div>
			</div>`;
		}
		html += `</div></div>`;
	}

	// === Section 19: Reverse IP / Shared Hosting ===
	if (data.reverseIpDomains && data.reverseIpDomains.length > 0) {
		const domains = data.reverseIpDomains;
		const targetHost = data.hostname?.toLowerCase() || '';
		const otherDomains = domains.filter((d) => d !== targetHost);
		html += `<div class="bg-cyber-card border border-amber-500/20 rounded-xl overflow-hidden mb-4">
			<div class="px-4 py-2.5 border-b border-amber-500/20 bg-amber-500/5 flex items-center justify-between">
				<div class="flex items-center">
					<h4 class="text-xs font-bold text-amber-400 uppercase tracking-wider">Reverse IP — Shared Hosting (${otherDomains.length} domain${otherDomains.length > 1 ? 's' : ''})</h4>
					${reconTip('Domains hosted on the same IP address (shared hosting).')}
				</div>
				${data.dns?.ipAddresses?.[0] ? `<code class="text-[10px] font-mono text-gray-500">${escapeHtml(data.dns.ipAddresses[0])}</code>` : ''}
			</div>
			<div class="max-h-64 overflow-y-auto divide-y divide-amber-500/10">`;
		for (const domain of otherDomains) {
			html += `<div class="flex items-center justify-between px-4 py-1.5 hover:bg-cyber-elevated/30 transition-colors">
				<div class="flex items-center gap-2 min-w-0">
					<span class="w-1.5 h-1.5 rounded-full bg-gray-600 flex-shrink-0"></span>
					<code class="text-xs font-mono text-white whitespace-nowrap">${escapeHtml(domain)}</code>
				</div>
				<a href="https://${escapeHtml(domain)}" target="_blank" rel="noopener" class="text-[10px] text-gray-600 hover:text-cyan-400 transition-colors flex-shrink-0 ml-2">
					<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
				</a>
			</div>`;
		}
		html += `</div></div>`;
	}

	// === Section 20: All Response Headers ===
	if (data.responseHeaders) {
		html += `<details class="bg-cyber-card border border-cyber-accent/20 rounded-xl overflow-hidden mb-4">
			<summary class="px-4 py-2.5 bg-cyber-elevated/30 cursor-pointer text-xs font-bold text-gray-400 uppercase tracking-wider hover:text-white transition-colors flex items-center">
				All Response Headers (${Object.keys(data.responseHeaders).length})
				${reconTip('Complete HTTP response headers. May reveal server software, caching, security policies.')}
			</summary>
			<div class="p-3 max-h-64 overflow-y-auto space-y-1">`;
		for (const [key, value] of Object.entries(data.responseHeaders)) {
			html += `<div class="flex gap-2 text-[11px]"><span class="font-mono text-cyber-accent font-bold whitespace-nowrap">${escapeHtml(key)}:</span><span class="font-mono text-gray-400 break-all">${escapeHtml(String(value))}</span></div>`;
		}
		html += `</div></details>`;
	}

	html += `</div>`;
	resultsDiv.innerHTML = html;
}
