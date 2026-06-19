output "api_endpoint" {
  description = "Base URL for the FedEx auth helper."
  value       = aws_apigatewayv2_stage.default.invoke_url
}

output "lambda_function_name" {
  description = "Name of the Lambda function."
  value       = aws_lambda_function.app.function_name
}
