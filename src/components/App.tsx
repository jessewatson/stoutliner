import * as React from "react";
import 'react-select/dist/react-select.css';
import "../stylesheets/main.scss"; // make sure this one always comes last so your styles override all others

// App component
export class App extends React.Component<any,any>
{
  // render
  render() {
    let children:any;
    // render
    return (

      <div className="main">
        {children}
      </div>
    );
  }
}
