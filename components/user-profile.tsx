/**
 * User Profile Component
 * Displays user info and sign out button
 */

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import { useAuth } from "@/context/auth-context";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Image } from "expo-image";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";

export function UserProfile() {
  const { user, signOut, isLoading } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  if (!user) return null;

  return (
    <ThemedView style={styles.container}>
      <View style={styles.profileRow}>
        {user.picture ? (
          <Image
            source={{ uri: user.picture }}
            style={styles.avatar}
            contentFit="cover"
          />
        ) : (
          <View
            style={[styles.avatarPlaceholder, { backgroundColor: colors.tint }]}
          >
            <ThemedText style={styles.avatarInitial}>
              {user.name?.[0]?.toUpperCase() || "U"}
            </ThemedText>
          </View>
        )}
        <View style={styles.userInfo}>
          <ThemedText style={styles.userName}>{user.name}</ThemedText>
          <ThemedText style={styles.userEmail}>{user.email}</ThemedText>
        </View>
      </View>

      <Pressable
        onPress={signOut}
        disabled={isLoading}
        style={({ pressed }) => [
          styles.signOutButton,
          pressed && styles.signOutButtonPressed,
          isLoading && styles.signOutButtonDisabled,
        ]}
      >
        <ThemedText style={styles.signOutText}>Sign Out</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitial: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },
  userInfo: {
    marginLeft: 12,
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
  },
  userEmail: {
    fontSize: 14,
    opacity: 0.6,
    marginTop: 2,
  },
  signOutButton: {
    backgroundColor: "rgba(255, 59, 48, 0.1)",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  signOutButtonPressed: {
    backgroundColor: "rgba(255, 59, 48, 0.2)",
  },
  signOutButtonDisabled: {
    opacity: 0.5,
  },
  signOutText: {
    color: "#ff3b30",
    fontWeight: "600",
  },
});

export default UserProfile;
