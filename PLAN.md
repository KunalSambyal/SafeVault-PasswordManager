# SafeVault: Offline Secure Password Manager

A zero-knowledge, offline-first mobile credential vault designed for Android. The application ensures complete privacy by isolating sensitive credentials on-device, backed by hardware encryption, with zero network communication capabilities.

---

## 1. The Problem

Storing credentials in plaintext (such as standard notes applications, draft emails, or unencrypted text documents) exposes sensitive accounts to severe security risks. If a device is compromised, shared, lost, or accessed without authorization, all credentials are immediately exposed.

Cloud-based password managers solve storage convenience but introduce distinct vulnerabilities:

- Third-party data breaches, remote credential harvesting, and cloud service outages.
- Complex subscription models and persistent background network synchronization.
- Attack surfaces exposed across web endpoints and synchronization protocols.

Command-line utilities and custom desktop scripts solve the privacy problem but lack the mobile-first accessibility, biometric integration, and convenience required for daily smartphone logins.

---

## 2. The Solution: Zero-Knowledge Local Architecture

SafeVault is designed as a standalone, zero-network Android utility functioning as an encrypted local vault.

### Core Principles

- **Zero Network Footprint:** The application is built without the Android Internet permission (`android.permission.INTERNET`). The operating system prevents the binary from creating network sockets, transmitting data, or performing external requests.
- **Hardware-Backed Isolation:** Cryptographic keys are protected using the device's hardware-backed Android Keystore via biometric authentication.
- **Envelope Encryption:** Passwords are encrypted using an internal Data Encryption Key (DEK) that is guarded by the Master Password (KEK) and an offline recovery phrase.
- **Ephemeral Memory Exposure:** Passwords exist in plaintext only in-memory, protected by 30-second auto-masking timers and automatic clipboard scrubbing.

---

## 3. Technology Stack

- **Frontend Framework:** React Native with Expo (TypeScript)
- **Secure Key Storage:** `expo-secure-store` (Hardware-backed Android Keystore integration)
- **Local Sandboxed Database:** `expo-sqlite` (Sandboxed relational metadata and ciphertext storage)
- **Biometric & System Security:** `expo-local-authentication` (Biometric fingerprint and device PIN verification)
- **Cryptographic Engine:** Native AES-256-GCM (Authenticated Encryption with Associated Data) and PBKDF2/Argon2 key derivation

---

## 4. Cryptographic Implementation

SafeVault uses an envelope encryption model to ensure data confidentiality, cryptographic integrity, and fast credential maintenance.

### A. Key Derivation & Salting

1. During initial setup, the user defines a strong Master Password.
2. The application generates a cryptographically secure 32-byte random salt using a CSPRNG.
3. A Key Encryption Key (KEK) is derived using PBKDF2-HMAC-SHA256 (with a minimum of 600,000 iterations) or native Argon2id.

### B. Envelope Encryption (DEK and KEK)

1. A 256-bit random Data Encryption Key (DEK) is generated on first launch.
2. The DEK is encrypted with the Master Password derived key (KEK) using AES-256-GCM and stored in the local database.
3. All individual credential passwords are encrypted solely with the DEK.
4. Changing the Master Password only requires re-encrypting the 32-byte DEK once, eliminating the need to re-encrypt all stored records in the database.

### C. Offline BIP-39 Recovery Phrase

1. The app generates a 12- or 24-word BIP-39 mnemonic recovery phrase upon first initialization.
2. The recovery phrase independently encrypts a duplicate copy of the DEK.
3. If the user forgets their Master Password, inputting the BIP-39 phrase decrypts the DEK and restores access to the vault without remote servers or developer intervention.

### D. Credential Ciphertext (AES-256-GCM)

- Every credential password is encrypted using AES-256-GCM.
- Each entry generates a unique 12-byte Initialization Vector (IV).
- An authentication tag (Auth Tag) is generated and stored per entry, ensuring protection against ciphertext tampering, bit-flipping, and padding oracle exploits.

---

## 5. Sandboxed Database Architecture

Data is stored within the application's isolated sandboxed storage on Android using `expo-sqlite`. Other applications cannot access this file.

### Table: `vault_metadata`

Stores initialization parameters and envelope encryption payloads.

