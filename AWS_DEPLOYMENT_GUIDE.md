# AWS WAF Protection for a Public Web Application
**Assignment / Problem Statement ID:** `24CC3014-P023`  
**Category:** Security  
**Scope:** Public Web Application Protection (CloudFront + S3 + API Gateway + Lambda + AWS WAFv2)

---

## 1. Architecture Overview

```mermaid
graph TD
    Client[Public Web Traffic / Attacker] -->|HTTPS Request| CF[Amazon CloudFront Distribution]
    CF -->|Inspects Request| WAF[AWS WAFv2 Web ACL]
    
    subgraph WAF Rules
        R1[1. AWSManagedRulesSQLiRuleSet - Pinned v2.0]
        R2[2. AWSManagedRulesCommonRuleSet & Bad Bot Match]
        R3[3. RateLimitAbusiveClients - 100 req/5m per IP]
    end
    
    WAF -->|SQLi / Bot / Flood Detected| Block[403 Forbidden / Rate-Limit Drop]
    WAF -->|Metrics & Alarms| CW[CloudWatch Logs & Metric Alarms]
    WAF -->|Allowed Request| CF
    
    CF -->|Path: /* (Static Assets)| S3[Amazon S3 Bucket - Private OAC]
    CF -->|Path: /api/* (API Calls)| APIGW[Amazon API Gateway HTTP API]
    APIGW --> Lambda[AWS Lambda Node.js API Handler]
```

---

## 2. Problem Statement Mapping & Solutions

### Use Case 1: Block SQL Injection and Bot Traffic
| Threat | AWS WAF Component | Configuration / Rule | Expected Outcome |
| :--- | :--- | :--- | :--- |
| **SQL Injection (SQLi)** | `AWSManagedRulesSQLiRuleSet` | Matches query strings, body, and headers for SQL patterns (`UNION SELECT`, `' OR '1'='1`) | Returns **HTTP 403 Forbidden** before reaching the backend API |
| **Bot Traffic & Scrapers** | `BlockBadBotsAndScrapers` / `AWSManagedRulesBotControlRuleSet` | Matches malicious User-Agents (`Scrapy`, `headlesschrome`, `badbot`, `python-requests`) | Returns **HTTP 403 Forbidden** |

### Use Case 2: Rate-Limit Abusive Clients
| Threat | AWS WAF Component | Configuration / Rule | Expected Outcome |
| :--- | :--- | :--- | :--- |
| **HTTP Flood / Brute-Force** | `RateLimitAbusiveClients` | Rate-based rule: limits requests to **100 requests per 5-minute window per IP** | Once the threshold is crossed, source IP is automatically blocked with **HTTP 403 Forbidden** |

---

## 3. Bottleneck Analysis & How We Solved Them

### Bottleneck A: WAF rules block legitimate users in count-mode testing gaps
* **The Problem:** Teams often test rules in `COUNT` mode during staging. When switching from `COUNT` to `BLOCK` mode in production, edge cases, special characters in form inputs, or search bars can suddenly trigger false positives, locking out legitimate users.
* **Our Solution:**
  1. **Configurable Count Mode Overrides:** In `terraform/variables.tf`, `count_mode_testing_sqli` and `count_mode_testing_bots` allow running rules in `COUNT` mode while logging sampled requests.
  2. **Sampled Requests Inspection:** We enable `sampled_requests_enabled = true` on all rules to inspect matched requests in the AWS WAF Console without blocking traffic.
  3. **Safe Transition Strategy:**
     - Step 1: Deploy with `COUNT` mode for 7–14 days.
     - Step 2: Query CloudWatch Logs Insights for rule matches:
       ```sql
       fields @timestamp, httpRequest.clientIp, httpRequest.uri, terminatingRuleId
       | filter action = "COUNT"
       | stats count(*) by httpRequest.uri
       ```
     - Step 3: Add rule exclusions for verified legitimate parameters before switching to `BLOCK` mode.

### Bottleneck B: Managed rule updates cause unexpected blocking
* **The Problem:** AWS periodically updates Managed Rule Groups with new signatures. If an updated signature conflicts with your application payload, it can cause unexpected blocking for legitimate users overnight.
* **Our Solution:**
  1. **Version Pinning:** In `terraform/waf.tf`, we pin the rule group to an explicit version (`version = "Version_2.0"`) instead of using `Default`. This ensures AWS cannot update the rule definition under the hood without testing.
  2. **CloudWatch Spike Alarm:** We created `aws_cloudwatch_metric_alarm.waf_block_spike_alarm` which triggers an alert whenever `BlockedRequests` rises sharply (indicative of a false positive after an upgrade).
  3. **Staging Canary Validation:** When upgrading to a new managed rule version, deploy the new version in `COUNT` mode on a staging distribution before applying to production.

