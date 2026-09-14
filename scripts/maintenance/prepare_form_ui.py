from pathlib import Path
import shutil
import sys
r=Path(sys.argv[1]).resolve();c=r/'current';o=r/'existing'
paths=['src/components/workspace/CustomFormsBuilder.jsx','src/components/workspace/CustomFormsInbox.jsx','src/pages/PublicFormPage.jsx','src/styles/workspace.css','src/styles/custom-forms.css']
for name in paths:
 (c/name).parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(o/name,c/name)
p=c/paths[0];s=p.read_text()
s=s.replace("import CustomFormsFields", "import { useRegisterAdminSave } from '@/context/AdminSaveContext';\nimport { workflowChanged } from '@/lib/pageContent';\nimport CustomFormsFields")
s=s.replace('({ definition, onClose, onSaved })','({ definition, initialDraft = {}, onClose, onSaved })').replace(': initial(),',': { ...initial(), ...initialDraft },')
s=s.replace("  const [preview, setPreview]", "  const [dirty, setDirty] = useState(Boolean(initialDraft.title));\n  const [preview, setPreview]")
s=s.replace("const patch = (value) => setDraft((current) => ({ ...current, ...value }));", "const patch = (value) => { setDirty(true); setDraft((current) => ({ ...current, ...value })); };\n  const close = () => { if (!dirty || window.confirm('Discard unsaved form changes?')) onClose(); };\n  useEffect(() => {\n    const warn = event => { if (dirty) { event.preventDefault(); event.returnValue = ''; } };\n    window.addEventListener('beforeunload', warn);\n    return () => window.removeEventListener('beforeunload', warn);\n  }, [dirty]);")
s=s.replace("    const invalid = validateDraft(draft);", "    if (busy || loading || loadFailed) throw new Error('Wait for the form and assignments to finish loading.');\n    const invalid = validateDraft(draft);")
s=s.replace("setMessage(invalid);\n      return;", "setMessage(invalid);\n      throw new Error(invalid);")
s=s.replace("setMessage('Choose at least one responsible person before publishing.');\n      return;", "setMessage('Choose at least one responsible person before publishing.');\n      throw new Error('Choose at least one responsible person before publishing.');")
s=s.replace("...(draft.id ? { id: draft.id } : {}),", "...(draft.id ? { id: draft.id, expected_updated_at: draft.updated_at } : {}),")
s=s.replace("      patch({ id });", "      setDraft(current => ({ ...current, id }));\n      const stored = await checked(supabase.from('custom_forms').select('*').eq('id', id).single());\n      setDraft(current => ({ ...current, ...stored }));\n      setDirty(false);")
s=s.replace("supabase.rpc('publish_custom_form', { p_form_id: id })", "supabase.rpc('publish_custom_form', { p_form_id: id, p_expected_updated_at: stored.updated_at })")
s=s.replace("      await onSaved();", "      const saved = await checked(supabase.from('custom_forms').select('*').eq('id', id).single());\n      setDraft(current => ({ ...current, ...saved }));\n      setDirty(false);\n      workflowChanged();\n      await onSaved(saved);")
s=s.replace("      setMessage(error.message || 'The form could not be saved. Please try again.');", "      setMessage(error.message || 'The form could not be saved. Please try again.');\n      throw error;")
s=s.replace('  return (\n    <section', "  useRegisterAdminSave(() => save(false), dirty && !busy && !loading, 'Save form draft');\n  return (\n    <section",1)
s=s.replace('onClick={onClose}','onClick={close}').replace('onClick={() => save(false)}','onClick={() => save(false).catch(() => {})}').replace('onClick={() => save(true)}','onClick={() => save(true).catch(() => {})}')
s=s.replace('value={draft.slug}\n              maxLength', 'value={draft.slug}\n              readOnly={Boolean(draft.published_version)}\n              maxLength')
s=s.replace('Watchers receive an alert.', 'Following staff can view new responses in admin.')
p.write_text(s)
p=c/paths[1];s=p.read_text().replace("import FeeLedger from './FeeLedger';\n",'').replace("import CustomFormsEmail from './CustomFormsEmail';\n",'')
s=s.replace("import { checked, dateLabel, Field } from './shared';", "import { checked, dateLabel, Field } from './shared';\nimport { workflowChanged } from '@/lib/pageContent';")
s=s.replace('({ auth, definitions, assignments, initialMine = false })','({ auth, definitions, assignments, initialMine = false, formId = null })')
s=s.replace("    form: '',", "    form: formId ? `form:${formId}` : '',")
s=s.replace('value={filters.form || filters.kind}', 'disabled={Boolean(formId)}\n            value={filters.form || filters.kind}')
s=s.replace('key={`${row.id}-${revision}`}','key={row.id}')
s=s.replace('''      {loading ? (
        <p role="status">Loading responses…</p>''','''      {loading && !result.rows.length ? (
        <p role="status">Loading responses…</p>''')
