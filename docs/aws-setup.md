# Optional: deploy the API to AWS ECS Fargate

The `Deploy API to AWS ECS (Fargate)` workflow is manual-only and does nothing until the
repository variable `AWS_ROLE_ARN` exists. GitHub signs in to AWS with a short-lived OIDC
token, so no AWS access keys are stored in GitHub.

**Cost:** one Fargate task (0.25 vCPU / 0.5 GB) costs a few cents per hour. Set a budget
alert first, and delete the service when you're done (last step below).

## One-time setup (AWS console or CLI, region `us-west-2`)

1. **Budget alert:** Billing → Budgets → create a $5 monthly budget with an email alert.
2. **ECR repository:** `aws ecr create-repository --repository-name device-inventory-api`
3. **OIDC provider for GitHub:** IAM → Identity providers → add OpenID Connect,
   URL `https://token.actions.githubusercontent.com`, audience `sts.amazonaws.com`.
4. **Deploy role** (e.g. `github-deploy-device-inventory`) with this trust policy:

   ```json
   {
     "Version": "2012-10-17",
     "Statement": [{
       "Effect": "Allow",
       "Principal": { "Federated": "arn:aws:iam::ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com" },
       "Action": "sts:AssumeRoleWithWebIdentity",
       "Condition": {
         "StringEquals": { "token.actions.githubusercontent.com:aud": "sts.amazonaws.com" },
         "StringLike": { "token.actions.githubusercontent.com:sub": "repo:roberto-t-plascencia/device-inventory-platform:*" }
       }
     }]
   }
   ```

   Permissions: ECR push to that repository, `ecs:RegisterTaskDefinition`,
   `ecs:UpdateService`, `ecs:DescribeServices`, and `iam:PassRole` on `ecsTaskExecutionRole`.
5. **Task execution role:** `ecsTaskExecutionRole` with the managed policy
   `AmazonECSTaskExecutionRolePolicy`, plus `logs:CreateLogGroup`.
   Put your account ID into `aws/task-definition.json`.
6. **Cluster and service:** create ECS cluster `device-inventory` (Fargate), register
   `aws/task-definition.json` once, and create service `device-inventory-api` with 1 task in
   public subnets with a public IP (or behind an ALB) and a security group that allows
   TCP 5000.
7. **GitHub:** Settings → Secrets and variables → Actions → **Variables**: add
   `AWS_ROLE_ARN` (and optionally `AWS_REGION`).

## Deploy

Actions → *Deploy API to AWS ECS (Fargate)* → **Run workflow**. It builds the image, pushes it
to ECR, renders a new task definition revision, and waits for the service to stabilize.
Check `http://<task public IP>:5000/api/version`.

## Tear down

Set the service's desired count to 0 (or delete the service), delete the cluster, and delete
the images in ECR.
