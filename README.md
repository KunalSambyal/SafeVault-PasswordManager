# SafeVault

SafeVault is an Android password manager built with React Native, Expo, TypeScript, and SQLite. It keeps vault data on the device and is configured without Android network permissions.

## Features

- Master-password vault setup with a 12-word recovery phrase
- Biometric or device authentication for supported vault actions
- Encrypted credential storage in SQLite
- Password and passphrase generator
- Three rotating local backup snapshots
- Password-protected export and import for moving a vault between devices
- Configurable auto-lock timeout and dark/light themes
- Built-in offline help

## Documentation

- [Architecture](ARCHITECTURE.md) explains the application structure, data flow, storage, and migration design.
- [Roadmap](PLAN.md) lists the current release scope and planned work.

## License

SafeVault is released under the [MIT License](LICENSE).
