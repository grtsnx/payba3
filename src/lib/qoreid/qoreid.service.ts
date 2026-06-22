import {
  buildQoreIDCacEndpoint,
  fetchQoreIDToken,
  getQoreIDBaseUrl,
  getValidQoreIDAccessToken,
  getQoreIDCredentials,
  requestQoreID,
} from './config/qoreid.helper';
import type {
  QoreIDCreateSessionInput,
  QoreIDCreateSessionResponse,
  QoreIDCredentials,
  QoreIDEnvironment,
  QoreIDServiceOptions,
  QoreIDTokenCache,
  QoreIDVerifyCacOptions,
  QoreIDVerifyCacResponse,
} from './config/qoreid.types';

export class QoreIDService {
  private readonly baseUrl: string;
  private readonly credentials: QoreIDCredentials;
  private token?: QoreIDTokenCache;

  constructor(options: QoreIDServiceOptions = {}) {
    const environment = (process.env.QOREID_ENVIRONMENT ??
      process.env.NODE_ENV ??
      'sandbox') as QoreIDEnvironment;
    const envCredentials = getQoreIDCredentials(
      options.environment ?? environment,
    );

    this.baseUrl = getQoreIDBaseUrl(
      options.environment ?? environment,
      options.baseUrl ?? process.env.QOREID_BASE_URL,
    );
    this.credentials = {
      clientId:
        options.clientId ??
        options.credentials?.clientId ??
        envCredentials.clientId,
      secret:
        options.secret ?? options.credentials?.secret ?? envCredentials.secret,
    };
  }

  async getToken(): Promise<string> {
    this.token = await getValidQoreIDAccessToken(this.token, () =>
      fetchQoreIDToken(this.baseUrl, this.credentials),
    );
    return this.token.accessToken;
  }

  async createSession(
    input: QoreIDCreateSessionInput,
  ): Promise<QoreIDCreateSessionResponse> {
    const token = await this.getToken();

    return requestQoreID<QoreIDCreateSessionResponse>({
      baseUrl: this.baseUrl,
      endpoint: '/v1/sessions',
      options: {
        method: 'POST',
        token,
        body: input,
      },
    });
  }

  async verifyCacNumber(
    cacNumber: string,
    options: QoreIDVerifyCacOptions = {},
  ): Promise<QoreIDVerifyCacResponse> {
    const token = await this.getToken();
    const version =
      options.version ?? (options.level === 'premium' ? 'v3' : 'v1');

    return requestQoreID<QoreIDVerifyCacResponse>({
      baseUrl: this.baseUrl,
      endpoint: buildQoreIDCacEndpoint(version, options.level),
      options: {
        method: 'POST',
        token,
        body: {
          regNumber: cacNumber,
        },
      },
    });
  }
}
