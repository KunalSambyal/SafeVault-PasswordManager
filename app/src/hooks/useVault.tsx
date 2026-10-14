import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    ReactNode,
} from "react";
import {
    isVaultInitialized,
    getVaultMetadata,
    initializeVaultMetadata,
    getIdentitiesWithCounts,
} from "../db";
import {
    initializeEnvelope,
    unlockDekWithPassword,
    unlockDekWithMnemonic,
    storeSessionDek,
    getSessionDek,
    clearSessionDek,
    generateSalt,
    deriveKeyFromPassword,
    encryptAESGCM,
    bytesToHex,
} from "../crypto";
import { IdentitySummary } from "../types/database";
import {
    initializeVaultFromMigration,
    MigrationCredentialItem,
} from "../utils/migrationService";

interface VaultContextType {
    isReady: boolean;
    isInitialized: boolean;
    isUnlocked: boolean;
    dek: Uint8Array | null;
    identities: IdentitySummary[];
    unlockWithPassword: (password: string) => Promise<boolean>;
    unlockWithMnemonicPhrase: (mnemonic: string) => Promise<boolean>;
    prepareRecoveryWithMnemonic: (mnemonic: string) => Promise<boolean>;
    abortRecovery: () => void;
    resetMasterPassword: (newPassword: string) => Promise<void>;
    unlockWithBiometricSession: () => Promise<boolean>;
    setupNewVault: (masterPassword: string) => Promise<string>;
    setupVaultFromMigration: (
        items: MigrationCredentialItem[],
        masterPassword: string,
    ) => Promise<string>;
    completeOnboarding: () => Promise<void>;
    lockVault: (clearBiometrics?: boolean) => Promise<void>;
    refreshIdentities: () => Promise<void>;
}

const VaultContext = createContext<VaultContextType | null>(null);

