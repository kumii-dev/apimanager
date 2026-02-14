# AI Risk Classification Implementation

**Status:** ✅ Complete (Ready for Testing)  
**Date:** 2025-02-14  
**Feature:** NIST AI RMF Basic Risk Classification (Option 1)  
**Estimated Time:** 2 hours | **Actual Time:** ~1.5 hours

## Overview

Implemented basic AI risk classification for API connectors following the NIST AI Risk Management Framework (AI RMF). This allows administrators to:

1. Mark connectors that serve AI/ML systems
2. Assign NIST risk levels (low, medium, high, critical)
3. Track NIST AI RMF categories
4. Document AI use cases and risk assessments
5. Filter connectors by risk level
6. View color-coded risk badges in the UI

## Database Changes

### Migration: `003_ai_risk_classification.sql`

Added 6 new columns to `api_connectors` table:

| Column | Type | Description |
|--------|------|-------------|
| `is_ai_system` | BOOLEAN | Indicates if connector serves AI/ML system (default: false) |
| `ai_risk_level` | TEXT | Risk level: low, medium, high, critical (CHECK constraint) |
| `nist_categories` | TEXT[] | Array of NIST categories (e.g., ['GOVERN-1.1', 'MAP-1.1']) |
| `ai_use_case` | TEXT | Description of AI application |
| `risk_assessment_notes` | TEXT | Detailed risk assessment documentation |
| `last_risk_review_date` | DATE | Auto-updated when risk level changes |

### Trigger

- `update_risk_review_timestamp()`: Automatically updates `last_risk_review_date` when `ai_risk_level` or `is_ai_system` changes

### Index

- `idx_connectors_ai_risk`: Optimizes filtering by AI systems and risk levels

## Backend Changes

### File: `gateway-server/src/routes/connectors.ts`

**CREATE Endpoint (`POST /admin/connectors`):**
- Lines 104-117: Extract AI classification fields from request body
- Lines 127-138: Validate `ai_risk_level` enum values
- Lines 139-154: Insert AI fields with proper defaults:
  ```typescript
  is_ai_system: is_ai_system || false,
  ai_risk_level: is_ai_system ? ai_risk_level : null,
  nist_categories: nist_categories || [],
  ai_use_case: ai_use_case || null,
  risk_assessment_notes: risk_assessment_notes || null,
  ```

**UPDATE Endpoint (`PUT /admin/connectors/:id`):**
- Lines 346-359: Extract AI fields from request body
- Lines 378-399: Conditionally update AI fields:
  ```typescript
  ...(is_ai_system !== undefined && { is_ai_system }),
  ...(ai_risk_level && { ai_risk_level }),
  ...(nist_categories && { nist_categories }),
  ...(ai_use_case && { ai_use_case }),
  ...(risk_assessment_notes && { risk_assessment_notes }),
  ```

## Frontend Changes

### New Component: `admin-client/src/components/AIRiskBadge.tsx`

**AIRiskBadge Component:**
- Props: `riskLevel`, `size` (sm/md/lg), `showLabel` (default: true)
- Color coding:
  - `low` → Green badge with shield-check icon
  - `medium` → Warning yellow with exclamation-triangle icon
  - `high` → Danger red with exclamation-octagon icon
  - `critical` → Danger red with x-octagon-fill icon

**AISystemBadge Component:**
- Props: `isAISystem`, `size` (sm/md/lg)
- Blue badge with CPU icon
- Displays "AI System"

### Updated Page: `admin-client/src/pages/Connectors.tsx`

**TypeScript Interfaces (Lines 18-49):**
- Added 6 AI fields to `Connector` interface
- Added 5 AI fields to `ConnectorFormData` interface (excluding `last_risk_review_date`)

**State Management (Line 72):**
- Added `riskFilter` state for filtering connectors

**Filtering Logic (Lines 87-96):**
- `getFilteredConnectors()` function supports:
  - All connectors
  - AI systems only
  - Filter by specific risk level (low/medium/high/critical)

**Table Display (Lines 347-371):**
- Added "AI Classification" column after "Type"
- Displays `AISystemBadge` if `is_ai_system = true`
- Displays `AIRiskBadge` if `ai_risk_level` is set
- Badges wrap and display side-by-side

**Filter Dropdown (Lines 332-345):**
- Displays filtered connector count
- Options:
  - All Connectors
  - AI Systems Only
  - Low Risk
  - Medium Risk
  - High Risk
  - Critical Risk

**Modal Form (Lines 663-766):**
- Added "AI Classification (NIST AI RMF)" section
- Checkbox: "This connector serves an AI/ML system"
- Conditional fields (shown only if checkbox checked):
  - **AI Risk Level:** Dropdown (low/medium/high/critical) - REQUIRED
  - **AI Use Case:** Text input
  - **NIST Categories:** Comma-separated text input
  - **Risk Assessment Notes:** Textarea (3 rows)

