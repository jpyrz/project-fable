# Project Fable customization art pipeline

The launch-species kit establishes the temporary production contract for modular pet art. These generated assets are placeholders until an original-art pass, but replacement art should preserve the same filenames and canvas behavior.

## Canvas contract

- Author and export every base and layer as a square transparent PNG.
- Runtime production size is 1024×1024.
- Keep the pet front-facing and centered in the same neutral pose.
- Layers may use species-specific `x`, `y`, `scale`, and `rotation` metadata; generated pixels are not expected to align automatically.
- Do not bake shadows, backgrounds, or another pet layer into an overlay.
- Physical layers may opt into the pet palette filter. Clothing and markings keep their authored colors.

## Launch-species golden kit

| Species | Slot | Asset | Unlock rule | Transform |
| --- | --- | --- | --- |
| Mossling | Base | `base.png` | Always | Full canvas |
| Mossling | Marking | `marking-sunberry-speckles.png` | Starter | `x 0`, `y 0`, `scale 1` |
| Mossling | Hair | `hair-leafy-mohawk.png` | Starter | `x .15`, `y -.128`, `scale .7` |
| Mossling | Outfit | `outfit-sunberry-tunic.png` | Own item 121 | `x .17`, `y .3`, `scale .66` |
| Mossling | Head | `head-sunny-day-hat.png` | Own item 16 | `x .178`, `y -.097`, `scale .62` |
| Lumipup | Base | `base.png` | Always | Full canvas |
| Lumipup | Marking | `marking-comet-dust.png` | Starter | Full canvas |
| Lumipup | Hair | `hair-nova-swoop.png` | Starter | Full canvas |
| Lumipup | Outfit | `outfit-sunberry-tunic.png` | Own item 121 | `x .19`, `y .27`, `scale .6` |
| Lumipup | Head | shared Sunny Day Hat | Own item 16 | `x .25`, `y -.05`, `scale .45` |
| Cloudkip | Base | `base.png` | Always | Full canvas |
| Cloudkip | Marking | `marking-raindrop-blush.png` | Starter | Full canvas |
| Cloudkip | Hair | `hair-storm-curl.png` | Starter | Full canvas |
| Cloudkip | Outfit | `outfit-sunberry-tunic.png` | Own item 121 | `x .22`, `y .36`, `scale .56` |
| Cloudkip | Head | shared Sunny Day Hat | Own item 16 | `x .31`, `y .02`, `scale .38` |
| Pebblit | Base | `base.png` | Always | Full canvas |
| Pebblit | Marking | `marking-geode-freckles.png` | Starter | Full canvas |
| Pebblit | Hair | `hair-crystal-crest.png` | Starter | Full canvas |
| Pebblit | Outfit | `outfit-sunberry-tunic.png` | Own item 121 | `x .22`, `y .37`, `scale .56` |
| Pebblit | Head | shared Sunny Day Hat | Own item 16 | `x .22`, `y -.02`, `scale .55` |

Headwear that geometrically conflicts with a hair/crest layer declares `hidesSlots: ['hair']`. The owned item remains singular: one Sunny Day Hat or Sunberry Tunic unlocks the fitted version for every species.

## Placeholder prompt set

The built-in image generator used each approved neutral pet as the exact style and proportion reference. Each layer prompt requested only the detached asset on a flat magenta chroma-key canvas:

- Neutral Mossling: clean pear-shaped moss creature with simple ear nubs and no optional traits.
- Leafy Mohawk: five overlapping moss-and-leaf spikes with a dark-plum outline.
- Sunberry Speckles: symmetrical raspberry and golden cheek/belly freckles.
- Sunberry Tunic: a front-half coral belly panel with open sides, separate shoulder tabs, cream stitching, and a leaf clasp. The rear collar and inside/back of the garment are intentionally omitted so the layer reads as worn clothing.
- Sunny Day Hat: golden watercolor sunhat, coral ribbon, and stitched leaf accent.
- Lumipup: Comet Dust starlight freckles, a golden Nova Swoop forelock, and a four-legged front/side Sunberry Tunic.
- Cloudkip: Raindrop Blush cheek droplets, a blue Storm Curl crest, and a wing-friendly front Sunberry Tunic.
- Pebblit: Geode Freckles, a lavender-and-gold Crystal Crest, and an upright front Sunberry Tunic with crystal cutouts.

Chroma sources were processed with the image-generation skill's soft-matte and despill helper, resized to 1024×1024, and checked as assembled pet composites before inclusion. Generated source images remain outside the deployed asset tree.

## Runtime rules

- The Style Studio is the only player-facing place that changes a pet's layered appearance.
- Physical traits are permanent unlocks; wardrobe pieces require a positive inventory stack.
- Item emoji remain inventory thumbnails and labels only. They are never rendered on a pet.
- Unsupported accessory items are shown as `Not fitted` until a species layer exists.
- Database definitions provide ownership and unlock rules; the repository manifest provides exact layer paths, transforms, tint behavior, and visual conflicts.
