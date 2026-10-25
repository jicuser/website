import React from 'react';
import PageHeading from '@/components/PageHeading';
import ProgrammePosters from '@/components/ProgrammePosters';

export default function ProgrammesPage() {
  return (
    <div className="page-transition">
      <PageHeading title="Programmes" eyebrow="What’s on at JIC">
        Explore classes, gatherings and notices from the centre. Open a poster to read it in full,
        or follow the programme link for details.
      </PageHeading>
      <ProgrammePosters listing />
    </div>
  );
}
