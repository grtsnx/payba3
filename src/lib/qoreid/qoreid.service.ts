import { Injectable } from '@nestjs/common';
import {
  fetchQoreIDToken,
  getValidQoreIDAccessToken,
  getQoreIDCredentials,
  requestQoreID,
  QOREID_BASE_URL,
} from './config/qoreid.helper';
import type {
  QoreIDCredentials,
  QoreIDEnvironment,
  QoreIDTokenCache,
  QoreIDVerifyCacResponse,
} from './config/qoreid.types';

@Injectable()
export class QoreIDService {
  private readonly baseUrl = QOREID_BASE_URL;
  private readonly credentials: QoreIDCredentials;
  private token?: QoreIDTokenCache;

  constructor() {
    const environment = (process.env.NODE_ENV ??
      'development') as QoreIDEnvironment;
    this.credentials = getQoreIDCredentials(environment);
  }

  async getToken(): Promise<string> {
    this.token = await getValidQoreIDAccessToken(this.token, () =>
      fetchQoreIDToken(this.baseUrl, this.credentials),
    );
    return this.token.accessToken;
  }

  async verifyCacNumber(cacNumber: string): Promise<QoreIDVerifyCacResponse> {
    const token = await this.getToken();

    return requestQoreID<QoreIDVerifyCacResponse>({
      baseUrl: this.baseUrl,
      endpoint: '/v1/ng/identities/cac-basic',
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
