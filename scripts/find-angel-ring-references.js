#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Search for Angel Ring references in the codebase
function findAngelRingReferences() {
    const projectRoot = process.cwd();
    const searchTerms = [
        'Angel Ring',
        'angel ring',
        'ANGEL RING',
        'scalix@contab.com',
        'cmofey73w000087izrdfvtlve',
        'Dirección Angel Ring'
    ];
    
    const extensions = ['.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.html'];
    const excludeDirs = ['.next', 'node_modules', '.git', 'dist', 'build'];
    
    const results = {
        files: [],
        totalMatches: 0,
        searchTermMatches: {}
    };
    
    function searchDirectory(dir) {
        const items = fs.readdirSync(dir);
        
        for (const item of items) {
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory() && !excludeDirs.includes(item)) {
                searchDirectory(fullPath);
            } else if (stat.isFile()) {
                const ext = path.extname(item);
                if (extensions.includes(ext)) {
                    searchFile(fullPath);
                }
            }
        }
    }
    
    function searchFile(filePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const relativePath = path.relative(projectRoot, filePath);
            const fileMatches = [];
            
            searchTerms.forEach(term => {
                const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
                const matches = content.match(regex);
                
                if (matches) {
                    if (!results.searchTermMatches[term]) {
                        results.searchTermMatches[term] = [];
                    }
                    
                    results.searchTermMatches[term].push({
                        file: relativePath,
                        matches: matches.length,
                        lines: getMatchingLines(content, term)
                    });
                    
                    fileMatches.push({
                        term: term,
                        count: matches.length
                    });
                    
                    results.totalMatches += matches.length;
                }
            });
            
            if (fileMatches.length > 0) {
                results.files.push({
                    file: relativePath,
                    matches: fileMatches,
                    totalMatches: fileMatches.reduce((sum, m) => sum + m.count, 0)
                });
            }
        } catch (error) {
            // Skip files that can't be read
        }
    }
    
    function getMatchingLines(content, term) {
        const lines = content.split('\n');
        const matchingLines = [];
        const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        
        lines.forEach((line, index) => {
            if (regex.test(line)) {
                matchingLines.push({
                    lineNumber: index + 1,
                    content: line.trim()
                });
            }
        });
        
        return matchingLines;
    }
    
    // Start search
    console.log('🔍 Searching for Angel Ring references...');
    searchDirectory(projectRoot);
    
    // Generate report
    console.log('\n📊 ANGEL RING REFERENCES REPORT');
    console.log('=====================================');
    console.log(`Total files with references: ${results.files.length}`);
    console.log(`Total matches found: ${results.totalMatches}`);
    
    console.log('\n🎯 Search Term Breakdown:');
    Object.entries(results.searchTermMatches).forEach(([term, matches]) => {
        console.log(`\n"${term}":`);
        console.log(`  Files: ${matches.length}`);
        console.log(`  Total matches: ${matches.reduce((sum, m) => sum + m.matches, 0)}`);
        
        matches.forEach(match => {
            console.log(`    📁 ${match.file} (${match.matches} matches)`);
        });
    });
    
    if (results.files.length > 0) {
        console.log('\n📋 Files with Angel Ring references:');
        results.files.forEach(file => {
            console.log(`\n📁 ${file.file} (${file.totalMatches} matches):`);
            file.matches.forEach(match => {
                console.log(`  "${match.term}": ${match.count} matches`);
            });
        });
        
        // Generate cleanup suggestions
        console.log('\n🧹 CLEANUP SUGGESTIONS:');
        console.log('=====================================');
        console.log('Files that need manual review:');
        
        results.files.forEach(file => {
            console.log(`\n📁 ${file.file}:`);
            file.matches.forEach(match => {
                console.log(`  - Replace "${match.term}" with appropriate value`);
            });
        });
    } else {
        console.log('\n✅ No Angel Ring references found in the codebase!');
    }
    
    // Save detailed report
    const reportPath = path.join(projectRoot, 'angel-ring-references-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
    
    return results;
}

// Run the search
if (require.main === module) {
    findAngelRingReferences();
}

module.exports = findAngelRingReferences;
