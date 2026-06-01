output "app_url" {
  description = "App URL"
  value       = "https://${var.domain}"
}

output "ticker_ws_url" {
  description = "Ticker WebSocket URL"
  value       = "wss://${var.domain}/ws"
}

output "alb_dns" {
  description = "ALB DNS name (point your Cloudflare CNAME here)"
  value       = aws_lb.main.dns_name
}

output "acm_validation" {
  description = "Add this CNAME in Cloudflare to validate the ACM certificate"
  value = {
    for dvo in aws_acm_certificate.main.domain_validation_options : dvo.domain_name => {
      name  = dvo.resource_record_name
      value = dvo.resource_record_value
    }
  }
}

output "ecr_web" {
  description = "ECR repository URL for web image"
  value       = aws_ecr_repository.web.repository_url
}

output "ecr_ticker" {
  description = "ECR repository URL for ticker image"
  value       = aws_ecr_repository.ticker.repository_url
}
