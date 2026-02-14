# AI Governance Dashboard - Testing Guide

**Status:** ✅ Frontend Dashboard Complete  
**Commit:** 5bc2d37c  
**Date:** 2026-02-14

## 🎯 What Was Built

### AI Governance Dashboard (`/ai-governance`)
A comprehensive React dashboard for monitoring and managing AI governance with NIST AI RMF compliance.

## 🚀 How to Test Locally

### 1. Start Backend Server
```bash
cd gateway-server
npm run dev
```
Expected output: `Server running on http://localhost:3000`

### 2. Start Frontend Development Server
```bash
cd admin-client
npm run dev
```
Expected output: `Local: http://localhost:5173/`

### 3. Access the Dashboard
1. Open browser: http://localhost:5173
2. Login with your admin credentials
3. Click **"🛡️ AI Governance"** in the navigation menu

## 📊 Dashboard Features

### Overview Tab
- **Key Metrics Cards:**
  * Total AI Systems count
  * Active Incidents (with critical count)
  * Pending Assessments (with overdue count)
  * Average Fairness Score (with systems below threshold)

- **Risk Distribution:**
  * Visual progress bars for Critical/High/Medium/Low risks
  * Color-coded: Red (Critical), Orange (High), Blue (Medium), Green (Low)
  * Percentage distribution across all AI systems

- **Incident Trends:**
  * Total incidents in last 30 days
  * Critical and active incident counts
  * Visual gauge display

### Recent Metrics Tab
- Table showing latest AI performance metrics
- Columns: Connector, Metric Type, Value, Status, Measured At
- Threshold violation indicators (green checkmark or red warning)
- Metric types: accuracy, precision, recall, fairness_score, bias_score, etc.

### Recent Incidents Tab
- **Report Incident Button** - Creates new incident
- Table showing latest AI incidents
- Columns: Connector, Incident Title, Severity, Status, Detected At, Actions
- Severity badges: Critical (red), High (orange), Medium (blue), Low (gray)
- Status badges: Open (red), Investigating (orange), Resolved (green), Closed (gray)
- Click "View" to see incident details

### Recent Assessments Tab
- **New Assessment Button** - Creates risk assessment
- Table showing latest risk assessments
- Columns: Connector, Risk Score, Risk Level, Status, Assessment Date, Actions
- Risk scoring: 0-100 scale with color coding
- Status tracking: Draft, In Review, Approved, Rejected

### Compliance Tab
- **Overall Compliance Score** - Large percentage display
- Progress bar visualization
- Compliant vs Non-Compliant systems count
- **Generate Reports** section
- Links to view and create compliance reports

### Quick Actions Bar
- 📊 Record Metric - Add new monitoring metric
- ⚠️ Report Incident - Report AI system incident
- 📋 Create Assessment - Start new risk assessment
- 🧪 Run Fairness Test - Execute bias audit

## 🧪 Expected Behavior

### On First Load (Empty State)
Since you just created the tables, the dashboard will show:
- ✅ Total AI Systems: 0 (or count of AI connectors)
- ✅ No incidents, metrics, or assessments yet
- ✅ Empty state messages: "No metrics recorded yet", "No incidents reported"

### After Seeding Data
Once you add sample data (see next section), you'll see:
- ✅ Populated statistics cards
- ✅ Risk distribution charts with actual data
- ✅ Tables filled with recent records
- ✅ Working navigation to detail pages

## 📝 Seed Sample Data (Optional)

To see the dashboard with real data, run this SQL in Supabase:

```sql
-- Get your tenant_id and a connector_id
SELECT id as tenant_id FROM tenants LIMIT 1;
SELECT id as connector_id FROM api_connectors WHERE is_ai_system = true LIMIT 1;

-- Insert sample monitoring metrics
INSERT INTO ai_monitoring_metrics (tenant_id, connector_id, metric_type, metric_category, metric_value, threshold_min, threshold_max, demographic_group)
VALUES
  ('YOUR_TENANT_ID', 'YOUR_CONNECTOR_ID', 'fairness_score', 'fairness', 0.85, 0.80, NULL, 'all_groups'),
  ('YOUR_TENANT_ID', 'YOUR_CONNECTOR_ID', 'accuracy', 'performance', 0.92, 0.90, NULL, 'all_groups'),
  ('YOUR_TENANT_ID', 'YOUR_CONNECTOR_ID', 'bias_score', 'fairness', 0.12, NULL, 0.15, 'gender');

-- Insert sample risk assessment
INSERT INTO ai_risk_assessments (
  tenant_id, connector_id, assessment_version, status, 
  overall_risk_score, impact_score, likelihood_score,
  govern_score, map_score, measure_score, manage_score,
  risk_description, residual_risk_level
)
VALUES (
  'YOUR_TENANT_ID', 'YOUR_CONNECTOR_ID', '1.0', 'approved',
  65, 7, 8,
  75, 70, 60, 65,
  'Initial risk assessment for customer segmentation AI',
  'medium'
);

-- Insert sample incident
INSERT INTO ai_incidents (
  tenant_id, connector_id, incident_type, severity, status,
  title, description, detected_by, users_affected
)
VALUES (
  'YOUR_TENANT_ID', 'YOUR_CONNECTOR_ID', 
  'bias_detected', 'high', 'investigating',
  'Gender bias detected in approval rates',
  'Analysis shows 12% disparity in approval rates between male and female applicants',
  'automated', 150
);

-- Insert sample fairness test
INSERT INTO ai_fairness_tests (
  tenant_id, connector_id, test_name, test_type, 
  protected_attributes, overall_fairness_score, passed
)
VALUES (
  'YOUR_TENANT_ID', 'YOUR_CONNECTOR_ID',
  'Q1 2026 Demographic Parity Test', 'demographic_parity',
  ARRAY['gender', 'race'], 82, true
);
```

