import * as React from "react";
import * as nodes from "../types/nodes";
import { NodeTreeView } from "./common/NodeTreeView";
import { ConceptView } from "./common/ConceptView";
import { connect } from "react-redux";
import { ProgressBar } from "react-bootstrap";
import { NodeUtil } from "../util";

// Home page component
export class HomeClass extends React.Component 
{
  // pre-render logic
  componentWillMount() 
  {
    // initialize the app and establish the root node
    this.props.dispatch({
      type: 'APP_INIT', 
      query: this.props.location.query.q
    });
  }

  // render
  render() 
  {
    if ( !this.props.rootNodeId ) {
      return (
        <ProgressBar active now={100}/>
      );
    }

    let { rootNodeId, nodeModel } = this.props;

    let rootNode = NodeUtil.getNodeForId( nodeModel, rootNodeId );

    return (
      <div className="container">
        <div className="nav">
          <b>Concepts</b>
          <ConceptView/>
        </div>
        <div className="main">
          <div className="viewTitle" title={rootNode.relatedChildOf}>{rootNode.text+" ("+rootNode.relatedChildOf+")"}</div>
          <NodeTreeView/>
        </div>
      </div>
    );
  }
}

// export the connected class
function mapStateToProps(state) {
  return {
    rootNodeId: state.root.rootNodeId,
    nodeModel: state.nodeModel.present,
    concepts: state.conceptModel.concepts
  };
}
export const Home = connect(mapStateToProps)(HomeClass);
