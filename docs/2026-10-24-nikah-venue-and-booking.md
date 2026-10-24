# Nikah venue and booking

The Nikah page now starts with a compact heading and two booking actions. The large introductory panel and standalone telephone link are removed. Facilities, decorated examples and parking share a compact switcher, with photo slots for the men’s hall, ladies’ hall, kitchen and serving area, previous decorations, and parking. Photos can be browsed and enlarged; empty slots say “Photos to follow”. No venue photographs, capacities, parking availability or prices are invented.

Under Admin → Pages → Nikah, **Nikah facilities & photos** allows content staff to add up to six photos per area, write descriptions and arrival instructions, reorder or remove photos, and show or hide an area. Draft changes appear in the existing website preview. Saving uses the existing content permission and `page_content` storage, with key `nikah_venue`; no database migration is required.

**Book Nikah** and **Book hall** open questions inline. Visitors choose Nikah only, Nikah and hall, or hall only. Date and guest questions are included, with room choices for hall requests. Each choice retains its answers while the visitor browses the other choices or closes the questions. The existing hall calendar remains linked.

Requests use the existing published `nikah-enquiry` or `hall-booking` form and version. Extra booking details are validated and included in the existing message field, so staff receive one enquiry in their current inbox. Published requirements, closure, upload checks and human verification remain in force. The review shows the booking type, and the receipt explains that availability still needs confirmation. Custom forms without a suitable message field direct visitors to contact the centre instead of silently dropping booking details.

Validation covers the booking payload, branch-specific questions, required fields, unsafe photo URLs, image limits and server rendering. Browser scenarios cover narrow/light/dark layouts, photos, saved draft answers, submission, closure and admin preview/save. Local browser execution is blocked by the workspace’s Chromium socket restrictions; those scenarios are included for CI.
