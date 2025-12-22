ALTER TABLE contractors 
ADD COLUMN IF NOT EXISTS price_offer_settings JSONB DEFAULT '{"defaultValidityPeriod": 30}';
