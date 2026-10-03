output "cloudfront_url" {
  description = "Public URL of the web application protected by AWS WAF"
  value       = "https://${aws_cloudfront_distribution.distribution.domain_name}"
}

output "cloudfront_distribution_id" {
  description = "CloudFront Distribution ID (used for cache invalidations)"
  value       = aws_cloudfront_distribution.distribution.id
}

output "s3_bucket_name" {
  description = "S3 bucket where the frontend build (dist/) must be uploaded"
  value       = aws_s3_bucket.frontend_bucket.id
}

output "api_gateway_url" {
  description = "Direct API Gateway endpoint URL (requests should go via CloudFront to trigger WAF)"
  value       = aws_apigatewayv2_api.http_api.api_endpoint
}

output "waf_web_acl_id" {
  description = "AWS WAF WebACL ID"
  value       = aws_wafv2_web_acl.web_acl.id
}

output "waf_web_acl_arn" {
  description = "AWS WAF WebACL ARN"
  value       = aws_wafv2_web_acl.web_acl.arn
}

output "frontend_deploy_command" {
  description = "Command to build and sync React frontend to S3"
  value       = "npm run build && aws s3 sync dist/ s3://${aws_s3_bucket.frontend_bucket.id} --delete && aws cloudfront create-invalidation --distribution-id ${aws_cloudfront_distribution.distribution.id} --paths '/*'"
}
