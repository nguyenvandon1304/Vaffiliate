/**
 * Avatar hiển thị user — dùng chung cho mọi header/dropdown trong dashboard.
 * Hiển thị: ảnh (URL) > emoji > chữ cái đầu.
 */

interface UserAvatarProps {
  /** URL ảnh avatar (http/data/file path) HOẶC emoji string (🌸, 💙…) HOẶC null */
  avatar: string | null | undefined;
  /** Chuỗi để lấy chữ cái đầu khi không có avatar/emoji */
  name: string | null | undefined;
  /** Kích thước container (mặc định 36 = w-9 h-9) */
  size?: number;
  /** Font size chữ cái / emoji (mặc định 14) */
  fontSize?: number;
  /** Thêm className tuỳ chỉnh */
  className?: string;
}

/** True nếu avatar là URL ảnh hợp lệ. */
function isAvatarUrl(value: string | null | undefined): boolean {
  if (!value) return false;
  return (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("data:image/") ||
    value.startsWith("/")
  );
}

/** True nếu avatar là emoji (1–4 ký tự, ít nhất 1 emoji Unicode). */
function isAvatarEmoji(value: string | null | undefined): boolean {
  if (!value) return false;
  return /^(\p{Emoji_Presentation}|\p{Extended_Pictographic})/u.test(value);
}

export function UserAvatar({
  avatar,
  name,
  size = 36,
  fontSize = 14,
  className = "",
}: UserAvatarProps) {
  if (isAvatarUrl(avatar)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- static avatar image from own domain
      <img
        src={avatar as string}
        alt={name ?? "Avatar"}
        className={`rounded-full object-cover ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  if (isAvatarEmoji(avatar)) {
    return (
      <div
        className={`rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shadow-md shadow-orange-500/30 ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.45 }}
      >
        {avatar}
      </div>
    );
  }

  const initial = (name ?? "U").charAt(0).toUpperCase();

  return (
    <div
      className={`rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white font-bold shadow-md shadow-orange-500/30 ${className}`}
      style={{ width: size, height: size, fontSize }}
    >
      {initial}
    </div>
  );
}
