import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eczfppxlflhqbvcxheeh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjemZwcHhsZmxocWJ2Y3hoZWVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MjMzMjgsImV4cCI6MjA4OTk5OTMyOH0.ZmQXaoBxVkzfH94EECreNVmfD-P2SgCbfz0OgYX1aoY';

async function checkSchema() {
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        'apikey': supabaseKey
      }
    });
    const spec = await res.json();
    console.log("Keys in spec:", Object.keys(spec));
    if (spec.definitions) {
      console.log("Definitions keys:", Object.keys(spec.definitions));
    } else {
      console.log("No definitions found in response. Sample spec:", JSON.stringify(spec).slice(0, 1000));
    }
  } catch (err) {
    console.error("Error fetching schema:", err);
  }
}

checkSchema();
