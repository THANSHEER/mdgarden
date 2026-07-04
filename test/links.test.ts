import { describe, expect, it } from 'vitest';
import {
  buildSiteIndex,
  makeRenderEnv,
  outPathForSlug,
  slugifyPath,
  tagUrl,
  urlForSlug,
} from '../src/parser/links.js';
import type { Asset } from '../src/types.js';

describe('links', () => {
  it('slugifies content paths and collapses index', () => {
    expect(slugifyPath('Concepts/Wikilinks.md')).toBe('concepts/wikilinks');
    expect(slugifyPath('index.md')).toBe('');
    expect(slugifyPath('A/B/index.md')).toBe('a/b');
    expect(slugifyPath('My Note.md')).toBe('my-note');
  });

  it('builds root-relative urls', () => {
    expect(urlForSlug('')).toBe('/');
    expect(urlForSlug('concepts/wikilinks')).toBe('/concepts/wikilinks/');
    expect(outPathForSlug('a/b')).toBe('a/b/index.html');
    expect(outPathForSlug('')).toBe('index.html');
    expect(tagUrl('Guide')).toBe('/tags/guide/');
  });
});

describe('resolveEmbed: media kind detection', () => {
  function assets(): Asset[] {
    return [
      { sourcePath: 'clip.mp4', outPath: 'clip.mp4', url: '/clip.mp4' },
      { sourcePath: 'song.mp3', outPath: 'song.mp3', url: '/song.mp3' },
      { sourcePath: 'pic.png', outPath: 'pic.png', url: '/pic.png', width: 10, height: 20 },
    ];
  }

  it('resolves a video extension to kind "video"', () => {
    const env = makeRenderEnv(buildSiteIndex([], assets()));
    expect(env.resolveEmbed('clip.mp4', '')).toEqual({ kind: 'video', src: '/clip.mp4', alt: 'clip' });
  });

  it('resolves an audio extension to kind "audio"', () => {
    const env = makeRenderEnv(buildSiteIndex([], assets()));
    expect(env.resolveEmbed('song.mp3', '')).toEqual({ kind: 'audio', src: '/song.mp3', alt: 'song' });
  });

  it('still resolves an image extension to kind "image"', () => {
    const env = makeRenderEnv(buildSiteIndex([], assets()));
    expect(env.resolveEmbed('pic.png', '')).toEqual({
      kind: 'image',
      src: '/pic.png',
      alt: 'pic',
      width: 10,
      height: 20,
    });
  });

  it('exposes lookupAssetDims for known asset URLs', () => {
    const env = makeRenderEnv(buildSiteIndex([], assets()));
    expect(env.lookupAssetDims('/pic.png')).toEqual({ width: 10, height: 20 });
    expect(env.lookupAssetDims('/unknown.png')).toBeUndefined();
  });
});
