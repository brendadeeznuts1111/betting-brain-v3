/**
 * Fix test import paths after reorganization
 */

import { readdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';

async function fixTestImports() {
  const testDirs = ['tests/unit', 'tests/integration'];
  
  for (const testDir of testDirs) {
    const files = await readdir(testDir);
    
    for (const file of files) {
      if (file.endsWith('.test.ts')) {
        const filePath = join(testDir, file);
        let content = await readFile(filePath, 'utf-8');
        
        // Fix import paths - handle all relative path depths
        content = content.replace(/from '\.\.\/src\//g, "from '../../src/");
        content = content.replace(/from '\.\.\/\.\.\/src\//g, "from '../../src/");
        content = content.replace(/from '\.\.\/\.\.\/\.\.\/src\//g, "from '../../src/");
        content = content.replace(/from '\.\.\/\.\.\/\.\.\/\.\.\/src\//g, "from '../../src/");
        content = content.replace(/from '\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/src\//g, "from '../../src/");
        
        // Also fix import statements without 'from'
        content = content.replace(/import '\.\.\/src\//g, "import '../../src/");
        content = content.replace(/import '\.\.\/\.\.\/src\//g, "import '../../src/");
        content = content.replace(/import '\.\.\/\.\.\/\.\.\/src\//g, "import '../../src/");
        content = content.replace(/import '\.\.\/\.\.\/\.\.\/\.\.\/src\//g, "import '../../src/");
        content = content.replace(/import '\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/src\//g, "import '../../src/");
        
        // Fix dynamic imports
        content = content.replace(/import\('\.\.\/src\//g, "import('../../src/");
        content = content.replace(/import\('\.\.\/\.\.\/src\//g, "import('../../src/");
        content = content.replace(/import\('\.\.\/\.\.\/\.\.\/src\//g, "import('../../src/");
        content = content.replace(/import\('\.\.\/\.\.\/\.\.\/\.\.\/src\//g, "import('../../src/");
        content = content.replace(/import\('\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/src\//g, "import('../../src/");
        
        await writeFile(filePath, content);
        console.log(`Fixed imports in ${filePath}`);
      }
    }
  }
}

fixTestImports().catch(console.error);
