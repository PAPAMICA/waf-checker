# WAF-CHECKER.COM (Cloudflare Worker Style)

This project helps you check how well your Web Application Firewall (WAF) protects your product against common web attacks. It is a web application implemented in a Cloudflare Worker style using TypeScript and provides a convenient web interface for WAF testing with a wide range of attack payloads.

## Main Features
- Web interface for entering the target URL and selecting HTTP methods (GET, POST, PUT, DELETE).
- Flexible selection of attack categories (SQLi, XSS, Path Traversal, Command Injection, SSRF, NoSQLi, LFI, SSTI, XXE, HTTP Header, and more).
- Each category uses its own set of payloads (in parameters, headers, or as file paths).
- Automatic sending of requests with payloads for the selected categories and methods.
- Color-coded results by status code:
  - 2xx/5xx — red (potential vulnerability)
  - 403 — green (WAF blocks)
  - other 4xx — orange (non-standard response)
- Results are displayed in a table with details for each payload.
- Easily extendable payload list (see `app/src/payloads.ts`).

## How to Use
1. Install wrangler https://developers.cloudflare.com/workers/wrangler/install-and-update/ (dependencies: node & npx)
2. Run `npx wrangler dev`
   ![](./img/1-run.png)

## Deployment

### Prerequisites
- A Cloudflare account with Workers enabled
- A Cloudflare API token with the following permissions:
  - Account: Cloudflare Workers:Edit
  - Zone: Zone:Read (if using custom domains)

### Setting up API Token
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens)
2. Create a custom token with "Edit" permissions for Workers
3. Set the token as an environment variable:
   ```bash
   export CLOUDFLARE_API_TOKEN=your_token_here
   ```
   Or add it to your `.env` file (make sure `.env` is in `.gitignore`)

### Deploying
```bash
npx wrangler deploy
```

### Troubleshooting Deployment Issues

#### Error 403 Forbidden
If you encounter a `403 Forbidden` error during deployment:

1. **Check API Token**: Ensure your `CLOUDFLARE_API_TOKEN` is set and valid
   ```bash
   echo $CLOUDFLARE_API_TOKEN
   ```

2. **Verify Token Permissions**: The token needs "Edit" permissions for Cloudflare Workers

3. **Check Account Access**: Ensure your Cloudflare account has Workers enabled (available on Free plan and above)

4. **Verify Worker Name**: The worker name in `wrangler.toml` must be unique. Try changing it if it's already in use:
   ```toml
   name = "waf-checker-unique-name"
   ```

5. **Login to Wrangler**: Try logging in again:
   ```bash
   npx wrangler login
   ```

6. **Check for Conflicting Config**: Ensure there's no conflicting `wrangler.jsonc` file that might override settings

## Project Structure
- `app/src/api.ts` — server logic: request handling, payload sending, `/api/check` API
- `app/src/payloads.ts` — all attack categories and payloads
- `app/src/static/index.html` — main web interface (Bootstrap, JS)
- `app/src/static/main.js` — frontend logic and UI handlers
- `app/src/static/style.css` — custom styling and theme support

## Extending Payloads
To add or modify payloads, edit the `app/src/payloads.ts` file. You can add new categories, payloads, and check types (in parameters, headers, as file).

---

The project requires Node.js and can be deployed as a Cloudflare Worker or on any server supporting the Fetch API.
