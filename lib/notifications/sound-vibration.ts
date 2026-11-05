/**
 * Universal Push Notification, Audio Chime & Vibration Engine
 * Works across Chrome Desktop, Android Chrome, and Mobile Web Browsers
 */

let audioContextInstance: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!audioContextInstance || audioContextInstance.state === 'closed') {
      audioContextInstance = new AudioCtx();
    }
    if (audioContextInstance.state === 'suspended') {
      audioContextInstance.resume().catch(() => {});
    }
    return audioContextInstance;
  } catch {
    return null;
  }
}

/**
 * Play a synthesized, Apple-style two-tone notification chime
 */
export function playChime(isAlert = false) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (isAlert) {
      // Alert chime: 2 urgent attention tones
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now); // A4
      osc.frequency.setValueAtTime(330, now + 0.12); // E4
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
    } else {
      // Normal chime: Pleasant executive two-tone chime (D5 -> A5)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880.0, now + 0.08); // A5
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc.start(now);
      osc.stop(now + 0.45);
    }
  } catch {
    // AudioContext blocked by autoplay policy until first interaction
  }
}

/**
 * Trigger mobile device vibration haptic feedback
 */
export function triggerVibration(isAlert = false) {
  try {
    if (typeof window !== 'undefined' && 'navigator' in window && typeof navigator.vibrate === 'function') {
      if (isAlert) {
        // Urgent pattern: 250ms buzz, 100ms pause, 250ms buzz
        navigator.vibrate([250, 100, 250, 100, 350]);
      } else {
        // Normal pattern: pleasant double tap
        navigator.vibrate([120, 80, 120]);
      }
    }
  } catch {
    // Vibration not supported or denied
  }
}

/**
 * Request notification permission from browser
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  try {
    const res = await Notification.requestPermission();
    if (res === 'granted') {
      // Unlock audio context on user gesture
      getAudioContext();
      playChime(false);
      triggerVibration(false);
    }
    return res;
  } catch {
    return 'denied';
  }
}

/**
 * Dispatch real-time push notification with sound and vibration
 */
export function dispatchNotification(
  title: string,
  body: string,
  options?: { isAlert?: boolean; tag?: string }
) {
  const isAlert = options?.isAlert ?? false;

  // 1. Play sound
  playChime(isAlert);

  // 2. Trigger vibration on phones
  triggerVibration(isAlert);

  // 3. Send system OS push notification (Chrome / Android / Desktop)
  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'granted') {
      try {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.ready.then((reg) => {
            reg.showNotification(title, {
              body,
              icon: '/icons/icon-192x192.png',
              badge: '/icons/icon-192x192.png',
              tag: options?.tag || 'jbb-update',
              vibrate: isAlert ? [250, 100, 250] : [120, 80, 120],
            } as any);
          }).catch(() => {
            new Notification(title, {
              body,
              icon: '/icons/icon-192x192.png',
              tag: options?.tag || 'jbb-update',
            });
          });
        } else {
          new Notification(title, {
            body,
            icon: '/icons/icon-192x192.png',
            tag: options?.tag || 'jbb-update',
          });
        }
      } catch {
        // Notification API fallback
      }
    }
  }
}
