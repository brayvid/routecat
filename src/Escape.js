import React from "react";
import { View, Text } from "react-native";

export default function Escape() {
  return (
    <View style={styles.container}>
      <Text style={styles.description}>
        Hit <Text style={styles.command}>Esc</Text> first
      </Text>
    </View>
  );
}

const styles = {
  container: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 24,
  },
  command: {
    fontSize: 40,
    color: "#7DF9FF",
    textShadowColor: "#7DF9FF",

    fontFamily: "Orbitron",

    textShadowOffset: { width: -2, height: 2 },
    textShadowRadius: 30,
  },
  description: {
    fontSize: 30,
    color: "#7fff00",
    textShadowColor: "#7fff00",
    fontFamily: "Orbitron",

    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 30,
  },
};
