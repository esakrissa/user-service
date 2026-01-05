# EventBridge Event Bus
resource "aws_cloudwatch_event_bus" "user_service" {
  name = local.name_prefix

  tags = {
    Name = local.name_prefix
  }
}

# SQS Dead Letter Queue
resource "aws_sqs_queue" "dlq" {
  name                      = "${local.name_prefix}-dlq"
  message_retention_seconds = 1209600 # 14 days

  tags = {
    Name = "${local.name_prefix}-dlq"
  }
}

# Event Rule for user events (for future consumers)
resource "aws_cloudwatch_event_rule" "user_events" {
  name           = "${local.name_prefix}-user-events"
  event_bus_name = aws_cloudwatch_event_bus.user_service.name

  event_pattern = jsonencode({
    source      = ["user-service"]
    detail-type = [{ prefix = "user." }]
  })

  tags = {
    Name = "${local.name_prefix}-user-events"
  }
}
