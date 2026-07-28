# FedEx Auth Helper

Browser-based helper for walking through the FedEx child credential authorization flow. The repository includes a local Node/Express helper, a Lambda backend handler, and Terraform for hosting a static frontend with S3 + CloudFront and the backend with Lambda + API Gateway.

## Current Architecture

- `fedex-ship-auth.html` is the local static UI.
- `server.js` serves the local UI and forwards supported FedEx calls server-side.
- `lambda/index.mjs` is the backend-only Lambda handler for AWS.
- `terraform/` deploys:
  - Static Next.js export files to a private S3 bucket
  - CloudFront distribution for the frontend
  - Node.js Lambda for the backend
  - API Gateway HTTP API with CORS enabled

The old generic `/proxy?url=...` endpoint has been removed. The backend only supports the FedEx routes used by the app.

## Requirements

- Node.js 20 or newer
- npm
- Terraform, for AWS deployment
- AWS credentials configured locally, for Terraform apply

## Local Development

Install dependencies:

```sh
npm install
```

Start the local helper:

```sh
npm start
```

Open:

```text
http://localhost:8010/
```

The local server uses these upstream defaults:

```text
FEDEX_SANDBOX_API_BASE_URL=https://apis-sandbox.fedex.com
FEDEX_PRODUCTION_API_BASE_URL=https://apis.fedex.com
```

You can override them with environment variables before starting the server.

## Backend Routes

The server and Lambda backend support these same-origin routes:

```text
POST /oauth/token
POST /registration/v2/address/keysgeneration
POST /registration/v2/invoice/keysgeneration
POST /registration/v2/customerkeys/pingeneration
POST /registration/v2/pin/keysgeneration
```

Frontend requests should include:

```text
x-fedex-environment: sandbox
```

or:

```text
x-fedex-environment: production
```

The backend strips that selector header before forwarding the request to FedEx.

## AWS Deployment

Terraform lives in `terraform/`.

The stack is designed for:

- Frontend: static Next.js export in S3 behind CloudFront
- Backend: Node.js Lambda behind API Gateway
- Region: `eu-west-2` by default

Build/export the Next.js frontend first. By default Terraform expects the static export at `../out` relative to the `terraform` directory. Change `frontend_build_dir` in `terraform.tfvars` if your export lives elsewhere.

```sh
cd terraform
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform plan
terraform apply
```

Useful outputs:

```text
frontend_cloudfront_url
api_gateway_url
frontend_s3_bucket
cloudfront_distribution_id
lambda_function_name
```

Terraform also uploads `runtime-config.json` to the frontend bucket:

```json
{
  "apiBaseUrl": "<api_gateway_url>"
}
```

Static frontends can read this file after load to discover the backend URL.

## CORS

API Gateway CORS is enabled in Terraform. Defaults are intentionally permissive for initial deployment:

```hcl
api_cors_allowed_origins = ["*"]
```

For production, replace the wildcard with explicit frontend origins.

## Notes

- The local HTML UI is retained for local testing.
- The AWS Lambda is backend-only and does not serve frontend assets.
- CloudFront serves the frontend from S3 using Origin Access Control.
