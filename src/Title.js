import React from "react";
import PropTypes from "prop-types";
import { View, Text } from "react-native";

export default function Title({ title }) {
  return <Text style={styles}> {title} </Text>;
}

const styles = {
  fontSize: 70,
  fontFamily: "Monoton",
  color: "#FF00DE",
  letterSpacing: 8,
  textShadowColor: "#FF00DE",
  textShadowOffset: {
    width: -1,
    height: 1,
  },
  textShadowRadius: 30,
  marginBottom: 16,
  textAlign: "center",
};

Title.propTypes = {
  title: PropTypes.string,
};
