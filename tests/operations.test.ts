import test from 'node:test';
import assert from 'node:assert/strict';
import {validDate,dateRange,csv,addDays} from '../src/lib/calendar.ts';
test('date filters reject impossible dates and cross month correctly',()=>{assert.equal(validDate('2026-02-30'),false);assert.equal(validDate('2026-99-01'),false);assert.equal(validDate('2028-02-29'),true);assert.equal(addDays('2026-12-31',1),'2027-01-01');assert.equal(dateRange('2026-09-28',true).to,'2026-10-05');});
test('CSV neutralizes spreadsheet formulas and quotes field boundaries',()=>{const s=csv([['=HYPERLINK("x")',' \t+1','hello,world','a"b']]);assert.ok(s.includes("'=HYPERLINK"));assert.ok(s.includes("' \t+1"));assert.ok(s.includes('"hello,world"'));assert.ok(s.includes('"a""b"'));});
