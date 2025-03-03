# Agenda Defender

A desktop application for managing meeting agendas and keeping track of time during presentations.

## Features

- Set custom time slots for different agenda items
- Visual timer display
- Theme toggle support
- Cross-platform support (Windows, macOS, Linux)

## Prerequisites

Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v18 or later)
- [Rust](https://www.rust-lang.org/tools/install) (v1.83.0 or later)
- [Tauri CLI](https://tauri.app/v1/guides/getting-started/prerequisites)

## Development

1. Clone the repository:
```bash
git clone https://github.com/yourusername/agenda-defender-rust.git
cd agenda-defender-rust
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

This will:
- Start the frontend development server
- Launch the Tauri application
- Enable hot-reload for development

## Building for Production

To create a production build:

```bash
# Clean previous builds
npm run clean:all

# Build the application
npm run build
```

The built application will be available in:
- `src-tauri/target/release/bundle/` - Contains platform-specific installers
- `src-tauri/target/release/` - Contains the executable

## Releases

You can download the latest version of Agenda Defender from the [Releases](https://github.com/yourusername/agenda-defender-rust/releases) page. We provide installers for:

- Windows (.msi)
- macOS (.dmg)
- Linux (.deb, .AppImage)

### Version Scheme

We use semantic versioning (MAJOR.MINOR.PATCH):

- MAJOR version for incompatible API changes
- MINOR version for new features in a backwards compatible manner
- PATCH version for backwards compatible bug fixes

To create a new release:

1. Update version in `package.json` and `src-tauri/tauri.conf.json`
2. Create and push a new tag:
```bash
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
```
3. GitHub Actions will automatically build and create a new release

## Project Structure

```
agenda-defender-rust/
├── src/                 # Frontend source files
├── src-tauri/          # Rust backend code
│   ├── src/            # Rust source code
│   ├── Cargo.toml      # Rust dependencies
│   └── tauri.conf.json # Tauri configuration
└── package.json        # Node.js dependencies
```

## Dependencies

- Tauri Core: v2.2.0
- @tauri-apps/api: v2.2.0
- @tauri-apps/cli: v2.2.2

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
