# SSM Parameters for cross-service configuration

resource "aws_ssm_parameter" "cognito_pool_id" {
  name  = "/user-service/${var.environment}/cognito-pool-id"
  type  = "String"
  value = aws_cognito_user_pool.main.id

  tags = {
    Name = "/user-service/${var.environment}/cognito-pool-id"
  }
}

resource "aws_ssm_parameter" "cognito_client_id" {
  name  = "/user-service/${var.environment}/cognito-client-id"
  type  = "String"
  value = aws_cognito_user_pool_client.main.id

  tags = {
    Name = "/user-service/${var.environment}/cognito-client-id"
  }
}

resource "aws_ssm_parameter" "table_name" {
  name  = "/user-service/${var.environment}/table-name"
  type  = "String"
  value = aws_dynamodb_table.user_service.name

  tags = {
    Name = "/user-service/${var.environment}/table-name"
  }
}

resource "aws_ssm_parameter" "event_bus_name" {
  name  = "/user-service/${var.environment}/event-bus-name"
  type  = "String"
  value = aws_cloudwatch_event_bus.user_service.name

  tags = {
    Name = "/user-service/${var.environment}/event-bus-name"
  }
}
