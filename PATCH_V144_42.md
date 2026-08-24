# Spreelo v144.42 — Complete Kling headlines + strict product identity

Built directly on v144.41.

## 1. Video headlines are never cut into incomplete phrases

The first caption line used as Kling typography is now required to be a short,
standalone, semantically complete advertising headline that makes full sense by
itself in the selected post language.

Spreelo no longer slices that generated line to a fixed number of words or
characters. If the generated first line violates the size contract, the whole
line is rejected and an independently meaningful verified product label is used
instead. No language-specific stop-word/block list is used.

This prevents fragments caused by mechanical truncation while remaining fully
multilingual.

## 2. Visible product design is immutable before Kling generation

The existing verified-view lock now explicitly treats visible identity details
as immutable, including:
- number, position, shape and size of buttons/switches/controls/openings;
- seams, joints and distinctive hardware;
- material boundaries and surface finish/texture;
- color blocking;
- visible logos, print and geometry.

When an intended action would require Kling to redraw/redesign the product,
Spreelo instructs Kling to reduce product motion and move the hand/person,
camera, props or environment instead.

The GPT-Image-2 direct-scene opening-frame identity review uses the same stricter
visible-detail rules.

## 3. Finished Kling result is audited before customer delivery

v144.42 restores one bounded finished-video identity audit because a real-world
v144.41 video preserved the visible side but invented a new button and changed
visible material/color design.

The audit:
- uses the exact verified retailer product image as the only identity authority;
- samples five frames from the part of the Kling source that will actually be
  delivered after any setup trim;
- uses one GPT-4.1-mini vision request;
- checks exact visible controls/hardware, material/color design, silhouette and
  the existing verified-view/surface lock;
- does not reject simple occlusion, glare, motion blur or perspective when no
  contradictory design is actually visible;
- persists a passed result so it is not paid again on local finalization retries;
- never submits another Kling generation.

A confirmed product redesign is failed closed before GPT-Image-2 typography and
Shotstack delivery. A temporary audit/provider/finalization error keeps using the
cached successful Kling source and follows the existing finalization backoff;
it does not generate another video.

## 4. v144.41 typography preserved

The transparent creative GPT-Image-2 overlay remains unchanged:
- accent color;
- underline;
- small brush stroke;
- crown/flourish and small graphic accents;
- true transparent surroundings;
- no broad shadow/glow/haze;
- no 2:3 -> 9:16 stretching.

## Deployment

- No SQL migration.
- No new environment variables.
- Product discovery/locking/price-removal code is not changed by this patch.
