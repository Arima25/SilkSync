import { View, Text, TouchableOpacity, Image, StyleSheet, Button } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useState, useEffect } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../../firebase/firebase";
import { router } from "expo-router";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase/firebase";

export default function Profile() {
  const [image, setImage] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      const user = auth.currentUser;
      if (!user) return;

      const snap = await getDoc(doc(db, "users", user.uid));

      if (snap.exists()) {
        const data = snap.data();
        setEmail(data.email);
        if (data.avatar) {
          setImage(data.avatar);
        }
      } else {
        await setDoc(doc(db, "users", user.uid), {
          email: user.email,
          avatar: null,
          createdAt: new Date(),
        });
        setEmail(user.email);
      }
    }

    loadProfile();
  }, []);

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setImage(uri);

      const user = auth.currentUser;
      if (user) {
        await updateDoc(doc(db, "users", user.uid), {
          avatar: uri,
        });
      }
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

      <Text style={styles.info}>{email}</Text>

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
