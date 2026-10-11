# SafeVault Technical Architecture Document

SafeVault is a zero-knowledge, offline-first mobile password manager engineered for Android using React Native, Expo (TypeScript), and SQLite. This document details the technical architecture, cryptographic implementation, database design, operating system isolations, user interface state machines, and visual styling rules.

---

## 1. Architectural Philosophy & Core Tenets

### Problem Statement

Storing credentials in unencrypted notes or text documents exposes accounts to complete compromise if an unlocked device is accessed. Conversely, cloud-synchronized password managers introduce remote attack surfaces, third-party data breaches, persistent network traffic, and subscription lock-in.

### Solution & Design Approach

SafeVault operates as an isolated on-device fortress:

1. **Zero-Network Footprint:** The application is architecturally and physically incapable of communicating over a network. The Android runtime hard-blocks socket creation and external data transmission.
2. **Envelope Encryption:** Passwords are encrypted under an internal Data Encryption Key (DEK). The Master Password wraps the DEK rather than encrypting database rows directly.
3. **Hardware-Backed Key Storage:** The Android Keystore secures session keys via biometric authentication.
4. **Ephemeral In-Memory Plaintext:** Passwords exist in plaintext only in component memory during an active 30-second inspection window and are purged immediately upon backgrounding.
5. **High-Contrast Distraction-Free UI:** Built with dark theme tokens, native typography, and zero GPU-heavy glassmorphism for fast rendering and battery conservation.

---

## 2. Operating System & Hardware Isolations

| Isolation Layer                | Implementation Mechanism                                            | Technical Rationale                                                                        |
| :----------------------------- | :------------------------------------------------------------------ | :----------------------------------------------------------------------------------------- |
| **Network Deprivation**        | Removal of `android.permission.INTERNET` and `ACCESS_NETWORK_STATE` | Completely eliminates remote exfiltration risks at the OS kernel level.                    |
| **Display Protection**         | Window manager `FLAG_SECURE` attribute on root Android Activity     | Prevents OS screenshots, screen capture utilities, and task switcher preview leaks.        |
| **Clipboard Privacy**          | `ClipDescription.EXTRA_IS_SENSITIVE` flag on clipboard payloads     | Prevents Android 13+ from displaying copied passwords in persistent system overlays.       |
| **Clipboard Scrubbing**        | Automated 30-second background purge timer                          | Clears plaintext passwords from system memory to prevent inspection by subsequent apps.    |
| **App Lifecycle Lock**         | React Native `AppState` change listener                             | Instantly locks the vault when the application enters `background` or `inactive` state.    |
| **Device Architecture Filter** | `reactNativeArchitectures=armeabi-v7a,arm64-v8a` in Gradle          | Eliminates x86/x86_64 emulator binaries to reduce standalone APK size from ~85MB to ~30MB. |

---

## 3. Cryptographic Architecture

SafeVault implements pure TypeScript audited cryptography utilizing `@noble/ciphers`, `@noble/hashes`, and `@scure/bip39`.

```
[ Master Password ]                [ 12-Word Recovery Phrase ]
        │                                       │
        ▼ (PBKDF2, 10k iter)                    ▼ (PBKDF2-HMAC-SHA512)
[ Key Encryption Key (KEK) ]        [ Recovery Encryption Key ]
        │                                       │
        ├───────────────────┬───────────────────┤
        ▼ (AES-256-GCM)     ▼ (AES-256-GCM)
  [ Encrypted DEK ]   [ Recovery Encrypted DEK ]
                            │
                   (On Valid Unlock)
                            │
                            ▼
              [ Data Encryption Key (DEK) ]
                            │
                    (AES-256-GCM AEAD)
                            │
                            ▼
              [ Credential Ciphertext Payload ]
```

### A. Key Derivation Function (PBKDF2)

