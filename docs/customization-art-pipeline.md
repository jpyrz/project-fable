# Project Fable customization art pipeline

The launch-species kit establishes the temporary production contract for modular pet art. These generated assets are placeholders until an original-art pass, but replacement art should preserve the same filenames and canvas behavior.

## Canvas contract

- Author and export every base and layer as a square transparent PNG.
- Runtime production size is 1024×1024.
- Keep the pet front-facing and centered in the same neutral pose.
- Layers may use species-specific `x`, `y`, `scale`, and `rotation` metadata; generated pixels are not expected to align automatically.
- Do not bake shadows, backgrounds, or another pet layer into an overlay.
- Physical layers may opt into the pet palette filter. Clothing and markings keep their authored colors.

## Required pose-first fitting workflow

Every new overlay—and every existing asset adapted to another species—must be fitted against that species' exact production `base.png`. Do not generate an isolated garment or accessory and assume transforms can repair its silhouette afterward.

1. **Inspect the production pet.** Identify its pose, body contour, foreground anatomy, attachment points, and protected features. Record anything that crosses the asset zone, such as wings, ears, horns, hair, tails, arms, or feet.
2. **Design on the dressed pet first.** Use the exact production base as the immutable fit target and the approved item art as the style/material reference. Create a dressed-pet fit reference while preserving the pet's identity, canvas registration, pose, and anatomy.
3. **Resolve occlusion in the fit reference.** Decide which pet parts sit in front of the asset and which sit behind it. Because the current renderer places the pet base below an overlay, any base-art wing, limb, crest, or other feature that must remain visible in front requires a transparent cutout in the overlay. Do not paint hidden cloth that would cover it. If an asset cannot be represented cleanly this way, add explicit foreground pet layers before shipping it.
4. **Show only renderable surfaces.** A clothing overlay contains only the exterior pixels visible from the pet's pose. Omit the back, rear collar, inside surfaces, hidden straps, and garment thickness. Neck openings, arm/wing openings, and all interrupted areas remain transparent.
5. **Derive the standalone layer.** From the approved dressed-pet reference, isolate or recreate only the visible asset pixels on a flat chroma-key canvas. Preserve the pose-specific asymmetry and cutouts instead of completing the object into a generic symmetrical item.
6. **Process non-destructively.** Remove the chroma key with a soft matte and despill, export a 1024×1024 transparent PNG, and save it under a new versioned filename. Keep the previous candidate until the replacement is approved.
7. **Tune in the Customization Lab.** Adjust `x`, `y`, `scale`, and `rotation` against the assembled production pet. Check guides off as well as on, and verify both the isolated layer and the composite.
8. **Require visual approval.** Review the asset at small and large avatar sizes, with every relevant trait combination and palette. Confirm that protected anatomy is visible, edges do not float or clip, and the item still reads correctly without showing impossible inner/back surfaces.
9. **Promote the approved result.** Update the manifest path and transform, the golden-kit table, and an exact regression assertion. Run tests, lint, and the production build before committing or pushing.

Cloudkip's Sunberry Tunic v3 is the reference example: first fit the tunic on Cloudkip's actual three-quarter pose with both wings visibly in front, then derive only the exposed front cloth and preserve the wing overlaps as transparent, asymmetric cutouts.

### Fitting acceptance checklist

- Uses the exact production base and pose—not a generic species approximation.
- Follows the pet's actual body volume and perspective.
- Leaves foreground anatomy visible through intentional transparent cutouts.
- Contains only visible front/exterior surfaces.
- Uses a versioned transparent 1024×1024 asset.
- Has manually approved lab transforms and composite screenshots.
- Has manifest/documentation regression coverage.

## Launch-species golden kit

