output "cognito_user_pool_id" {
  description = "Cognito User Pool ID"
  value       = aws_cognito_user_pool.main.id
}

output "cognito_user_pool_arn" {
  description = "Cognito User Pool ARN"
  value       = aws_cognito_user_pool.main.arn
}

output "cognito_client_id" {
  description = "Cognito App Client ID"
  value       = aws_cognito_user_pool_client.main.id
}

output "dynamodb_table_name" {
  description = "DynamoDB Table Name"
  value       = aws_dynamodb_table.user_service.name
}

output "dynamodb_table_arn" {
  description = "DynamoDB Table ARN"
  value       = aws_dynamodb_table.user_service.arn
}

output "event_bus_name" {
  description = "EventBridge Event Bus Name"
  value       = aws_cloudwatch_event_bus.user_service.name
}

output "event_bus_arn" {
  description = "EventBridge Event Bus ARN"
  value       = aws_cloudwatch_event_bus.user_service.arn
}

output "dlq_url" {
  description = "SQS Dead Letter Queue URL"
  value       = aws_sqs_queue.dlq.url
}
