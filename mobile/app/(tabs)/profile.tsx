import { View, Text, TouchableOpacity, Image, StyleSheet, Button } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../../firebase/firebase";
import { router } from "expo-router";

export default function Profile() {
  const [image, setImage] = useState<string | null>(null);

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  }

  async function handleLogout() {
    await signOut(auth);
    router.replace("/auth");
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={pickImage} style={styles.avatar}>
        {image ? (
          <Image source={{ uri: image }} style={styles.avatarImage} />
        ) : (
          <Text style={styles.avatarText}>+</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.info}>Profile details coming soon</Text>

      <View style={{ marginTop: "auto" }}>
        <Button title="Log Out" color="red" onPress={handleLogout} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#eee",
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  avatarImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarText: {
    fontSize: 40,
    color: "#888",
  },
  info: {
    textAlign: "center",
    fontSize: 16,
  },
});
