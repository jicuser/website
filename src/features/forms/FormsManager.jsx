import React, { useCallback, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FileText, Plus, ClipboardList } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { useAdminSave } from '@/context/AdminSaveContext';
import useAdminRecords from '@/hooks/useAdminRecords';
import { checked } from '@/components/workspace/shared';
import CustomFormsBuilder from '@/components/workspace/CustomFormsBuilder';
import CustomFormsInbox from '@/components/workspace/CustomFormsInbox';
import FormActions from './FormActions';
import { formStatus, workflowChanged, pageUrl } from '@/lib/pageContent';
import '@/styles/workspace.css';
import '@/styles/custom-forms.css';
import '@/styles/content-workflow.css';

function useFormSummaries() {
  const {user} = useAuth();
  const read = useCallback(signal => checked(supabase.rpc('admin_forms_overview').abortSignal(signal)), [user?.id]);
  return useAdminRecords(read);
}
export function FormWorkspace({formId, initialTab = 'overview', onClose}) {
  const auth = useAuth();
  const {data:forms,loading,error,reload} = useFormSummaries();
  const form = forms?.find(item => item.id === formId);
  const [tab,setTab] = useState(initialTab);
  const [editor,setEditor] = useState(null);
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState('');
  async function act(work) {
    if(busy)return;setBusy(true);setMessage('');
    try{await work();}catch(failure){setMessage(failure.message || 'Could not complete this change.');}finally{setBusy(false);}
  }
  if(editor)return <CustomFormsBuilder definition={editor} onClose={() => setEditor(null)} onSaved={() => {setEditor(null);reload();}} />;
  if(!form)return <section><p role={error?'alert':'status'}>{error || (loading?'Loading form…':'This form is not available to your account.')}</p><button className="admin-button" onClick={reload}>Retry form</button>{onClose && <button className="admin-button" onClick={onClose}>Back to forms</button>}</section>;
  const assignments = form.people.map(person => ({...person,form_id:form.id}));
  return <section className="community-workspace custom-forms-admin" aria-label={`${form.title} management`}>
    <div className="admin-heading"><div><h3>{form.title}</h3><span className="content-status">{formStatus(form)}</span></div>{onClose && <button className="admin-button" onClick={onClose}>All forms</button>}</div>
    <nav className="admin-actions" aria-label="Form management"><button className="admin-button" aria-pressed={tab==='overview'} onClick={() => setTab('overview')}>Information & people</button><button className="admin-button" aria-pressed={tab==='responses'} onClick={() => setTab('responses')}>Responses ({form.new_count + form.done_count})</button><button className="admin-button" aria-pressed={tab==='actions'} onClick={() => setTab('actions')}>Actions ({form.open_actions})</button></nav>
    {message && <p role="status">{message}</p>}
    {tab==='overview' && <>
      <p>{form.description}</p>
      <div className="content-summary-grid"><div><strong>{form.new_count}</strong><span>Awaiting response</span></div><div><strong>{form.done_count}</strong><span>Completed responses</span></div><div><strong>{form.open_actions}</strong><span>Outstanding actions you can access</span></div></div>
      <h4>Responsible people & access</h4>
      {form.people.length ? <dl className="content-people">{form.people.map(person => <div key={`${person.user_id}-${person.role}`}><dt>{{responsible:'Responsible',manager:'Form editor',watcher:'Following'}[person.role]}</dt><dd>{person.display_name || 'Staff member'}{!person.active && ' · Access disabled'}</dd></div>)}</dl>:<p>Choose a responsible person before publishing.</p>}
      <h4>Where this form is used</h4>
      {form.pages?.length ? form.pages.map(page => <p key={page.id}>{page.published ? <Link to={pageUrl(page)} target="_blank" rel="noreferrer">{page.title}</Link> : page.title} · {page.placement} · {page.published?'Page live':'Page hidden'}</p>):<p>Standalone form. Link it from a poster or content page when needed.</p>}
      <p>Assignments apply to future responses. Reassign existing unfinished actions in Actions when responsibility changes.</p>
      <div className="admin-actions">
        {form.can_manage && <button className="admin-button primary" disabled={busy} onClick={() => act(async () => setEditor(await checked(supabase.from('custom_forms').select('*').eq('id',form.id).single())))}>Edit form & assignments</button>}
        {form.published_version && <><Link className="admin-button" to={`/forms/${form.slug}`} target="_blank" rel="noreferrer">View form</Link><button className="admin-button" disabled={busy} onClick={() => act(async () => {const url=new URL(`/forms/${form.slug}`,location.origin).href;try{await navigator.clipboard.writeText(url);setMessage('Form link copied.');}catch{setMessage(`Copy this form address: ${url}`);}})}>Copy link</button>
          {form.can_manage && <button className="admin-button" disabled={busy} onClick={() => act(async () => {if(form.enabled && !window.confirm('Close this form to new responses? Existing responses and actions are kept.'))return;await checked(supabase.rpc('set_custom_form_open',{p_form_id:form.id,p_enabled:!form.enabled}));workflowChanged();})}>{form.enabled?'Close registrations':'Reopen registrations'}</button>}
        </>}
      </div>
    </>}
    {tab==='responses' && <CustomFormsInbox key={form.id} auth={auth} definitions={[form]} assignments={assignments} formId={form.id} />}
    {tab==='actions' && <FormActions key={form.id} formId={form.id} />}
  </section>;
}
function FormCatalogue({view,onChoose,onCreate}) {
  const auth=useAuth();const {data,loading,error,reload}=useFormSummaries();const forms=data || [];
  const [status,setStatus]=useState('all');
  const listed=forms.filter(form => status==='all' || formStatus(form)===status);
  return <section className="community-workspace custom-forms-admin">
    <div className="admin-heading"><div><h2>Forms</h2><p>Manage live forms, where they are used and who handles each response.</p></div><button className="admin-button" disabled={loading} onClick={reload}>Refresh forms</button></div>
    <div className="admin-task-grid forms-entry-tiles"><button onClick={() => onChoose({})}><FileText /><strong>Current forms</strong><span>Live, draft and closed forms.</span></button>{(auth.isOwner || auth.can('forms_manage')) && <button onClick={onCreate}><Plus /><strong>Create form</strong><span>Questions, responsible people and publishing.</span></button>}<button onClick={() => onChoose({view:'responses'})}><ClipboardList /><strong>Responses & actions</strong><span>Submitted information and outstanding work.</span></button></div>
    {error && <p role="alert">{error}</p>}
    {view==='forms' ? <>
      <label>Show forms<select value={status} onChange={event=>setStatus(event.target.value)}><option value="all">All current forms</option><option>Live</option><option>Draft</option><option>Closed</option></select></label>
      {loading && !data && <p role="status">Loading forms…</p>}
      <div className="content-form-grid">{listed.map(form => <button className="admin-panel content-form-card" key={form.id} onClick={() => onChoose({form:form.id})}><span className="content-status">{formStatus(form)}</span><strong>{form.title}</strong><span>{form.new_count} awaiting response · {form.open_actions} outstanding actions</span><span>Responsible: {form.people.filter(person=>person.role==='responsible').map(person=>person.display_name || 'Staff member').join(', ') || 'Not assigned'}</span><span>{form.pages?.length?`${form.pages.length} linked page${form.pages.length===1?'':'s'}`:'Standalone form'}</span></button>)}</div>
      {!loading && !listed.length && !error && <p>No forms match this view. Existing contact, Madrasah and I’tikaf submissions remain in Responses & actions.</p>}
    </> : <>
      <div className="admin-actions"><button className="admin-button" aria-pressed={view==='responses'} onClick={() => onChoose({view:'responses'})}>Responses</button><button className="admin-button" aria-pressed={view==='actions'} onClick={() => onChoose({view:'actions'})}>Actions</button></div>
      {view==='actions'?<FormActions />:<CustomFormsInbox auth={auth} definitions={forms} assignments={forms.flatMap(form=>form.people.map(person=>({...person,form_id:form.id})))} />}
    </>}
  </section>;
}
export default function FormsManager() {
  const {dirty}=useAdminSave();const [params,setParams]=useSearchParams();const [creating,setCreating]=useState(false);
  const select=params.get('form');const view=params.get('view') || 'forms';
  const choose=changes=>{if(dirty && !window.confirm('Discard unsaved form changes?'))return;setCreating(false);setParams({section:'forms',...changes});};
  if(creating)return <CustomFormsBuilder onClose={()=>setCreating(false)} onSaved={saved=>{setCreating(false);setParams({section:'forms',form:saved.id});}} />;
  if(select)return <FormWorkspace key={`${select}:${params.get('tab') || 'overview'}`} formId={select} initialTab={params.get('tab') || 'overview'} onClose={()=>choose({})} />;
  return <FormCatalogue view={view} onChoose={choose} onCreate={()=>setCreating(true)} />;
}
