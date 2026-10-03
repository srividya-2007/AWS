variable "aws_region" {
  description = "AWS region for regional resources (S3, Lambda, API Gateway)"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Name identifier for the project resources"
  type        = string
  default     = "waf-threatmon"
}

variable "environment" {
  description = "Deployment environment (e.g. dev, staging, production)"
  type        = string
  default     = "production"
}

# ── Problem Statement Use Case 1: Rate Limiting ──
variable "rate_limit_threshold" {
  description = "Maximum requests allowed per 5-minute evaluation period per IP before WAF blocks (AWS minimum is 100)"
  type        = number
  default     = 100
}

# ── Problem Statement Use Case 2: Bot Traffic ──
variable "enable_bot_control" {
  description = "Enable AWS Managed Rules Bot Control or Common Rule Set to block bots and scrapers"
  type        = bool
  default     = true
}

# ── Problem Statement Bottleneck 1: Count-Mode Testing Gaps ──
# When true, SQLi and Bot rules run in COUNT mode instead of BLOCK mode.
# This prevents legitimate users from being blocked during staging / testing gaps.
variable "count_mode_testing_sqli" {
  description = "Set SQL injection rule to COUNT mode for safe evaluation during testing gaps"
  type        = bool
  default     = false
}

variable "count_mode_testing_bots" {
  description = "Set Bot Control rule to COUNT mode for safe evaluation during testing gaps"
  type        = bool
  default     = false
}

# ── Problem Statement Bottleneck 2: Managed Rule Updates Causing Unexpected Blocking ──
# Pinning the managed rule version prevents automatic updates from breaking legitimate app traffic.
variable "sqli_rule_group_version" {
  description = "Specific version of AWSManagedRulesSQLiRuleSet to pin (e.g., 'Version_2.0', 'Default', or empty for default)"
  type        = string
  default     = "Version_2.0"
}
