#!/usr/bin/env bash
# Build and push Docker images to ECR, then force new ECS deployment.
# Usage: ./deploy.sh [web|ticker|all]
set -euo pipefail

TARGET=${1:-all}
cd "$(git rev-parse --show-toplevel)"

REGION=${AWS_REGION:-$(terraform -chdir=infra output -raw aws_region 2>/dev/null || echo "eu-west-1")}
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_BASE="$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com"

# Login to ECR
aws ecr get-login-password --region "$REGION" | \
  docker login --username AWS --password-stdin "$ECR_BASE"

build_and_push() {
  local name=$1
  local dockerfile=$2
  local repo="$ECR_BASE/stock-$name"

  echo "==> Building $name"
  docker build --platform linux/amd64 -t "$repo:latest" -f "$dockerfile" .
  docker push "$repo:latest"
}

case "$TARGET" in
  web)    build_and_push web apps/tanstack-start/Dockerfile ;;
  ticker) build_and_push ticker apps/ticker/Dockerfile ;;
  all)
    build_and_push web apps/tanstack-start/Dockerfile
    build_and_push ticker apps/ticker/Dockerfile
    ;;
  *) echo "Usage: $0 [web|ticker|all]" && exit 1 ;;
esac

# Force new deployment (single service with both containers)
echo "==> Redeploying ECS service"
aws ecs update-service \
  --cluster stock \
  --service stock \
  --force-new-deployment \
  --region "$REGION" \
  > /dev/null

echo "Done. Service is redeploying."
