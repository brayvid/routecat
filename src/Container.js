// src/Container.js

import React from "react";
import PropTypes from "prop-types";
import { View, Text } from "react-native";

export default function Container({ children }) {
  return (
    <View style={styles.container}>
      <View style={styles.content}> {children} </View>{" "}
    </View>
  );
}

const styles = {
  container: {
    backgroundColor: "black",
    backgroundImage:
      "repeating-linear-gradient(0deg, hsla(103,11%,32%,0.09) 0px, hsla(103,11%,32%,0.09) 1px,transparent 1px, transparent 11px),repeating-linear-gradient(90deg, hsla(103,11%,32%,0.09) 0px, hsla(103,11%,32%,0.09) 1px,transparent 1px, transparent 11px),linear-gradient(90deg, hsl(317,13%,6%),hsl(317,13%,6%))",

    height: "100%",
    minHeight: "100vh",
    padding: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    maxWidth: 785,
  },
};

Container.propTypes = {
  children: PropTypes.node,
};
