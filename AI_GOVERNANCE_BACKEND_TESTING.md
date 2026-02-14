# AI Governance Backend - Testing Guide

**Status:** ✅ Backend 100% Complete  
**Date:** 2026-02-14  
**Commit:** e719b4d2

## 🎉 Completed Work

### Backend API Routes (All Functional)

**Base URL:** `/admin/governance`

All endpoints require:
- Authentication (Bearer token)
- Admin role
- Rate limiting applied

## API Endpoints Reference

### 1. Dashboard Overview
```
GET /admin/governance/dashboard
```

**Returns:**
- Total AI systems count
- Risk distribution (critical/high/medium/low)
- Incident statistics (active, last 30 days, critical)
- Assessment statistics (pending, overdue)
- Average fairness score
- Recent metrics, incidents, assessments

**Example Response:**
```json
{
  "success": true,
  "data": {
    "total_ai_systems": 5,
    "critical_risk_count": 1,
    "high_risk_count": 2,
    "medium_risk_count": 1,
    "low_risk_count": 1,
    "active_incidents": 2,
    "incidents_last_30_days": 5,
    "critical_incidents": 1,
    "pending_assessments": 3,
    "overdue_reviews": 1,
    "average_fairness_score": 0.87,
    "systems_below_fairness_threshold": 1,
    "compliance_score": 0,
    "compliant_systems": 0,
    "non_compliant_systems": 0,
    "recent_metrics": [...],
    "recent_incidents": [...],
    "recent_assessments": [...]
  }
}
```

### 2. Monitoring Metrics

**List Metrics:**
```
GET /admin/governance/metrics
Query Params:
  - connector_id (UUID, optional)
  - metric_type (string, optional): accuracy, precision, recall, f1_score, 
    bias_score, fairness_score, demographic_parity, equal_opportunity, 
    calibration, latency, throughput, error_rate
  - start_date (ISO 8601, optional)
  - end_date (ISO 8601, optional)
```

**Record Metric:**
```
POST /admin/governance/metrics
Body:
{
  "connector_id": "uuid",
  "metric_type": "fairness_score",
  "metric_category": "fairness",
  "metric_value": 0.85,
  "threshold_min": 0.80,
  "threshold_max": null,
  "demographic_group": "all",
  "model_version": "v1.2.0",
  "data_sample_size": 10000,
  "confidence_interval": 0.95,
  "notes": "Weekly fairness audit"
}
```

### 3. Risk Assessments

**List Assessments:**
```
GET /admin/governance/assessments
Query Params:
  - connector_id (UUID, optional)
  - status (string, optional): draft, in_review, approved, rejected, archived
```

**Create Assessment:**
```
POST /admin/governance/assessments
Body:
{
  "connector_id": "uuid",
  "assessment_version": "1.0",
  "assessment_date": "2026-02-14",
  "status": "draft",
  "overall_risk_score": 75,
  "impact_score": 8,
  "likelihood_score": 9,
  "govern_score": 80,
  "map_score": 70,
  "measure_score": 75,
  "manage_score": 65,
  "affected_populations": ["customers", "employees"],
  "harm_types": ["discrimination", "privacy_violation"],
  "risk_description": "Potential bias in customer segmentation",
  "impact_analysis": "Could affect 10,000+ users",
  "likelihood_rationale": "Historical data shows similar patterns",
  "mitigation_measures": [
    "Regular fairness audits",
    "Diverse training data",
    "Human oversight on edge cases"
  ],
  "residual_risk_level": "medium",
  "next_review_date": "2026-05-14"
}
```

**Update Assessment:**
```
PUT /admin/governance/assessments/:id
Body: (any fields from create)
{
  "status": "approved",
  "approval_notes": "Mitigation plan looks comprehensive"
}
```

### 4. Incidents

**List Incidents:**
```
GET /admin/governance/incidents
Query Params:
  - connector_id (UUID, optional)
  - status (string, optional): open, investigating, resolved, closed, false_alarm
  - severity (string, optional): low, medium, high, critical
```

**Create Incident:**
```
POST /admin/governance/incidents
Body:
{
  "connector_id": "uuid",
  "incident_type": "bias_detected",
  "severity": "high",
  "title": "Gender bias detected in loan approval model",
  "description": "Analysis shows approval rates differ by 15% between genders",
  "detected_by": "automated_audit",
  "users_affected": 150,
  "data_records_affected": 500,
  "financial_impact": 25000,
  "harm_caused": ["discrimination", "economic_harm"]
}
```

**Update Incident:**
```
PUT /admin/governance/incidents/:id
Body:
{
  "status": "resolved",
  "root_cause": "Training data imbalance",
  "resolution_steps": "Retrained model with balanced dataset",
  "resolved_by": "uuid",
  "preventive_measures": [
    "Implement continuous bias monitoring",
    "Quarterly training data audits",
    "Threshold alerts for demographic parity"
  ]
}
```

### 5. Fairness Tests

**List Tests:**
```
GET /admin/governance/fairness-tests
Query Params:
  - connector_id (UUID, optional)
```

**Record Test:**
```
POST /admin/governance/fairness-tests
Body:
{
  "connector_id": "uuid",
  "model_version_id": "uuid",
  "test_name": "Q1 2026 Demographic Parity Test",
  "test_type": "demographic_parity",
  "protected_attributes": ["gender", "race", "age"],
  "overall_fairness_score": 0.82,
  "passed": false,
  "failure_reason": "Demographic parity ratio below 0.8 threshold",
  "group_results": {
    "male": {"accuracy": 0.89, "precision": 0.87},
    "female": {"accuracy": 0.85, "precision": 0.83}
  },
  "disparity_metrics": {
    "gender_disparity": 0.048,
    "race_disparity": 0.023
  },
  "p_value": 0.03,
  "confidence_level": 0.95,
  "sample_size": 50000,
  "remediation_required": true,
  "recommendations": [
    "Rebalance training data",
    "Apply fairness constraints",
    "Increase female representation in dataset"
  ]
}
```

