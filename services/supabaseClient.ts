
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pwsarhttuhdlwjsfigcx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3c2FyaHR0dWhkbHdqc2ZpZ2N4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY1NDE5NTQsImV4cCI6MjA4MjExNzk1NH0.3MZZ2V9CrAo1f3h6Nq3bUIN8V8Av085-w12RO8ZDY88';

export const supabase = createClient(supabaseUrl, supabaseKey);