s=s.replace('const [internal, setInternal] = useState(false);','const [internal] = useState(true);')
s=s.replace('        {open && <FeeLedger key={row.id} formId={row.id} canManage={canWork} />}\n','')
a=s.index('            {open && canWork && (\n              <CustomFormsEmail');b=s.index('            {canWork && !row.submitter_id',a);s=s[:a]+s[b:]
a=s.index('                {canWork && (\n                  <label>\n                    <input\n                      type="checkbox"\n                      checked={internal}');b=s.index('                <button disabled={!reply.trim()}>',a);s=s[:a]+s[b:]
s=s.replace("<Field label={internal ? 'Internal note' : 'Reply in the portal'}>", '<Field label="Internal note">')
s=s.replace('<h3>Replies and notes</h3>','<h3>Staff notes</h3>').replace('portal messages are retained for your team.','internal notes stay with your authorised team.')
s=s.replace("if (!open || row.kind !== 'custom') return undefined;", "if (!open) return undefined;\n    if (row.kind !== 'custom') {\n      let active = true;\n      checked(supabase.rpc('task_assignees', { p_form_id: row.id })).then(data => active && setPeople(data || [])).catch(() => active && setMessage('Assigned people could not be loaded.'));\n      return () => { active = false; };\n    }")
s=s.replace("            {row.kind === 'custom' ? (", "            {(")
a=s.index('''            ) : (
              <Link className="workspace-button" to={`/portal?form=''');b=s.index('            {email && (',a);s=s[:a]+'''            )}
'''+s[b:]
s=s.replace("supabase.rpc('assign_custom_form_task', {\n                    p_submission_id: row.id,", "supabase.rpc(row.kind === 'custom' ? 'assign_custom_form_task' : 'create_work_task', {\n                    ...(row.kind === 'custom' ? { p_submission_id: row.id } : { p_form_id: row.id }),")
s=s.replace('                  onChanged();','                  workflowChanged();\n                  onChanged();').replace("                setMessage('Action assigned.');", "                workflowChanged();\n                setMessage('Action assigned.');")
s=s.replace('  async function exportCsv()', "  useEffect(() => {\n    const refresh = () => setRevision(value => value + 1);\n    window.addEventListener('content-workflow-updated', refresh);\n    return () => window.removeEventListener('content-workflow-updated', refresh);\n  }, []);\n\n  async function exportCsv()")
p.write_text(s)
p=c/paths[2];s=p.read_text();a=s.index("  if (import.meta.env.VITE_ENABLE_WORKSPACE");b=s.index('  if (auth.loading',a);s=s[:a]+s[b:]
s=s.replace('to="/portal?tab=forms&mine=true"','to="/contact"').replace('View your response and replies','Contact the centre about your response')
a=s.index('            {!auth.user && (');b=s.index('            <fieldset disabled={busy}>',a);s=s[:a]+'''            <p className="workspace-meta">Submitting this form does not confirm a place. The centre will review your details.</p>
'''+s[b:]
p.write_text(s)
p=c/paths[3];s=p.read_text().replace('color: #0c1930;\n  background: #fff;', 'color: var(--jic-text, #0c1930);\n  background: var(--jic-surface, #fff);');p.write_text(s)

import hashlib
expected={'src/components/workspace/CustomFormsBuilder.jsx': '6babc361d80de92807dcfabd73da6cb4205829dce46ebda64a660738f485b68d', 'src/components/workspace/CustomFormsInbox.jsx': '58378ca8f4d2b93326fdcd0a5a531805764ca2e4ddc81914078ea79432881adb', 'src/pages/PublicFormPage.jsx': '45c6f69194cd42e38630c7ef43c85d3a353ac1912ad171bbecad6d91323a9e85', 'src/styles/workspace.css': '696f844a9654962d90e5da1c0d06952bf09c90a1df9f4c7924951fbb431768e2', 'src/styles/custom-forms.css': 'b2fdea1978e78c3d2bc0245111c9da63c332f64db67d45543bb84f1be7460185'}
for name,digest in expected.items():
 assert hashlib.sha256((c/name).read_bytes()).hexdigest()==digest, name
print("Prepared and hash-checked", len(expected), "website form files")
