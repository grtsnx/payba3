import { Payba3Error, type Payba3ErrorBody } from './payba3-error';

export type HandleResponseBody = Payba3ErrorBody;

export class handleResponse extends Payba3Error {
  constructor(
    public statusCode: number,
    public message: string,
    public data?: unknown,
  ) {
    super(message, {
      statusCode,
      data,
    });
  }
}
