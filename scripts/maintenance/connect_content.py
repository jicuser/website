"""One-time source integration on the maintenance branch; remove before release."""
from pathlib import Path

root = Path.cwd()
changed = {}

def change(path, old, new, count=1):
    text = changed.get(path, (root / path).read_text())
    if text.count(old) != count:
        raise RuntimeError(f'Unexpected source at {path}; refusing a partial integration')
    changed[path] = text.replace(old, new, count)

p = 'src/pages/admin/AdminPage.jsx'
change(p, "import FormsInbox from '@/components/admin/FormsInbox';", "import FormsManager from '@/features/forms/FormsManager';")
change(p, "import PageEditor from '@/components/admin/PageEditor';", "import ContentPages from '@/features/content/ContentPages';")
change(p, "['forms', 'Forms inbox', FileText, 'forms']", "['forms', 'Forms', FileText, 'forms']")
change(p, "'Forms inbox',\n      'Read messages and registrations, then mark them completed.'", "'Forms',\n      'Manage forms, responsible people, responses and actions.'")
change(p, 'posters: <PostersEditor />', 'posters: <PostersEditor key={user?.id} />')
change(p, "content: <PageEditor initialPath={params.get('page') || '/'} />", "content: <ContentPages key={user?.id} initialPath={params.get('page') || '/'} />")
change(p, 'forms: <FormsInbox />', 'forms: <FormsManager key={user?.id} />')

p = 'src/App.jsx'
change(p, "const ClassesCoursesPage = lazy(() => import('@/pages/ClassesCoursesPage'));\n", '')
change(p, "const ContactPage = lazy(() => import('@/pages/ContactPage'));", "const ContactPage = lazy(() => import('@/pages/ContactPage'));\nconst PublicFormPage = lazy(() => import('@/pages/PublicFormPage'));\nconst ContentPage = lazy(() => import('@/pages/ContentPage'));\nconst AdultCoursesPage = lazy(() => import('@/pages/AdultCoursesPage'));")
change(p, '<Route path="education" element={<EducationPage />} />', '<Route path="education" element={<EducationPage />} />\n              <Route path="education/courses" element={<AdultCoursesPage />} />\n              <Route path="forms/:slug" element={<PublicFormPage />} />\n              <Route path="pages/:slug" element={<ContentPage />} />')
change(p, '<Route path="madrassah/classes-courses" element={<ClassesCoursesPage />} />', '<Route path="madrassah/classes-courses" element={<Navigate to="/education/courses" replace />} />')

p = 'src/layouts/MainLayout.jsx'
change(p, "import ProgrammePosters from '@/components/ProgrammePosters';", "import ProgrammePosters from '@/components/ProgrammePosters';\nimport PublishedPageLinks from '@/features/content/PublishedPageLinks';\nimport { PublishedPagesProvider } from '@/context/PublishedPagesContext';")
change(p, '<PublicLayout />', '<PublishedPagesProvider><PublicLayout /></PublishedPagesProvider>')
change(p, '{!isHome && !isDiscovery && <ProgrammePosters />}', '{!isHome && !isDiscovery && <ProgrammePosters />}\n          {!isDiscovery && <PublishedPageLinks />}')

p = 'src/components/ProgrammePosters.jsx'
change(p, "import usePosters from '@/hooks/usePosters';", "import usePosters from '@/hooks/usePosters';\nimport { usePublishedPages } from '@/context/PublishedPagesContext';\nimport { pageUrl } from '@/lib/pageContent';")
change(p, 'const programmes = usePosters();', 'const programmes = usePosters();\n  const pages = usePublishedPages();')
change(p, 'const posters = programmes.filter((item) => item.groups.includes(group));', "const posters = programmes.filter((item) => {\n    if (pathname === '/education/courses') return pages.some(page => page.source_poster_id === item.id && page.placement === pathname);\n    return item.groups.includes(group);\n  }).map(item => {\n    const page = pages.find(candidate => candidate.source_poster_id === item.id);\n    return page ? { ...item, to: pageUrl(page), registration: page.registration } : item;\n  });")
change(p, "{item.to === pathname ? 'Enquire at the centre' : 'Explore programme'}", "{item.registration && item.registration !== 'none' ? 'Details & registration' : item.to === pathname ? 'Enquire at the centre' : 'Explore programme'}")

