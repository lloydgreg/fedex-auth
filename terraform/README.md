# AWS Hosting

This Terraform stack deploys the frontend HTML/assets and Node.js backend to one Lambda behind API Gateway, with CloudFront in front of API Gateway.

## What It Creates

- Lambda function running the backend and serving static assets from `../lambda/static`
- API Gateway HTTP API with CORS enabled
- CloudFront distribution using API Gateway/Lambda as its origin
- IAM execution role for Lambda
- CloudWatch log group with configurable retention

## Deploy

Build the frontend export first. This writes the current HTML and assets into `../lambda/static`, which Terraform includes in the Lambda zip.

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
- Use `api_gateway_url` only for direct backend/API Gateway testing.
- Browser requests through CloudFront are same-origin and are routed to the same Lambda backend.

## Static Assets

Terraform packages files from `../lambda`, including generated assets in `../lambda/static`. Run `npm run build:frontend` from the repository root before `terraform plan` or `terraform apply` so the Lambda zip contains the latest UI.

## FedEx Upstream URLs

The Lambda only handles the FedEx API routes used by the app. Set the upstream base URLs in `terraform.tfvars`:

```hcl
fedex_sandbox_api_base_url    = "https://apis-sandbox.fedex.com"
fedex_production_api_base_url = "https://apis.fedex.com"
```

## CORS

API Gateway CORS is enabled for direct API Gateway access. By default `api_cors_allowed_origins = ["*"]`. Calls made through CloudFront are same-origin and do not depend on CORS.
