export interface ErrorInterface {
  httpCode: number;
  errorCode: number;
  description: string;
}

export class ApiError extends Error {
  httpCode;

  errorCode;

  constructor(error: ErrorInterface) {
    super(error.description);
    this.httpCode = error.httpCode;
    this.errorCode = error.errorCode;
  }
}
