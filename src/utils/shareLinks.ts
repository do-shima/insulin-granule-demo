import type { SceneState } from '../state/sceneState';

export function createShareUrl(
  state: Readonly<SceneState>,
  storyIndex: number | undefined,
  href = window.location.href
): string {
  const url = new URL(href);
  url.search = '';

  if (storyIndex !== undefined) {
    url.searchParams.set('story', String(storyIndex + 1));
  } else {
    url.searchParams.set('mode', state.demoMode);
  }

  if (state.presentationMode) {
    url.searchParams.set('presentation', '1');
  }

  return url.toString();
}

export function sceneStateMatchesSettings(
  state: Readonly<SceneState>,
  settings: Partial<SceneState>
): boolean {
  const settingKeys = Object.keys(settings) as Array<keyof SceneState>;

  return settingKeys.every((key) => state[key] === settings[key]);
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return copyTextWithFallback(text);
    }
  }

  return copyTextWithFallback(text);
}

function copyTextWithFallback(text: string): boolean {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', 'true');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  textarea.style.top = '0';
  document.body.appendChild(textarea);
  textarea.select();

  try {
    const copied = document.execCommand('copy');
    document.body.removeChild(textarea);

    if (!copied) {
      window.prompt('Copy this share link:', text);
    }

    return copied;
  } catch {
    document.body.removeChild(textarea);
    window.prompt('Copy this share link:', text);
    return false;
  }
}
