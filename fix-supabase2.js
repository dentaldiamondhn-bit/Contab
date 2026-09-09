const fs = require('fs');
const path = require('path');

function findFiles(dir, exts, results = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) findFiles(full, exts, results);
    else if (exts.some(e => entry.name.endsWith(e))) results.push(full);
  }
  return results;
}

const files = findFiles('app/api', ['.ts', '.js']).filter(f => {
  try {
    const c = fs.readFileSync(f, 'utf8');
    return c.includes('getSupabaseServer') && (c.includes('supabase.') || c.includes('await supabase'));
  } catch { return false; }
});

let count = 0;
files.forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  const orig = c;

  // Replace standalone supabase references (end of line with . on next line)
  // Pattern: "supabase\n" where next line starts with whitespace + "." 
  c = c.replace(/supabase\n(\s+)\./g, 'getSupabaseServer()\n$1.');

  // Replace "await supabase\n" patterns
  c = c.replace(/await supabase\n/g, 'await getSupabaseServer()\n');

  // Replace "= supabase\n" patterns  
  c = c.replace(/= supabase\n/g, '= getSupabaseServer()\n');

  // Replace "(supabase\n" patterns
  c = c.replace(/\(supabase\n/g, '(getSupabaseServer()\n');

  // Final catch: any remaining bare "supabase" that's a variable reference (not in string/comment)
  // Only replace if it's the variable name, not part of a word
  c = c.replace(/(?<![a-zA-Z])supabase(?![a-zA-Z])/g, 'getSupabaseServer()');

  if (c !== orig) {
    fs.writeFileSync(f, c);
    count++;
    console.log('Fixed: ' + f);
  }
});

console.log('\nTotal fixed: ' + count + ' files');
