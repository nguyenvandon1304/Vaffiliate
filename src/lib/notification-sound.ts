/**
 * Sinh âm thanh "ding-ding" thông báo bằng Web Audio API.
 * Không phụ thuộc file mp3 — bundle size = 0.
 *
 * Phải gọi từ user gesture trước khi resume AudioContext (browser policy),
 * nhưng admin đã click vào trang nên context auto-resume luôn.
 */

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    try {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioCtx = new Ctor();
    } catch {
      return null;
    }
  }
  return audioCtx;
}

/**
 * Tạo 1 tone đơn — tần số (Hz), thời lượng (giây), độ to (0-1).
 * Có envelope (attack-decay) để âm thanh không bị "click".
 */
function playTone(ctx: AudioContext, freq: number, duration: number, when: number, gain = 0.15) {
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, ctx.currentTime + when);
  env.gain.setValueAtTime(0, ctx.currentTime + when);
  env.gain.linearRampToValueAtTime(gain, ctx.currentTime + when + 0.01);
  env.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + when + duration);
  osc.connect(env);
  env.connect(ctx.destination);
  osc.start(ctx.currentTime + when);
  osc.stop(ctx.currentTime + when + duration);
}

/**
 * "Ding-ding" — 2 tone cao nhanh, kiểu thông báo Messenger/Slack.
 * Total length ~0.5s.
 */
export function playNotificationSound() {
  const ctx = getCtx();
  if (!ctx) return;
  // Một số browser pause AudioContext khi mất focus — resume trước khi play.
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  // Tone 1 — 880Hz (A5)
  playTone(ctx, 880, 0.18, 0);
  // Tone 2 — 1320Hz (E6) sau 0.15s — quãng 5
  playTone(ctx, 1320, 0.22, 0.15);
}

/**
 * "Win" jackpot — 4 tone đi lên dần (C5 → E5 → G5 → C6) tạo cảm giác chiến thắng.
 * Length ~1.2s.
 */
export function playWinSound() {
  const ctx = getCtx();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  playTone(ctx, 523, 0.18, 0, 0.18);    // C5
  playTone(ctx, 659, 0.18, 0.15, 0.18); // E5
  playTone(ctx, 784, 0.22, 0.3, 0.2);   // G5
  playTone(ctx, 1046, 0.5, 0.5, 0.22);  // C6 — sustain longer
}

/**
 * "Tick" ngắn — dùng khi vòng quay đang chạy, đập vào pin.
 * Length ~0.05s. Gain thấp để không khó chịu khi gọi nhiều lần.
 */
export function playTickSound() {
  const ctx = getCtx();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  playTone(ctx, 1800, 0.04, 0, 0.08);
}

/**
 * "Lose" — 1 tone giảm dần buồn nhẹ. Dùng cho miss/no win.
 */
export function playLoseSound() {
  const ctx = getCtx();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  playTone(ctx, 440, 0.4, 0, 0.12);
  playTone(ctx, 330, 0.5, 0.2, 0.1);
}
