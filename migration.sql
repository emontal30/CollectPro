-- Migration script to fix archive_data table column name
-- Run this in Supabase SQL Editor

-- First, check if 'date' column exists and 'archive_date' doesn't
DO $$
BEGIN
    -- If there's a 'date' column, rename it to 'archive_date'
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'archive_data'
        AND column_name = 'date'
        AND table_schema = 'public'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'archive_data'
        AND column_name = 'archive_date'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.archive_data RENAME COLUMN "date" TO archive_date;
        RAISE NOTICE 'Renamed column "date" to "archive_date"';
    END IF;

    -- If both exist, drop the old 'date' column (after backing up data if needed)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'archive_data'
        AND column_name = 'date'
        AND table_schema = 'public'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'archive_data'
        AND column_name = 'archive_date'
        AND table_schema = 'public'
    ) THEN
        -- Copy data from 'date' to 'archive_date' if archive_date is null
        UPDATE public.archive_data
        SET archive_date = "date"
        WHERE archive_date IS NULL AND "date" IS NOT NULL;

        ALTER TABLE public.archive_data DROP COLUMN "date";
        RAISE NOTICE 'Dropped old "date" column after migrating data';
    END IF;

    -- Ensure archive_data.data column is nullable and has a safe default
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'archive_data'
        AND column_name = 'data'
        AND table_schema = 'public'
    ) THEN
        -- Set a default empty JSON object if not already set
        ALTER TABLE public.archive_data
            ALTER COLUMN data DROP NOT NULL,
            ALTER COLUMN data SET DEFAULT '{}'::jsonb;

        RAISE NOTICE 'Updated archive_data.data column to be nullable with default {}';
    END IF;
END $$;