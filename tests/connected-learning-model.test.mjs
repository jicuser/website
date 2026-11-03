import test from 'node:test';
import assert from 'node:assert/strict';
import {
  admissionPayload,
  admissionStatus,
  learningAreas,
} from '../src/features/learning/model.js';
const id = '10000000-0000-4000-8000-000000000001';
test('admission values use integer pence and require explicit staff review', () => {
  const form = {
    course_id: id,
    student_id: id,
    amount: '20.05',
    note: 'Registration reviewed',
    reviewed: true,
  };
  assert.equal(admissionPayload(form, id).p_amount_minor, 2005);
  assert.equal(admissionPayload({ ...form, amount: '0' }, id).p_amount_minor, 0);
  for (const amount of ['-1', '1e3', '1.001', 'Infinity', ''])
    assert.throws(() => admissionPayload({ ...form, amount }, id));
  assert.throws(() => admissionPayload({ ...form, reviewed: false }, id));
  assert.throws(() => admissionPayload({ ...form, submission_id: 'javascript:alert(1)' }, id));
});
test('unknown payment state never appears ready and already enrolled arrears stay explicit', () => {
  assert.equal(
    admissionStatus({ state: 'approved', amount_minor: 2000, fee_id: id }, null),
    'Payment status unavailable',
  );
  assert.equal(
    admissionStatus(
      { state: 'approved', amount_minor: 2000, fee_id: id },
      { status: 'partial', outstanding_minor: 100 },
    ),
    'Awaiting payment',
  );
  assert.equal(
    admissionStatus(
      { state: 'approved', amount_minor: 2000, fee_id: id },
      { status: 'paid', outstanding_minor: 0 },
    ),
    'Approved · ready to enrol',
  );
  assert.equal(
    admissionStatus({ state: 'approved', amount_minor: 0, fee_id: null }),
    'Approved · ready to enrol',
  );
  assert.equal(
    admissionStatus(
      { state: 'enrolled', amount_minor: 2000, fee_id: id },
      { status: 'partial', outstanding_minor: 100 },
    ),
    'Enrolled · payment needs attention',
  );
});
test('learning-only navigation never activates legacy tasks, talks or owner tools for a label', () => {
  const auth = {
    user: { id },
    profile: { is_active: true, staff_kinds: ['teacher'] },
    isOwner: false,
  };
  assert.deepEqual(learningAreas({}, auth), [
    ['learning', 'My learning'],
    ['fees', 'Fees & receipts'],
  ]);
  assert.ok(learningAreas({}, { ...auth, isOwner: true }).some(([key]) => key === 'admissions'));
  assert.ok(
    learningAreas({}, { ...auth, isOwner: true }).every(
      ([key]) => !['tasks', 'talks', 'forms'].includes(key),
    ),
  );
});