- **Algorithm:** PBKDF2-HMAC-SHA256
- **Salt:** 32-byte cryptographically secure random value generated via `expo-crypto.getRandomBytes`.
- **Iterations:** 10,000 iterations.
    - _Rationale:_ In the React Native Hermes engine (interpreted JavaScript mode without JIT compilation), 10,000 iterations compute in approximately 200ms on modern Android hardware. This provides brute-force resistance while keeping the unlock experience instantaneous without freezing the UI thread.

### B. Envelope Encryption Model

- **Data Encryption Key (DEK):** A 256-bit CSPRNG-generated key that directly encrypts credential passwords.
- **Key Encryption Key (KEK):** Derived from the user's Master Password. It wraps the DEK using AES-256-GCM.
- **Master Password Rotation:** When the Master Password is changed, only the 32-byte DEK is re-wrapped with the new KEK. Existing credential records in the database do not need to be re-encrypted, preventing bulk write latency and data corruption risks.

### C. Offline BIP-39 Recovery Phrase

- **Generation:** 12-word mnemonic phrase generated using `@scure/bip39` english wordlist (128 bits of entropy).
- **Secondary DEK Wrapping:** The recovery phrase derives an independent key that encrypts a duplicate copy of the DEK (`recovery_encrypted_dek`).
- **Dual-Factor Recovery Reset:** To protect against scenarios where physical paper backups are discovered by unauthorized individuals:
    1. The user must supply the correct 12-word recovery phrase.
    2. The system prompts for biometric/device PIN authentication.
    3. Upon passing both challenges, the user sets a new Master Password, re-wrapping the active DEK.

### D. Credential Ciphertext (AES-256-GCM)

- Authenticated Encryption with Associated Data (AEAD) ensures confidentiality and authenticity.
- Each credential encryption operation produces:
    - A unique 12-byte Initialization Vector (IV).
    - Ciphertext string.
    - 16-byte Authentication Tag (`auth_tag`).
- Prevents ciphertext tampering, bit-flipping attacks, and padding oracle vulnerabilities.

---

## 4. Sandboxed Database Architecture

The local database is stored in Android's isolated app container using `expo-sqlite` configured with Write-Ahead Logging (`PRAGMA journal_mode = WAL`) for concurrent read/write throughput.

### Table: `vault_metadata`

Singleton table holding initialization parameters and envelope encryption wrappers.

| Column                   | Type    | Constraints | Description                                      |
| :----------------------- | :------ | :---------- | :----------------------------------------------- |
| `id`                     | INTEGER | PRIMARY KEY | Singleton row identifier (fixed at 1)            |
| `salt`                   | TEXT    | NOT NULL    | 32-byte hex salt for PBKDF2 key derivation       |
| `encrypted_dek`          | TEXT    | NOT NULL    | AES-256-GCM encrypted DEK (hex)                  |
| `dek_iv`                 | TEXT    | NOT NULL    | 12-byte initialization vector for DEK encryption |
| `dek_tag`                | TEXT    | NOT NULL    | 16-byte authentication tag for DEK               |
| `recovery_encrypted_dek` | TEXT    | NOT NULL    | AES-256-GCM encrypted DEK via recovery phrase    |
| `recovery_iv`            | TEXT    | NOT NULL    | 12-byte initialization vector for recovery DEK   |
| `recovery_tag`           | TEXT    | NOT NULL    | 16-byte authentication tag for recovery DEK      |
| `is_biometric_enabled`   | INTEGER | DEFAULT 0   | Flag indicating biometric unlock preference      |
| `created_at`             | INTEGER | NOT NULL    | Vault initialization timestamp                   |

### Table: `credentials`

Stores account metadata and encrypted password payloads.

