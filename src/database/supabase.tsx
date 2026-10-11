import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  'https://qtpgoxmnugdumuiinbmu.supabase.co';

const supabasePublishableKey =
  'sb_publishable_ZkZJV9Ir0hMVF8CNzSGBcw_OuyWsB3k';

export const supabase = createClient(
  supabaseUrl,
  supabasePublishableKey
);