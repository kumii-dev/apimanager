# NIST AI RMF Integration Strategy for KUMII API Gateway

## Overview

The NIST AI Risk Management Framework (AI RMF) provides a structured approach to managing AI risks across the lifecycle. Your API Gateway can operationalize these principles to govern AI/ML APIs that flow through your system.

## Integration Approach

### 1. **Governance Layer** (GOVERN)
Track and enforce AI governance policies for APIs that serve AI/ML models.

#### Implementation in API Gateway:

**Database Schema Addition:**
```sql
-- Track AI system classification and governance
CREATE TABLE ai_system_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_id UUID REFERENCES api_connectors(id),
  route_id UUID REFERENCES api_routes(id),
  
  -- NIST AI RMF Classification
  system_name TEXT NOT NULL,
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  nist_category TEXT, -- e.g., 'GOVERN-1.1', 'MAP-1.1'
  
  -- Trustworthy AI Characteristics
  accountability_measures JSONB DEFAULT '{}',
  transparency_level TEXT,
  explainability_required BOOLEAN DEFAULT false,
  fairness_metrics JSONB DEFAULT '{}',
  privacy_controls JSONB DEFAULT '{}',
  safety_controls JSONB DEFAULT '{}',
  
  -- Compliance
  legal_requirements TEXT[],
  regulatory_frameworks TEXT[], -- e.g., ['GDPR', 'CCPA', 'HIPAA']
  
  -- Documentation
  impact_assessment JSONB DEFAULT '{}',
  risk_mitigation_plan TEXT,
  last_reviewed_at TIMESTAMPTZ,
  next_review_date DATE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Track AI system incidents and issues
CREATE TABLE ai_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_system_id UUID REFERENCES ai_system_registry(id),
  
  incident_type TEXT CHECK (incident_type IN ('bias', 'error', 'security', 'privacy', 'fairness', 'other')),
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  
  description TEXT NOT NULL,
  affected_users INTEGER,
  root_cause TEXT,
  mitigation_steps TEXT,
  
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  reported_by UUID REFERENCES profiles(id),
  
  -- Link to NIST AI RMF
  nist_categories TEXT[], -- Related NIST categories
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Track AI model performance and fairness metrics
CREATE TABLE ai_metrics_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_system_id UUID REFERENCES ai_system_registry(id),
  
  metric_type TEXT, -- 'accuracy', 'fairness', 'bias', 'drift'
  metric_name TEXT,
  metric_value NUMERIC,
  
  -- Fairness metrics
  demographic_group TEXT, -- e.g., 'age_group_25-34', 'gender_female'
  disparate_impact NUMERIC,
  equal_opportunity_difference NUMERIC,
  
  -- Performance metrics
  precision NUMERIC,
  recall NUMERIC,
  f1_score NUMERIC,
  
  measured_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);
```

### 2. **API Classification** (MAP)
Automatically classify APIs based on AI risk factors.

**Features to Add:**
- **AI Detection**: Automatically detect if an API endpoint serves AI/ML models
- **Risk Scoring**: Assign NIST risk levels (low/medium/high/critical)
- **Impact Assessment**: Track potential impacts (financial, social, privacy)

**UI Component: `AIRiskClassifier.tsx`**
```typescript
// Add to connector/route creation flow
interface AIRiskAssessment {
  isAISystem: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  nistCategories: string[];
  impactAreas: string[]; // ['privacy', 'fairness', 'safety']
}

// Show in connector details
<AIRiskBadge level={connector.riskLevel} />
<NISTComplianceChecklist categories={connector.nistCategories} />
```

### 3. **Monitoring & Measurement** (MEASURE)
Track AI system performance and fairness metrics.

**Audit Log Enhancements:**
```typescript
// Enhanced audit logging for AI systems
interface AIAuditLog extends AuditLog {
  ai_system_id?: string;
  prediction_id?: string;
  input_hash?: string; // Hash of input for traceability
  output_hash?: string;
  fairness_check?: {
    demographic_parity: number;
    equal_opportunity: number;
    disparate_impact: number;
  };
  explainability_data?: {
    feature_importance: Record<string, number>;
    shap_values?: number[];
  };
}
```

**Monitoring Dashboard:**
- Real-time bias detection
- Model drift alerts
- Performance degradation warnings
- Fairness metric tracking

### 4. **Risk Management** (MANAGE)
Implement controls based on risk levels.

**Risk-Based Controls:**

