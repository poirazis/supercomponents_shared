# Contributing to @supercomponents/shared

Thank you for considering contributing to this project! Here's how you can help:

## Development Process

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Run tests: `npm test`
5. Build the package: `bun run build`
6. Commit your changes: `git commit -m 'Add my feature'`
7. Push to your branch: `git push origin feature/my-feature`
8. Submit a pull request

## Adding New Components

When adding a new component:

1. Create a folder in `src/lib/{ComponentName}`
2. Add your component as `{ComponentName}.svelte`
3. Export it in `src/index.js`
4. Add it to the exports in `package.json`
5. Document it in README.md

## Code Style

- Follow the existing code style
- Use meaningful variable and function names
- Add comments for complex logic

## Releasing

Releases are automated via GitHub Actions when pushing to the main branch.
