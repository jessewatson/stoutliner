import * as React from "react";
import * as nodes from "../types/nodes";
import { ConceptView } from "./common/ConceptView";
import "../stylesheets/main.scss";

// App component
export class App extends React.Component 
{
  // render
  render() {
    // show a progress bar while we wait for the app to load

    // render
    return (
      <div className="main">
        {children}
      </div>
    );
  }
}
