# Lessons learned

What this project has done wrong, what it cost, and what rule or file holds the fix
now. Cite an entry as `LL-01` … `LL-12`. Newest first inside a group.

Art means: measure at the size that ships, before judging the pipeline. Geometry
means: put it in a test, not in an eye. Tools mean: check the round trip before you
blame the picture.

## Art and generated textures

`LL-01` **A generated sheet does not survive an arbitrary shrink.** I baked the ten
city fronts from 640 x 1280 sheets into 16 x 32 tiles: a factor of 40 in each axis. Every window fell to one pixel and the skyline lost all detail - the textures
and the skyline stopped being recognizable. The fronts now ship as thirty PNG files
at their tile box (32 x 64, factor 20, one per design and layer) and load before the
first frame, so a tower still looks like its sheet. `DG-P-10` carries that decision
and its cost, `src/render/texturen/README.md` the files.

`LL-02` **Four equal tone shares read as noise.** The first bake split a sheet into
four equal quarters and every material turned into TV static, because one tone dominates a real surface. The bake now splits at 20 / 40 / 25 / 15 percent.

`LL-03` **Decide a window, not a pixel.** Thinning the sheet's lit-window mask with
one random draw per pixel shredded window runs into single lit dots, which read as
tinsel. One draw per horizontal run now keeps a window whole.

`LL-04` **Crop isotropically.** The first bake scaled 5,3x across and 38x down,
because it fitted width and height to the tile separately; that flattened every
stone into a horizontal band. Every bake since takes one factor for both axes and
crops the rest.

`LL-05` **A generated sheet is never seamless.** The prompt word "seamless" changed
nothing: the measured edge difference across the eighteen sheets ran from 3 to 241.
The bake mirrors the border bands instead of trusting the prompt.

`LL-06` **Compute statistics over what ships.** Baking the moon over the whole
88 x 88 square let the black corners eat the darkest tone class, so the disc lost
its shading. Percentiles now run over the disc only - and the moon stayed drawn
anyway, because its sheet sat off-centre and left a straight edge inside the tile.

`LL-07` **The model ignores palette words more often than shape words.** One soil
sheet came back in daylight colours although the prompt asked for night, and this box has
no pixel-art LoRA, so "pixel art game tile" produced painted surfaces
at best. Read the sheet's colour bins first (376 to 2504 in these runs) before
planning how it will meet a four-shade ramp.

## Tools and measurement

`LL-08` **A tool bug looks exactly like an art problem.** Five of my own bugs first
read as bad textures: the baker read its arguments from the wrong index and took the
preview path as a colour, its field packed four pixels per byte while the reader in
the game expected two, a missing command-line argument wrote a preview into a stray
file named `430`, and `PX.copy(...)` - a call that copies FROM the buffer it sits
on - painted all ten textures black. Encode and decode one field, and look at the file,
before judging any picture.

`LL-09` **A pixel counter must know every variant, and every scale.** `city-windows`
broke when the city grew a third tint per layer, because its denominator matched only
the base ramp, and it broke again on the shipped textures: the far layer's own mean
rises with its lit windows, so a relative threshold called the brightest layer the
darkest. It now divides the layer's baked value scale out of `FRONT_LAYER_TON` and
judges one absolute threshold, which is why that number lives in `config.js` and not
only in the generating tool.

## Geometry

`LL-10` **Stretched tiles hid for many commits.** The soil cell was 192 x 48 over a
21 px band (2,3x squash), cap tiles were 4 px under a 5 px band, the moon was a
64 px cell drawn at 88 px, buildings were 30 to 122 px wide against a 16 px façade.
Nothing in the suite looked at it, so nothing failed. `tile-fit` now walks every
surface, and `paintAtlas` throws when a painter asks for a box other than
`TILE` in `config.js`.

## Working with the machine

`LL-11` **A broad `pkill` pattern kills the shell that ran it.** `pkill -f
"main.py --listen"` matched the invoking command line too, so my own command died
with the server. `pgrep` first, then a pattern that only a real server matches.

`LL-12` **Claim a capability only after measuring it.** Early in this project I
answered that I could not see images, and kept repeating it after I had in fact read
two random codes correctly. The fix was not a rule but a habit: run the blind test,
then report the result - and the same habit caught the stretched tiles of `LL-10`.

`LL-13` **A sampled screenshot case fails for camera reasons.** `hero-head` reported
one run frame with 7 helmet pixels against 17 in the others, in a suite that had
passed 21 of 21 before, and I had touched nothing near the sprite. The case samples a
frame, reads the player position, and then cuts the helmet out of an earlier shot, so
one slow frame and the camera offset points at an empty wall. Before hunting an art
bug, run the suite a second time: a case that moves the world while it measures it
needs that confirmation.
