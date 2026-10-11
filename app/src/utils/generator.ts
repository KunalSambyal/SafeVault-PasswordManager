import { getRandomBytes } from "../crypto";
import { wordlist } from "@scure/bip39/wordlists/english.js";

export interface PasswordGeneratorOptions {
    length: number;
    includeUppercase: boolean;
    includeLowercase: boolean;
    includeNumbers: boolean;
    includeSymbols: boolean;
}

const UPPERCASE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWERCASE_CHARS = "abcdefghijklmnopqrstuvwxyz";
const NUMBER_CHARS = "0123456789";
const SYMBOL_CHARS = "!@#$%^&*()_+-=[]{}|;:,.<>?";

export function generatePassword(options: PasswordGeneratorOptions): string {
    let charset = "";
    if (options.includeUppercase) charset += UPPERCASE_CHARS;
    if (options.includeLowercase) charset += LOWERCASE_CHARS;
    if (options.includeNumbers) charset += NUMBER_CHARS;
    if (options.includeSymbols) charset += SYMBOL_CHARS;

    if (!charset) {
        charset = LOWERCASE_CHARS + NUMBER_CHARS;
    }

    const randomBytes = getRandomBytes(options.length);
    let result = "";
    for (let i = 0; i < options.length; i++) {
        result += charset[randomBytes[i] % charset.length];
    }

    return result;
}

export function generatePassphrase(wordCount = 4): string {
    const randomBytes = getRandomBytes(wordCount * 2);
    const words: string[] = [];

    for (let i = 0; i < wordCount; i++) {
        const index =
            ((randomBytes[i * 2] << 8) | randomBytes[i * 2 + 1]) %
            wordlist.length;
        words.push(wordlist[index]);
    }

    return words.join("-");
}

export interface PasswordStrength {
    score: number;
    label: "Very Weak" | "Weak" | "Fair" | "Strong" | "Very Strong";
    color: string;
}

export function calculatePasswordStrength(password: string): PasswordStrength {
    if (!password) {
        return { score: 0, label: "Very Weak", color: "#686460" };
    }

    let score = 0;
    if (password.length >= 8) score += 1;
    if (password.length >= 14) score += 1;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
    if (/[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) score += 1;

    switch (score) {
        case 0:
        case 1:
            return { score: 1, label: "Weak", color: "#fb7185" };
        case 2:
            return { score: 2, label: "Fair", color: "#f59e0b" };
        case 3:
            return { score: 3, label: "Strong", color: "#38bdf8" };
        case 4:
        default:
            return { score: 4, label: "Very Strong", color: "#2dd4bf" };
    }
}
