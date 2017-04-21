import * as nodes from "../../types/nodes";

import React from "react";
import { connect } from "react-redux";
import { NodeAction } from "../../util";
import ActionHandler from "../../util/ActionHandler";

class ConceptViewClass extends React.Component<any,any>
{
  constructor(props:any) 
  {
    super(props);
    this.handleClick = this.handleClick.bind(this);
  }

  render() 
  {
    const {nodeModel} = this.props;

    return (
      <div>
        {nodeModel.concepts.map((concept:nodes.Concept, index:number ) => { 
          return (
            <div key={index} className="conceptName">
              <a href="#" onClick={(event) => this.handleClick(event,concept.nodeId)} title={concept.nodeId.toString()}>
              {concept.name}
              </a>
            </div>);
        })}
      </div>
    );
  }

  handleClick(e:any,nodeId:nodes.NodeId)
  {
    e.preventDefault();

    ActionHandler.nodeAction( (n:NodeAction) => {
      n.setDocumentTreeNode(nodeId);
    }, true, true, true );
    
  }
}

// export the connected class
function mapStateToProps(state:any): any
{
  return { 
    nodeModel: { 
      documentNodeRefId: state.nodeModel.present.documentNodeRefId,
      nodes:state.nodeModel.present.nodes, 
      concepts:state.nodeModel.present.concepts || [], 
      nodeTreeRevision: state.nodeModel.present.nodeTreeRevision 
    },
  };
}
export const ConceptView = connect(mapStateToProps,null,null,{withRef:true})(ConceptViewClass)
//<TStateProps, TDispatchProps, TOwnProps>