p = 'src/pages/EducationPage.jsx'
change(p, "title: 'Classes & Courses',\n    description: 'Browse current classes, courses and learning opportunities.',\n    path: '/madrassah/classes-courses',", "title: 'Adult Courses & Classes',\n    description: 'Adult learning, current courses and registration information.',\n    path: '/education/courses',")
change(p, 'Explore our Madrassah, classes and courses, or find enrolment information and student', 'Explore adult courses separately from Madrasah, or find pupil enrolment information and student')
p = 'src/content/nav.js'
change(p, "  { name: 'Classes & Courses', path: '/madrassah/classes-courses' },", "  { name: 'Adult Courses & Classes', path: '/education/courses' },", 2)

p = 'supabase/functions/_shared/access.js'
change(p, "  ['forms_itikaaf', 'I’tikaf registrations'],", "  ['forms_itikaaf', 'I’tikaf registrations'],\n  ['forms_manage', 'Create and manage registration forms'],\n  ['forms_custom', 'All custom form responses'],")
change(p, "if (permission === 'forms') return permissions.some((key) => key.startsWith('forms_'));", "if (permission === 'forms') return profile.has_assigned_forms === true || permissions.some((key) => key.startsWith('forms_'));")
change(p, '(profile.is_owner === true ||', '(profile.is_owner === true || profile.has_assigned_forms === true ||')

p = 'src/components/admin/PostersEditor.jsx'
change(p, "import { useRegisterAdminSave }", "import { useAdminSave, useRegisterAdminSave }")
change(p, "import { IMAGE_ACCEPT, validateImage } from '@/lib/images';", "import { IMAGE_ACCEPT, validateImage } from '@/lib/images';\nimport PosterWorkflow from '@/features/content/PosterWorkflow';\nimport '@/styles/content-workflow.css';")
change(p, "const [selected, setSelected] = useState('');", "const [selected, setSelected] = useState('');\n  const [editingPoster, setEditingPoster] = useState(false);\n  const { dirty: workspaceDirty } = useAdminSave();")
change(p, '}, [selected, revealEditor]);', '}, [selected, editingPoster, revealEditor]);')
change(p, '  const add = (kind) => {\n    const id', "  const canLeaveLinkedEditor = () =>\n    editingPoster || !workspaceDirty || window.confirm('Discard unsaved page or form changes?');\n  const add = (kind) => {\n    if (!canLeaveLinkedEditor()) return;\n    setEditingPoster(true);\n    const id")
change(p, 'if (selected === poster.id) revealEditor();\n              else setSelected(poster.id);', 'if (selected === poster.id) { revealEditor(); return; }\n              if (!canLeaveLinkedEditor()) return;\n              setEditingPoster(false);\n              setSelected(poster.id);')
change(p, '      {item && (\n        <fieldset ref={editor} tabIndex={-1} disabled={busy} className="scene-properties">', '''      {item && (
        <div ref={editor} tabIndex={-1} className="poster-management">
        {editingPoster ? <>
        <button type="button" className="admin-button" disabled={busy} onClick={() => {
          if (dirty) { setMessage('Publish your poster changes before opening its page and forms.'); return; }
          setEditingPoster(false);
        }}>Poster overview, page & forms</button>
        <fieldset disabled={busy} className="scene-properties">''')
change(p, '        </fieldset>\n      )}\n      <button', '''        </fieldset>
        </> : <PosterWorkflow key={item.id} poster={item} onEditPoster={() => {
          if (canLeaveLinkedEditor()) setEditingPoster(true);
        }} />}
        </div>
      )}
      <button''')

p = 'tests/browser/admin-reliability.spec.mjs'
change(p, 'await cards.first().click();\n    await expect(page.getByLabel', "await cards.first().click();\n    await page.getByRole('button', { name: 'Edit poster', exact: true }).click();\n    await expect(page.getByLabel")
p = 'tests/browser/content-workflow.spec.mjs'
change(p, 'data={id:id(41)};', 'data={ok:true,id:id(41)};')
change(p, "await page.getByRole('button',{name:'Save page',exact:true}).last().click();", "page.once('dialog', dialog => dialog.accept());\n  await page.getByRole('button',{name:'Save page',exact:true}).last().click();")

# Write only after all expected source fragments have been verified.
for path, content in changed.items():
    (root / path).write_text(content)
    print(path)
