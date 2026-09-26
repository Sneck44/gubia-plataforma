import test from 'node:test';
import assert from 'node:assert/strict';
import { can, isRole } from '../src/lib/access.ts';
import { promoInput, campaignInput } from '../src/lib/promo-validation.ts';

function form(overrides: Record<string,string> = {}) {
  const f = new FormData();
  Object.entries({ name: 'Prevención', code: 'PRUEBA_26', discount_type: 'percentage', discount_value: '10', ...overrides }).forEach(([k,v]) => f.set(k,v));
  return f;
}
test('marketing cannot read clinical records or manage users', () => {
  assert.equal(can('marketing','clinical:read'),false);
  assert.equal(can('marketing','users:manage'),false);
  assert.equal(can('marketing','marketing:write'),true);
});
test('consulta is read-only and unknown roles fail closed', () => {
  for (const permission of ['clinical:write','marketing:write','users:manage','catalog:write'] as const) assert.equal(can('consulta',permission),false);
  assert.equal(can('consulta','clinical:read'),true);
  for (const role of [undefined, null, 'owner', 'SUPERADMIN', '__proto__', {}]) {
    assert.equal(isRole(role),false);
    assert.equal(can(role,'users:manage'),false);
  }
});
test('only superadmin manages users; reception cannot write marketing', () => {
  assert.equal(can('superadmin','users:manage'),true);
  assert.equal(can('administrador','users:manage'),false);
  assert.equal(can('recepcion','marketing:write'),false);
});
test('rejects invalid discount and malformed codes without silently changing them', () => {
  for (const discount_value of ['NaN','Infinity','-1','101','']) assert.throws(()=>promoInput(form({discount_value})));
  for (const code of ['ab','ABC XYZ','ABC<script>','A'.repeat(49)]) assert.throws(()=>promoInput(form({code})));
  assert.equal(promoInput(form({code:'promo-26'})).code,'PROMO-26');
});
test('usage limits must be positive whole integers', () => {
  for (const usage_limit of ['0','-1','1.5','1e3','2147483648','Infinity']) assert.throws(()=>promoInput(form({usage_limit})));
  assert.equal(promoInput(form({usage_limit:'10'})).usage_limit,10);
  assert.equal(promoInput(form()).usage_limit,null);
});
test('campaign dates must exist and close after opening in Mexico central time', () => {
  assert.throws(()=>campaignInput(form({starts_at:'2026-02-30T12:00'})));
  assert.throws(()=>campaignInput(form({starts_at:'2026-09-26T12:00',ends_at:'2026-09-26T11:59'})));
  assert.throws(()=>campaignInput(form({starts_at:'2026-09-26T12:00',ends_at:'2026-09-26T12:00'})));
  assert.equal(campaignInput(form({starts_at:'2026-09-26T12:00'})).starts_at,'2026-09-26T18:00:00.000Z');
});
test('validates names, text limits and optional campaign references', () => {
  assert.throws(()=>promoInput(form({name:' '})));
  assert.throws(()=>promoInput(form({description:'x'.repeat(2001)})));
  assert.throws(()=>promoInput(form({campaign_id:'not-a-uuid'})));
  const f=form();f.set('name',new Blob(['test']),'name.txt');assert.throws(()=>promoInput(f));
});
