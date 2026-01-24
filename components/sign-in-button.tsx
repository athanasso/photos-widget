/**
 * Sign In Button Component
 * Google-styled sign in button
 */

import { ThemedText } from "@/components/themed-text";
import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";

interface SignInButtonProps {
  onPress: () => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export function SignInButton({
  onPress,
  isLoading = false,
  disabled = false,
}: SignInButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || isLoading}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.buttonPressed,
        (disabled || isLoading) && styles.buttonDisabled,
      ]}
    >
      <View style={styles.content}>
        {isLoading ? (
          <ActivityIndicator size="small" color="#4285F4" />
        ) : (
          <>
            <View style={styles.googleIcon}>
              <ThemedText style={styles.googleIconText}>G</ThemedText>
            </View>
            <ThemedText style={styles.buttonText}>
              Sign in with Google
            </ThemedText>
          </>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minWidth: 240,
  },
  buttonPressed: {
    backgroundColor: "#f5f5f5",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  googleIcon: {
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  googleIconText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#4285F4",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1a1a1a",
  },
});

export default SignInButton;
