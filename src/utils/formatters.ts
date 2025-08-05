// Utility functions for formatting data and helper functions

export function formatBandwidth(bandwidthLimit: string): string {
  if (!bandwidthLimit) return "Standard Speed";
  const [download] = bandwidthLimit.split("/");
  return `${download.replace("M", "")} Mbps`;
}

export function formatDataUsage(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export function formatSessionTime(seconds: number): string {
  if (!seconds) return "0m";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");

  if (cleaned.startsWith("0")) {
    return "254" + cleaned.slice(1);
  } else if (cleaned.startsWith("254")) {
    return cleaned;
  } else if (cleaned.length <= 9) {
    return "254" + cleaned;
  }
  return cleaned;
}

export function formatCurrency(amount: number): string {
  return `KSh ${amount.toLocaleString()}`;
}

export function formatDateTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString() + " " + d.toLocaleTimeString();
}

export function formatDateOnly(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString();
}

export function formatTimeOnly(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleTimeString();
}

export function formatDuration(
  startTime: Date | string,
  endTime?: Date | string
): string {
  const start = new Date(startTime);
  const end = endTime ? new Date(endTime) : new Date();
  const diff = end.getTime() - start.getTime();
  const seconds = Math.floor(diff / 1000);

  return formatSessionTime(seconds);
}

export function formatMacAddress(mac: string): string {
  if (!mac) return "";
  // Format MAC address to standard format (XX:XX:XX:XX:XX:XX)
  const cleanMac = mac.replace(/[^a-fA-F0-9]/g, "");
  if (cleanMac.length === 12) {
    return cleanMac.match(/.{2}/g)?.join(":").toUpperCase() || mac;
  }
  return mac;
}

export function formatPercentage(value: number, total: number): string {
  if (total === 0) return "0%";
  const percentage = (value / total) * 100;
  return `${percentage.toFixed(1)}%`;
}

export function truncateString(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.substring(0, length - 3) + "...";
}

export function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function generateUsername(): string {
  const prefix = "User";
  const randomNum = Math.floor(Math.random() * 90000) + 10000; // 5-digit number
  return `${prefix}${randomNum}`;
}

export function generateRandomPassword(length: number = 8): string {
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

export function generateSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

export function validatePhoneNumber(phone: string): boolean {
  const formatted = formatPhoneNumber(phone);
  return /^254[0-9]{9}$/.test(formatted);
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function sanitizeString(str: string): string {
  return str.replace(/[<>]/g, "");
}

export function calculatePlanPrice(
  basePrice: number,
  deviceCount: number
): number {
  if (deviceCount <= 1) {
    return basePrice;
  }

  // Each additional device adds 60% of base price
  const deviceMultiplier = 0.6 * (deviceCount - 1);
  return Math.round(basePrice * (1 + deviceMultiplier));
}

export function getDeviceIcon(deviceType?: string): string {
  if (!deviceType) return "📱";

  const type = deviceType.toLowerCase();
  if (type.includes("mobile") || type.includes("phone")) return "📱";
  if (type.includes("laptop") || type.includes("computer")) return "💻";
  if (type.includes("tablet") || type.includes("ipad")) return "📱";
  if (type.includes("smart") || type.includes("iot")) return "🏠";

  return "📱";
}

export function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case "active":
      return "green";
    case "expired":
    case "terminated":
      return "red";
    case "pending":
      return "yellow";
    case "completed":
      return "green";
    case "failed":
      return "red";
    default:
      return "gray";
  }
}

export function getStatusIcon(status: string): string {
  switch (status.toLowerCase()) {
    case "active":
      return "✅";
    case "expired":
      return "⏰";
    case "terminated":
      return "❌";
    case "pending":
      return "⏳";
    case "completed":
      return "✅";
    case "failed":
      return "❌";
    default:
      return "❓";
  }
}

export function timeAgo(date: Date | string): string {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return formatDateOnly(date);
}

export function timeUntil(date: Date | string): string {
  const now = new Date();
  const future = new Date(date);
  const diffMs = future.getTime() - now.getTime();

  if (diffMs <= 0) return "expired";

  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) return `${diffMins}m left`;
  if (diffHours < 24) return `${diffHours}h ${diffMins % 60}m left`;
  if (diffDays < 7) return `${diffDays}d ${diffHours % 24}h left`;

  return `${diffDays}d left`;
}

export function isExpired(date: Date | string): boolean {
  return new Date(date) <= new Date();
}

export function addTime(date: Date | string, hours: number): Date {
  const d = new Date(date);
  d.setHours(d.getHours() + hours);
  return d;
}

export function getTimeRange(period: string): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date();
  const end = new Date();

  switch (period) {
    case "today":
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case "yesterday":
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(end.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      break;
    case "week":
      start.setDate(start.getDate() - 7);
      break;
    case "month":
      start.setMonth(start.getMonth() - 1);
      break;
    case "year":
      start.setFullYear(start.getFullYear() - 1);
      break;
    default:
      start.setDate(start.getDate() - 7);
  }

  return { start, end };
}
