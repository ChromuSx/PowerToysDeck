const fs = require('fs');
const path = require('path');

const testDir = path.join(__dirname, '..', 'test');
const tests = fs.readdirSync(testDir)
  .filter((file) => file.endsWith('.test.js'))
  .sort();

let failed = 0;

for (const test of tests) {
  const testPath = path.join(testDir, test);
  try {
    require(testPath);
    console.log(`PASS ${test}`);
  } catch (error) {
    failed++;
    console.error(`FAIL ${test}`);
    console.error(error);
  }
}

if (failed > 0) {
  process.exit(1);
}

console.log(`All ${tests.length} test file(s) passed.`);