**Form Handling:**
- Lines 128-140: Populate AI fields when editing connector
- Lines 178-188: Include AI fields in payload when submitting
- NIST categories are parsed from comma-separated string to array

## Testing Checklist

### Local Testing

- [ ] Apply database migration in Supabase SQL Editor
- [ ] Start backend: `cd gateway-server && npm run dev`
- [ ] Start frontend: `cd admin-client && npm run dev`
- [ ] Create new connector without AI classification (should work)
- [ ] Create new connector with AI classification:
  - [ ] Check "This is an AI/ML system"
  - [ ] Select risk level (required)
  - [ ] Enter AI use case
  - [ ] Enter NIST categories (e.g., GOVERN-1.1, MAP-1.1)
  - [ ] Enter risk assessment notes
  - [ ] Verify connector appears with badges in table
- [ ] Test filtering:
  - [ ] Filter by "AI Systems Only"
  - [ ] Filter by each risk level
  - [ ] Verify counts update correctly
- [ ] Edit existing connector:
  - [ ] Verify AI fields populate correctly
  - [ ] Change risk level
  - [ ] Verify `last_risk_review_date` updates automatically
- [ ] Delete connector (should work as before)

### Production Testing

**⚠️ BLOCKED:** Vercel→Supabase connectivity timeout issue (30s)

Once connectivity is fixed:
- [ ] Deploy to Vercel
- [ ] Verify migration applied to production database
- [ ] Test create/read/update/delete with AI classification
- [ ] Verify badges render correctly
- [ ] Test filtering functionality

## Integration with NIST AI RMF

This implementation provides the foundation for NIST AI RMF governance:

### Current Features (Phase 1 - Basic Classification)
- ✅ Identify which APIs serve AI systems
- ✅ Classify AI systems by risk level
- ✅ Track NIST AI RMF categories
- ✅ Document AI use cases
- ✅ Record risk assessment notes
- ✅ Auto-update risk review dates

### Future Enhancements (Phases 2-4)
See `NIST_AI_RMF_INTEGRATION.md` for:
- Real-time AI fairness monitoring
- Governance dashboard with metrics
- Compliance reporting
- Interactive NIST AI RMF Playbook viewer
- AI lifecycle tracking
- Bias detection integration

## Files Changed

### New Files
1. `supabase/migrations/003_ai_risk_classification.sql` (53 lines)
2. `admin-client/src/components/AIRiskBadge.tsx` (100 lines)
3. `AI_CLASSIFICATION_IMPLEMENTATION.md` (this file)

### Modified Files
1. `gateway-server/src/routes/connectors.ts` (6 edits, ~40 lines added)
2. `admin-client/src/pages/Connectors.tsx` (8 edits, ~150 lines added)

### Total Lines Added: ~343 lines

## API Changes

### POST `/admin/connectors`
**New Optional Fields:**
```json
{
  "is_ai_system": boolean,
  "ai_risk_level": "low" | "medium" | "high" | "critical",
  "nist_categories": string[],
  "ai_use_case": string,
  "risk_assessment_notes": string
}
```

### PUT `/admin/connectors/:id`
**New Optional Fields:** Same as POST

### Response Format
All connector objects now include:
```json
{
  "id": "uuid",
  "name": "string",
  "type": "rest",
  ...
  "is_ai_system": false,
  "ai_risk_level": null,
  "nist_categories": [],
  "ai_use_case": null,
  "risk_assessment_notes": null,
  "last_risk_review_date": null
}
```

## Next Steps

1. **Immediate:**
   - Apply database migration: Run `003_ai_risk_classification.sql` in Supabase SQL Editor
   - Test locally with sample AI connectors
   - Commit and push changes

2. **After Connectivity Fix:**
   - Deploy to production
   - Test end-to-end on Vercel
   - Create documentation for users

3. **Phase 2 (Optional - 8 hours):**
   - Implement real-time AI fairness monitoring
   - Add governance dashboard
   - Create compliance reporting

4. **Phase 3 (Optional - 4 hours):**
   - Add interactive NIST AI RMF Playbook viewer
   - Link connectors to playbook categories
   - Provide guided risk assessments

## References

- NIST AI RMF Playbook: `nist_ai_rmf_playbook.json`
- Integration Strategy: `NIST_AI_RMF_INTEGRATION.md`
- Troubleshooting: `TROUBLESHOOTING_VERCEL_SUPABASE.md`

---

**Implementation Complete ✅**  
Ready for local testing. Production deployment pending Vercel→Supabase connectivity fix.
