import React, { useMemo, useState } from 'react';
import { Heart, Loader2, Phone, ShieldCheck, User } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { submitWebsiteForm } from '@/lib/submitWebsiteForm';

const inputClass =
  'flex w-full min-h-9 rounded-md border border-input bg-background px-2.5 py-1.5 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1';

const labelClass = 'mb-0.5 block text-sm font-medium text-foreground';

const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

function SectionCard({ iconWrapClassName, icon: Icon, title, children }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-sm sm:p-3.5">
      <div className="mb-2 flex items-center gap-2">
        <div
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-primary-foreground',
            iconWrapClassName,
          )}
        >
          <Icon className="h-4 w-4" aria-hidden />
        </div>
        <h3 className="text-base font-semibold text-card-foreground">{title}</h3>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

const initialState = {
  attendee_name: '',
  attendee_age: '',
  attendee_address: '',
  attendee_phone: '',
  attendee_email: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
  emergency_contact_relationship: '',
  medical_conditions: '',
  allergies: '',
  medications: '',
  parent_name: '',
  parent_phone: '',
  parent_email: '',
  parent_consent_signature: '',
  parent_consent_date: '',
};

export default function ItikaafRegistrationForm() {
  const { toast } = useToast();
  const [form, setForm] = useState(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const attendeeAgeNum = useMemo(() => {
    const n = form.attendee_age.trim() ? Number(form.attendee_age) : NaN;
    return Number.isFinite(n) ? n : NaN;
  }, [form.attendee_age]);

  const needsParentConsent = attendeeAgeNum >= 11 && attendeeAgeNum <= 16;

  const setField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const attendeeName = form.attendee_name.trim();
    const attendeeAddress = form.attendee_address.trim();
    const attendeePhone = form.attendee_phone.trim();
    const attendeeEmail = form.attendee_email.trim();
    const emergencyName = form.emergency_contact_name.trim();
    const emergencyPhone = form.emergency_contact_phone.trim();
    const emergencyRel = form.emergency_contact_relationship.trim();

    if (
      !attendeeName ||
      !Number.isInteger(attendeeAgeNum) || attendeeAgeNum < 1 || attendeeAgeNum > 120 ||
      !attendeeAddress ||
      !attendeePhone ||
      !attendeeEmail
    ) {
      setError('Please fill in all attendee information fields.');
      return;
    }
    if (!emailOk(attendeeEmail)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!emergencyName || !emergencyPhone || !emergencyRel) {
      setError('Please fill in all emergency contact fields.');
      return;
    }

    if (needsParentConsent) {
      const pn = form.parent_name.trim();
      const pp = form.parent_phone.trim();
      const pe = form.parent_email.trim();
      const ps = form.parent_consent_signature.trim();
      const pd = form.parent_consent_date;
      if (!pn || !pp || !pe || !ps || !pd) {
        setError('Please complete all parent/guardian consent fields.');
        return;
      }
      if (!emailOk(pe)) {
        setError('Please enter a valid parent email address.');
        return;
      }
    }

    const payload = {
      attendee_name: attendeeName,
      attendee_age: attendeeAgeNum,
      attendee_address: attendeeAddress,
      attendee_phone: attendeePhone,
      attendee_email: attendeeEmail,
      emergency_contact_name: emergencyName,
      emergency_contact_phone: emergencyPhone,
      emergency_contact_relationship: emergencyRel,
      medical_conditions: form.medical_conditions.trim() || 'None',
      allergies: form.allergies.trim() || 'None',
      medications: form.medications.trim() || 'None',
      parent_name: needsParentConsent ? form.parent_name.trim() : '',
      parent_phone: needsParentConsent ? form.parent_phone.trim() : '',
      parent_email: needsParentConsent ? form.parent_email.trim() : '',
      parent_consent_signature: needsParentConsent ? form.parent_consent_signature.trim() : '',
      parent_consent_date: needsParentConsent ? form.parent_consent_date : '',
    };

    setSubmitting(true);
    try {
      await submitWebsiteForm('itikaaf', payload);
      setForm(initialState);
      toast({
        title: 'Registration successful',
        description: 'Your details were saved. Thank you.',
      });
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      toast({
        title: 'Could not submit',
        description: err.message || 'Please try again or contact the masjid.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto w-full max-w-2xl space-y-3" noValidate>
      <SectionCard iconWrapClassName="bg-primary" icon={User} title="Attendee Information">
        <div>
          <label htmlFor="attendee_name" className={labelClass}>
            Full Name *
          </label>
          <input
            id="attendee_name"
            type="text"
            required
            value={form.attendee_name}
            onChange={(e) => setField('attendee_name', e.target.value)}
            placeholder="Enter full name"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="attendee_age" className={labelClass}>
            Age *
          </label>
          <input
            id="attendee_age"
            type="number"
            required
            min={1}
            max={120}
            value={form.attendee_age}
            onChange={(e) => setField('attendee_age', e.target.value)}
            placeholder="Enter age"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="attendee_address" className={labelClass}>
            Address *
          </label>
          <textarea
            id="attendee_address"
            required
            rows={2}
            value={form.attendee_address}
            onChange={(e) => setField('attendee_address', e.target.value)}
            placeholder="Enter full address"
            className={cn(inputClass, 'min-h-[3.25rem] resize-none')}
          />
        </div>
        <div>
          <label htmlFor="attendee_phone" className={labelClass}>
            Phone Number *
          </label>
          <input
            id="attendee_phone"
            type="tel"
            required
            value={form.attendee_phone}
            onChange={(e) => setField('attendee_phone', e.target.value)}
            placeholder="+44 (0)…"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="attendee_email" className={labelClass}>
            Email *
          </label>
          <input
            id="attendee_email"
            type="email"
            required
            value={form.attendee_email}
            onChange={(e) => setField('attendee_email', e.target.value)}
            placeholder="email@example.com"
            className={inputClass}
          />
        </div>
      </SectionCard>

      <SectionCard
        iconWrapClassName="bg-orange-500 text-white"
        icon={Phone}
        title="Emergency Contact"
      >
        <div>
          <label htmlFor="emergency_contact_name" className={labelClass}>
            Contact Name *
          </label>
          <input
            id="emergency_contact_name"
            type="text"
            required
            value={form.emergency_contact_name}
            onChange={(e) => setField('emergency_contact_name', e.target.value)}
            placeholder="Full name"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="emergency_contact_phone" className={labelClass}>
            Phone Number *
          </label>
          <input
            id="emergency_contact_phone"
            type="tel"
            required
            value={form.emergency_contact_phone}
            onChange={(e) => setField('emergency_contact_phone', e.target.value)}
            placeholder="+44 (0)…"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="emergency_contact_relationship" className={labelClass}>
            Relationship *
          </label>
          <input
            id="emergency_contact_relationship"
            type="text"
            required
            value={form.emergency_contact_relationship}
            onChange={(e) => setField('emergency_contact_relationship', e.target.value)}
            placeholder="e.g. Parent, Sibling, Friend"
            className={inputClass}
          />
        </div>
      </SectionCard>

      <SectionCard
        iconWrapClassName="bg-destructive text-destructive-foreground"
        icon={Heart}
        title="Medical Information"
      >
        <div>
          <label htmlFor="medical_conditions" className={labelClass}>
            Medical Conditions
          </label>
          <textarea
            id="medical_conditions"
            rows={2}
            value={form.medical_conditions}
            onChange={(e) => setField('medical_conditions', e.target.value)}
            placeholder="e.g. Asthma, Diabetes (leave blank if none)"
            className={cn(inputClass, 'min-h-[3.25rem] resize-none')}
          />
        </div>
        <div>
          <label htmlFor="allergies" className={labelClass}>
            Allergies
          </label>
          <textarea
            id="allergies"
            rows={2}
            value={form.allergies}
            onChange={(e) => setField('allergies', e.target.value)}
            placeholder="e.g. Peanuts, Penicillin (leave blank if none)"
            className={cn(inputClass, 'min-h-[3.25rem] resize-none')}
          />
        </div>
        <div>
          <label htmlFor="medications" className={labelClass}>
            Current Medications
          </label>
          <textarea
            id="medications"
            rows={2}
            value={form.medications}
            onChange={(e) => setField('medications', e.target.value)}
            placeholder="e.g. Insulin (leave blank if none)"
            className={cn(inputClass, 'min-h-[3.25rem] resize-none')}
          />
        </div>
      </SectionCard>

      {needsParentConsent ? (
        <SectionCard
          iconWrapClassName="bg-violet-600 text-white"
          icon={ShieldCheck}
          title="Parent/Guardian Consent"
        >
          <p className="text-xs text-muted-foreground">Required for ages 11–16.</p>
          <div>
            <label htmlFor="parent_name" className={labelClass}>
              Parent/Guardian Name *
            </label>
            <input
              id="parent_name"
              type="text"
              required={needsParentConsent}
              value={form.parent_name}
              onChange={(e) => setField('parent_name', e.target.value)}
              placeholder="Full name"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="parent_phone" className={labelClass}>
              Phone Number *
            </label>
            <input
              id="parent_phone"
              type="tel"
              required={needsParentConsent}
              value={form.parent_phone}
              onChange={(e) => setField('parent_phone', e.target.value)}
              placeholder="+44 (0)…"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="parent_email" className={labelClass}>
              Email *
            </label>
            <input
              id="parent_email"
              type="email"
              required={needsParentConsent}
              value={form.parent_email}
              onChange={(e) => setField('parent_email', e.target.value)}
              placeholder="email@example.com"
              className={inputClass}
            />
          </div>
          <div className="rounded-md border border-border bg-muted/40 p-2">
            <p className="mb-2 text-xs text-muted-foreground">
              I give consent for my child to attend Itikaaf and confirm that all information
              provided is accurate.
            </p>
            <div>
              <label htmlFor="parent_consent_signature" className={labelClass}>
                Parent/Guardian Signature *
              </label>
              <input
                id="parent_consent_signature"
                type="text"
                required={needsParentConsent}
                value={form.parent_consent_signature}
                onChange={(e) => setField('parent_consent_signature', e.target.value)}
                placeholder="Type your full name as signature"
                className={inputClass}
              />
            </div>
            <div className="mt-2">
              <label htmlFor="parent_consent_date" className={labelClass}>
                Date *
              </label>
              <input
                id="parent_consent_date"
                type="date"
                required={needsParentConsent}
                value={form.parent_consent_date}
                onChange={(e) => setField('parent_consent_date', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </SectionCard>
      ) : null}

      {error ? (
        <div
          className="rounded-md border border-destructive/50 bg-destructive/10 px-2.5 py-2 text-sm text-destructive"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <Button type="submit" className="h-10 w-full gap-2" disabled={submitting}>
        {submitting ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            Saving…
          </>
        ) : (
          'Register'
        )}
      </Button>
    </form>
  );
}
