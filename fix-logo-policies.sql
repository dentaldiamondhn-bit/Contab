-- Fix existing RLS policies for company_logos table
-- Run this if you get "policy already exists" error

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their tenant logo" ON company_logos;
DROP POLICY IF EXISTS "Users can update their tenant logo" ON company_logos;
DROP POLICY IF EXISTS "Users can insert their tenant logo" ON company_logos;

-- Recreate policies with simplified access
CREATE POLICY "Users can view their tenant logo" ON company_logos
    FOR SELECT USING (true);

CREATE POLICY "Users can update their tenant logo" ON company_logos
    FOR UPDATE USING (true);

CREATE POLICY "Users can insert their tenant logo" ON company_logos
    FOR INSERT WITH CHECK (true);

-- Verify policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'company_logos';
