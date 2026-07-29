# FedEx Auth Helper

Browser-based helper for walking through the FedEx child credential authorization flow. The repository includes a local Node/Express helper, a Lambda backend handler, and Terraform for hosting the frontend and backend through Lambda, API Gateway, and CloudFront.

## Author

Lloyd Gregory

## Current Architecture

- `fedex-ship-auth.html` is the local static UI.
- `server.js` serves the local UI and forwards supported FedEx calls server-side.
- `lambda/index.mjs` serves the AWS UI/assets and forwards supported FedEx calls server-side.
- `terraform/` deploys:
  - Node.js Lambda containing the frontend HTML/assets and backend FedEx routes
  - API Gateway HTTP API with CORS enabled
  - CloudFront distribution in front of API Gateway/Lambda

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

- Frontend: HTML/assets served by Node.js Lambda through API Gateway and CloudFront
- Backend: FedEx server-side routes served by the same Lambda
- Region: `eu-west-2` by default

Build/export the frontend first. The export script copies the current `fedex-ship-auth.html` and `favicon.png` into `lambda/static/`, so Terraform packages the latest UI into the Lambda zip. It also writes `out/` for local inspection of the generated static files.

```sh
npm run build:frontend
```

Create `terraform/terraform.tfvars` from the example file and set values for your environment:

```hcl
aws_region   = "eu-west-2"
project_name = "fedex-auth-helper"

# CloudFront edge price class
cloudfront_price_class = "PriceClass_100"

# FedEx upstreams used by the Lambda backend
fedex_sandbox_api_base_url    = "https://apis-sandbox.fedex.com"
fedex_production_api_base_url = "https://apis.fedex.com"

# API Gateway CORS. Use ["*"] for direct API Gateway testing, then restrict for production.
# Browser calls through CloudFront are same-origin and do not depend on CORS.
api_cors_allowed_origins           = ["*"]
api_cors_include_cloudfront_origin = false

tags = {
  Project     = "fedex-auth-helper"
  ManagedBy   = "terraform"
  Environment = "dev"
}
```

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
cloudfront_distribution_id
lambda_function_name
```

Example output values look like:

```text
frontend_cloudfront_url = "https://d123abc456def.cloudfront.net"
api_gateway_url         = "https://abc123xyz.execute-api.eu-west-2.amazonaws.com"
cloudfront_distribution_id = "E123ABC456DEF"
lambda_function_name    = "fedex-auth-helper-app"
```

Resource URLs and identifiers:

```text
Frontend URL:
https://<cloudfront_distribution_domain>

Backend API base URL:
https://<api_id>.execute-api.eu-west-2.amazonaws.com

Lambda function name:
fedex-auth-helper-app

Lambda console URL:
https://eu-west-2.console.aws.amazon.com/lambda/home?region=eu-west-2#/functions/fedex-auth-helper-app

CloudFront console URL:
https://console.aws.amazon.com/cloudfront/v4/home#/distributions/<cloudfront_distribution_id>
```

The Lambda also serves `/runtime-config.json`. In AWS it returns an empty `apiBaseUrl`, which keeps browser calls same-origin through the current CloudFront or API Gateway host.

## CORS

API Gateway CORS is enabled in Terraform. Defaults are intentionally permissive for initial deployment:

```hcl
api_cors_allowed_origins = ["*"]
```

For production, replace the wildcard with explicit frontend origins.

## Notes

- The local HTML UI is retained for local testing.
- Run `npm run build:frontend` before `terraform plan` or `terraform apply` so the Lambda zip includes the latest `lambda/static/` assets.
- CloudFront serves the frontend and backend from API Gateway/Lambda.
