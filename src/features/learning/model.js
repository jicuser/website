import { poundsToMinor } from '../../lib/fees.js';
import { linkedStudents } from '../portal/model.js';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function admissionPayload(form, attempt) {
  if (form.reviewed !== true)
    throw new Error('Check the student, class and consent before approving.');
  if (![form.course_id, form.student_id, attempt].every((value) => uuid.test(value || '')))
    throw new Error('Choose an existing class and student.');
  if (form.submission_id && !uuid.test(form.submission_id))
    throw new Error('Choose a valid form response.');
  const note = String(form.note || '').trim();
  if (note.length < 3 || note.length > 2000)
    throw new Error('Add a short review note (3–2,000 characters).');
  const amount = String(form.amount ?? '').trim();
  return {
    p_course_id: form.course_id,
    p_student_id: form.student_id,
    p_submission_id: form.submission_id || null,
    p_amount_minor: /^0(?:\.0{1,2})?$/.test(amount) ? 0 : poundsToMinor(amount),
    p_note: note,
    p_attempt_id: attempt,
  };
}
export function admissionStatus(admission, fee) {
  if (admission.state === 'withdrawn') return 'Withdrawn · history retained';
  const needsPayment = admission.fee_id != null;
  const paid = fee?.status === 'paid' && fee.outstanding_minor === 0;
  if (admission.state === 'enrolled')
    return needsPayment && !paid ? 'Enrolled · payment needs attention' : 'Enrolled';
  if (needsPayment && !fee) return 'Payment status unavailable';
  if (needsPayment && fee.status === 'void') return 'Fee voided · review required';
  if (needsPayment && !paid) return 'Awaiting payment';
  return admission.amount_minor === 0 || paid
    ? 'Approved · ready to enrol'
    : 'Payment status unavailable';
}
export function learningAreas(data, auth) {
  if (!auth?.user?.id || !auth.profile?.is_active) return [];
  const teacher =
    auth.isOwner ||
    data.learning_staff?.some((row) => row.user_id === auth.user.id) ||
    data.learning_department_heads?.some((row) => row.user_id === auth.user.id);
  return [
    ['learning', teacher ? 'Learning & teaching' : 'My learning'],
    ...(linkedStudents(data, auth.user.id).length ? [['family', 'My family']] : []),
    ['fees', 'Fees & receipts'],
    ...(auth.isOwner
      ? [
          ['manage', 'Manage learning'],
          ['admissions', 'Admissions & places'],
        ]
      : []),
  ];
}
