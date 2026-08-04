import { Pressable, StyleSheet, Text, View } from "react-native";

import type { GuideSection } from "../../constants/phishingGuide";
import { colors } from "../../constants/theme";

type GuideSectionCardProps = {
  section: GuideSection;
  isExpanded: boolean;
  onToggle: () => void;
};

export function GuideSectionCard({
  section,
  isExpanded,
  onToggle,
}: GuideSectionCardProps) {
  return (
    <View style={[styles.container, isExpanded && styles.containerExpanded]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: isExpanded }}
        accessibilityLabel={`${section.title} bölümünü ${
          isExpanded ? "kapat" : "aç"
        }`}
        onPress={onToggle}
        style={({ pressed }) => [
          styles.header,
          pressed && styles.headerPressed,
        ]}
      >
        <View style={styles.numberBadge}>
          <Text style={styles.numberText}>{section.number}</Text>
        </View>

        <Text style={styles.title}>{section.title}</Text>

        <View
          style={[styles.toggleBadge, isExpanded && styles.toggleBadgeExpanded]}
        >
          <Text
            style={[styles.toggleText, isExpanded && styles.toggleTextExpanded]}
          >
            {isExpanded ? "−" : "+"}
          </Text>
        </View>
      </Pressable>

      {isExpanded ? (
        <View style={styles.content}>
          <Text style={styles.description}>{section.description}</Text>

          <View style={styles.itemList}>
            {section.items.map((item) => (
              <View key={`${section.id}-${item}`} style={styles.item}>
                <View style={styles.bullet} />
                <Text style={styles.itemText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 12,
  },
  containerExpanded: {
    borderColor: colors.text,
    borderWidth: 2,
  },
  header: {
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 14,
  },
  headerPressed: {
    backgroundColor: colors.subtle,
  },
  numberBadge: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.text,
    alignItems: "center",
    justifyContent: "center",
  },
  numberText: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
  },
  title: {
    flex: 1,
    color: colors.text,
    fontSize: 17,
    fontWeight: "700",
    marginHorizontal: 13,
  },
  toggleBadge: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: colors.subtle,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleBadgeExpanded: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  toggleText: {
    color: colors.text,
    fontSize: 21,
    lineHeight: 23,
    fontWeight: "500",
  },
  toggleTextExpanded: {
    color: colors.surface,
  },
  content: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingHorizontal: 16,
    paddingTop: 17,
    paddingBottom: 18,
  },
  description: {
    color: colors.textSoft,
    fontSize: 14,
    lineHeight: 22,
  },
  itemList: {
    marginTop: 17,
  },
  item: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.subtle,
    borderRadius: 14,
    paddingHorizontal: 13,
    paddingVertical: 12,
    marginBottom: 9,
  },
  bullet: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.text,
    marginTop: 6,
    marginRight: 10,
  },
  itemText: {
    flex: 1,
    color: colors.textStrong,
    fontSize: 13,
    lineHeight: 19,
  },
});
