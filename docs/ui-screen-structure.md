# UI structure and screen map

## Design goals
- mobile-first layout;
- bright and playful palette: fuchsia, turquoise, yellow, soft neutrals;
- rounded cards and touch-friendly controls;
- layered paper-doll outfit presentation;
- clear flow from quiz to result and replacement.

## Screen 1: onboarding questionnaire
### Purpose
Collect the user mood and constraints before generating outfit suggestions.

### Elements
- progress bar with 4 steps;
- color chips with circle selectors for up to 7 colors;
- garment preference toggle: pants, skirt, or dress flow;
- temperature slider or segmented options;
- event selector: school, walk, club, party, casual;
- CTA button: Show me looks.

### Layout
- top area with playful heading and subheading;
- full-width cards for each selection;
- bottom sticky CTA for mobile use.

## Screen 2: result list
### Purpose
Show the three most relevant outfit matches.

### Elements
- summary chips: selected colors, event, season;
- three outfit cards;
- each card includes: paper-doll mini preview, tags, score label, “View look” action;
- button to regenerate or adjust filters.

### Layout
- stacked cards in a vertical mobile layout;
- top bar with filter summary.

## Screen 3: outfit detail
### Purpose
Reveal the look composition and give replacement controls.

### Elements
- large paper-doll preview;
- categories: top, bottom, shoes, bag, accessory;
- item cards below with photo, label, and Replace action;
- small explanation block: “matching colors / season / event”;
- Save outfit button.

## Screen 4: replacement flow
### Purpose
Allow the user to change a part of the look without losing the whole outfit.

### Elements
- segmented tabs: top / bottom / bag / accessory;
- grid of item options with thumbnails;
- preview after replacement;
- “Apply” and “Cancel” actions.

## Screen 5: saved looks
### Purpose
Store favourite outfits for later review.

### Elements
- list of saved looks with date and mood tag;
- mini cards with all item names;
- open and edit actions.

## Screen 6: admin photo upload and cropping
### Purpose
Add wardrobe items to the database with metadata.

### Elements
- upload panel;
- item metadata form: name, category, slot, colors, season, event;
- crop overlay with template guidance;
- preview area; save button.

## Visual style rules
- cards with rounded corners and soft shadow;
- primary accent: fuchsia;
- secondary accent: turquoise;
- warm accent: yellow;
- neutrals: white, beige, brown, black;
- playful decorative icons: stars, cloud and spark elements used sparingly.

## Navigation model
- onboarding -> results -> detail -> replacement -> saved looks
- admin upload is a separate route with secure access.

## Suggested component structure
- App shell
- Bottom navigation
- Question card
- Color chip selector
- Outfit result card
- Paper-doll layer preview
- Item selector drawer
- Admin upload form
- Saved look card