| Species | Slot | Asset | Unlock rule | Transform |
| --- | --- | --- | --- |
| Mossling | Base | `base.png` | Always | Full canvas |
| Mossling | Marking | `marking-sunberry-speckles.png` | Starter | `x 0`, `y 0`, `scale 1` |
| Mossling | Hair | `hair-leafy-mohawk.png` | Starter | `x .15`, `y -.12`, `scale .7` |
| Mossling | Outfit | `outfit-sunberry-tunic-v4.png` | Own item 121 | `x .14`, `y .325`, `scale .71` |
| Mossling | Head | `head-sunny-day-hat.png` | Own item 16 | `x .17`, `y -.09`, `scale .66` |
| Lumipup | Base | `base.png` | Always | Full canvas |
| Lumipup | Marking | `marking-comet-dust.png` | Starter | `x -.095`, `y -.085`, `scale 1.23` |
| Lumipup | Hair | `hair-nova-swoop.png` | Starter | `x -.105`, `y -.15`, `scale .99` |
| Lumipup | Outfit | `outfit-sunberry-tunic.png` | Own item 121 | `x .105`, `y .295`, `scale .6` |
| Lumipup | Head | shared Sunny Day Hat | Own item 16 | `x .06`, `y -.105`, `scale .71`, `rotation 3.5` |
| Cloudkip | Base | `base.png` | Always | Full canvas |
| Cloudkip | Marking | `marking-raindrop-blush.png` | Starter | `x -.035`, `y 0`, `scale 1` |
| Cloudkip | Hair | `hair-storm-curl.png` | Starter | `x -.03`, `y -.04`, `scale .95` |
| Cloudkip | Outfit | `outfit-sunberry-tunic-v3.png` | Own item 121 | `x .125`, `y .42`, `scale .56`, `rotation .5` |
| Cloudkip | Head | shared Sunny Day Hat | Own item 16 | `x .05`, `y -.005`, `scale .75`, `rotation 3` |
| Pebblit | Base | `base.png` | Always | Full canvas |
| Pebblit | Marking | `marking-geode-freckles.png` | Starter | `x -.01`, `y -.02`, `scale 1.04` |
| Pebblit | Hair | `hair-crystal-crest.png` | Starter | `x .08`, `y -.08`, `scale .87`, `rotation -4.5` |
| Pebblit | Outfit | `outfit-sunberry-tunic-v2.png` | Own item 121 | `x .275`, `y .46`, `scale .43` |
| Pebblit | Head | shared Sunny Day Hat | Own item 16 | `x .19`, `y .02`, `scale .63`, `rotation -6` |

Headwear that geometrically conflicts with a hair/crest layer declares `hidesSlots: ['hair']`. The owned item remains singular: one Sunny Day Hat or Sunberry Tunic unlocks the fitted version for every species.

## Placeholder prompt set

The built-in image generator used each approved neutral pet as the exact style and proportion reference. Each layer prompt requested only the detached asset on a flat magenta chroma-key canvas:

- Neutral Mossling: clean pear-shaped moss creature with simple ear nubs and no optional traits.
- Leafy Mohawk: five overlapping moss-and-leaf spikes with a dark-plum outline.
- Sunberry Speckles: symmetrical raspberry and golden cheek/belly freckles.
- Sunberry Tunic: a front-half coral belly panel with open sides, separate shoulder tabs, cream stitching, and a leaf clasp. The rear collar and inside/back of the garment are intentionally omitted so the layer reads as worn clothing.
- Sunny Day Hat: golden watercolor sunhat, coral ribbon, and stitched leaf accent.
- Lumipup: Comet Dust starlight freckles, a compact three-lock Nova Swoop with a tiny star tip that keeps the eyes clear, and a four-legged front/side Sunberry Tunic.
- Cloudkip: Raindrop Blush cheek droplets, a blue Storm Curl crest, and a wing-friendly front Sunberry Tunic.
- Pebblit: Geode Freckles, a compact three-spike lavender-and-gold Crystal Crest that stays between the natural crystal ears, and an upright front Sunberry Tunic with crystal cutouts.

Chroma sources were processed with the image-generation skill's soft-matte and despill helper, resized to 1024×1024, and checked as assembled pet composites before inclusion. Generated source images remain outside the deployed asset tree. All future prompt work follows the required pose-first fitting workflow above.

## Runtime rules

- The Style Studio is the only player-facing place that changes a pet's layered appearance.
- Physical traits are permanent unlocks; wardrobe pieces require a positive inventory stack.
- Item emoji remain inventory thumbnails and labels only. They are never rendered on a pet.
- Unsupported accessory items are shown as `Not fitted` until a species layer exists.
- Database definitions provide ownership and unlock rules; the repository manifest provides exact layer paths, transforms, tint behavior, and visual conflicts.
