import { HttpException, HttpStatus } from '@nestjs/common';

export type HandleResponseBody = {
  statusCode: number;
  statusType: string;
  message: string;
  data?: unknown;
};

export class handleResponse extends HttpException {
  constructor(
    public statusCode: number,
    public message: string,
    public data?: unknown,
  ) {
    const response: HandleResponseBody = {
      statusCode,
      statusType: HttpStatus[statusCode],
      message,
    };

    if (data !== undefined) {
      response.data = data;
    }

    super(response, statusCode);
  }

  getResponse(): HandleResponseBody {
    const response: HandleResponseBody = {
      statusCode: this.getStatus(),
      statusType: HttpStatus[this.getStatus()],
      message: this.message,
    };

    if (this.data !== undefined) {
      response.data = this.data;
    }

    return response;
  }

  getStatus(): number {
    return this.statusCode;
  }
}