```typescript
// Middleware for high-risk AI systems
export const aiRiskControls = (riskLevel: string) => {
  return async (req, res, next) => {
    if (riskLevel === 'high' || riskLevel === 'critical') {
      // Require additional logging
      await logDetailedAIRequest(req);
      
      // Require human-in-the-loop for critical decisions
      if (riskLevel === 'critical' && !req.headers['x-human-reviewed']) {
        return res.status(403).json({
          error: 'Human review required',
          message: 'Critical AI systems require human oversight'
        });
      }
      
      // Enable explainability
      req.explainabilityRequired = true;
    }
    
    next();
  };
};
```

**Rate Limiting Based on Risk:**
```typescript
// Higher risk = stricter rate limits
const riskBasedRateLimits = {
  low: 1000,      // requests per minute
  medium: 500,
  high: 100,
  critical: 50
};
```

### 5. **Compliance Dashboard**

**New Admin Panel: "AI Governance"**

Pages to add:
1. **AI System Registry** - List all AI systems with risk levels
2. **NIST Compliance Checklist** - Track compliance with each NIST category
3. **Impact Assessments** - Document and review impact assessments
4. **Incident Management** - Track and resolve AI incidents
5. **Fairness Monitoring** - Real-time fairness metrics dashboard
6. **Audit Reports** - Generate compliance reports

### 6. **NIST Playbook Integration**

**Use the existing `nist_ai_rmf_playbook.json`:**

```typescript
// components/NISTPlaybook.tsx
import playbook from '../nist_ai_rmf_playbook.json';

export const NISTGuidance = ({ category }: { category: string }) => {
  const guidance = playbook.find(item => item.title === category);
  
  return (
    <div className="nist-guidance">
      <h3>{guidance.title}</h3>
      <p>{guidance.description}</p>
      
      <h4>Actions</h4>
      <div dangerouslySetInnerHTML={{ __html: guidance.section_actions }} />
      
      <h4>Documentation</h4>
      <div dangerouslySetInnerHTML={{ __html: guidance.section_doc }} />
    </div>
  );
};
```

## Implementation Priority

### Phase 1: Foundation (Week 1-2)
1. ✅ Add `ai_system_registry` table
2. ✅ Add AI classification UI to connector creation
3. ✅ Implement basic risk scoring

### Phase 2: Monitoring (Week 3-4)
1. ✅ Enhanced audit logging for AI systems
2. ✅ Fairness metrics tracking
3. ✅ AI-specific dashboard

### Phase 3: Governance (Week 5-6)
1. ✅ Impact assessment workflow
2. ✅ Incident management system
3. ✅ Compliance reporting

### Phase 4: Advanced (Week 7-8)
1. ✅ Automated bias detection
2. ✅ Model drift monitoring
3. ✅ Human-in-the-loop workflows

## Example: Classifying an AI Connector

```typescript
// When creating a connector for an AI API
const aiConnector = {
  name: 'Sentiment Analysis API',
  type: 'rest',
  base_url: 'https://api.example.com/sentiment',
  
  // AI Classification
  ai_system: {
    is_ai_system: true,
    risk_level: 'medium',
    nist_categories: ['GOVERN-1.1', 'GOVERN-1.2', 'MAP-1.1', 'MEASURE-2.1'],
    
    // Trustworthy characteristics
    accountability: {
      data_provenance: true,
      audit_trail: true,
      responsible_parties: ['AI Team', 'Compliance']
    },
    
    transparency: {
      model_card_available: true,
      explainability_enabled: true,
      documentation_url: 'https://docs.example.com/model'
    },
    
    fairness: {
      protected_attributes: ['race', 'gender', 'age'],
      fairness_metrics: ['demographic_parity', 'equal_opportunity'],
      disparate_impact_threshold: 0.8
    },
    
    privacy: {
      pii_handling: 'encrypted',
      data_retention_days: 30,
      gdpr_compliant: true
    },
    
    safety: {
      fail_safe_mode: true,
      human_oversight_required: false,
      error_handling: 'graceful_degradation'
    }
  }
};
```

## Benefits

1. **Compliance**: Meet regulatory requirements (EU AI Act, etc.)
2. **Risk Management**: Identify and mitigate AI risks proactively
3. **Trust**: Build stakeholder confidence with transparent governance
4. **Accountability**: Clear audit trails for AI decisions
5. **Fairness**: Monitor and address bias systematically
6. **Safety**: Prevent harmful AI system behaviors

## Next Steps

Would you like me to:
1. **Implement the database schema** for AI system registry?
2. **Create the AI Classification UI** for connectors?
3. **Build the NIST Compliance Dashboard**?
4. **Add fairness monitoring** to the audit logs?

Let me know which aspect you'd like to start with!
