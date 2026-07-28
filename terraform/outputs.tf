output "api_gateway_url" {
  description = "Base URL for the backend API Gateway."
  value       = local.api_gateway_url
}

output "frontend_cloudfront_url" {
  description = "CloudFront URL for the frontend."
  value       = local.cloudfront_url
}

output "frontend_s3_bucket" {
  description = "Private S3 bucket containing the frontend static export."
  value       = aws_s3_bucket.frontend.bucket
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID for frontend cache invalidations."
  value       = aws_cloudfront_distribution.frontend.id
}

output "lambda_function_name" {
  description = "Name of the Lambda function."
  value       = aws_lambda_function.app.function_name
}
