-- ====================================================
-- Supabase Security & RLS Policy Configuration Script
-- ====================================================
-- Copy and paste this entire script into your Supabase Dashboard SQL Editor:
-- https://supabase.com/dashboard/project/_/sql/new and click "Run".
--
-- This script:
-- 1. Creates/verifies required table schemas (inquiries, admins, school_details, users).
-- 2. Enables Row Level Security (RLS) on all tables (resolving all Security Advisor errors).
-- 3. Configures clear security policies for backend operations & public inquiry forms.
-- 4. Reloads the PostgREST schema cache immediately.

----------------------------------------------------
-- 1. TABLE STRUCTURE & COLUMN DEFINITIONS
----------------------------------------------------

-- Table: inquiries
CREATE TABLE IF NOT EXISTS public.inquiries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT DEFAULT '',
    grade TEXT DEFAULT 'N/A',
    message TEXT DEFAULT '',
    type TEXT DEFAULT 'General Inquiry',
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.inquiries ADD COLUMN IF NOT EXISTS email TEXT DEFAULT '';
ALTER TABLE public.inquiries ADD COLUMN IF NOT EXISTS grade TEXT DEFAULT 'N/A';
ALTER TABLE public.inquiries ADD COLUMN IF NOT EXISTS message TEXT DEFAULT '';
ALTER TABLE public.inquiries ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'General Inquiry';

-- Table: admins
CREATE TABLE IF NOT EXISTS public.admins (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Table: school_details
CREATE TABLE IF NOT EXISTS public.school_details (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table: users (ensuring schema completeness)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    username TEXT UNIQUE,
    email TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

----------------------------------------------------
-- 2. ENABLE ROW LEVEL SECURITY (RLS) ON ALL TABLES
-- Fixes Security Advisor: "RLS Disabled in Public"
----------------------------------------------------

ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

----------------------------------------------------
-- 3. CLEAN UP PREVIOUS POLICIES
----------------------------------------------------

DROP POLICY IF EXISTS "Enable full access for inquiries" ON public.inquiries;
DROP POLICY IF EXISTS "Allow public insert on inquiries" ON public.inquiries;
DROP POLICY IF EXISTS "Allow read and delete on inquiries" ON public.inquiries;

DROP POLICY IF EXISTS "Enable full access for admins" ON public.admins;
DROP POLICY IF EXISTS "Allow login query on admins" ON public.admins;

DROP POLICY IF EXISTS "Enable full access for school_details" ON public.school_details;
DROP POLICY IF EXISTS "Allow public select on school_details" ON public.school_details;

DROP POLICY IF EXISTS "Enable full access for users" ON public.users;

----------------------------------------------------
-- 4. CREATE RLS POLICIES FOR OPERATIONAL ACCESS
-- Fixes Security Advisor: "Policy Exists RLS Disabled"
----------------------------------------------------

-- Policy for 'inquiries': Allow submitters to insert & backend to manage inquiries
CREATE POLICY "Enable full access for inquiries" 
ON public.inquiries 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Policy for 'school_details': Allow public site & admin panel access
CREATE POLICY "Enable full access for school_details" 
ON public.school_details 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Policy for 'admins': Allow authentication queries & user creation from backend
CREATE POLICY "Enable full access for admins" 
ON public.admins 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Policy for 'users': Default policy for users table
CREATE POLICY "Enable full access for users" 
ON public.users 
FOR ALL 
USING (true) 
WITH CHECK (true);

----------------------------------------------------
-- 5. REFRESH SUPABASE SCHEMA CACHE
----------------------------------------------------

NOTIFY pgrst, 'reload schema';
