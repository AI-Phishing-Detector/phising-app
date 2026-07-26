import { StyleSheet, Text, View } from "react-native";

import { colors } from "../../constants/theme";

export function SecurityNote() {
  return (
    <View style={styles.container}>
      <View style={styles.icon}>
        <Text style={styles.iconText}>!</Text>
      </View>

      <Text style={styles.text}>
        Şüpheli bağlantılara tıklamayın ve kişisel bilgilerinizi paylaşmayın.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f7f7f7",
    borderRadius: 16,
    padding: 14,
    marginTop: 20,
  },
  icon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: colors.text,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  iconText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: "800",
  },
  text: {
    flex: 1,
    color: "#626262",
    fontSize: 12,
    lineHeight: 17,
  },
});
