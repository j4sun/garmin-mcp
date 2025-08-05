#!/usr/bin/env node

// Test date formatting to understand the issue
const testDate = new Date('2025-07-10');
console.log('Input date:', testDate);
console.log('ISO string:', testDate.toISOString());
console.log('Split on T:', testDate.toISOString().split('T')[0]);

// Test timezone offset calculation (like in DateUtils)
const offset = testDate.getTimezoneOffset();
const offsetDate = new Date(testDate.getTime() - offset * 60 * 1000);
const dateString = offsetDate.toISOString().split('T')[0];
console.log('Offset:', offset);
console.log('Offset date:', offsetDate);
console.log('Final date string:', dateString);

// Test with current date
const now = new Date();
console.log('\nCurrent date tests:');
console.log('Now:', now);
console.log('Now ISO:', now.toISOString().split('T')[0]);

// Test date from several days ago
const pastDate = new Date();
pastDate.setDate(pastDate.getDate() - 5);
console.log('\n5 days ago tests:');
console.log('Past date:', pastDate);
console.log('Past ISO:', pastDate.toISOString().split('T')[0]);
