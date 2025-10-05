// supabase-client.js

const supabaseUrl = 'https://altnvsolaqphpndyztup.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsdG52c29sYXFwaHBuZHl6dHVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwNjI2ODUsImV4cCI6MjA3MzYzODY4NX0.LOvdanWvNL1DaScTDTyXSAbi_4KX_jnJFB1WEdtb-GI';

/**
 * --------------------------------------------------------------------------------
 * More robust way to initialize the Supabase client.
 * 
 * 1. The Supabase CDN script creates a global `supabase` object.
 * 2. We extract the `createClient` function from that global object.
 * 3. We then call `createClient` to initialize our connection.
 * 4. Finally, we overwrite the global `supabase` variable with our new, initialized client instance.
 * 
 * This avoids potential race conditions or reference errors during initialization.
 * --------------------------------------------------------------------------------
 */
const { createClient } = supabase;
window.supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true
  }
});
