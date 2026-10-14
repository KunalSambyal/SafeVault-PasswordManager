# SafeVault Project Plan & Roadmap

SafeVault is an ultra-secure, zero-knowledge, offline-first credential vault built for Android with React Native / Expo (TypeScript) and SQLite. The project eliminates cloud attack surfaces and remote data harvesting by storing and encrypting all data strictly on-device with hardware-level isolation.

---

## 1. Project Overview & Release Status

### Current Milestone: Beta Release (v1.2.0-beta)

The core cryptographic engine, secure database layer, primary user interfaces, biometric access controls, GFS rotational backup, cross-device encrypted migration, and settings panel are fully implemented, tested, and bundled into a standalone Android APK.

### Release Characteristics

- **Binary Format:** Standalone APK compiled for real physical Android devices (`arm64-v8a` and `armeabi-v7a`).
- **Network Scope:** Completely isolated. Zero internet permissions requested or granted.

---

## 2. Features Implemented in Beta (v1.0.0-beta)

### Phase 0: Native Security & Scaffolding

- **Zero-Network Compilation:** Stripped `android.permission.INTERNET` and `ACCESS_NETWORK_STATE` at the manifest and Gradle build levels.
- **Window Protection (`FLAG_SECURE`):** Enforced `FLAG_SECURE` on the root Android Activity via custom Expo config plugin (`withFlagSecure.js`), blocking screenshots, screen recordings, and recent app task previews.
- **Orientation Lock:** Locked to portrait orientation for secure single-hand mobile usage.

### Phase 1: Cryptographic Engine & Key Management

- **Authenticated Encryption:** Native AES-256-GCM authenticated encryption with unique 12-byte initialization vectors (IVs) and authentication tags per record.
- **Key Derivation:** PBKDF2-HMAC-SHA256 with 32-byte CSPRNG salt. Iteration count tuned to Hermes runtime to ensure sub-250ms unlock without UI freezing.
- **Envelope Encryption (DEK & KEK):** A random 256-bit Data Encryption Key (DEK) encrypts credential passwords; the Master Password derived Key Encryption Key (KEK) wraps the DEK.
- **BIP-39 Mnemonic Recovery:** 12-word recovery phrase generated on onboarding that independently wraps the DEK for disaster recovery.
- **Secure Hardware Keystore:** Android Keystore caching via `expo-secure-store` for rapid biometric unlock without repeated PBKDF2 computation.

### Phase 2: Sandboxed Database Layer

- **Local Relational Storage:** `expo-sqlite` operating in Write-Ahead Logging (WAL) mode.
- **Table `vault_metadata`:** Stores cryptographic salt, encrypted DEK envelopes, and biometric preference flags.
- **Table `credentials`:** Stores identities and service labels in plaintext for high-performance filtering, with password payloads stored as AES-256-GCM ciphertext.

### Phase 3: Core UI & Navigation System

- **Theme System:** High-contrast dark theme optimized for OLED battery efficiency and readability.
- **Onboarding Screen:** Master password creation and 12-word recovery phrase confirmation.
- **Dashboard (Identity Directory):** Accounts aggregated by identity (email/username), real-time search filtering, account count badges, and quick-navigation chevrons.
- **Label Vault (Detail View):** Service cards grouped under active identity, displaying individual credentials.
- **Add / Edit Modal:** Clean modal dialog for creating and modifying credential entries.

### Phase 4: Biometrics & Operating System Hardening

- **Launch Verification:** Biometric authentication challenge (fingerprint, face, or device PIN) on app startup.
- **Step-Up Authentication:** Biometric verification required prior to viewing, copying, editing, or deleting any credential.
- **Temporary Reveal Timer:** Decrypted passwords displayed with a 30-second countdown before automatically reverting to masked bullets (`••••••••`).
- **Lifecycle Auto-Lock:** Monitors Android `AppState` transitions; locks the vault immediately upon backgrounding or app switching.

### Phase 5: Password Generator & Health

- **CSPRNG Generation:** Configurable random password generator supporting custom lengths (8 to 64 chars), uppercase, lowercase, numbers, and special symbols.
- **BIP-39 Passphrase Mode:** Multi-word dictionary passphrase generator.
- **Strength Evaluation:** Real-time entropy and complexity calculation with visual strength meter.

### Dual-Factor Recovery & Master Password Reset

- **Recovery Workflow:** Verification of the 12-word recovery phrase against the stored recovery DEK envelope.
- **Secondary Biometric Challenge:** Enforces biometric/PIN verification after recovery word input to prevent unauthorized access from discovered paper backups.
- **Safe Password Reset:** Allows users to define a new Master Password and re-wrap the active DEK without re-encrypting or losing stored passwords.

### Navigation & Beta Feedback UI

- **Right-Sliding Drawer:** High-contrast solid sidebar (80% screen width) that slides in from the right edge with backdrop dismissal.
- **Beta Notice & Feedback:** Direct reporting channel with developer email (`kunalsambyal9628@gmail.com`), one-tap clipboard copy, and warning against sole production dependency.
- **Release Channel Link:** Direct link to GitHub repository and APK release page.

---

## 3. Features Planned for Future Updates

The following capabilities are scheduled for subsequent releases following beta feedback:

### Phase 6: Offline Backup & Data Migration (Target: v1.1.0)

1. **Local 4-File Rotational Backup (GFS Architecture):**
    - Background automated rotation before any mutating database query (`insert`, `update`, `delete`).
    - Rolling history: `vault.db` (live), `backup_v1.json`, `backup_v2.json`, and `backup_v3.json` in `FileSystem.documentDirectory`.
    - Automatic recovery mechanism if database corruption is detected at startup.
2. **Cross-Device Encrypted Migration File:**
    - Manual export producing `vault_migration.json` encrypted via AES-256-GCM with a user-specified backup password.
    - Storage Access Framework (SAF) integration for saving to external storage, SD cards, or downloads.
3. **Hybrid Import Workflow:**
    - **Onboarding Flow:** "Import Existing Vault" option on first startup for clean device migration without dummy vault creation.
    - **In-App Flow:** "Import Vault" option in the sidebar supporting both safe merge (appending credentials re-wrapped under active DEK) and full restore.

### Phase 7: Configuration & Settings Panel (Target: v1.2.0)

1. **Security Preferences:**
    - Configurable auto-lock timeout (immediate, 1 minute, 5 minutes, 15 minutes).
2. **Appearance & Customization:**
    - Light theme option with automated system theme matching.
3. **Vault Health Audit:**
    - Local on-device scan for weak, short, duplicate, or compromised passwords without network communication.

### Phase 8: Documentation & User Experience (Target: v1.3.0)

1. **In-App Guide:** Built-in offline guide explaining zero-knowledge security, recovery phrase handling, and best practices.
2. **Credential Tags & Custom Fields:** Support for custom fields (PINs, security questions, notes, Wi-Fi credentials).

---

## 4. Engineering Milestones

| Milestone       | Target Scope                                                                | Status        |
| :-------------- | :-------------------------------------------------------------------------- | :------------ |
| **v1.0.0-beta** | Core crypto, database, full CRUD, biometrics, generator, sidebar UI, APK    | **Completed** |
| **v1.1.0**      | GFS rotational backup, encrypted migration JSON export/import (hybrid)      | **Completed** |
| **v1.2.0-beta** | Settings panel, configurable auto-lock, theme switching, offline user guide | **Completed** |
| **v1.3.0**      | Vault health audit, custom field types, database export verification        | Planned       |
