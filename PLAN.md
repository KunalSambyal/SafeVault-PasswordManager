# SafeVault Roadmap

SafeVault is an Android password manager built with React Native, Expo, TypeScript, and SQLite. It stores the vault locally and does not request Android network permissions.

## Current release

The current beta is **v1.2.0-beta**. It includes the core vault workflow, local backup and migration tools, settings, theme selection, and an in-app guide.

### Included

- Vault setup with a master password and 12-word recovery phrase
- Local SQLite storage for credential records
- Password encryption and key wrapping
- Biometric or device authentication for supported actions
- Dashboard, credential list, add/edit flow, and password generator
- Automatic three-slot local snapshots before credential changes
- Encrypted export and import, including merge and replace options
- Auto-lock timeout and dark/light theme preferences
- Offline help content

### Build scope

- Android APK builds target `arm64-v8a` and `armeabi-v7a` devices.
- The app blocks `android.permission.INTERNET` and `android.permission.ACCESS_NETWORK_STATE`.

## Next release

### v1.3.0

- Vault health checks for weak, short, duplicate, or compromised passwords
- Credential tags and custom fields such as notes, PINs, security questions, and Wi-Fi credentials
- Migration-file verification improvements

## Release history

| Release | Main additions | Status |
| :-- | :-- | :-- |
| v1.0.0-beta | Core vault, credential CRUD, biometrics, generator, and sidebar | Completed |
| v1.1.0 | Local snapshots and encrypted vault migration | Completed |
| v1.2.0-beta | Settings, auto-lock options, theme selection, and in-app guide | Completed |
| v1.3.0 | Vault health and richer credential fields | Planned |
