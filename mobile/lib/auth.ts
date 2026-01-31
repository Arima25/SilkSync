import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { makeRedirectUri } from "expo-auth-session";

WebBrowser.maybeCompleteAuthSession();

export function useGoogleAuth() {
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: "YOUR_IOS_CLIENT_ID.apps.googleusercontent.com",
    redirectUri: makeRedirectUri({
      scheme: "silksync",
    }),
  });

  return { request, response, promptAsync };
}