export function VaultProvider({ children }: { children: ReactNode }) {
    const [isReady, setIsReady] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [dek, setDek] = useState<Uint8Array | null>(null);
    const [identities, setIdentities] = useState<IdentitySummary[]>([]);

    useEffect(() => {
        checkInitialState();
    }, []);

    async function checkInitialState() {
        try {
            const initialized = await isVaultInitialized();
            setIsInitialized(initialized);
        } catch (err) {
            console.error("Failed to initialize vault state", err);
        } finally {
            setIsReady(true);
        }
    }

    async function loadIdentities() {
        try {
            const list = await getIdentitiesWithCounts();
            setIdentities(list);
        } catch (err) {
            console.error("Failed to load identities", err);
        }
    }

    async function setupNewVault(masterPassword: string): Promise<string> {
        const { metadata, dek: initializedDek } =
            initializeEnvelope(masterPassword);

        await initializeVaultMetadata({
            salt: metadata.salt,
            encrypted_dek: metadata.encryptedDek.ciphertext,
            dek_iv: metadata.encryptedDek.iv,
            dek_tag: metadata.encryptedDek.tag,
            recovery_encrypted_dek: metadata.recoveryEncryptedDek.ciphertext,
            recovery_iv: metadata.recoveryEncryptedDek.iv,
            recovery_tag: metadata.recoveryEncryptedDek.tag,
            is_biometric_enabled: 1,
            created_at: Math.floor(Date.now() / 1000),
        });

        await storeSessionDek(initializedDek);
        setDek(initializedDek);

        return metadata.mnemonic;
    }

    async function setupVaultFromMigration(
        items: MigrationCredentialItem[],
        masterPassword: string,
    ): Promise<string> {
        const { mnemonic, dek: initializedDek } =
            await initializeVaultFromMigration(items, masterPassword);
        setDek(initializedDek);
        return mnemonic;
    }

    async function completeOnboarding(): Promise<void> {
        setIsInitialized(true);
        setIsUnlocked(true);
        await loadIdentities();
    }

    async function unlockWithBiometricSession(): Promise<boolean> {
        const cachedDek = await getSessionDek();
        if (!cachedDek) return false;

        setDek(cachedDek);
        setIsUnlocked(true);
        await loadIdentities();
        return true;
    }

    async function unlockWithPassword(password: string): Promise<boolean> {
        const meta = await getVaultMetadata();
        if (!meta) return false;

        try {
            const unlockedDek = unlockDekWithPassword(password, meta.salt, {
                ciphertext: meta.encrypted_dek,
                iv: meta.dek_iv,
                tag: meta.dek_tag,
            });

            await storeSessionDek(unlockedDek);

            setDek(unlockedDek);
            setIsUnlocked(true);
            await loadIdentities();
            return true;
        } catch {
            return false;
        }
    }

    // Direct recovery that unlocks to dashboard
    async function unlockWithMnemonicPhrase(
        mnemonic: string,
    ): Promise<boolean> {
        const meta = await getVaultMetadata();
        if (!meta) return false;

        try {
            const unlockedDek = unlockDekWithMnemonic(mnemonic, {
                ciphertext: meta.recovery_encrypted_dek,
                iv: meta.recovery_iv,
                tag: meta.recovery_tag,
            });

            await storeSessionDek(unlockedDek);

            setDek(unlockedDek);
            setIsUnlocked(true);
            await loadIdentities();
            return true;
        } catch {
            return false;
        }
    }

    // Prepares recovery without unlocking UI, holding DEK in memory for password reset
    async function prepareRecoveryWithMnemonic(
        mnemonic: string,
    ): Promise<boolean> {
        const meta = await getVaultMetadata();
        if (!meta) return false;

        try {
            const unlockedDek = unlockDekWithMnemonic(mnemonic, {
                ciphertext: meta.recovery_encrypted_dek,
                iv: meta.recovery_iv,
                tag: meta.recovery_tag,
            });

            setDek(unlockedDek);
            return true;
        } catch {
            return false;
        }
    }

    function abortRecovery(): void {
        setDek(null);
    }

    // Re-encrypts DEK with new Master Password KEK and completes unlock
    async function resetMasterPassword(newPassword: string): Promise<void> {
        if (!dek) throw new Error("Vault is not unlocked");

        const salt = generateSalt(32);
        const newKek = deriveKeyFromPassword(newPassword, salt);
        const encryptedDek = encryptAESGCM(bytesToHex(dek), newKek);

        const meta = await getVaultMetadata();
        if (!meta) throw new Error("Metadata missing");

        await initializeVaultMetadata({
            salt,
            encrypted_dek: encryptedDek.ciphertext,
            dek_iv: encryptedDek.iv,
            dek_tag: encryptedDek.tag,
            recovery_encrypted_dek: meta.recovery_encrypted_dek,
            recovery_iv: meta.recovery_iv,
            recovery_tag: meta.recovery_tag,
            is_biometric_enabled: 1,
            created_at: meta.created_at,
        });

        storeSessionDek(dek).catch((err) =>
            console.warn("Background keystore update error", err),
        );

        setIsUnlocked(true);
        await loadIdentities();
    }

    async function lockVault(clearBiometrics = false): Promise<void> {
        if (clearBiometrics) {
            await clearSessionDek();
        }
        setDek(null);
        setIsUnlocked(false);
    }

    return (
        <VaultContext.Provider
            value={{
                isReady,
                isInitialized,
                isUnlocked,
                dek,
                identities,
                unlockWithPassword,
                unlockWithMnemonicPhrase,
                prepareRecoveryWithMnemonic,
                abortRecovery,
                resetMasterPassword,
                unlockWithBiometricSession,
                setupNewVault,
                setupVaultFromMigration,
                completeOnboarding,
                lockVault,
                refreshIdentities: loadIdentities,
            }}
        >
            {children}
        </VaultContext.Provider>
    );
}

export function useVault(): VaultContextType {
    const context = useContext(VaultContext);
    if (!context) {
        throw new Error("useVault must be used within a VaultProvider");
    }
    return context;
}
