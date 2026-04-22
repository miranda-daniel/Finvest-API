import { requestLogger } from '@middlewares/request-logger-middleware';
import logger from '@config/logger';
import { Request, Response, NextFunction } from 'express';
import { EventEmitter } from 'events';

jest.mock('@config/logger', () => ({
  http: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

const makeRes = (statusCode: number): Response => {
  const emitter = new EventEmitter();
  return Object.assign(emitter, { statusCode }) as unknown as Response;
};

const makeReq = (method: string, url: string, ip = '127.0.0.1'): Request =>
  ({ method, url, ip }) as unknown as Request;

describe('requestLogger middleware', () => {
  it('calls next() immediately', () => {
    const req = makeReq('GET', '/health');
    const res = makeRes(200);
    const next: NextFunction = jest.fn();

    requestLogger(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('logs method, url, ip, status code and duration on finish', () => {
    const req = makeReq('POST', '/session/login', '192.168.1.10');
    const res = makeRes(200);
    const next: NextFunction = jest.fn();

    requestLogger(req, res, next);
    res.emit('finish');

    expect(logger.http).toHaveBeenCalledTimes(1);
    const message: string = (logger.http as jest.Mock).mock.calls[0][0];
    expect(message).toContain('POST');
    expect(message).toContain('/session/login');
    expect(message).toContain('192.168.1.10');
    expect(message).toContain('200');
    expect(message).toMatch(/\d+ms/);
  });

  it('uses logger.http for 2xx responses', () => {
    const req = makeReq('GET', '/users');
    const res = makeRes(201);
    const next: NextFunction = jest.fn();

    requestLogger(req, res, next);
    res.emit('finish');

    expect(logger.http).toHaveBeenCalledTimes(1);
    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('uses logger.http for 3xx responses', () => {
    const req = makeReq('GET', '/old-path');
    const res = makeRes(301);
    const next: NextFunction = jest.fn();

    requestLogger(req, res, next);
    res.emit('finish');

    expect(logger.http).toHaveBeenCalledTimes(1);
    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('uses logger.warn for 4xx responses', () => {
    const req = makeReq('GET', '/users/999');
    const res = makeRes(404);
    const next: NextFunction = jest.fn();

    requestLogger(req, res, next);
    res.emit('finish');

    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.http).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
    const message: string = (logger.warn as jest.Mock).mock.calls[0][0];
    expect(message).toContain('404');
  });

  it('uses logger.error for 5xx responses', () => {
    const req = makeReq('POST', '/portfolios');
    const res = makeRes(500);
    const next: NextFunction = jest.fn();

    requestLogger(req, res, next);
    res.emit('finish');

    expect(logger.error).toHaveBeenCalledTimes(1);
    expect(logger.http).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
    const message: string = (logger.error as jest.Mock).mock.calls[0][0];
    expect(message).toContain('500');
  });
});
