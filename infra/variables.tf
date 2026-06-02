variable "project" {
  description = "Project name used for resource naming"
  type        = string
  default     = "stock"
}

variable "aws_region" {
  type    = string
  default = "eu-west-1"
}

variable "postgres_url" {
  description = "Supabase (or any external) Postgres connection string"
  type        = string
  sensitive   = true
}

variable "auth_secret" {
  type      = string
  sensitive = true
}

variable "auth_google_id" {
  type      = string
  sensitive = true
}

variable "auth_google_secret" {
  type      = string
  sensitive = true
}

variable "domain" {
  type    = string
  default = "stockgrid.app"
}

