/**
 * Reporting module for WAF-CHECKER.COM - handles result export and analysis
 * Supports JSON, CSV, and PDF export formats with vulnerability scoring
 */

export interface TestResult {
  category: string;
  method: string;
  status: number | string;
  responseTime: number;
  payload: string;
  is_redirect?: boolean;
  wafDetected?: boolean;
  wafType?: string;
  timestamp?: string;
  url?: string;
}

export interface WAFDetectionResult {
  detected: boolean;
  wafType?: string;
  confidence?: number;
  evidence?: string[];
  suggestedBypassTechniques?: string[];
}

export interface TestSession {
  id: string;
  url: string;
  startTime: string;
  endTime: string;
  totalTests: number;
  results: TestResult[];
  wafDetection?: WAFDetectionResult;
  settings: {
    methods: string[];
    categories: string[];
    followRedirect: boolean;
    falsePositiveTest: boolean;
    caseSensitiveTest: boolean;
    enhancedPayloads: boolean;
    useAdvancedPayloads: boolean;
    autoDetectWAF: boolean;
    useEncodingVariations: boolean;
    httpManipulation: boolean;
  };
}

export interface VulnerabilityScore {
  category: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  score: number;
  bypassedCount: number;
  totalCount: number;
  bypassRate: number;
}

export interface ExecutiveSummary {
  overallScore: number;
  riskLevel: 'Critical' | 'High' | 'Medium' | 'Low';
  totalTests: number;
  bypassedTests: number;
  bypassRate: number;
  wafEffectiveness: number;
  criticalVulnerabilities: number;
  highVulnerabilities: number;
  mediumVulnerabilities: number;
  lowVulnerabilities: number;
  recommendations: string[];
}

/**
 * Generate vulnerability scoring for each category
 */
export function generateVulnerabilityScores(results: TestResult[], falsePositiveMode: boolean = false): VulnerabilityScore[] {
  const categoryStats = new Map<string, { total: number; bypassed: number }>();

  // Count results by category
  results.forEach(result => {
    const category = result.category;
    const stats = categoryStats.get(category) || { total: 0, bypassed: 0 };
    stats.total++;

    // In false positive mode: 403 = bad (blocking legitimate traffic)
    // In normal mode: 200 = bad (not blocking attacks)
    const isBypassed = falsePositiveMode
      ? (result.status === 403 || result.status === '403')
      : (result.status === 200 || result.status === '200');

    if (isBypassed) {
      stats.bypassed++;
    }

    categoryStats.set(category, stats);
  });

  // Generate scores
  const scores: VulnerabilityScore[] = [];

  categoryStats.forEach((stats, category) => {
    const bypassRate = stats.total > 0 ? (stats.bypassed / stats.total) * 100 : 0;

    // Determine severity based on bypass rate
    let severity: VulnerabilityScore['severity'];
    let score: number;

    if (bypassRate >= 75) {
      severity = 'Critical';
      score = 90 + (bypassRate - 75) / 25 * 10;
    } else if (bypassRate >= 50) {
      severity = 'High';
      score = 70 + (bypassRate - 50) / 25 * 20;
    } else if (bypassRate >= 25) {
      severity = 'Medium';
      score = 40 + (bypassRate - 25) / 25 * 30;
    } else {
      severity = 'Low';
      score = bypassRate / 25 * 40;
    }

    scores.push({
      category,
      severity,
      score: Math.round(score),
      bypassedCount: stats.bypassed,
      totalCount: stats.total,
      bypassRate: Math.round(bypassRate * 100) / 100
    });
  });

  return scores.sort((a, b) => b.score - a.score);
}

/**
 * Generate executive summary
 */