| Column               | Type    | Constraints               | Description                                         |
| :------------------- | :------ | :------------------------ | :-------------------------------------------------- |
| `id`                 | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique credential identifier                        |
| `identity`           | TEXT    | NOT NULL                  | Plaintext email, username, or account identity      |
| `label`              | TEXT    | NOT NULL                  | Plaintext service name (e.g., Spotify, Work Email)  |
| `encrypted_password` | TEXT    | NOT NULL                  | AES-256-GCM ciphertext payload                      |
| `iv`                 | TEXT    | NOT NULL                  | 12-byte initialization vector for this record       |
| `auth_tag`           | TEXT    | NOT NULL                  | 16-byte authentication tag for integrity validation |
| `created_at`         | INTEGER | NOT NULL                  | Creation timestamp (Unix epoch milliseconds)        |
| `updated_at`         | INTEGER | NOT NULL                  | Last modification timestamp                         |

#### Rationale for Plaintext Identities and Labels

Identities and labels remain unencrypted within the local sandboxed database file. Because the SQLite database resides within the app's secure private sandbox, external applications cannot access this file. Plaintext metadata enables high-speed indexing, grouped SQL queries, and instant real-time filtering without requiring in-memory decryption of the entire database.

---

## 5. UI Layout, Navigation & State Machines

### Navigation Architecture

The application uses React Navigation Native Stack:

```
Navigation Root
├── OnboardingScreen (Shown if vault_metadata does not exist)
├── UnlockScreen (Shown on startup if vault exists and is locked)
├── DashboardScreen (Main authenticated entry point)
│   ├── LabelVaultScreen (Detail view for an identity)
│   └── AddEditModal (Modal for creating/editing credentials)
└── PasswordGeneratorModal (CSPRNG password creator)
```

### Screen Specifications

#### 1. Main Dashboard (Identity Directory)

```
+-------------------------------------------------+
| SafeVault                    [+ Add] [Lock] [=] |
+-------------------------------------------------+
| Filter accounts...                              |
+-------------------------------------------------+
| user@gmail.com                           (3)  > |
| ----------------------------------------------- |
| work.alias@company.com                   (1)  > |
| ----------------------------------------------- |
| personal.handle                          (4)  > |
+-------------------------------------------------+
```

- **Header:** Title, "+ Add" button, "Lock" button, and 3-line hamburger menu button.
- **Search:** Case-insensitive substring filtering across identities.
- **List Rows:** Identity label, item count badge, navigation chevron.

#### 2. Label Vault (Detail Screen)

```
+-------------------------------------------------+
| [< Back] user@gmail.com                         |
+-------------------------------------------------+
| Spotify                                         |
| [ View ] [ Copy ] [ Edit ] [ Delete ]           |
| ----------------------------------------------- |
| Personal Banking                                |
| [ View ] [ Copy ] [ Edit ] [ Delete ]           |
+-------------------------------------------------+
```

- **Actions:**
    - `View`: Biometric challenge. On success, decrypts password and begins a 30-second reveal countdown. At 0s, auto-masks back to bullets.
    - `Copy`: Biometric challenge. On success, decrypts, copies to clipboard with `EXTRA_IS_SENSITIVE`, and starts a 30-second clipboard wipe timer.
    - `Edit`: Opens AddEditModal populated with decrypted credential data.
    - `Delete`: Biometric challenge followed by a native confirmation alert before deleting the record.

#### 3. Right-Sliding Sidebar Drawer

```
+--------------------------------+
| SafeVault Dashboard | Menu   X |
| (Dimmed Backdrop)   |--------- |
|                     | Actions  |
|                     | Export   |
|                     | Import   |
|                     | About    |
|                     | Feedback |
|                     | Updates  |
+--------------------------------+
```

- **Dimensions:** Takes 80% screen width (capped at 340px).
- **Animation:** Native-driven slide transition from the right edge with a 65% opacity backdrop overlay.
- **Dismissal:** Top-right `X` button or tapping anywhere on the darkened backdrop.
- **Design Philosophy:** Solid theme background (`#15131b`) with high contrast. No glassmorphism or blur filters, ensuring zero frame drops on budget hardware.

