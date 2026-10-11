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
} from "../crypto";
import { IdentitySummary } from "../types/database";

interface VaultContextType {
    isReady: boolean;
    isInitialized: boolean;
    isUnlocked: boolean;
    dek: Uint8Array | null;
    identities: IdentitySummary[];
    unlockWithPassword: (password: string) => Promise<boolean>;
    unlockWithMnemonicPhrase: (mnemonic: string) => Promise<boolean>;
    setupNewVault: (masterPassword: string) => Promise<string>;
    completeOnboarding: () => Promise<void>;
    lockVault: () => Promise<void>;
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

            if (initialized) {
                const cachedDek = await getSessionDek();
                if (cachedDek) {
                    setDek(cachedDek);
                    setIsUnlocked(true);
                    await loadIdentities();
                }
            }
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

    async function completeOnboarding(): Promise<void> {
        setIsInitialized(true);
        setIsUnlocked(true);
        await loadIdentities();
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

    async function lockVault(): Promise<void> {
        await clearSessionDek();
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
                setupNewVault,
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
