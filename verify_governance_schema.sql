-- Verification queries for AI Governance Schema
-- Run these in Supabase SQL Editor to verify everything is set up correctly

-- 1. Check all tables exist
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name LIKE 'ai_%'
ORDER BY table_name;

-- Expected output: 6 tables
-- ai_compliance_reports, ai_fairness_tests, ai_incidents, 
-- ai_model_versions, ai_monitoring_metrics, ai_risk_assessments

-- 2. Check all indexes exist
SELECT 
  schemaname,
  tablename,
  indexname
FROM pg_indexes
WHERE tablename LIKE 'ai_%'
ORDER BY tablename, indexname;

-- Expected: 15+ indexes

-- 3. Check RLS is enabled
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename LIKE 'ai_%'
ORDER BY tablename;

-- Expected: All should show 't' (true)

-- 4. Check foreign key relationships
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name LIKE 'ai_%'
ORDER BY tc.table_name, kcu.column_name;

-- Expected: All references should point to tenants, api_connectors, profiles

-- 5. Verify table comments
SELECT 
  c.table_name,
  pgd.description
FROM pg_catalog.pg_statio_all_tables c
LEFT JOIN pg_catalog.pg_description pgd 
  ON pgd.objoid = c.relid
WHERE c.schemaname = 'public'
  AND c.table_name LIKE 'ai_%'
  AND pgd.description IS NOT NULL
ORDER BY c.table_name;

-- Expected: Descriptive comments for each table

-- 6. Test insert permissions (should work with proper tenant_id)
-- Note: This is just to verify the table structure, not actual data
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'ai_monitoring_metrics'
ORDER BY ordinal_position;

-- Expected: Full column list with correct data types
