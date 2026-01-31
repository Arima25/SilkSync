import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import Constants from "expo-constants";

WebBrowser.maybeCompleteAuthSession();

const clientId =
  Constants.expoConfig?.extra?.googleOAuth?.webClientId;

export function useGoogleAuth() {
  return Google.useAuthRequest({
    clientId,
  });
}
