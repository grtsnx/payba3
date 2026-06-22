import {
  buildMonoHeaders,
  buildMonoQuery,
  getMonoBaseUrl,
} from './mono.helper';

describe('Mono helpers', () => {
  it('builds required mono-sec-key auth headers', () => {
    expect(buildMonoHeaders('secret')).toMatchObject({
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'mono-sec-key': 'secret',
    });
  });

  it('trims base URL overrides', () => {
    expect(getMonoBaseUrl('https://api.example.test///')).toBe(
      'https://api.example.test',
    );
  });

  it('builds compact query strings without undefined values', () => {
    expect(
      buildMonoQuery({
        page: 1,
        include: true,
        empty: undefined,
      }),
    ).toBe('?page=1&include=true');
  });
});
