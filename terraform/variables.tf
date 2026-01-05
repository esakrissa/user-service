variable "environment" {
  description = "Deployment environment (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "common_tags" {
  description = "Common tags for all resources"
  type        = map(string)
  default = {
    Service   = "user-service"
    ManagedBy = "terraform"
  }
}
