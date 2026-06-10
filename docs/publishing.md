# Publishing

Slab uses the official `@vscode/vsce` CLI for packaging and publishing.

## One-time Marketplace setup

1. Create or select the Visual Studio Marketplace publisher named `slab-notebooks`.
2. If that publisher ID is unavailable, update `publisher` in `package.json` before the first publish.
3. Create a Marketplace personal access token with Marketplace Manage scope.
4. Add the token as the GitHub Actions repository secret `VSCE_PAT`.

The official VS Code docs describe the required publisher, PAT, `vsce package`,
and `vsce publish` flow:
https://code.visualstudio.com/api/working-with-extensions/publishing-extension

The official CI docs describe automated publishing with the `VSCE_PAT` secret:
https://code.visualstudio.com/api/working-with-extensions/continuous-integration

## Local verification

```bash
npm ci
npm run release:check
```

Install the generated `.vsix` in VS Code before first public release:

```bash
code --install-extension slab-vscode-0.1.0.vsix
```

## Publish from GitHub

1. Update `CHANGELOG.md`.
2. Update `version` in `package.json`.
3. Commit the release.
4. Tag it with the same version:

```bash
git tag v0.1.0
git push origin main --tags
```

The `Publish VS Code Extension` workflow runs smoke tests, packages the VSIX,
and publishes with `npm run deploy` using `VSCE_PAT`.

## Release check

`npm run release:check` verifies the repo-side release contract:

- required Marketplace fields in `package.json`
- required Marketplace files and workflows
- GitHub release tag matches `package.json.version` when running on a tag
- smoke tests
- VSIX packaging
- generated VSIX contents, including checks that local scratch files are absent

## Publish manually

Use manual publishing only when GitHub Actions is unavailable:

```bash
npm ci
npm run release:check
npm run deploy
```

`vsce` reads the Marketplace token from `VSCE_PAT`, so do not write tokens into
scripts, commits, logs, or shell history.
