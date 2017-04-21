import * as React from "react";
//import * as nodes from "../types/nodes";
import { NodeTreeView } from "./common/NodeTreeView";
import { DocView } from "./common/DocView";
import { connect } from "react-redux";
import { NodeAction } from "../util";
import ActionHandler from "../util/ActionHandler";

interface StateProps
{
}

interface ParamProps
{
}

// Home page component
export class HomeClass extends React.PureComponent<any,any>
{
  // pre-render logic
  componentWillMount() 
  {
    // initialize the app and establish the root node
    ActionHandler.nodeAction( 
      (n:NodeAction)=> n.appInit(), true, true, true );
  }

  // render
  render() 
  {
    if ( !this.props.documentNodeRefId ) {
      return (
        null
      );
    }

    return (
      <div className="container">
        <div className="nav">
          <DocView/>
        </div>
        <div className="main">
          <NodeTreeView/>
        </div>
      </div>
    );
  }
}

// export the connected class
function mapStateToProps(state:any) {
  return {
    documentNodeRefId: state.nodeModel.present.documentNodeRefId || null
  };
}
export const Home = connect<StateProps,ParamProps,ParamProps> (mapStateToProps)(HomeClass);
