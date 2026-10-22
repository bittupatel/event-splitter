import { describe, expect, it } from 'vitest';
import { cleanSupabaseKey, cleanSupabaseUrl } from './admin';

describe('cleanSupabaseUrl', () => {
  it('handles duplicated URLs separated by spaces', () => {
    const raw =
      'https://jkbzwswvxzibiuhkgmem.supabase.co https://jkbzwswvxzibiuhkgmem.supabase.co https://jkbzwswvxzibiuhkgmem.supabase.co';
    expect(cleanSupabaseUrl(raw)).toBe('https://jkbzwswvxzibiuhkgmem.supabase.co');
  });

  it('corrects .supabase.com to .supabase.co and trims trailing slashes', () => {
    expect(cleanSupabaseUrl('https://xyz.supabase.com/')).toBe('https://xyz.supabase.co');
  });

  it('handles KEY=value format and quotes', () => {
    expect(cleanSupabaseUrl('NEXT_PUBLIC_SUPABASE_URL="https://xyz.supabase.co"')).toBe(
      'https://xyz.supabase.co',
    );
  });
});

describe('cleanSupabaseKey', () => {
  it('handles duplicated keys separated by whitespace', () => {
    const raw = 'eyJhbGciOi... eyJhbGciOi...';
    expect(cleanSupabaseKey(raw)).toBe('eyJhbGciOi...');
  });

  it('handles KEY=value and surrounding quotes', () => {
    expect(cleanSupabaseKey('KEY="eyJhbGciOi..."')).toBe('eyJhbGciOi...');
  });
});
