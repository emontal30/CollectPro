-- ====================================================================
-- COLLECTPRO DATABASE - FILE 5: CLIENT ROUTES (ITINERARY)
-- Stores route/itinerary data persistently for users.
-- ====================================================================

-- 1. Create the table
CREATE TABLE IF NOT EXISTS public.client_routes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    shop_code TEXT NOT NULL,
    shop_name TEXT,
    latitude FLOAT,
    longitude FLOAT,
    location_updated_at TIMESTAMP WITH TIME ZONE,
    current_balance NUMERIC DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    is_ignored BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique shop code per user to prevent duplicates
    CONSTRAINT unique_shop_code_per_user UNIQUE(user_id, shop_code)
);

-- 2. Create Indexes for performance
CREATE INDEX IF NOT EXISTS idx_client_routes_user_id ON public.client_routes(user_id);
CREATE INDEX IF NOT EXISTS idx_client_routes_shop_code ON public.client_routes(shop_code);

-- 3. Enable RLS
ALTER TABLE public.client_routes ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies

-- Policy: Users can view their own routes
-- Policy: Users can view their own routes
DROP POLICY IF EXISTS "Users can view their own routes" ON public.client_routes;
CREATE POLICY "Users can view their own routes" 
ON public.client_routes FOR SELECT 
USING (auth.uid() = user_id);

-- Policy: Users can insert their own routes
DROP POLICY IF EXISTS "Users can insert their own routes" ON public.client_routes;
CREATE POLICY "Users can insert their own routes" 
ON public.client_routes FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own routes
DROP POLICY IF EXISTS "Users can update their own routes" ON public.client_routes;
CREATE POLICY "Users can update their own routes" 
ON public.client_routes FOR UPDATE 
USING (auth.uid() = user_id);

-- Policy: Users can delete their own routes
DROP POLICY IF EXISTS "Users can delete their own routes" ON public.client_routes;
CREATE POLICY "Users can delete their own routes" 
ON public.client_routes FOR DELETE 
USING (auth.uid() = user_id);

-- Policy: Admins can view ALL routes (for the Location Export feature)
DROP POLICY IF EXISTS "Admins can view all routes" ON public.client_routes;
CREATE POLICY "Admins can view all routes" 
ON public.client_routes FOR SELECT 
USING (public.is_admin());

-- 5. Trigger for updated_at
DROP TRIGGER IF EXISTS update_client_routes_modtime ON public.client_routes;
CREATE TRIGGER update_client_routes_modtime 
BEFORE UPDATE ON public.client_routes 
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
