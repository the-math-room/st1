import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { SUPABASE_CONFIG } from '../config.js';

export const supabase = createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.KEY);