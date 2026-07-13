# Image-based companion customization pipeline

## Goal

Give companions strong individual identity without drawing every item for every species. Render transparent layers at runtime on one canonical canvas rather than exporting every possible combination.

## Canonical render contract

- Author every companion on a 1024 × 1024 transparent canvas with a fixed camera and neutral showcase pose.
- Keep feet, eye line, and body center within documented guides.
- Export repository-owned WebP or PNG layers at the same canvas size.
- Store stable asset keys and compatibility metadata in data; never store assembled image URLs in player records.
- Render in this order: background, rear effect, base body, body marking, eyes/face trait, species trait, neck, head, held item, front effect.

## Three asset classes

Use a **70 / 20 / 10 catalog target**:

- **70% universal:** backgrounds, auras, particles, foreground frames, and held props. One asset works for every companion.
- **20% anchored:** hats, bows, glasses, necklaces, badges, and small accessories. Draw once per body rig, then position with species anchor data.
- **10% fitted:** jackets, dresses, armor, or silhouette-changing pieces. These need a species-specific layer and should be special releases rather than the bulk of the catalog.

Four species do not need four unrelated rigs. Group compatible silhouettes into two rigs where possible—for example, upright and quadruped—then give each species anchor adjustments:

```json
{
  "item": "sun-hat",
  "slot": "head",
  "compatibleRigs": ["upright", "quadruped"],
  "anchors": {
    "mossling": { "x": 512, "y": 248, "scale": 1, "rotation": -2, "z": 70 },
    "lumipup": { "x": 520, "y": 235, "scale": 0.94, "rotation": 1, "z": 70 }
  }
}
```

## Physical traits without combinatorial art

Physical traits should be species-authored identity modules, not universal facial surgery.

- Two or three eye styles per species.
- Three body markings per species.
- Two ear, horn, crest, or tail alternatives where the silhouette supports them.
- A small set of palette channels that recolor approved parts of the base and markings.
- Compatibility filters prevent impossible combinations.

This deliberately allows species to remain distinctive. A horn option does not need to fit a species that has no horn anatomy. Identity comes from combining palette, marking, eyes, one species trait, accessories, background, title, badge, and collection showcase.

## Cost controls

- Prefer universal rewards for high-volume event and shop catalogs.
- Use anchored accessories for seasonal identity pieces.
- Reserve fitted clothing for tentpole rewards, supporter cosmetics, or a later production pipeline.
- Add a simple internal preview page that renders every species × palette × variant for one asset.
- Snapshot-test anchor manifests so an art update cannot silently move every hat.
- Budget assets by **number of required renders**, not item count: universal = 1, two-rig anchored = 2 plus anchor data, fitted = species count.

## Recommended first production set

- 6 backgrounds
- 6 effects or profile frames
- 8 head accessories
- 6 neck accessories
- 6 held props
- 3 markings and 2 eye styles per species
- 2 species-exclusive traits per species
- No fitted torso clothing until this system has been tested with final art

