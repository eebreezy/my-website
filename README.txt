# 3D Mini Games Pack

This pack contains 30 original browser mini games.

## What's inside
- `index.html` + `index.css`: game hub
- `shared/core.js`: shared 3D scene, controls, synth sounds, HUD
- `shared/families.js`: gameplay systems
- `games/<slug>/index.html`: each game page
- `games/<slug>/game.js`: game config and launcher

## Notes
- The games are static files and can be hosted on GitHub Pages, GoDaddy, Netlify, or similar.
- They load Three.js from a CDN, so the player needs internet access.
- Sound effects are generated with WebAudio, so there are no external audio files to upload.

## Recommended upload
Upload the full folder structure exactly as-is.
