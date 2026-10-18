import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Award, ShieldCheck } from 'lucide-react';
import { CERTIFICATES_ENABLED, CERTIFICATE_KINDS } from '@/lib/certificates';
import { JourneySteps } from '@/components/services/ServiceJourney';
import ContactForm from '@/components/sections/contact/ContactForm';
import '@/styles/services.css';

const descriptions = {
  nikah: 'A record of your Nikah ceremony.',
  shahadah: 'A record of your Shahadah at the centre.',
  course: 'A record of completion confirmed by your course team.',
  ijazah: 'An authorisation confirmed by the relevant teacher.',
};
export default function CertificatesGuidePage() {
  return (
    <div className="service-page">
      <section className="service-hero">
        <div className="service-hero-copy">
          <p className="service-eyebrow">Your milestones, recorded</p>
          <h1>JIC certificates</h1>
          <p>
            Certificates record a ceremony or completed learning confirmed by JIC. Find your issued
            certificates in your portal, or ask the office about a missing record.
          </p>
          <div className="service-actions">
            <Link to="/account/certificates" className="service-button is-primary">
              My certificates <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <a href="#certificate-types" className="service-text-link">
              Explore certificate types
            </a>
          </div>
        </div>
        <div className="certificate-guide-visual">
          <Award size={52} aria-hidden="true" />
          <p>Jamatia Islamic Centre</p>
          <strong>
            A record to keep.
            <br />A link to verify.
          </strong>
          <span>
            <ShieldCheck size={17} aria-hidden="true" /> Private account · Shareable verification
          </span>
        </div>
      </section>
      <section className="service-section">
        <h2>From request to record</h2>
        <JourneySteps
          steps={[
            [
              'Prepare your details',
              'Have the correct names, type of certificate and event or completion date ready. Include the relevant course or ceremony details.',
            ],
            [
              'Office review',
              'An authorised staff member checks the source record and confirms the wording. A submitted request is not an issued certificate.',
            ],
            [
              'View, keep & verify',
              'When issued online, open the certificate in your account. Print or save it as a PDF, or share its verification link.',
            ],
          ]}
        />
      </section>
      <section id="certificate-types" className="service-section">
        <h2>Which certificate do you need?</h2>
        <p>
          {CERTIFICATES_ENABLED
            ? 'Choose a type to start your request. You will be asked to sign in.'
            : 'Online certificate requests are not open yet. The office can help with these records and existing certificates.'}
        </p>
        <div className="service-directory certificate-type-grid">
          {CERTIFICATE_KINDS.map(([kind, name]) => (
            <Link
              to={
                CERTIFICATES_ENABLED ? `/account/certificates?request=${kind}` : '#certificate-help'
              }
              key={kind}
              onClick={
                !CERTIFICATES_ENABLED
                  ? () =>
                      document
                        .getElementById('certificate-help')
                        ?.scrollIntoView({ behavior: 'smooth' })
                  : undefined
              }
            >
              <Award size={25} aria-hidden="true" />
              <h3>{name}</h3>
              <p>{descriptions[kind]}</p>
              <span>
                {CERTIFICATES_ENABLED ? 'Start request' : 'Ask the office'}{' '}
                <ArrowRight size={16} aria-hidden="true" />
              </span>
            </Link>
          ))}
        </div>
      </section>
      <section className="service-detail-grid">
        <div className="service-checklist">
          <h2>What a verification link shows</h2>
          <p>
            The full online certificate is available through your account. The verification link
            shows the reference, type, issuer, issue date and whether the record is valid. It does
            not show your name or the full wording.
          </p>
        </div>
        <div className="service-faq">
          <h2>Before you request</h2>
          <details>
            <summary>What if a name or date needs correcting?</summary>
            <p>
              Contact the office with the certificate reference and the correction needed. Issued
              records are retained; the office can review a replacement.
            </p>
          </details>
          <details>
            <summary>Can I request a certificate for someone else?</summary>
            <p>
              Speak to the office about the person’s record and the access needed. Family access to
              learning records does not automatically give access to their certificates.
            </p>
          </details>
          <details>
            <summary>What if I do not have an account?</summary>
            <p>
              You can <Link to="/account/request">request a JIC account</Link> or ask the office
              below. Access is checked before private records are available.
            </p>
          </details>
        </div>
      </section>
      <section className="service-enquiry" id="certificate-help">
        <div>
          <p className="service-eyebrow">Need a hand?</p>
          <h2>Ask about a certificate</h2>
          <p>
            Tell the office which record you need help with. Include an existing certificate
            reference if you have one.
          </p>
        </div>
        <div className="service-enquiry-form">
          <ContactForm subject="Certificate enquiry" title="Certificate help" />
        </div>
      </section>
    </div>
  );
}
