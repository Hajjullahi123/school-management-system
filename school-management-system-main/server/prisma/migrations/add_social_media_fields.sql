-- Add social media fields to SchoolSettings table
-- Migration: add_social_media_links
-- Date: 2025-12-20

-- Add Facebook URL column
ALTER TABLE "SchoolSettings" 
ADD COLUMN IF NOT EXISTS "facebookUrl" TEXT;

-- Add Instagram URL column
ALTER TABLE "SchoolSettings" 
ADD COLUMN IF NOT EXISTS "instagramUrl" TEXT;

-- Add WhatsApp number column
ALTER TABLE "SchoolSettings" 
ADD COLUMN IF NOT EXISTS "whatsappUrl" TEXT;
