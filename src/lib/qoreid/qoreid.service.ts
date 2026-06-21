import { HttpStatus, Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { Redis } from 'ioredis';
import { handleResponse } from 'src/middleware';

@Injectable()
export class QoreIDService {
  private readonly redis: Redis;
  private readonly isDev: boolean;
  private readonly clientId: string | undefined;
  private readonly secret: string | undefined;
  private readonly TOKEN_KEY = 'qore';
  private readonly redisUrl = process.env.REDIS_URL || '';
  private readonly baseUrl = 'https://api.qoreid.com';

  constructor(private readonly httpService: HttpService) {
    this.redis = new Redis(this.redisUrl);
    this.isDev = process.env.NODE_ENV === 'development';
    this.clientId = this.isDev
      ? process.env.QOREID_CLIENT
      : process.env.QOREID_LIVE_CLIENT;
    this.secret = this.isDev
      ? process.env.QOREID_SECRET
      : process.env.QOREID_LIVE_SECRET;
  }

  private handleError(message: string, error: any) {
    console.error(`[QoreID] ${message}`, error?.message || error);
    throw new handleResponse(
      HttpStatus.INTERNAL_SERVER_ERROR,
      'An error occurred with the verification service',
    );
  }

  private async fetchToken(): Promise<
    | {
        accessToken: string;
        expiresIn: number;
      }
    | undefined
  > {
    try {
      const response = await lastValueFrom(
        this.httpService.post(
          this.baseUrl + '/token',
          { clientId: this.clientId, secret: this.secret },
          {
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
          },
        ),
      );
      const { accessToken, expiresIn } = response.data;
      if (!accessToken || !expiresIn) {
        this.handleError(
          'Invalid response format: Missing accessToken or expiresIn',
          response.data,
        );
      }
      return { accessToken, expiresIn };
    } catch (error: any) {
      this.handleError(
        `Error fetching QoreID token: ${error.response?.data || error.message}`,
        error,
      );
      return undefined;
    }
  }

  async getToken(): Promise<string | undefined> {
    try {
      const cachedToken = await this.redis.get(this.TOKEN_KEY);
      if (cachedToken) {
        return JSON.parse(cachedToken);
      }
      const { accessToken, expiresIn } = (await this.fetchToken()) ?? {
        accessToken: '',
        expiresIn: 0,
      };
      await this.redis.set(
        this.TOKEN_KEY,
        JSON.stringify(accessToken),
        'EX',
        expiresIn,
      );
      return accessToken;
    } catch (error: any) {
      this.handleError(`Error retrieving token: ${error.message}`, error);
    }
  }

  /**
   * Verifies a CAC number using QoreID CAC Basic endpoint.
   * @param cacNumber The CAC registration number.
   * @returns The verification data from QoreID.
   */
  async verifyCacNumber(cacNumber: string): Promise<any> {
    // Fetch the Bearer token
    const token = await this.getToken();
    if (!token) {
      this.handleError('QoreID Bearer token not found', null);
      return;
    }

    try {
      const response = await lastValueFrom(
        this.httpService.post(
          `${this.baseUrl}/v1/ng/identities/cac-basic`,
          {
            regNumber: cacNumber,
          },
          {
            headers: {
              accept: 'application/json',
              authorization: `Bearer ${token}`,
              'content-type': 'application/json',
            },
          },
        ),
      );
      return response.data;
    } catch (error: any) {
      this.handleError(
        `Error verifying CAC number: ${error.response?.data || error.message}`,
        error,
      );
      return;
    }
  }
}