| Column                   | Type                | Description                                 |
| :----------------------- | :------------------ | :------------------------------------------ |
| `id`                     | INTEGER PRIMARY KEY | Singleton metadata identifier               |
| `salt`                   | TEXT NOT NULL       | Cryptographic salt for PBKDF2/Argon2        |
| `encrypted_dek`          | TEXT NOT NULL       | DEK encrypted with Master Password KEK      |
| `dek_iv`                 | TEXT NOT NULL       | IV used for DEK encryption                  |
| `dek_tag`                | TEXT NOT NULL       | GCM authentication tag for DEK              |
| `recovery_encrypted_dek` | TEXT NOT NULL       | DEK encrypted with BIP-39 recovery key      |
| `recovery_iv`            | TEXT NOT NULL       | IV used for recovery key encryption         |
| `recovery_tag`           | TEXT NOT NULL       | GCM authentication tag for recovery key     |
| `is_biometric_enabled`   | INTEGER DEFAULT 0   | Flag indicating biometric unlock preference |
| `created_at`             | INTEGER             | Initialization timestamp                    |

### Table: `credentials`

Stores account metadata and encrypted password payloads.

| Column               | Type                              | Description                                        |
| :------------------- | :-------------------------------- | :------------------------------------------------- |
| `id`                 | INTEGER PRIMARY KEY AUTOINCREMENT | Unique record identifier                           |
| `identity`           | TEXT NOT NULL                     | Plaintext email, username, or account identity     |
| `label`              | TEXT NOT NULL                     | Plaintext service name (e.g., Spotify, Work Email) |
| `encrypted_password` | TEXT NOT NULL                     | AES-256-GCM ciphertext                             |
| `iv`                 | TEXT NOT NULL                     | Unique initialization vector for this record       |
| `auth_tag`           | TEXT NOT NULL                     | Authentication tag for integrity validation        |
| `created_at`         | INTEGER                           | Record creation timestamp                          |
| `updated_at`         | INTEGER                           | Record modification timestamp                      |

_Note: Storing identities and labels in plaintext within the local sandbox allows instant on-device filtering, sorting, and indexing while preserving confidentiality for secret payloads._

---

## 6. User Interface & Workflow

The interface follows a dark, high-contrast, text-only design system utilizing native fonts for minimal footprint and battery efficiency.

### Screen 1: Dashboard (Identity Directory)

- Groups stored credentials by identity (e.g., `user@gmail.com`, `work_alias`).
- Displays an account count badge for each identity row.
- Fast search filter bar to quickly locate services and usernames.
- Tap an identity row to navigate directly to its associated services.

### Screen 2: Label Vault (Detail Screen)

- Displays service cards associated with the selected identity (e.g., Spotify, Personal Banking).
- Card actions:
    - **View:** Prompts for biometric or PIN verification. On success, decrypts the password into memory and displays it alongside a 30-second countdown timer. At 0 seconds, the view automatically reverts to masked text (`••••••••`).
    - **Copy:** Copies the decrypted password to the system clipboard and initiates a 30-second clipboard wipe timer.
    - **Edit:** Requires biometric or PIN re-verification to alter existing credentials.
    - **Delete:** Requires biometric or PIN re-verification followed by a native confirmation prompt to prevent accidental deletions.

### Ephemeral State & In-Memory Protections

- Decrypted passwords are stored only in temporary component state.
- If the user minimizes the application or switches tasks, active timers scrub memory and the vault locks immediately.

---

## 7. Operating System & Hardware Protections

### Strict Network Isolation

- The `android.permission.INTERNET` flag is stripped from the compiled `AndroidManifest.xml`.
- Android's operating system sandbox hard-blocks any socket creation or external data routing.

### Window Security (`FLAG_SECURE`)

- The application runs with the Android `FLAG_SECURE` window attribute active.
- Prevents screenshots and screen recordings of decrypted passwords.
- Automatically blacks out or blurs the application preview in the Android recent apps switcher.

### Android 13+ Sensitive Clipboard Flag

- When copying credentials to the clipboard, the item is tagged with `ClipDescription.EXTRA_IS_SENSITIVE`.
- Prevents Android 13+ from rendering the plain-text password in the floating clipboard preview overlay.
- A background timer purges the clipboard contents after 30 seconds.

### App Lifecycle Auto-Lock

- Listens to Android `AppState` lifecycle transitions.
- If the application enters the `background` or `inactive` state, the vault locks instantly, invalidating active biometric sessions.

---

## 8. Offline Backup & Data Portability

SafeVault supports local encrypted backup and restore without network connectivity:

- **Encrypted Container Export:** The entire vault (identities, labels, and password records) is serialized and encrypted into a single container file using AES-256-GCM.
- **Storage Access Framework (SAF):** Backups are written directly to user-selected locations on local storage or external media (e.g., USB drive, PC transfer) without requesting broad storage permissions.
- **Integrity Verified Import:** Restoring requires the backup password or master key. If the file has been tampered with, the GCM authentication tag fails and the import is safely aborted.
