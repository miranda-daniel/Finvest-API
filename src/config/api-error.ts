export interface ErrorInterface {
  code: string;
  httpCode: number;
  errorCode: number;
  description: string;
}

export class ApiError extends Error {
  code;

  httpCode;

  errorCode;

  constructor(error: ErrorInterface) {
    super(error.description);
    this.code = error.code;
    this.httpCode = error.httpCode;
    this.errorCode = error.errorCode;
  }
}
