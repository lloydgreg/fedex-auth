# AWS Hosting

This Terraform stack deploys the static frontend export to a private S3 bucket behind CloudFront, and a Node.js backend to Lambda behind an API Gateway HTTP API.

## What It Creates

- Private S3 bucket for the frontend static export
- CloudFront distribution using Origin Access Control for S3
- Lambda function running the backend from `../lambda`
- API Gateway HTTP API with CORS enabled
- IAM execution role for Lambda
- CloudWatch log group with configurable retention

## Deploy

Build the frontend export first. By default Terraform expects the exported files in `../out` relative to the `terraform` directory.

```sh
# From the repository root:
npm run build:frontend

# Then deploy:
cd terraform
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform plan
terraform apply
```

After apply:

- Use `frontend_cloudfront_url` as the frontend URL.
- Use `api_gateway_url` as the backend URL.
- The frontend bucket also receives `runtime-config.json` containing `{ "apiBaseUrl": "<api_gateway_url>" }` for static frontends that read runtime configuration after load.

## Static Assets

Terraform uploads files from `frontend_build_dir`, which defaults to `../out`. The generated `runtime-config.json` is also uploaded and contains the API Gateway URL used by the static frontend.

## FedEx Upstream URLs

The Lambda only handles the FedEx API routes used by the app. Set the upstream base URLs in `terraform.tfvars`:

```hcl
fedex_sandbox_api_base_url    = "https://apis-sandbox.fedex.com"
fedex_production_api_base_url = "https://apis.fedex.com"
```

## CORS

API Gateway CORS is enabled. By default `api_cors_allowed_origins = ["*"]` and `api_cors_include_cloudfront_origin = true`. For a tighter production setup, replace the wildcard with explicit origins.