export function generateExecutiveSummary(results: TestResult[], vulnerabilityScores: VulnerabilityScore[], wafDetection?: WAFDetectionResult, falsePositiveMode: boolean = false): ExecutiveSummary {
  const totalTests = results.length;
  const bypassedTests = results.filter(r => {
    if (falsePositiveMode) {
      return r.status === 403 || r.status === '403';
    }
    return r.status === 200 || r.status === '200' || r.status === 500 || r.status === '500';
  }).length;
  const bypassRate = totalTests > 0 ? (bypassedTests / totalTests) * 100 : 0;
  const wafEffectiveness = Math.max(0, 100 - bypassRate);

  // Count vulnerabilities by severity
  const criticalVulnerabilities = vulnerabilityScores.filter(v => v.severity === 'Critical').length;
  const highVulnerabilities = vulnerabilityScores.filter(v => v.severity === 'High').length;
  const mediumVulnerabilities = vulnerabilityScores.filter(v => v.severity === 'Medium').length;
  const lowVulnerabilities = vulnerabilityScores.filter(v => v.severity === 'Low').length;

  // Determine overall risk level
  let riskLevel: ExecutiveSummary['riskLevel'];
  let overallScore: number;

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

  // Generate recommendations
  const recommendations: string[] = [];

  if (falsePositiveMode) {
    if (bypassRate > 50) {
      recommendations.push('WAF is blocking too much legitimate traffic - review and relax rules');
    }
    if (criticalVulnerabilities > 0) {
      recommendations.push('Critical false positive rate detected - immediate rule review needed');
    }
    vulnerabilityScores.slice(0, 3).forEach(vuln => {
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
    vulnerabilityScores.slice(0, 3).forEach(vuln => {
      if (vuln.severity === 'Critical' || vuln.severity === 'High') {
        recommendations.push(`Strengthen protection against ${vuln.category} attacks`);
      }
    });
    if (recommendations.length === 0) {
      recommendations.push('WAF is performing well, continue monitoring');
    }
  }

  return {
    overallScore,
    riskLevel,
    totalTests,
    bypassedTests,
    bypassRate: Math.round(bypassRate * 100) / 100,
    wafEffectiveness: Math.round(wafEffectiveness * 100) / 100,
    criticalVulnerabilities,
    highVulnerabilities,
    mediumVulnerabilities,
    lowVulnerabilities,
    recommendations: recommendations.slice(0, 5) // Limit to 5 recommendations
  };
}

/**
 * Export results as JSON
 */
export function exportAsJSON(session: TestSession, includeAnalysis: boolean = true): string {
  const exportData: any = {
    ...session,
    exportedAt: new Date().toISOString(),
    version: '1.0.0'
  };

  if (includeAnalysis) {
    const vulnerabilityScores = generateVulnerabilityScores(session.results, session.settings.falsePositiveTest);
    const executiveSummary = generateExecutiveSummary(session.results, vulnerabilityScores, session.wafDetection, session.settings.falsePositiveTest);

    exportData.analysis = {
      vulnerabilityScores,
      executiveSummary
    };
  }

  return JSON.stringify(exportData, null, 2);
}

/**
 * Export results as CSV
 */
export function exportAsCSV(results: TestResult[]): string {
  if (results.length === 0) {
    return 'No results to export';
  }

  // CSV headers
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
    'URL'
  ];

  // Convert results to CSV rows
  const csvRows = [
    headers.join(','),
    ...results.map(result => [
      `"${result.category}"`,
      `"${result.method}"`,
      result.status,
      result.responseTime || 0,
      `"${result.payload.replace(/"/g, '""')}"`, // Escape quotes
      result.is_redirect || false,
      result.wafDetected || false,
      `"${result.wafType || ''}"`,
      `"${result.timestamp || ''}"`,
      `"${result.url || ''}"`
    ].join(','))
  ];

  return csvRows.join('\n');
}

/**
 * Generate HTML report for PDF export
 */
export function generateHTMLReport(session: TestSession): string {
  const falsePositiveMode = session.settings.falsePositiveTest;
  const vulnerabilityScores = generateVulnerabilityScores(session.results, falsePositiveMode);
  const executiveSummary = generateExecutiveSummary(session.results, vulnerabilityScores, session.wafDetection, falsePositiveMode);

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'Critical': return '#dc3545';
      case 'High': return '#fd7e14';
      case 'Medium': return '#ffc107';
      case 'Low': return '#198754';
      default: return '#6c757d';
    }
  };

  // In FP mode: 200 = green (allowed), 403 = red (blocked)
  // In normal mode: 403 = green (protected), 200 = red (vulnerable)
  const statusGoodClass = falsePositiveMode ? 'status-200' : 'status-403';
  const statusBadClass = falsePositiveMode ? 'status-403' : 'status-200';
  const effectivenessLabel = falsePositiveMode ? 'WAF Accuracy' : 'WAF Effectiveness';
  const bypassedLabel = falsePositiveMode ? 'False Positives' : 'Bypassed Tests';
  const bypassRateLabel = falsePositiveMode ? 'FP Rate' : 'Bypass Rate';
  const testCountLabel = falsePositiveMode ? 'False Pos.' : 'Bypassed';

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>WAF ${falsePositiveMode ? 'False Positive' : 'Security'} Assessment Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
        .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #007bff; padding-bottom: 20px; }
        .summary-card { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .risk-badge { padding: 4px 12px; border-radius: 4px; color: white; font-weight: bold; }
        .metric { display: inline-block; margin: 10px 20px; text-align: center; }
        .metric-value { font-size: 2em; font-weight: bold; color: #007bff; }
        .metric-label { font-size: 0.9em; color: #666; }
        .vulnerability-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .vulnerability-table th, .vulnerability-table td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        .vulnerability-table th { background-color: #f8f9fa; font-weight: bold; }
        .severity-critical { color: #dc3545; font-weight: bold; }
        .severity-high { color: #fd7e14; font-weight: bold; }
        .severity-medium { color: #ffc107; font-weight: bold; }
        .severity-low { color: #198754; font-weight: bold; }
        .recommendations { background: #e7f3ff; padding: 20px; border-left: 4px solid #007bff; }
        .results-table { width: 100%; border-collapse: collapse; font-size: 0.9em; }
        .results-table th, .results-table td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
        .results-table th { background-color: #f8f9fa; }
        .status-good { background-color: #d1e7dd; }
        .status-bad { background-color: #f8d7da; }
        .status-other { background-color: #fff3cd; }
        .page-break { page-break-before: always; }
        .fp-banner { background: #cfe2ff; padding: 12px 20px; border-left: 4px solid #0d6efd; margin-bottom: 20px; border-radius: 4px; }
        @media print { .page-break { page-break-before: always; } }
    </style>
</head>
<body>
    <div class="header">
        <h1>WAF ${falsePositiveMode ? 'False Positive' : 'Security'} Assessment Report</h1>
        <p><strong>Target URL:</strong> ${session.url}</p>
        <p><strong>Test Date:</strong> ${new Date(session.startTime).toLocaleString()}</p>
        <p><strong>Duration:</strong> ${Math.round((new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / 1000)}s</p>
    </div>

    ${falsePositiveMode ? `
    <div class="fp-banner">
        <strong>False Positive Test</strong> — This report tests if legitimate traffic is being blocked by the WAF.
        <strong>200 = Allowed (good)</strong>, <strong>403 = Blocked (bad)</strong>.
    </div>
    ` : ''}

    <div class="summary-card">
        <h2>Executive Summary</h2>
        <div style="text-align: center; margin: 20px 0;">
            <span class="risk-badge" style="background-color: ${getRiskColor(executiveSummary.riskLevel)}">
                ${executiveSummary.riskLevel} Risk Level
            </span>
        </div>

        <div style="text-align: center;">
            <div class="metric">
                <div class="metric-value">${executiveSummary.overallScore}</div>
                <div class="metric-label">Security Score</div>
            </div>
            <div class="metric">
                <div class="metric-value">${executiveSummary.wafEffectiveness}%</div>
                <div class="metric-label">${effectivenessLabel}</div>
            </div>
            <div class="metric">
                <div class="metric-value">${executiveSummary.bypassedTests}</div>
                <div class="metric-label">${bypassedLabel}</div>
            </div>
            <div class="metric">
                <div class="metric-value">${executiveSummary.totalTests}</div>
                <div class="metric-label">Total Tests</div>
            </div>
        </div>
    </div>

    ${session.wafDetection?.detected ? `
    <div class="summary-card">
        <h3>WAF Detection Results</h3>
        <p><strong>Detected WAF:</strong> ${session.wafDetection.wafType}</p>
        <p><strong>Confidence:</strong> ${session.wafDetection.confidence}%</p>
        ${session.wafDetection.evidence ? `
        <p><strong>Evidence:</strong></p>
        <ul>
            ${session.wafDetection.evidence.map(e => `<li><code>${e}</code></li>`).join('')}
        </ul>
        ` : ''}
    </div>
    ` : ''}

    <div class="summary-card">
        <h3>Vulnerability Assessment</h3>
        <table class="vulnerability-table">
            <thead>
                <tr>
                    <th>Category</th>
                    <th>Severity</th>
                    <th>Score</th>
                    <th>${bypassRateLabel}</th>
                    <th>Tests (${testCountLabel}/Total)</th>
                </tr>
            </thead>
            <tbody>
                ${vulnerabilityScores.map(vuln => `
                <tr>
                    <td>${vuln.category}</td>
                    <td class="severity-${vuln.severity.toLowerCase()}">${vuln.severity}</td>
                    <td>${vuln.score}/100</td>
                    <td>${vuln.bypassRate}%</td>
                    <td>${vuln.bypassedCount}/${vuln.totalCount}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
    </div>

    <div class="recommendations">
        <h3>Recommendations</h3>
        <ol>
            ${executiveSummary.recommendations.map(rec => `<li>${rec}</li>`).join('')}
        </ol>
    </div>

    <div class="page-break"></div>

    <h2>Detailed Test Results</h2>
    <table class="results-table">
        <thead>
            <tr>
                <th>Category</th>
                <th>Method</th>
                <th>Status</th>
                <th>Response Time</th>
                <th>Payload</th>
            </tr>
        </thead>
        <tbody>
            ${session.results.map(result => {
                const codeNum = typeof result.status === 'number' ? result.status : parseInt(String(result.status), 10);
                let statusClass = 'status-other';
                if (falsePositiveMode) {
                    if (codeNum >= 200 && codeNum < 300) statusClass = 'status-good';
                    else if (codeNum === 403) statusClass = 'status-bad';
                } else {
                    if (codeNum === 403) statusClass = 'status-good';
                    else if (codeNum >= 200 && codeNum < 300) statusClass = 'status-bad';
                }

                return `
                <tr class="${statusClass}">
                    <td>${result.category}</td>
                    <td>${result.method}</td>
                    <td>${result.status}</td>
                    <td>${result.responseTime}ms</td>
                    <td><code>${result.payload.length > 100 ? result.payload.substring(0, 100) + '...' : result.payload}</code></td>
                </tr>
                `;
            }).join('')}
        </tbody>
    </table>

    <div style="margin-top: 40px; text-align: center; color: #666; font-size: 0.9em;">
        <p>Generated by WAF-CHECKER.COM on ${new Date().toLocaleString()}</p>
    </div>
</body>
</html>
  `;
}

/**
 * Download file utility
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
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

/**
 * Generate timestamped filename
 */
export function generateFilename(baseUrl: string, extension: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
  const hostname = new URL(baseUrl).hostname.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `waf-report_${hostname}_${timestamp}.${extension}`;
}

/**
 * Export session data with multiple format options
 */
export class ReportExporter {
  constructor(private session: TestSession) {}

  exportJSON(includeAnalysis: boolean = true): void {
    const content = exportAsJSON(this.session, includeAnalysis);
    const filename = generateFilename(this.session.url, 'json');
    downloadFile(content, filename, 'application/json');
  }

  exportCSV(): void {
    const content = exportAsCSV(this.session.results);
    const filename = generateFilename(this.session.url, 'csv');
    downloadFile(content, filename, 'text/csv');
  }

  async exportPDF(): Promise<void> {
    const html = generateHTMLReport(this.session);
    const filename = generateFilename(this.session.url, 'html');
    downloadFile(html, filename, 'text/html');

    // Note: For actual PDF generation, you would need a PDF library
    // This exports as HTML which can be printed to PDF by the browser
    alert('HTML report downloaded. Use your browser\'s Print to PDF feature to create a PDF.');
  }

  getAnalysis() {
    const vulnerabilityScores = generateVulnerabilityScores(this.session.results, this.session.settings.falsePositiveTest);
    const executiveSummary = generateExecutiveSummary(this.session.results, vulnerabilityScores, this.session.wafDetection, this.session.settings.falsePositiveTest);

    return {
      vulnerabilityScores,
      executiveSummary
    };
  }
}
