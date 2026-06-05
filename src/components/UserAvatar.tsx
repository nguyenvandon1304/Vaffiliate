/**
 * Avatar hiển thị user — dùng chung cho mọi header/dropdown trong dashboard.
 * Nếu user có avatar (URL ảnh hoặc base64): render <img>
 * Nếu không: render chữ cái đầu của tên với gradient orange-amber.
 */

interface UserAvatarProps {
  /** URL ảnh avatar (http/base64) hoặc null */
  avatar: string | null | undefined;
  /** Chuỗi để lấy chữ cái đầu khi không có avatar */
  name: string | null | undefined;
  /** Kích thước container (mặc định 36 = w-9 h-9) */
  size?: number;
  /** Font size chữ cái (mặc định 14 = text-sm) */
  fontSize?: number;
  /** Thêm className tuỳ chỉnh */
  className?: string;
}

function isAvatarUrl(value: string | null | undefined): boolean {
  if (!value) return false;
  return value.startsWith("http://") || value.startsWith("https://") ||
    value.startsWith("data:image/") || value.startsWith("/");
}

export function UserAvatar({ avatar, name, size = 36, fontSize = 14, className = "" }: UserAvatarProps) {
  const initial = (name || "U").charAt(0).toUpperCase();

  if (isAvatarUrl(avatar)) {
    return (
      <img
        src={avatar as string}
        alt={initial}
        className={`rounded-full object-cover ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className={`rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white font-bold shadow-md shadow-orange-500/30 ${className}`}
      style={{ width: size, height: size, fontSize }}
    >
      {initial}
    </div>
  );
}
