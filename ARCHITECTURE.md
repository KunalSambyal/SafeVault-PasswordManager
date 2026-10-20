# SafeVault Architecture

SafeVault is an Android password manager built with React Native, Expo, TypeScript, and SQLite. The application is local-first: credential storage, encryption, backup, and migration are handled on the device.

## Application structure

```text
App
|-- ThemeProvider
|-- VaultProvider
`-- Navigation
    |-- Onboarding
    |-- Unlock
    `-- Authenticated vault
        |-- Dashboard
        |-- Label vault
        `-- Add/edit credential modal
```

`App.tsx` selects the active navigation branch from the vault state and listens for app lifecycle changes. `VaultProvider` owns the in-memory vault key, the locked/unlocked state, and the dashboard identity summaries. `ThemeProvider` loads and saves the selected theme.

### Main flows

```text
Create or unlock vault
  -> obtain data-encryption key (DEK)
  -> load credential identities
  -> display dashboard

Add or edit credential
  -> encrypt password with DEK
  -> create local snapshot
  -> write SQLite record
  -> refresh identity list
```

The dashboard groups records by identity. Selecting an identity opens its credential list. That screen handles viewing, copying, editing, and deleting individual records. The dashboard also hosts the export, import, settings, and help interfaces.

## Platform configuration

The Expo configuration:

- limits the app to portrait orientation;
- blocks Android network permissions;
- enables the SQLite, SecureStore, local-authentication, and sharing integrations; and
- applies custom Android config plugins for `FLAG_SECURE` and physical-device CPU architectures.

The app watches `AppState` transitions. Its auto-lock behavior uses the timeout stored in the application settings. Document-picker and sharing flows temporarily pause that check while the operating-system interface is open.

## Key and encryption flow

SafeVault uses an envelope model. Credential passwords are encrypted with a randomly generated Data Encryption Key (DEK). A key derived from the master password encrypts the DEK, so changing the master password only requires encrypting the DEK again.

```text
Master password --PBKDF2--> key-encryption key --AES-GCM--> encrypted DEK
Recovery phrase ----------> recovery key        --AES-GCM--> recovery encrypted DEK

DEK --AES-GCM--> encrypted credential password
```

The crypto helpers use `@noble/ciphers`, `@noble/hashes`, `@scure/bip39`, and Expo random-byte support. The recovery phrase is generated during onboarding and provides a second way to unwrap the DEK during the recovery flow. The active DEK is also managed as a session value through SecureStore.

## Local storage

`expo-sqlite` opens a single database connection and initializes the schema and indexes. It enables SQLite write-ahead logging and foreign-key support.

### `vault_metadata`

This singleton table stores the information required to open the vault:

- master-password salt;
- master-password encrypted DEK and its IV/tag;
- recovery encrypted DEK and its IV/tag;
- biometric preference value; and
- vault creation time.

### `credentials`

Each credential record contains:

- `identity` and `label` for grouping and display;
- the encrypted password with its IV and authentication tag; and
- creation and update timestamps.

The repository layer provides queries for identity summaries, records for one identity, individual records, and all records. It also owns add, update, and delete operations.

## Screens and components

| Area           | Responsibility                                                                             |
| :------------- | :----------------------------------------------------------------------------------------- |
| Onboarding     | Creates a vault or imports an existing migration, then presents the recovery phrase.       |
| Unlock         | Opens the vault with a master password, recovery phrase, or biometric session.             |
| Dashboard      | Filters identities and opens the drawer, export, import, settings, and help features.      |
| Label vault    | Lists credentials for one identity and provides credential actions.                        |
| Add/edit modal | Collects credential input, invokes the generator, and encrypts the password before saving. |
| Theme context  | Provides dark and light color tokens and persists the chosen theme.                        |

Passwords can be shown temporarily in the credential list. The view maintains a 30-second countdown for each revealed item before masking it again.

## Backup and migration

Before credential additions, updates, and deletions, the repository asks the backup utility to write a JSON snapshot. The utility retains three rotating files in the app document directory:

```text
backup_v1.json  most recent snapshot
backup_v2.json  previous snapshot
backup_v3.json  oldest retained snapshot
```

The settings screen can list, create, and restore those snapshots.

Export decrypts the current credential passwords with the active DEK, places them in a migration payload, then encrypts that payload with a user-provided backup password. Import reverses this process. An active vault can merge or replace credentials; onboarding can create a new vault from imported credentials, using a new DEK and recovery phrase.
