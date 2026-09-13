const hasScenes = (settings) =>
  Array.isArray(settings?.scenes) && settings.scenes.length > 0 && settings.scenes.length <= 6;

// Browser drafts may contain unpublished work. Restoring one never publishes it.
export function recoverStreamWorkspace(data, draft) {
  if (hasScenes(draft?.form) && [2, 3].includes(draft.stage)) {
    return {
      form: draft.form,
      stage: draft.stage,
      revision: draft.revision || data.updated_at,
      managedId:
        data.presentation?.id && draft.managedId === data.presentation.id
          ? draft.managedId
          : null,
      baseline: draft.baseline || null,
      savedTemplate: draft.savedTemplate || null,
      streamName: draft.streamName || draft.savedTemplate?.name || draft.form.scenes[0]?.name || '',
      recoveredLive: false,
    };
  }
  if (
    draft?.stage === 2 &&
    !draft.form &&
    typeof draft.streamName === 'string' &&
    draft.streamName.trim()
  ) {
    return {
      form: null,
      stage: 2,
      revision: data.updated_at,
      managedId: null,
      baseline: null,
      savedTemplate: null,
      streamName: draft.streamName,
      recoveredLive: false,
    };
  }
  // The server, not sessionStorage, owns the lifetime of the presentation.
  if (data.presentation?.id && hasScenes(data.settings)) {
    return {
      form: data.settings,
      stage: 3,
      revision: data.updated_at,
      managedId: data.presentation.id,
      baseline: data.settings,
      savedTemplate: null,
      streamName: '',
      recoveredLive: true,
    };
  }
  return null;
}

export function streamEndSnapshot(data, workspace) {
  const ownsDraft = Boolean(data.presentation?.id && workspace.managedId === data.presentation.id);
  return {
    form: ownsDraft && workspace.form ? workspace.form : data.settings,
    template: ownsDraft ? workspace.savedTemplate || null : null,
    name: ownsDraft ? workspace.streamName || '' : '',
    keepDraft: Boolean(!ownsDraft && (workspace.form || workspace.streamName?.trim())),
  };
}
