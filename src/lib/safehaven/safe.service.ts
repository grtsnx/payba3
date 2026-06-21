import {
  BadGatewayException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type SafehavenEnvironment = 'sandbox' | 'live';
type HttpMethod = 'GET' | 'POST';

type SafehavenTokenResponse = {
  access_token: string;
  client_id: string;
  token_type: 'Bearer';
  expires_in: number;
  refresh_token: string;
  ibs_client_id: string;
  ibs_user_id: string;
};

export type CreateSafehavenSubAccountPayload = {
  phoneNumber: string;
  identityType: string;
  identityId: string;
  emailAddress: string;
  externalReference: string;
  autoSweep?: boolean;
};

export type SafehavenSubAccountResponse = {
  statusCode: number;
  message: string;
  data: Record<string, unknown>;
};

type SafehavenRequestOptions = {
  method?: HttpMethod;
  body?: unknown;
  accessToken?: string;
  headers?: Record<string, string>;
};

const SAFEHAVEN_BASE_URLS: Record<SafehavenEnvironment, string> = {
  sandbox: 'https://api.sandbox.safehavenmfb.com',
  live: 'https://api.safehavenmfb.com',
};

@Injectable()
export class SafehavenService {
  private readonly baseUrl: string;
  private readonly clientId: string;
  private readonly clientAssertion: string;
  private token?: { accessToken: string; expiresAt: number };

  constructor(private readonly configService: ConfigService) {
    const environment = this.configService.get<SafehavenEnvironment>(
      'SAFEHAVEN_ENVIRONMENT',
      'sandbox',
    );

    this.baseUrl =
      this.configService.get<string>('SAFEHAVEN_BASE_URL') ??
      SAFEHAVEN_BASE_URLS[environment];
    this.clientId = this.configService.get<string>('SAFEHAVEN_CLIENT_ID') ?? '';
    this.clientAssertion =
      this.configService.get<string>('SAFEHAVEN_CLIENT_ASSERTION') ?? '';
  }

  async getAccessToken(): Promise<SafehavenTokenResponse> {
    const response = await this.request<SafehavenTokenResponse>(
      '/oauth2/token',
      {
        method: 'POST',
        body: {
          grant_type: 'client_credentials',
          client_assertion_type:
            'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
          client_id: this.getClientId(),
          client_assertion: this.getClientAssertion(),
        },
      },
    );

    this.token = {
      accessToken: response.access_token,
      expiresAt: Date.now() + response.expires_in * 1000,
    };

    return response;
  }

  async createSubAccount(
    payload: CreateSafehavenSubAccountPayload,
  ): Promise<SafehavenSubAccountResponse> {
    const accessToken = await this.getValidAccessToken();

    return this.request<SafehavenSubAccountResponse>(
      '/accounts/v2/subaccount',
      {
        method: 'POST',
        accessToken,
        headers: {
          ClientID: this.getClientId(),
        },
        body: {
          autoSweep: false,
          ...payload,
        },
      },
    );
  }

  private async getValidAccessToken(): Promise<string> {
    const tokenRefreshBufferMs = 60_000;

    if (this.token && this.token.expiresAt - tokenRefreshBufferMs > Date.now()) {
      return this.token.accessToken;
    }

    const token = await this.getAccessToken();
    return token.access_token;
  }

  private async request<T>(
    endpoint: string,
    options: SafehavenRequestOptions = {},
  ): Promise<T> {
    const headers = this.buildHeaders(options);

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const responseBody = await this.parseResponse(response);

    if (!response.ok) {
      this.throwSafehavenError(response.status, responseBody);
    }

    return responseBody as T;
  }

  private buildHeaders(options: SafehavenRequestOptions) {
    return {
      accept: 'application/json',
      'content-type': 'application/json',
      ...(options.accessToken
        ? { authorization: `Bearer ${options.accessToken}` }
        : {}),
      ...options.headers,
    };
  }

  private async parseResponse(response: Response): Promise<unknown> {
    const text = await response.text();

    if (!text) {
      return null;
    }

    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  private throwSafehavenError(status: number, responseBody: unknown): never {
    if (status === 401) {
      throw new UnauthorizedException({
        message: 'Unauthorized request to Safehaven',
        data: responseBody,
      });
    }

    throw new BadGatewayException({
      message: 'Safehaven request failed',
      data: responseBody,
    });
  }

  private getClientId(): string {
    if (!this.clientId) {
      throw new InternalServerErrorException(
        'SAFEHAVEN_CLIENT_ID is not configured',
      );
    }

    return this.clientId;
  }

  private getClientAssertion(): string {
    if (!this.clientAssertion) {
      throw new InternalServerErrorException(
        'SAFEHAVEN_CLIENT_ASSERTION is not configured',
      );
    }

    return this.clientAssertion;
  }
}
