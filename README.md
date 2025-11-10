# iCubeControl
iCubeSmart Web Interface

## GitHub Pages deployment

This repo now builds and publishes the `dist/` bundle to GitHub Pages via the workflow defined in `.github/workflows/deploy.yml`.

1. In the repo settings on GitHub, open **Pages** and set the source to **GitHub Actions** (one-time step).
2. Push to `main` (or trigger the workflow manually from the **Actions** tab) to kick off a deploy.
3. The workflow installs dependencies with `npm ci`, runs `npm run build`, uploads `dist/` as the artifact, and deploys it using `actions/deploy-pages`.
4. Once the run succeeds, the Pages URL appears in the workflow summary and under Settings → Pages.

Because Shoelace assets are copied next to the generated `index.html`, they now load correctly whether the site is served at the domain root or under a repository sub-path (as GitHub Pages does).

## Game of Life playground

- Use the **Slice Editor** to paint individual voxels, rows, or columns on the currently selected 8×8 layer.
- The **Life Controls** (Start/Pause, Step, Randomize, Clear) run a 3D Game of Life variant where cells spawn in both primary and secondary color families.
- Primaries and secondaries treat each other as hostile: if a living cell has two or more opposing-color neighbors it dies, so mixed clusters burn out faster than dark space.
- Births now use a relaxed B45 rule, survival S3-6, and the loop advances roughly every 750 ms so patterns linger a bit longer.
