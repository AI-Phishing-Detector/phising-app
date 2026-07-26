import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";

import type { ScanResult } from "../types/scan";

type ScanResultCardProps = {
  result: ScanResult;
};

export function ScanResultCard({ result }: ScanResultCardProps) {
  const isSafe = result.verdict === "safe";
  const entranceAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.timing(entranceAnimation, {
      toValue: 1,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });

    animation.start();

    return () => {
      animation.stop();
    };
  }, [entranceAnimation]);

  const translateY = entranceAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [18, 0],
  });

  return (
    <Animated.View
      accessible
      accessibilityLabel={`Analiz sonucu: ${
        isSafe ? "Güvenli" : "Tehlikeli"
      }. Yüzde ${result.riskScore} risk. ${result.message}`}
      style={[
        styles.container,
        isSafe ? styles.safeContainer : styles.dangerousContainer,
        {
          opacity: entranceAnimation,
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text
            style={[
              styles.status,
              isSafe ? styles.safeText : styles.dangerousText,
            ]}
          >
            {isSafe ? "GÜVENLİ" : "TEHLİKELİ"}
          </Text>

          <Text style={styles.title}>{result.title}</Text>
        </View>

        <View
          style={[
            styles.riskBadge,
            isSafe ? styles.safeBadge : styles.dangerousBadge,
          ]}
        >
          <Text style={styles.riskBadgeText}>%{result.riskScore} risk</Text>
        </View>
      </View>

      <Text style={styles.message}>{result.message}</Text>

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>Analiz durumu</Text>

        <Text style={styles.infoText}>
          {isSafe
            ? "Bağlantıda bilinen şüpheli işaretlere rastlanmadı."
            : "Bu bağlantıyı açmadan önce dikkatli olun ve kişisel bilgi girmeyin."}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 18,
    borderWidth: 1,
    borderRadius: 18,
    padding: 17,
  },

  safeContainer: {
    backgroundColor: "#f0fdf4",
    borderColor: "#bbf7d0",
  },

  dangerousContainer: {
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
  },

  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },

  headerText: {
    flex: 1,
    paddingRight: 12,
  },

  status: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginBottom: 6,
  },

  safeText: {
    color: "#15803d",
  },

  dangerousText: {
    color: "#b91c1c",
  },

  title: {
    color: "#050505",
    fontSize: 20,
    fontWeight: "700",
  },

  riskBadge: {
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },

  safeBadge: {
    backgroundColor: "#15803d",
  },

  dangerousBadge: {
    backgroundColor: "#b91c1c",
  },

  riskBadgeText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },

  message: {
    color: "#404040",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 12,
  },

  infoBox: {
    backgroundColor: "rgba(255, 255, 255, 0.75)",
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.08)",
    borderRadius: 14,
    padding: 13,
    marginTop: 14,
  },

  infoTitle: {
    color: "#171717",
    fontSize: 13,
    fontWeight: "700",
  },

  infoText: {
    color: "#525252",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
  },
});
