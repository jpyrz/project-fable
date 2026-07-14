# Project Fable customization art pipeline

The Mossling pilot establishes the temporary production contract for modular pet art. These generated assets are placeholders until an original-art pass, but replacement art should preserve the same filenames and canvas behavior.

## Canvas contract

- Author and export every base and layer as a square transparent PNG.
- Runtime production size is 1024×1024.
- Keep the pet front-facing and centered in the same neutral pose.
- Layers may use species-specific `x`, `y`, `scale`, and `rotation` metadata; generated pixels are not expected to align automatically.
- Do not bake shadows, backgrounds, or another pet layer into an overlay.
- Physical layers may opt into the pet palette filter. Clothing and markings keep their authored colors.

## Mossling golden kit

| Slot | Asset | Unlock rule | Transform |
| --- | --- | --- | --- |
| Base | `base.png` | Always | Full canvas |
| Marking | `marking-sunberry-speckles.png` | Starter | `x 0`, `y 0`, `scale 1` |
| Hair | `hair-leafy-mohawk.png` | Starter | `x .15`, `y -.128`, `scale .7` |
| Outfit | `outfit-sunberry-tunic.png` | Reputation Level 2 | `x .17`, `y .3`, `scale .66` |
| Head | `head-sunny-day-hat.png` | Own item 16 | `x .178`, `y -.097`, `scale .62` |

## Placeholder prompt set

The built-in image generator used the approved neutral Mossling as the exact style and proportion reference. Each layer prompt requested only the detached asset on a flat magenta chroma-key canvas:

- Neutral Mossling: clean pear-shaped moss creature with simple ear nubs and no optional traits.
- Leafy Mohawk: five overlapping moss-and-leaf spikes with a dark-plum outline.
- Sunberry Speckles: symmetrical raspberry and golden cheek/belly freckles.
- Sunberry Tunic: a front-half coral belly panel with open sides, separate shoulder tabs, cream stitching, and a leaf clasp. The rear collar and inside/back of the garment are intentionally omitted so the layer reads as worn clothing.
- Sunny Day Hat: golden watercolor sunhat, coral ribbon, and stitched leaf accent.

Chroma sources were processed with the image-generation skill's soft-matte and despill helper, resized to 1024×1024, visually checked, and excluded from the deployed asset tree.
