# ─────────────────────────────────────────────────────────────────
# AWS WAFv2 WebACL for Public Web Application Protection
# Assignment Problem Statement: 24CC3014-P023
#
# Use Cases:
#   1. Block SQL Injection
#   2. Block Bot Traffic
#   3. Rate-Limit Abusive Clients
#
# Bottlenecks Addressed:
#   - WAF rules block legitimate users in count-mode testing gaps
#     -> Solved with configurable COUNT mode override & CloudWatch metrics
#   - Managed rule updates cause unexpected blocking
#     -> Solved with Managed Rule Version Pinning (e.g. Version_2.0)
# ─────────────────────────────────────────────────────────────────

resource "aws_wafv2_web_acl" "web_acl" {
  provider = aws.us_east_1

  name        = "${var.project_name}-web-acl"
  description = "AWS WAF Web ACL protecting CloudFront public web application against SQLi, Bots, and Flood attacks"
  scope       = "CLOUDFRONT"

  default_action {
    allow {}
  }

  # ── RULE 1: SQL Injection Protection (AWS Managed Rule) ───────
  # Addresses: Use Case 1 (Block SQL Injection)
  # Addresses: Bottleneck 2 (Pinning version prevents unexpected updates breaking traffic)
  # Addresses: Bottleneck 1 (COUNT override during testing evaluation)
  rule {
    name     = "AWSManagedRulesSQLiRuleSet"
    priority = 10

    override_action {
      dynamic "count" {
        for_each = var.count_mode_testing_sqli ? [1] : []
        content {}
      }
      dynamic "none" {
        for_each = var.count_mode_testing_sqli ? [] : [1]
        content {}
      }
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesSQLiRuleSet"
        vendor_name = "AWS"

        # Version pinning to prevent sudden breaking changes from managed rule updates
        version = var.sqli_rule_group_version != "" ? var.sqli_rule_group_version : null
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "WAF-SQLi-RuleMetric"
      sampled_requests_enabled   = true
    }
  }

  # ── RULE 2: Core Exploit Protection (OWASP Top 10 & Exploits) ──
  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 20

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "WAF-CommonRuleSetMetric"
      sampled_requests_enabled   = true
    }
  }

  # ── RULE 3: Bot & Scraper Traffic Protection ───────────────────
  # Addresses: Use Case 1 (Block Bot Traffic)
  # Works reliably across all AWS accounts (including AWS Academy / Student Labs)
  rule {
    name     = "BlockBadBotsAndScrapers"
    priority = 30

    action {
      dynamic "count" {
        for_each = var.count_mode_testing_bots ? [1] : []
        content {}
      }
      dynamic "block" {
        for_each = var.count_mode_testing_bots ? [] : [1]
        content {}
      }
    }

    statement {
      or_statement {
        statement {
          byte_match_statement {
            search_string         = "scrapy"
            field_to_match {
              single_header {
                name = "user-agent"
              }
            }
            text_transformation {
              priority = 0
              type     = "LOWERCASE"
            }
            positional_constraint = "CONTAINS"
          }
        }
        statement {
          byte_match_statement {
            search_string         = "badbot"
            field_to_match {
              single_header {
                name = "user-agent"
              }
            }
            text_transformation {
              priority = 0
              type     = "LOWERCASE"
            }
            positional_constraint = "CONTAINS"
          }
        }
        statement {
          byte_match_statement {
            search_string         = "headlesschrome"
            field_to_match {
              single_header {
                name = "user-agent"
              }
            }
            text_transformation {
              priority = 0
              type     = "LOWERCASE"
            }
            positional_constraint = "CONTAINS"
          }
        }
        statement {
          byte_match_statement {
            search_string         = "python-requests"
            field_to_match {
              single_header {
                name = "user-agent"
              }
            }
            text_transformation {
              priority = 0
              type     = "LOWERCASE"
            }
            positional_constraint = "CONTAINS"
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "WAF-BotTrafficMetric"
      sampled_requests_enabled   = true
    }
  }

  # ── RULE 4: Rate-Limit Abusive Clients ────────────────────────
  # Addresses: Use Case 2 (Rate-limit abusive clients)
  # Tracks request rate per source IP. If an IP exceeds threshold in 5 mins, it gets blocked.
  rule {
    name     = "RateLimitAbusiveClients"
    priority = 40

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = var.rate_limit_threshold
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "WAF-RateLimitMetric"
      sampled_requests_enabled   = true
    }
  }

  # ── Global WAF Visibility Configuration ───────────────────────
  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${var.project_name}-web-acl-metric"
    sampled_requests_enabled   = true
  }
}

# ── CloudWatch Metric Alarm for Sudden Spike in WAF Blocks ──────
# Solves Bottleneck: Managed rule updates causing unexpected blocking
# Alerts security engineers if blocked requests spike dramatically (sign of false positives)
resource "aws_cloudwatch_metric_alarm" "waf_block_spike_alarm" {
  provider            = aws.us_east_1
  alarm_name          = "${var.project_name}-waf-block-spike-alert"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "BlockedRequests"
  namespace           = "AWS/WAFV2"
  period              = 300
  statistic           = "Sum"
  threshold           = 50
  alarm_description   = "Triggered when blocked requests exceed threshold. Investigates potential false positives from rule updates or active DDoS."
  treat_missing_data  = "notBreaching"

  dimensions = {
    WebACL = aws_wafv2_web_acl.web_acl.name
    Region = "CloudFront"
    Rule   = "ALL"
  }
}
