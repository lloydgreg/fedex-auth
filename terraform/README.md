# AWS Lambda Hosting

This Terraform stack deploys the FedEx Auth Helper as a Lambda function behind an API Gateway HTTP API.

## What It Creates

- Lambda function running the app from `../lambda`
- API Gateway HTTP API with a `$default` route
- IAM execution role for Lambda
- CloudWatch log group with configurable retention

## Deploy

```sh
cd terraform
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform plan
terraform apply
```

After apply, use the `api_endpoint` output as the hosted app URL.

## Static Assets

Terraform packages the `../lambda` directory only. If you change the root `fedex-ship-auth.html` or `favicon.png`, copy the updated file into `../lambda` before applying Terraform.

## FedEx Upstream URLs

The Lambda only handles the FedEx API routes used by the app. Set the upstream base URLs in `terraform.tfvars`:

```hcl
fedex_sandbox_api_base_url    = "https://apis-sandbox.fedex.com"
fedex_production_api_base_url = "https://apis.fedex.com"
```
