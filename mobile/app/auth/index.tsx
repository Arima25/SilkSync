import { View, Text, TextInput, Button, StyleSheet } from "react-native";
import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../firebase/firebase";
import { router, Link } from "expo-router";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSignIn() {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.replace("/(tabs)");
    } catch (err: any) {
      alert(err.message);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign In</Text>

      <TextInput
        placeholder="Email"
        style={styles.input}
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />

      <TextInput
        placeholder="Password"
        style={styles.input}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <Button title="Sign In" onPress={handleSignIn} />

      <Link href="/auth/signup" style={styles.link}>
        Don’t have an account? Create one
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 28,
    fontWeight: "600",
    marginBottom: 24,
    color: "#11181C",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 12,
    marginBottom: 16,
    color: "#11181C",
    backgroundColor: "#fff",
  },
  link: {
    marginTop: 16,
    color: "#007AFF",
    fontSize: 17,
    fontWeight: "400",
    textAlign: "center",
  },  
});
