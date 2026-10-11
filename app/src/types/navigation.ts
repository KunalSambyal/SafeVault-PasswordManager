export type RootStackParamList = {
  Onboarding: undefined;
  Unlock: undefined;
  Dashboard: undefined;
  LabelVault: { identity: string };
  AddEditModal: {
    identity?: string;
    credentialId?: number;
    initialLabel?: string;
  };
};