---

## 6. Visual Design System & Theme Tokens

### Color Palette Architecture

The color tokens are structured for maximum contrast, eye comfort in low light, and OLED black battery conservation.

```typescript
export interface ThemeColors {
    background: string;
    surface: string;
    surfaceBorder: string;
    cardBackground: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    primary: string;
    primaryDark: string;
    accent: string;
    danger: string;
    dangerBackground: string;
    inputBackground: string;
}
```

#### Dark Theme Tokens (Default)

- `background`: `#0a090d` (Deep OLED black)
- `surface`: `#15131b` (Subtle dark purple-tinted container)
- `surfaceBorder`: `#272233` (Clean structural divider)
- `cardBackground`: `#191624` (Elevated component surface)
- `textPrimary`: `#f8f8f6` (High-contrast near-white)
- `textSecondary`: `#a5a09b` (Subdued informational text)
- `textMuted`: `#686460` (Tertiary captions and placeholders)
- `primary`: `#2dd4bf` (Crisp aquamarine teal for action triggers)
- `primaryDark`: `#0f766e` (Pressed action state)
- `accent`: `#c084fc` (Soft violet for badges and highlights)
- `danger`: `#fb7185` (Coral red for destructive actions)
- `dangerBackground`: `#331219` (Tinted container for warnings)
- `inputBackground`: `#1f1b2b` (Deep input field fill)

#### Light Theme Tokens (Planned)

- `background`: `#fcfbf7` (Warm light paper)
- `surface`: `#f4f2ea` (Slightly shaded container surface)
- `surfaceBorder`: `#e6e2d3` (Warm neutral border)
- `cardBackground`: `#ffffff` (Pure white card background)
- `textPrimary`: `#1a1625` (Deep purple-charcoal text)
- `textSecondary`: `#5a5568` (Balanced neutral secondary)
- `textMuted`: `#948f9f` (Low-contrast tertiary text)
- `primary`: `#0d9488` (Deep teal)
- `primaryDark`: `#042f2e` (Dark spruce)
- `accent`: `#7e22ce` (Royal purple)
- `danger`: `#e11d48` (Crimson red)
- `dangerBackground`: `#ffe4e6` (Soft rose background)
- `inputBackground`: `#f5f3eb` (Input fill)

---

## 7. Architecture for Backup & Migration (Upcoming Phase 6)

### A. Local Grandfather-Father-Son (GFS) 4-File Rotation

To protect against app crashes during SQLite write cycles, disk corruption, or accidental deletions, the vault implements a 4-file background rolling snapshot system within `FileSystem.documentDirectory`:

1. `vault.db`: The live SQLite database file.
2. `backup_v1.json`: Snapshot 1 (state immediately prior to the latest modification).
3. `backup_v2.json`: Snapshot 2 (state prior to Snapshot 1).
4. `backup_v3.json`: Snapshot 3 (oldest fallback state).

**Rotation Cycle:** Triggers before any mutating database query (`insert`, `update`, `delete`):

```
Purge backup_v3.json -> Rename backup_v2 to backup_v3 -> Rename backup_v1 to backup_v2 -> Write current live state to backup_v1.json -> Commit mutation to vault.db
```

### B. Portable Migration File (`vault_migration.json`)

- For migrating across devices without cloud sync:
    1. User initiates Export in the sidebar.
    2. User defines a transient **Backup Password**.
    3. Vault derives a migration key via PBKDF2 and encrypts the entire JSON database structure via AES-256-GCM.
    4. File is exported to user-designated storage via Android Storage Access Framework (SAF).
- Import Flow:
    - On a new phone: "Import Existing Vault" during Onboarding decrypts the container, creates the new device DEK, and rebuilds the SQLite tables.
    - On an active vault: "Import Vault" in the sidebar safely decrypts and re-encrypts imported records under the active DEK to merge or restore.
