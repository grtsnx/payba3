import { Injectable } from '@nestjs/common';
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
  QoreIDTokenCache,
  QoreIDVerifyCacOptions,
  QoreIDVerifyCacResponse,
} from './config/qoreid.types';

@Injectable()
export class QoreIDService {
  private readonly baseUrl: string;
  private readonly credentials: QoreIDCredentials;
  private token?: QoreIDTokenCache;

  constructor() {
    const environment = (process.env.QOREID_ENVIRONMENT ??
      process.env.NODE_ENV ??
      'sandbox') as QoreIDEnvironment;
    this.baseUrl = getQoreIDBaseUrl(environment, process.env.QOREID_BASE_URL);
    this.credentials = getQoreIDCredentials(environment);
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