### 6. Connector Governance Detail

**Get Full Governance Info:**
```
GET /admin/governance/connectors/:connectorId/governance
```

**Returns:**
- Connector basic info
- Latest risk assessment
- Latest metrics (last 10)
- Active incidents
- Model versions
- Fairness tests (last 5)
- Compliance status

## Testing Locally

### Prerequisites
1. Apply database migrations:
   - Run `003_ai_risk_classification.sql` in Supabase
   - Run `004_ai_governance_schema.sql` in Supabase

2. Start the backend:
```bash
cd gateway-server
npm run dev
```

3. Get authentication token:
```bash
# Login and get token (use admin-client or Supabase auth)
# Token will be in format: Bearer <jwt_token>
```

### Test with cURL

**1. Test Dashboard:**
```bash
curl -X GET http://localhost:3000/admin/governance/dashboard \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

**2. Record a Metric:**
```bash
curl -X POST http://localhost:3000/admin/governance/metrics \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "connector_id": "YOUR_CONNECTOR_ID",
    "metric_type": "fairness_score",
    "metric_category": "fairness",
    "metric_value": 0.85,
    "threshold_min": 0.80
  }'
```

**3. Create Risk Assessment:**
```bash
curl -X POST http://localhost:3000/admin/governance/assessments \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "connector_id": "YOUR_CONNECTOR_ID",
    "assessment_version": "1.0",
    "status": "draft",
    "overall_risk_score": 75,
    "risk_description": "Test assessment"
  }'
```

**4. Report Incident:**
```bash
curl -X POST http://localhost:governance/incidents \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "connector_id": "YOUR_CONNECTOR_ID",
    "incident_type": "bias_detected",
    "severity": "medium",
    "title": "Test incident",
    "description": "Testing incident reporting"
  }'
```

### Test with Thunder Client / Postman

**Collection Setup:**
1. Create new collection: "AI Governance API"
2. Add environment variable: `baseUrl = http://localhost:3000`
3. Add environment variable: `token = YOUR_JWT_TOKEN`
4. Create requests for each endpoint above

**Sample Request:**
```
Method: GET
URL: {{baseUrl}}/admin/governance/dashboard
Headers:
  Authorization: Bearer {{token}}
  Content-Type: application/json
```

## Production Testing

**⚠️ Note:** Vercel→Supabase connectivity issue (30s timeout) will affect these endpoints until resolved.

Once connectivity is fixed:

```bash
# Production URL
curl -X GET https://apimanager-two.vercel.app/api/admin/governance/dashboard \
  -H "Authorization: Bearer YOUR_PRODUCTION_TOKEN" \
  -H "Content-Type: application/json"
```

## Expected Errors

### Common Error Responses:

**401 Unauthorized:**
```json
{
  "error": "Unauthorized",
  "message": "No authorization token provided"
}
```

**403 Forbidden:**
```json
{
  "error": "Forbidden",
  "message": "Insufficient permissions"
}
```

**404 Not Found:**
```json
{
  "error": "Not Found",
  "message": "Resource not found"
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "error": "Failed to fetch dashboard data"
}
```

## Validation Rules

### Metric Types:
- accuracy, precision, recall, f1_score
- bias_score, fairness_score, demographic_parity
- equal_opportunity, calibration
- latency, throughput, error_rate

### Metric Categories:
- performance, fairness, reliability, efficiency

### Risk Levels:
- low, medium, high, critical

### Assessment Status:
- draft, in_review, approved, rejected, archived

### Incident Types:
- bias_detected, fairness_violation, performance_degradation
- security_breach, privacy_leak, safety_incident
- incorrect_prediction, system_failure, other

### Incident Status:
- open, investigating, resolved, closed, false_alarm

### Fairness Test Types:
- demographic_parity, equal_opportunity, equalized_odds
- predictive_parity, calibration, individual_fairness
- group_fairness, custom

## Next Steps

### For Frontend Development:
1. Use these endpoints to build dashboard UI
2. Test with real data (apply migrations first)
3. Handle loading states and errors gracefully
4. Add real-time updates (polling every 30s)

### For Production Deployment:
1. Fix Vercel→Supabase connectivity issue first
2. Test all endpoints on production URL
3. Monitor API performance and errors
4. Set up alerts for incidents

### For Data Seeding:
1. Create sample connectors with AI classification
2. Record test metrics (various types)
3. Create draft risk assessments
4. Report test incidents
5. Record fairness test results

## Troubleshooting

**Issue: "Module not found" errors**
```bash
cd gateway-server
npm install
npm run build
```

**Issue: "Cannot find name 'supabase'"**
- Fixed in commit e719b4d2
- Pull latest changes

**Issue: "tenant_id does not exist"**
- Fixed in commit e719b4d2
- Updated to use tenantId

**Issue: TypeScript compilation errors**
- Run `npm run build` to see errors
- All errors should be resolved

## API Design Notes

- All responses follow consistent format: `{ success: boolean, data?: any, error?: string }`
- All routes are protected with authentication middleware
- Rate limiting applied: max 100 requests/15min for admin endpoints
- Tenant isolation enforced via RLS policies
- All timestamps in ISO 8601 format
- UUIDs for all IDs

---

**Backend Status:** ✅ 100% Complete and Ready for Frontend Integration

**Next:** Build React dashboard to consume these APIs!
