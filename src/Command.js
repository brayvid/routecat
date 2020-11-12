import React from "react";
import PropTypes from "prop-types";
import { View, Text } from "react-native";
export default function Command({ description, command, subDescription }) {
  return (
    <View style={styles.container}>
      <Text style={styles.command}>{command}</Text>
      <View style={styles.descriptionContainer}>
        <Text style={styles.description}>{description}</Text>
        {subDescription ? (
          <Text style={styles.subDescription}>({subDescription})</Text>
        ) : null}
      </View>
    </View>
  );
}
const styles = {
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  command: {
    fontSize: 40,
    color: "#7DF9FF",
    textShadowColor: "#7DF9FF",
    fontFamily: "Orbitron",
    textShadowOffset: { width: -2, height: 2 },
    textShadowRadius: 30,
    flex: 1,
    marginRight: 8,
  },
  descriptionContainer: {
    flex: 1,
  },
  description: {
    fontSize: 18,
    color: "#7fff00",
    textShadowColor: "#7fff00",
    fontFamily: "Orbitron",
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 30,
    textAlign: "right",
    marginBottom: 6,
  },
  subDescription: {
    fontSize: 12,
    color: "#59af03",
    textShadowColor: "#59af03",
    fontFamily: "Orbitron",
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 30,
    textAlign: "right",
  },
};
Command.propTypes = {
  description: PropTypes.string,
  command: PropTypes.string,
};
