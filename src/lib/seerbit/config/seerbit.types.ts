export type SeerbitEnvironment =
  | 'sandbox'
  | 'live'
  | 'development'
  | 'production'
  | 'test'
  | 'provision';

export type NormalizedSeerbitEnvironment = 'sandbox' | 'live';

export type SeerbitCredentials = {
  publicKey: string;
  secretKey: string;
};

export type SeerbitServiceOptions = {
  environment?: SeerbitEnvironment;
  baseUrl?: string;
  credentials?: Partial<SeerbitCredentials>;
  publicKey?: string;
  secretKey?: string;
};

export type SeerbitBaseUrls = Record<NormalizedSeerbitEnvironment, string>;

export type SeerbitCreateVirtualAccountInput = {
  fullName: string;
  email: string;
  reference: string;
  bankVerificationNumber?: string;
  currency?: string;
  country?: string;
};

export type SeerbitVirtualAccountPayments = {
  reference: string;
  walletName: string;
  bankName: string;
  accountNumber: string;
};

export type SeerbitCreateVirtualAccountResult = {
  status: string;
  data: {
    code: string;
    payments: SeerbitVirtualAccountPayments;
    message: string;
  };
};

export type SeerbitEncryptedKeyResponse = {
  status: string;
  data?: {
    EncryptedSecKey?: {
      encryptedKey?: string;
    };
    EncrytedSecKey?: {
      encryptedKey?: string;
    };
  };
};

export type SeerbitRequestOptions = {
  method?: 'GET' | 'POST';
  body?: unknown;
  token?: string;
};

export type SeerbitRequestContext = {
  baseUrl: string;
  endpoint: string;
  options?: SeerbitRequestOptions;
};
