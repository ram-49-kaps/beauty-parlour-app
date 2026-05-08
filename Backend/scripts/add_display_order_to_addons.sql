-- ==========================================
-- Migration: Add Display Order to Add-Ons
-- ==========================================

-- Add display_order column to add_ons table
ALTER TABLE add_ons
ADD COLUMN display_order INT DEFAULT 0 AFTER is_active;

-- Set initial display_order based on creation order
SET @row_number = 0;

UPDATE add_ons
SET
    display_order = (
        @row_number := @row_number + 1
    )
ORDER BY created_at ASC;

-- Create index for faster sorting
ALTER TABLE add_ons ADD INDEX idx_display_order (display_order);

-- ==========================================