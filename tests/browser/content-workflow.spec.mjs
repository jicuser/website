import { test, expect } from '@playwright/test';

const id = n => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const owner = {id:id(1),display_name:'Centre owner',is_owner:true,is_active:true,permissions:[],staff_kinds:[]};
const person = {id:id(2),display_name:'Education team',is_owner:false,is_active:true,permissions:[],staff_kinds:[]};
const replacement = {id:id(3),display_name:'Course coordinator',is_owner:false,is_active:true,permissions:[],staff_kinds:[]};

async function fixture(page, {actor=owner, pagePublished=true, pageExists=true} = {}) {
  const state = {
    writes: [], errors: [],
    form: {id:id(10),slug:'course-interest',title:'Course interest',description:'An expression of interest, not an accepted place.',schema:{fields:[{id:'name',type:'text',label:'Your name',required:true}]},published_version:1,enabled:true,task_title:'Contact applicant',due_hours:48,created_by:owner.id,updated_at:'2026-09-14T10:00:00Z'},
    page: pageExists ? {id:id(20),slug:'arabic-course',title:'Arabic course',body:'Learn Arabic at the centre.',image_url:'/posters/seekers-gateway.jpg',schedule:'See course details',placement:'/education/courses',kind:'course',registration:'interest',form_id:id(10),source_poster_id:'seekers-gateway',published:pagePublished,updated_at:'2026-09-14T10:00:00Z'} : null,
    task: {id:id(30),form_id:id(40),custom_form_id:id(10),form_title:'Course interest',title:'Contact applicant',assigned_to:person.id,assignee_name:person.display_name,description:'',status:'open',due_at:null,updated_at:'2026-09-14T10:00:00Z',can_reassign:true},
  };
  page.on('pageerror', error=>state.errors.push(error.message));
  await page.addInitScript(()=>sessionStorage.setItem('jic-salawat-shown','1'));
  await page.route('**/*', route => ['127.0.0.1','localhost'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
  await page.route('**/preview-api/**', async route => {
    const request=route.request(),url=new URL(request.url()),path=url.pathname;
    const body=request.method()==='POST' ? request.postDataJSON() : {};
    let data=[];
    const overview=()=>({...state.form,can_manage:actor.is_owner,new_count:1,done_count:0,open_actions:state.task.status==='done'?0:1,people:[{user_id:person.id,display_name:person.display_name,active:true,role:'responsible'}],pages:state.page ? [state.page] : []});
    if(path.endsWith('/auth/v1/token')) {
      const exp=Math.floor(Date.now()/1000)+3600;const enc=v=>Buffer.from(JSON.stringify(v)).toString('base64url');
      data={user:{...actor,email:'staff@example.invalid',role:'authenticated',aud:'authenticated',user_metadata:{},app_metadata:{}},access_token:`${enc({alg:'HS256',typ:'JWT'})}.${enc({sub:actor.id,exp})}.test`,refresh_token:'test-only',expires_in:3600,expires_at:exp,token_type:'bearer'};
    } else if(path.endsWith('/rpc/get_my_profile')) data=actor;
    else if(path.endsWith('/rpc/admin_forms_overview')) data=[overview()];
    else if(path.endsWith('/rpc/admin_form_tasks')) data={rows:[state.task],total:1,open_count:state.task.status==='done'?0:1};
    else if(path.endsWith('/rpc/custom_form_assignees') || path.endsWith('/rpc/custom_form_members')) data=[owner,person,replacement];
    else if(path.endsWith('/rpc/reassign_form_task')) {state.writes.push(body);state.task={...state.task,assigned_to:body.p_assigned_to,assignee_name:replacement.display_name,updated_at:'2026-09-14T11:00:00Z'};data=null;}
    else if(path.endsWith('/rpc/set_custom_form_open')) {state.writes.push(body);state.form.enabled=body.p_enabled;data=null;}
    else if(path.endsWith('/rpc/search_form_submissions')) data={rows:[{id:id(40),kind:'custom',custom_form_id:id(10),status:'new',created_at:'2026-09-14T10:00:00Z',payload:{name:'Test applicant'},schema_snapshot:{title:'Course interest',fields:state.form.schema.fields}}],total:1,new_count:1,done_count:0};
    else if(path.endsWith('/rpc/list_site_pages')) data=state.page?.published?[state.page]:[];
    else if(path.endsWith('/rpc/get_site_page')) data=state.page?.published && body.p_slug===state.page.slug?{...state.page,form:{id:state.form.id,slug:state.form.slug,open:state.form.enabled}}:null;
    else if(path.endsWith('/rpc/get_public_form')) data=state.form.enabled?{...state.form,version:state.form.published_version}:null;
    else if(path.endsWith('/rpc/save_site_page')) {state.writes.push(body);state.page={...body.p_page,updated_at:'2026-09-14T11:00:00Z'};data=state.page;}
    else if(path.endsWith('/rpc/save_custom_form')) {state.writes.push(body);state.form={...state.form,...body.p_form,updated_at:'2026-09-14T11:00:00Z'};data=state.form.id;}
    else if(path.endsWith('/rpc/publish_custom_form')) {state.writes.push(body);state.form.published_version=2;data=2;}
    else if(path.endsWith('/site_pages')) data=state.page?[state.page]:[];
    else if(path.endsWith('/custom_forms')) data=request.headers().accept?.includes('object')?state.form:[state.form];
    else if(path.endsWith('/custom_form_staff')) data=[{user_id:person.id,role:'responsible'}];
    else if(path.endsWith('/profiles')) data=[owner,person,replacement];
    else if(path.endsWith('/functions/v1/custom-forms')) {state.writes.push(body);data={ok:true,id:id(41)};}
    return route.fulfill({contentType:'application/json',body:JSON.stringify(data)});
  });
  async function admin(section='forms') {
    await page.goto('/admin/login');
    await page.getByLabel('Email address').fill('staff@example.invalid');
    await page.getByLabel('Password',{exact:true}).fill('Local test password');
    await page.getByRole('button',{name:'Sign in',exact:true}).click();
    await expect(page.locator('.admin-toolbar')).toBeVisible();
    await page.goto(`/admin?section=${section}`);
    await expect(page.locator('.admin-toolbar')).toBeVisible();
  }
  return {state,admin};
}

test('Admin Forms keeps live forms, people, responses and actions together',async({page})=>{
  const {state,admin}=await fixture(page);await admin();
  await expect(page.getByRole('heading',{name:'Forms',exact:true})).toBeVisible();
  await page.locator('.content-form-card').filter({hasText:'Course interest'}).click();
  await expect(page.getByText('Responsible people & access')).toBeVisible();
  await expect(page.getByRole('link',{name:'Arabic course',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Responses (1)',exact:true}).click();
  await expect(page.getByText('Test applicant',{exact:false}).first()).toBeVisible();
  await page.getByRole('button',{name:'Actions (1)',exact:true}).click();
  await page.getByRole('button',{name:'Reassign',exact:true}).click();
  await page.getByLabel('Assign to',{exact:true}).selectOption(replacement.id);
  await page.getByRole('button',{name:'Save assignment',exact:true}).click();
  await expect(page.getByText(`Responsible: ${replacement.display_name}`,{exact:false})).toBeVisible();
  expect(state.errors).toEqual([]);
});

test('A poster opens its linked page and the same form responses without copying records',async({page})=>{
  const {state,admin}=await fixture(page);await admin('posters');
  await page.locator('.admin-poster-picker button').filter({hasText:'The Seeker’s Gateway'}).click();
  await expect(page.getByRole('navigation',{name:'Poster management'})).toBeVisible();
  await page.getByRole('button',{name:'Page & registration',exact:true}).click();
  await expect(page.getByLabel('Page title',{exact:true})).toHaveValue('Arabic course');
  await page.getByRole('button',{name:'Responses',exact:true}).first().click();
  await expect(page.getByText('Test applicant',{exact:false}).first()).toBeVisible();
  expect(state.writes).toEqual([]);expect(state.errors).toEqual([]);
});

test('Pages can be created and hidden without erasing a linked form or changing its address',async({page})=>{
  const {state,admin}=await fixture(page);await admin('content');
  await page.getByRole('button',{name:'Pages & programmes',exact:true}).click();
  await page.getByRole('button',{name:'Edit Arabic course',exact:true}).click();
  await page.getByLabel('Show page on website',{exact:true}).uncheck();
  await page.getByLabel('Place under',{exact:true}).selectOption('/education');
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button',{name:'Save page',exact:true}).last().click();
  await expect.poll(()=>state.page.published).toBe(false);
  expect(state.page.form_id).toBe(id(10));expect(state.page.slug).toBe('arabic-course');expect(state.form.enabled).toBe(true);
  expect(state.errors).toEqual([]);
});

test('Public programme page offers the linked registration form and closed pages stay unavailable',async({page})=>{
  const {state}=await fixture(page);await page.goto('/pages/arabic-course');
  await expect(page.getByRole('heading',{name:'Arabic course',exact:true})).toBeVisible();
  await page.getByRole('link',{name:'Register interest',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Course interest',exact:true})).toBeVisible();
  await page.getByLabel('Your name',{exact:false}).fill('Applicant');
  await page.getByRole('button',{name:'Send response',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Thank you',exact:true})).toBeVisible();
  state.page.published=false;await page.goto('/pages/arabic-course');
  await expect(page.getByText('This page is not available.')).toBeVisible();
  expect(state.errors).toEqual([]);
});
