import { readValidJwt } from './jwt';

describe('JWT expiry validation shared by guards and session', () => {
  const token = (payload: object) => {
    const encode = (value: object) =>
      btoa(JSON.stringify(value))
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
    return `${encode({ alg: 'HS256' })}.${encode(payload)}.signature`;
  };

  it('rejects malformed, missing, string and expired expiration claims', () => {
    for (const value of [
      'broken',
      token({}),
      token({ exp: '9999999999' }),
      token({ exp: 0 }),
    ]) {
      expect(readValidJwt(value)).toBeNull();
    }
  });

  it('preserves valid claims without treating client decoding as signature verification', () => {
    const payload = {
      exp: Math.floor(Date.now() / 1000) + 60,
      role: 'admin',
      userId: 7,
    };
    expect(readValidJwt(token(payload))).toEqual(payload);
  });
});
