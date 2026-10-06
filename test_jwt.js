const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://owseuntgcgvflqpnmwcc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93c2V1bnRnY2d2ZmxxcG5td2NjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTEyNTgzNjksImV4cCI6MjAyNjg1ODM2OX0.uOOh_g30N50j_x1iYfCok7vXFfT87i_FhG-63T2Q8vM'; // I don't have the full anon key, so I will just extract what I can. Wait, I can't test without the full anon key because createClient needs it to make API requests!

// The anon key acts as a bearer token to talk to Supabase Auth.
