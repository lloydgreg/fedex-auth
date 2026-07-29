variable "aws_region" {
  description = "AWS region to deploy into."
  type        = string
  default     = "eu-west-2"
}

variable "project_name" {
  description = "Name prefix for AWS resources."
  type        = string
  default     = "fedex-auth-helper"
}

variable "stage_name" {
  description = "API Gateway stage name. Use $default for the root URL without a stage path."
  type        = string
  default     = "$default"
}

variable "cloudfront_price_class" {
  description = "CloudFront price class for the Lambda-backed frontend distribution."
  type        = string
  default     = "PriceClass_100"
}

variable "lambda_runtime" {
  description = "Node.js runtime for the Lambda function."
  type        = string
  default     = "nodejs24.x"
}

variable "lambda_architecture" {
  description = "Instruction set architecture for the Lambda function."
  type        = string
  default     = "arm64"
}

variable "lambda_memory_size" {
  description = "Memory allocated to the Lambda function in MB."
  type        = number
  default     = 256
}

variable "lambda_timeout" {
  description = "Lambda timeout in seconds."
  type        = number
  default     = 30
}

variable "api_cors_allowed_origins" {
  description = "Origins allowed to call the backend API Gateway."
  type        = list(string)
  default     = ["*"]
}

variable "api_cors_include_cloudfront_origin" {
  description = "Deprecated. CloudFront now uses API Gateway as its origin, so frontend calls are same-origin through CloudFront."
  type        = bool
  default     = false
}

variable "api_cors_allowed_methods" {
  description = "HTTP methods allowed by API Gateway CORS."
  type        = list(string)
  default     = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
}

variable "api_cors_allowed_headers" {
  description = "Headers allowed by API Gateway CORS."
  type        = list(string)
  default = [
    "authorization",
    "content-type",
    "accountauthtoken",
    "x-fedex-environment"
  ]
}

variable "api_cors_allow_credentials" {
  description = "Whether API Gateway CORS allows credentials."
  type        = bool
  default     = false
}

variable "api_cors_max_age" {
  description = "API Gateway CORS preflight max age in seconds."
  type        = number
  default     = 86400
}

variable "log_retention_days" {
  description = "CloudWatch log retention for Lambda logs."
  type        = number
  default     = 14
}

variable "fedex_sandbox_api_base_url" {
  description = "FedEx sandbox API base URL used by server-side calls."
  type        = string
  default     = "https://apis-sandbox.fedex.com"
}

variable "fedex_production_api_base_url" {
  description = "FedEx production API base URL used by server-side calls."
  type        = string
  default     = "https://apis.fedex.com"
}

variable "tags" {
  description = "Tags applied to supported AWS resources."
  type        = map(string)
  default = {
    Project   = "fedex-auth-helper"
    ManagedBy = "terraform"
  }
}