Replace `YOUR_TENANT_ID` and `YOUR_CONNECTOR_ID` with actual UUIDs from your database.

## 🔍 Verification Checklist

### Navigation
- [ ] "🛡️ AI Governance" link appears in top navigation
- [ ] Clicking link navigates to `/ai-governance` route
- [ ] Page loads without errors

### API Connection
- [ ] Dashboard makes GET request to `/admin/governance/dashboard`
- [ ] Request includes Bearer authentication token
- [ ] Response returns successfully (check Network tab)

### UI Elements
- [ ] All 4 stat cards display correctly
- [ ] Risk distribution chart renders
- [ ] All tabs are clickable and switch content
- [ ] Tables render with proper columns
- [ ] Badges show correct colors for severity/status
- [ ] Date formatting displays correctly

### Error Handling
- [ ] Loading spinner shows while fetching data
- [ ] Error message displays if API fails
- [ ] Retry button works after error
- [ ] Empty states show when no data exists

### Responsive Design
- [ ] Dashboard looks good on desktop (1920x1080)
- [ ] Dashboard adapts to tablet (768px)
- [ ] Cards stack properly on mobile (375px)
- [ ] Tables scroll horizontally on small screens

## 🐛 Troubleshooting

### Issue: "Module not found" error
**Solution:** Make sure you're in the correct directory
```bash
cd admin-client
npm install
npm run dev
```

### Issue: API calls return 401 Unauthorized
**Solution:** Check authentication token
1. Open DevTools → Application → Local Storage
2. Verify Supabase session exists
3. Try logging out and back in

### Issue: Dashboard shows "No data"
**Solution:** This is expected! You need to:
1. Ensure migration 004 is applied
2. Create some AI connectors with `is_ai_system = true`
3. Optionally seed sample data (see above)

### Issue: Network Error / CORS
**Solution:** Backend not running
```bash
cd gateway-server
npm run dev
# Should show: Server running on http://localhost:3000
```

### Issue: Components not styled properly
**Solution:** Bootstrap not loaded
- Check that `bootstrap/dist/css/bootstrap.min.css` is imported in App.tsx
- Restart dev server: `npm run dev`

## 📈 Next Steps

Now that the dashboard is working, you can:

1. **Test the API endpoints** - Use Thunder Client or Postman
2. **Add more pages:**
   - `/ai-governance/monitoring` - Detailed metrics page
   - `/ai-governance/incidents` - Full incident list
   - `/ai-governance/assessments` - Assessment management
   - `/ai-governance/reports` - Compliance reports
3. **Add charts** - Install Recharts for visualizations
4. **Add real-time updates** - Polling or WebSocket for live data
5. **Add filters** - Date range, connector selection, status filters

## 🎨 UI Screenshots (What You Should See)

### Navigation
```
[KUMII API Gateway] [Dashboard] [Connectors] [Routes] [🛡️ AI Governance] [Audit Logs] [...Logout]
```

### Dashboard Header
```
🛡️ AI Governance Dashboard
NIST AI RMF Compliance & Monitoring
[📋 Risk Assessments] [⚠️ Incidents] [📊 Monitoring]
```

### Tabs
```
[📈 Overview] [📏 Recent Metrics] [⚠️ Recent Incidents] [📋 Recent Assessments] [✓ Compliance]
```

### Stat Cards (Empty State)
```
┌─────────────────┬─────────────────┬─────────────────┬─────────────────┐
│ Total AI Systems│ Active Incidents│ Pending Assess. │ Avg Fair. Score │
│       0         │       0         │       0         │      0.0%       │
│                 │  0 critical     │  0 overdue      │ 0 below thresh. │
└─────────────────┴─────────────────┴─────────────────┴─────────────────┘
```

## ✅ Success Criteria

You know the dashboard is working correctly when:

1. ✅ Dashboard loads without console errors
2. ✅ Navigation link is visible and clickable
3. ✅ API call to `/admin/governance/dashboard` succeeds
4. ✅ All tabs render and are switchable
5. ✅ Empty states display properly (if no data)
6. ✅ Stat cards show "0" for empty metrics
7. ✅ Quick action buttons navigate correctly
8. ✅ Page is responsive on different screen sizes

---

**Current Status:** ✅ Frontend Dashboard Complete and Ready for Testing!

**Deployed to:** Vercel (will auto-deploy on push)

**Next:** Test locally, seed data, and build additional pages
