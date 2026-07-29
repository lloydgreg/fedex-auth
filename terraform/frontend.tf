locals {
  api_gateway_url_without_scheme = trimprefix(local.api_gateway_url, "https://")
  api_gateway_origin_domain      = split("/", local.api_gateway_url_without_scheme)[0]
  api_gateway_origin_path        = var.stage_name == "$default" ? "" : "/${var.stage_name}"
  api_origin_id                  = "${var.project_name}-api-gateway"
}

data "aws_cloudfront_cache_policy" "caching_disabled" {
  name = "Managed-CachingDisabled"
}

data "aws_cloudfront_cache_policy" "caching_optimized" {
  name = "Managed-CachingOptimized"
}

data "aws_cloudfront_origin_request_policy" "all_viewer_except_host" {
  name = "Managed-AllViewerExceptHostHeader"
}

resource "aws_cloudfront_distribution" "frontend" {
  enabled             = true
  comment             = "${var.project_name} frontend and backend"
  default_root_object = "index.html"
  price_class         = var.cloudfront_price_class
  wait_for_deployment = false

  origin {
    domain_name = local.api_gateway_origin_domain
    origin_id   = local.api_origin_id
    origin_path = local.api_gateway_origin_path

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    allowed_methods          = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods           = ["GET", "HEAD"]
    cache_policy_id          = data.aws_cloudfront_cache_policy.caching_disabled.id
    compress                 = true
    origin_request_policy_id = data.aws_cloudfront_origin_request_policy.all_viewer_except_host.id
    target_origin_id         = local.api_origin_id
    viewer_protocol_policy   = "redirect-to-https"
  }

  ordered_cache_behavior {
    path_pattern             = "/favicon.png"
    allowed_methods          = ["GET", "HEAD", "OPTIONS"]
    cached_methods           = ["GET", "HEAD"]
    cache_policy_id          = data.aws_cloudfront_cache_policy.caching_optimized.id
    compress                 = true
    origin_request_policy_id = data.aws_cloudfront_origin_request_policy.all_viewer_except_host.id
    target_origin_id         = local.api_origin_id
    viewer_protocol_policy   = "redirect-to-https"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}
