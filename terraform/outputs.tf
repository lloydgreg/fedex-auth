output "api_gateway_url" {
  description = "Base URL for the backend API Gateway."
  value       = local.api_gateway_url
}

output "frontend_cloudfront_url" {
  description = "CloudFront URL for the Lambda-served frontend and backend."
  value       = local.cloudfront_url
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID for frontend cache invalidations."
  value       = aws_cloudfront_distribution.frontend.id
}

output "lambda_function_name" {
  description = "Name of the Lambda function."
  value       = aws_lambda_function.app.function_name
}
