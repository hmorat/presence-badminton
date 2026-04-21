import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://wjzrdrtumjnfqwnoyehe.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqenJkcnR1bWpuZnF3bm95ZWhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwODkxNDcsImV4cCI6MjA5MTY2NTE0N30.jSxk8aPftNh5Sx7xcjxaspZuH1yZU0PkXEymDxHTDwM"
);

export default supabase;