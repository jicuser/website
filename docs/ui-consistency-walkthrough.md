# Website UI consistency

## What caused the screenshot problems?

The shared material stylesheet only applied card backgrounds while Glass was on.
Switching it off left social cards and several controls transparent instead of
opaque. The WhatsApp colour was also only applied in Glass mode.

Another selector applied glass to every button, including plain controls. Some
components supplied their own material as well. This made the final appearance
depend on which selector won rather than on the intended control type.

## How the fix works

1. **One material rule, two sets of values.** `src/styles/liquid-glass.css` now
   applies the same card/control rules in both modes. Glass uses translucent
   colours; Solid substitutes opaque colours, no sheen and no blur. Dialog
   backdrops follow the same preference.
2. **Controls opt in.** The shared `Button` component and named public controls
   receive the material. Plain controls, poster images and staff buttons keep
   their own appearance. A link-style button is no longer automatically filled.
3. **Colours keep their purpose.** WhatsApp remains green, Watch Live remains red,
   and filled primary buttons use brass with dark text in both themes. Contrast
   tests cover the coloured actions over dark and bright backgrounds.
4. **One source for Services navigation.** The existing header links choose the
   service category. The page reads the current URL directly; a duplicate tab row
   and its separately synchronised state have been removed. Older category hashes
   continue to display their category.
5. **Compact, usable layouts.** Related footer links share rows, social and contact
   icons have separate rows, and mobile social shortcuts wrap so every channel is
   visible. The public shell already fills the viewport, so individual pages no
   longer reserve an extra viewport of height. The approved logo is unchanged.

## Follow the code in small steps

Start with `src/pages/SocialMediaPage.jsx`. Find `data-glass="frosted"` on a card.
Then find that selector in `src/styles/liquid-glass.css`. Its background uses a
CSS variable such as `--jic-glass-tile`. Near the bottom of the stylesheet, Solid
mode changes that value to `--jic-surface`. The component stays the same.

For link labels and their order, read `FOOTER_LINKS` in `src/content/nav.js` and
then its `.map()` in `src/components/shell/Footer.jsx`. Each record becomes one
link. Keep public addresses stable when changing their display labels.

## Verification

- JavaScript checks, the repository test suite and the production build.
- A source audit of navigation registries and literal JSX links against declared
  routes/local assets: 188 links inspected; no missing internal destination found.
  This does not establish third-party platform availability or validate every
  content-managed link.
- Contrast regression coverage includes green, red, teal, brass and grey actions
  in Light/Dark and Glass/Solid modes.
- The original transparent-card fault was reproduced on the deployed website.
  This environment blocks local browser previews. Physical iPhone/Safari and
  Android rendering still need device checks; desktop browser results are not
  evidence of Safari performance.

On a phone, check Social Media and the footer in both themes and both surface
modes. Open and close Menu, follow a social shortcut, use Back/Home, and open the
phone wallpaper preview. Cards should remain readable in Solid mode, the logo
should keep its proportions, and controls should stay above the bottom bar.
