import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useContent } from '@/context/ContentContext';
import ManagedPageContent from '@/components/ManagedPageContent';
import GuidedHelp, { HelpResourceLinks } from '@/components/services/GuidedHelp';
import { GUIDED_HELP } from '@/content/guidedHelp';
import { readGuidedHelp } from '@/lib/guidedHelp';
import '@/styles/services.css';
export default function CommunityHelpPage() {
  const { pathname: routePath } = useLocation(),
    { getContent } = useContent();
  const pathname = routePath.replace(/\/+$/, '') || '/';
  const support = pathname === '/services/support';
  let page = {};
  try {
    page = JSON.parse(getContent(`page:${pathname}`, '{}')) || {};
  } catch {}
  const journey = readGuidedHelp(page.guidedJourney, GUIDED_HELP[pathname]);
  return (
    <div className="service-page community-help-page">
      <Link className="service-text-link" to="/services">
        Community Hub
      </Link>
      <ManagedPageContent
        className="is-unframed"
        fallbackTitle={support ? 'Support & wellbeing' : 'Skills & careers'}
        fallbackBody={
          support
            ? 'Find practical information and trusted places to get help. You do not need to send personal details to use this guide.'
            : 'Choose one task and leave with a useful next step. Browse resources without uploading a CV or filling in a form.'
        }
      />
      {support && (
        <aside className="service-urgent" aria-label="Urgent help">
          <strong>Need urgent help?</strong>
          <p>
            If someone is in immediate danger, call <a href="tel:999">999</a>. For urgent mental
            health help,{' '}
            <a href="https://www.nhs.uk/nhs-services/mental-health-services/where-to-get-urgent-help-for-mental-health/">
              use the NHS urgent-help guidance
            </a>
            . For safety or abuse concerns,{' '}
            <a href="https://www.gov.uk/guidance/domestic-abuse-how-to-get-help">
              go directly to specialist support
            </a>
            .
          </p>
        </aside>
      )}
      <GuidedHelp key={`${pathname}:${JSON.stringify(journey)}`} journey={journey} />
      <details className="service-visit-details" open={journey.enabled === false}>
        <summary>Browse resources directly</summary>
        <HelpResourceLinks
          ids={
            support
              ? ['living', 'health', 'safety', 'funeral', 'nikah']
              : ['cv', 'interview', 'skills', 'careers', 'adult']
          }
        />
      </details>
      <p className="community-help-note">
        {support
          ? 'This is a resource guide. JIC does not currently accept confidential support cases through this page. Do not send sensitive case details to the general enquiries inbox.'
          : 'Use these resources at your own pace. Browse Education and Youth for published activities at JIC.'}
      </p>
    </div>
  );
}
