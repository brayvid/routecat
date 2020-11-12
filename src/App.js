// Cody Pierce https://github.com/codypearce/howtoexitvim
import React from "react";
import ReactDOM from "react-dom";

import { Text, StyleSheet, View } from "react-native";
import Container from "./Container";
import Command from "./Command";
import Title from "./Title";
import Escape from "./Escape";

export default class App extends React.Component {
  render() {
    return (
      <Container>
        <Title title={"How to Exit Vim"} /> <Escape />
        <View>
          <Command
            description={"Quit"}
            subDescription={"Fails if changes were made"}
            command={":q"}
          />{" "}
          <Command
            description={"Quit without writing"}
            subDescription={"Discard changes"}
            command={":q!"}
          />
          <Command
            description={"Write current file and Quit"}
            subDescription={"Saves changes even if there arent any"}
            command={":wq"}
          />{" "}
          <Command
            description={"Write current file and Quit"}
            subDescription={"Saves changes only if there are changes"}
            command={":x"}
          />{" "}
          <Command
            description={"Quit without writing"}
            subDescription={"Discard changes"}
            command={"shift + ZQ"}
          />{" "}
          <Command
            description={"Write current file and Quit"}
            subDescription={"Saves changes only if there are changes"}
            command={"shift + ZZ"}
          />{" "}
        </View>{" "}
      </Container>
    );
  }
}
