-- Migration: Add AI Risk Classification to Connectors
-- Date: 2026-02-14
-- Description: Add NIST AI RMF risk classification fields to api_connectors table

-- Add AI classification columns to api_connectors
ALTER TABLE api_connectors
ADD COLUMN IF NOT EXISTS is_ai_system BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ai_risk_level TEXT CHECK (ai_risk_level IN ('low', 'medium', 'high', 'critical')),
ADD COLUMN IF NOT EXISTS nist_categories TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS ai_use_case TEXT,
ADD COLUMN IF NOT EXISTS risk_assessment_notes TEXT,
ADD COLUMN IF NOT EXISTS last_risk_review_date DATE;

-- Add comments for documentation
COMMENT ON COLUMN api_connectors.is_ai_system IS 'Indicates if this connector serves an AI/ML system';
COMMENT ON COLUMN api_connectors.ai_risk_level IS 'NIST AI RMF risk level: low, medium, high, or critical';
COMMENT ON COLUMN api_connectors.nist_categories IS 'Array of applicable NIST AI RMF categories (e.g., GOVERN-1.1, MAP-1.1)';
COMMENT ON COLUMN api_connectors.ai_use_case IS 'Description of the AI system use case';
COMMENT ON COLUMN api_connectors.risk_assessment_notes IS 'Notes from risk assessment process';
COMMENT ON COLUMN api_connectors.last_risk_review_date IS 'Date of last risk assessment review';

-- Create index for filtering by AI systems and risk level
CREATE INDEX IF NOT EXISTS idx_connectors_ai_risk ON api_connectors(is_ai_system, ai_risk_level) WHERE is_ai_system = true;

-- Update RLS policies to include new fields
-- (Existing tenant isolation policies already cover these fields)

-- Add trigger to update risk review date
CREATE OR REPLACE FUNCTION update_risk_review_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.ai_risk_level IS DISTINCT FROM OLD.ai_risk_level) OR
     (NEW.is_ai_system IS DISTINCT FROM OLD.is_ai_system) THEN
    NEW.last_risk_review_date := CURRENT_DATE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_risk_review ON api_connectors;
CREATE TRIGGER trg_update_risk_review
  BEFORE UPDATE ON api_connectors
  FOR EACH ROW
  EXECUTE FUNCTION update_risk_review_timestamp();

-- Insert example AI risk levels (optional - for testing)
-- UPDATE api_connectors SET 
--   is_ai_system = true,
--   ai_risk_level = 'medium',
--   nist_categories = ARRAY['GOVERN-1.1', 'MAP-1.1'],
--   ai_use_case = 'Sentiment analysis for customer feedback'
-- WHERE name = 'Example AI API';
