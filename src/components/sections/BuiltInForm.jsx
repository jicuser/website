import React, { lazy, Suspense } from 'react';

const EmbeddedPublicForm = lazy(() =>
  import('@/pages/PublicFormPage').then((module) => ({ default: module.EmbeddedPublicForm })),
);

export default function BuiltInForm(props) {
  return (
    <Suspense fallback={<p role="status">Loading form…</p>}>
      <EmbeddedPublicForm {...props} />
    </Suspense>
  );
}
