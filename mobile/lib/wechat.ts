import { Linking } from 'react-native';

/**
 * WeChat booking deep-link is blocked on a WeChat Open Platform app registration
 * and a real merchant/mini-program — neither exists yet (WECHAT_APP_ID is still the
 * placeholder value). This stays disabled until that setup is done; wiring the
 * actual `weixin://` / mini-program launch is the easy part once it is.
 */
const WECHAT_APP_ID = process.env.WECHAT_APP_ID;

export function isWeChatBookingConfigured(): boolean {
  return Boolean(WECHAT_APP_ID) && WECHAT_APP_ID !== 'your_wechat_app_id';
}

/**
 * Opens the WeChat mini-program booking page for a train, falling back silently
 * to `false` if WeChat isn't installed or booking isn't configured. Callers should
 * offer a fallback (e.g. the 12306 website) when this returns false.
 */
export async function openWeChatBooking(miniProgramPath: string): Promise<boolean> {
  if (!isWeChatBookingConfigured()) {
    return false;
  }

  const url = `weixin://dl/business/?appid=${WECHAT_APP_ID}&path=${encodeURIComponent(miniProgramPath)}`;

  const supported = await Linking.canOpenURL(url);
  if (!supported) {
    return false;
  }

  await Linking.openURL(url);
  return true;
}
