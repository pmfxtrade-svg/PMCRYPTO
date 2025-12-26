import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rktwvccoxoawcpdwtspu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJrdHd2Y2NveG9hd2NwZHd0c3B1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY3MDg1MTcsImV4cCI6MjA4MjI4NDUxN30.yrVogd9-shoMLBbPPs96dr-w_LuVNlY9Rs-YBMW2D7I';

export const supabase = createClient(supabaseUrl, supabaseKey);