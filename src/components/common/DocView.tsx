import * as n from "../../types/nodes";

import React from "react";
import { connect } from "react-redux";
import { NodeAction } from "../../util";
import ActionHandler from "../../util/ActionHandler";

interface ReduxState
{
  documentNodeRefId: n.NodeRefId;
  documents: Array<n.Document>;
}

interface LocalState
{
}

type State = LocalState & ReduxState;

interface ParamProps
{

}

type Props = ParamProps & ReduxState;

class DocViewClass extends React.PureComponent<Props, State>
{
  constructor(props:any) 
  {
    super(props);
    this.clickDocName = this.clickDocName.bind(this);
  }

  private docName:HTMLInputElement;
  private viewName:HTMLInputElement;

  render() 
  {
    const documents = this.props.documents.filter( doc => !doc.isView );
    const views = this.props.documents.filter( doc => doc.isView );
    const n = NodeAction.get();

    return (
      <div>
        <div className="docViewHeader">Documents</div>
        <div className="docViewContainer">
          {documents.map((doc:n.Document ) => { 
            const docName = n.getDocName(doc.nodeRefId);
            return (
              <div key={doc.nodeRefId} className="docName">
                <a href="#" onClick={(event) => this.clickDocName(event,doc.nodeRefId)} title={doc.nodeRefId.toString()}>
                {docName}
                </a>
              </div>);
          })}
        </div>
        <div>
          <input type="text" name="docName" ref={(input) => this.docName = input}/>
          <input className="stdButton" type="button" value="Add Document" onClick={(event) => this.clickAddDoc(event,this.docName.value)}/>
        </div>
        <div className="viewHeader">Views</div>
        <div className="docViewContainer">
          {views.map((view:n.Document ) => { 
            const docName = n.getDocName(view.nodeRefId);
            return (
              <div key={view.nodeRefId} className="docName">
                <a href="#" onClick={(event) => this.clickDocName(event,view.nodeRefId)} title={view.nodeRefId.toString()}>
                {docName}
                </a>
              </div>);
          })}
        </div>
        <div>
          <input type="text" name="viewName" ref={(input) => this.viewName = input}/>
          <input className="stdButton" type="button" value="Add View" onClick={(event) => this.clickAddView(event,this.viewName.value)}/>
        </div>
      </div>
    );
  }

  clickDocName(e:any,nodeRefId:n.NodeRefId)
  {
    e.preventDefault();

    ActionHandler.nodeAction( (n:NodeAction) => {
      n.setActiveDocument(nodeRefId);
    }, true, true, false );
  }

  clickAddDoc(e:any,docName:string)
  {
    e.preventDefault();
    this.docName.value = "";

    ActionHandler.nodeAction( (n:NodeAction) => {
      let doc = n.addDocument(docName);
      n.setActiveDocument( doc.nodeRefId );
    }, true, true, true );
  }

  clickAddView(e:any,docName:string)
  {
    e.preventDefault();
    this.viewName.value = "";

    ActionHandler.nodeAction( (n:NodeAction) => {
      let doc = n.addDocument(docName,true);
      n.setActiveDocument( doc.nodeRefId );
    }, true, true, true );
  }  
}

// export the connected class
function mapStateToProps(state:n.NodeModelState): n.NodeModelParams
{
  return { 
    documentNodeRefId: state.nodeModel.present.documentNodeRefId,
    documents:state.nodeModel.present.documents || []
  };
}
export const DocView = connect<LocalState,ParamProps,ParamProps>(mapStateToProps,null,null,{withRef:true})(DocViewClass)
//<TStateProps, TDispatchProps, TOwnProps>
