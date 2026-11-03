# Bookmark home: compact glass correction

Scope: installed/bookmark homepage only. Public browser home, TV/admin and backend stay unchanged.

- Retain the existing dated timetable, current-Salah highlight and live begins/Jamaat countdown.
- Reduce masthead and panel padding; avoid duplicate prayer links (bottom Salah tab and More retain both destinations).
- Restore the existing JIC photograph behind frosted, translucent surfaces, including the radio and bottom navigation. Dark/light, solid and reduced-transparency modes remain supported.
- Two activity rows per swipe; arrows share the section heading. Every activity and poster remains available. The standard browser feed retains three rows and the full listing retains its load-more control.
- Extra content, community links and WhatsApp expand under More. Live/announcement banners remain visible; clicking Live opens the disclosure. Footer/social/contact links reappear when More opens. Explicit privacy and contact links are inside More.
- No `overflow:hidden` on the page, fixed viewport-height clamp, zoom restriction or reduced touch targets. Long notices, small/landscape devices and larger text can scroll rather than lose information.

Verification: five focused Node tests passed. The isolated Chromium component preview passed 72 checks across 320, 375, 390 and 430px phone widths, dark/light, solid and reduced-transparency states, paging and disclosure. Standard opening views at 375x812, 390x844 and 430x932 fit without page scrolling. The fixture uses sample data and an injected clock; full-site CI and iOS/WebKit remain separate release checks. Local preview does not prove deployment.
