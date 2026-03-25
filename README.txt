Omfunny 3D Music Arcade

Contents
- index.html -> homepage with image cards
- shared/css/site.css -> shared styles
- shared/js/engine.js -> shared 3D/audio engine
- thumbs/ -> SVG thumbnails for homepage cards
- 30 game folders -> each contains its own index.html

Publishing
1. Upload the CONTENTS of this folder to your web root or repo root.
2. Keep the folder structure intact.
3. Open index.html to launch the arcade.

Important audio note
Modern browsers generally block autoplay audio until the first user gesture. These games are configured to start audio as soon as the user first taps/clicks/presses a key.


V2 sampled-sound upgrade:
- Added sample-based instrument banks loaded via CDN soundfont files.
- Added Sound Set switcher on each experiment.
- Expanded note counts and control ranges across modes.
- Browsers still require a user tap/click before audio starts.
