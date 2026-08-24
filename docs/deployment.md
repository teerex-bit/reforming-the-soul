# Deployment — GitHub to Cloudflare

## Repository
GitHub repository:
```text
teerex-bit/reforming-the-soul
```

Production branch:
```text
main
```

## Hosting
Cloudflare Workers Static Assets.

Deploy command:
```bash
npx wrangler deploy
```

Static asset directory:
```text
./public
```

## Required Configuration
`wrangler.jsonc` should retain an assets configuration equivalent to:
```json
{
  "name": "reforming-the-soul",
  "assets": {
    "directory": "./public"
  }
}
```

## Failure History
The first Cloudflare deployment failed because the repository contained only a README and Wrangler could not detect a static files directory.

## Deployment Workflow
1. Make requested site change.
2. Test locally.
3. Confirm approved copy/assets were not unintentionally changed.
4. Commit focused changes.
5. Push to `main` when approved for the live development site.
6. Cloudflare deploys.
7. Verify deployment.
8. Check live site for missing assets, layout breakage, copy mismatch, mobile overflow, and navigation issues.

## Domain
The domain is registered at GoDaddy.
DNS nameservers are on Cloudflare.
Google Workspace handles email and its MX/TXT records must remain intact.

Website hosting and email hosting are separate concerns.

## Rollback
If a deployment breaks the site:
- revert the bad commit
- push the revert to `main`
- let Cloudflare redeploy

## Agent Deployment Rule
Codex must not:
- change registrar settings
- change nameservers
- delete DNS records
- alter Google Workspace mail records
- purchase paid Cloudflare products

without explicit user approval.
