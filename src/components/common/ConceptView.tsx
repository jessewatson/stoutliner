//import * as nodes from "../../types/nodes";

import React from "react";
import { connect } from "react-redux";
import { NodeUtil } from "../../util";

class ConceptViewClass extends React.Component<any,any>
{
  constructor(props:any) 
  {
    super(props);
    this.handleClick = this.handleClick.bind(this);
    this.mainViewClick = this.mainViewClick.bind(this);
  }

  render() 
  {
    const {conceptNames,concepts} = this.props;

    return (
      <div>
        <div className="conceptName">
          <a href="#" onClick={this.mainViewClick}>
          Main View
          </a>
        </div>
        {conceptNames.map((conceptUpperName:string, index:number ) => { 
          let displayName = concepts[conceptUpperName].displayName;
          return (
            <div key={index} className="conceptName">
              <a href="#" onClick={this.handleClick} title={displayName}>
              {displayName}
              </a>
            </div>);
        })}
      </div>
    );
  }

  handleClick(e:any)
  {
    e.preventDefault();
    let href= e.target as HTMLAnchorElement;
    // save it in state
    this.props.dispatch({ 
      type: "RESET_ROOT",
      query: href.title,
      nodeTreeRevision: this.props.nodeTreeRevision+1 
    });
  }

  mainViewClick(e:any)
  {
    e.preventDefault();
    // save it in state
    this.props.dispatch({ 
      type: "RESET_ROOT",
      rootNodeId: NodeUtil.mainRootNodeId,
      nodeTreeRevision: this.props.nodeTreeRevision+1 
    });
  }
}


// export the connected class
function mapStateToProps(state:any): any
{
  return { 
    nodeTreeRevision: state.nodeModel.present.nodeTreeRevision,
    concepts: state.conceptModel.concepts || [],
    conceptNames: state.conceptModel.conceptNames || []
  };
}
export const ConceptView = connect(mapStateToProps)(ConceptViewClass)