---

## 4. Deploying with Terraform (Recommended)

### Prerequisites
1. [AWS CLI](https://aws.amazon.com/cli/) installed and configured (`aws configure` with your Access Key and Secret Key, or AWS Academy session tokens).
2. [Terraform](https://www.terraform.io/downloads) (>= 1.3.0) installed.

### Step 1: Initialize Terraform
```bash
cd terraform
terraform init
```

### Step 2: Review and Customize Variables
Copy `terraform.tfvars.example` to `terraform.tfvars`:
```bash
cp terraform.tfvars.example terraform.tfvars
```
You can adjust `rate_limit_threshold` (default: 100), `count_mode_testing_sqli`, or `sqli_rule_group_version`.

### Step 3: Plan and Deploy
```bash
terraform plan -out=tfplan
terraform apply tfplan
```

### Step 4: Build and Deploy the Frontend
Once Terraform completes, it outputs the S3 Bucket Name and CloudFront Domain:
```bash
# From the project root
npm run build

# Sync built assets to S3 (replace <S3_BUCKET_NAME> with Terraform output)
aws s3 sync dist/ s3://<S3_BUCKET_NAME> --delete

# Invalidate CloudFront cache (replace <DISTRIBUTION_ID>)
aws cloudfront create-invalidation --distribution-id <DISTRIBUTION_ID> --paths "/*"
```

---

## 5. Alternative: Step-by-Step AWS Console (GUI) Setup

If you are using **AWS Academy Learner Lab** or prefer the AWS Console:

### Step 1: Create the AWS WAF Web ACL
1. Open the [AWS WAF Console](https://console.aws.amazon.com/wafv2/).
2. In the top navigation, ensure the region dropdown is set to **Global (CloudFront)**.
3. Click **Create web ACL**.
4. Set Name: `WAF-ThreatMon-Protection`, Resource type: `CloudFront distributions`.
5. Under **Add rules and rule groups**:
   - **Add managed rule groups**:
     - Expand `AWS managed rule groups`.
     - Find **SQL database** (`AWSManagedRulesSQLiRuleSet`). Click **Add to web ACL**.
     - Click **Edit** next to it -> Select a pinned version (e.g. `Version_2.0`) to avoid unexpected updates.
     - Find **Core rule set** (`AWSManagedRulesCommonRuleSet`). Click **Add to web ACL**.
   - **Add my own rules and rule groups**:
     - Select **Rule type: Rule builder**.
     - Name: `RateLimit-AbusiveClients`.
     - Type: **Rate-based rule**. Rate limit: `100` (evaluates requests per 5 minutes per IP address).
     - Action: **Block**.
     - Add another custom rule: `BlockBadBots` -> Match header `User-Agent` contains `scrapy` or `badbot` -> Action: **Block**.
6. Set Default Action to **Allow**.
7. In the Metrics step, leave CloudWatch metrics enabled and finish creating the Web ACL.

### Step 2: Create S3 Bucket and CloudFront Distribution
1. Create a private S3 bucket (e.g. `waf-threatmon-frontend-kl`).
2. Open **CloudFront** -> **Create distribution**.
3. Origin domain: Select your S3 bucket. Under Origin access, select **Origin access control settings (recommended)** and create an OAC.
4. Under **Web Application Firewall (WAF)**: Select **Use existing WAF web ACL** and choose `WAF-ThreatMon-Protection`.
5. Under **Default root object**: Enter `index.html`.
6. Under **Error pages**: Create a custom error response:
   - HTTP error code: `404` -> Response page path: `/index.html` -> HTTP response code: `200`.
7. Once created, copy the S3 bucket policy generated by CloudFront into the S3 bucket permissions tab.
8. Upload the contents of your `dist/` directory into the S3 bucket.

---

## 6. How to Test & Verify in the Application

In your browser, visit the app running locally or via your CloudFront URL:
1. Navigate to the **Security Demo** page.
2. Click the **Live AWS WAF Live Tester** tab.
3. Enter your deployed CloudFront URL (or test against the local proxy).
4. Run each test:
   - **SQL Injection Test:** Sends `?id=1' OR '1'='1' UNION SELECT...` -> Verify **HTTP 403 Forbidden** returned by AWS WAF!
   - **Bot Traffic Test:** Sends simulated scraper User-Agent -> Verify **HTTP 403 Forbidden** block.
   - **Rate Limiting Test:** Fires bursts of requests to `/api/login` -> Verify **HTTP 403 / 429** triggers when the rate limit threshold is crossed!
5. Check the **Bottleneck Solvers** tab in the UI for documentation and demonstration of Count Mode evaluation and Version Pinning.
