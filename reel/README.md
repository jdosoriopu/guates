# Reel: así nace la tienda

Vertical reel (1080 × 1920, 60 fps, 23.1 s) that builds anticipation for the Guates online store. Live film, with playback and MP4 export: https://claude.ai/artifact/TNip5RBkRXbG1NcN9Wq2t6

This folder is a snapshot of the film's source. The live film keeps its source in the artifact's own store, so edits there are not synced here automatically.

- `scenes.json`: scene order, durations, fonts and palette.
- `base.css`: shared styles and the colour variables.
- `shared.js`: the tone-on-tone stripe bands that fill the edges Instagram covers.
- `scene-*.js`: one module per scene. Everything on screen is a pure function of time `t`.
- `score.js`: the generated music and sound effects, timed to each scene.

The film also loads the logo, the grano ornament and the animal illustrations as HTML modules. They are the SVG masters from `guates-design-system/assets/`, with their fill switched to `currentColor`.
