import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eczfppxlflhqbvcxheeh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjemZwcHhsZmxocWJ2Y3hoZWVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MjMzMjgsImV4cCI6MjA4OTk5OTMyOH0.ZmQXaoBxVkzfH94EECreNVmfD-P2SgCbfz0OgYX1aoY';

async function checkSchema() {
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        'apikey': supabaseKey,
        'Accept': 'application/openapi+json'
      }
    });
    const spec = await res.json();
    
    console.log("=== paper_authors columns ===");
    const authorProperties = spec.definitions?.paper_authors?.properties;
    if (authorProperties) {
      console.log(Object.keys(authorProperties));
      console.log("Details:", JSON.stringify(authorProperties, null, 2));
    } else {
      console.log("No definitions for paper_authors found in OpenAPI spec");
    }

    console.log("=== papers columns ===");
    const paperProperties = spec.definitions?.papers?.properties;
    if (paperProperties) {
      console.log(Object.keys(paperProperties));
    }
  } catch (err) {
    console.error("Error fetching OpenAPI schema:", err);
  }
}

checkSchema();
