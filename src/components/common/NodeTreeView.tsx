
import * as n from "../../types/nodes";

import React from "react";
import { connect } from "react-redux";
import { NodeView } from "./NodeView";
import ActionHandler from "../../util/ActionHandler";
import { NodeAction } from "../../util";
import { store } from "../../store";
import { ActionCreators } from 'redux-undo';
import { QueryView } from "./QueryView";

interface InputContainer
{
  index:number;
  input:HTMLTextAreaElement;
}

interface ParamProps
{

}

interface ReduxProps
{
  documentNodeRefId: n.NodeRefId;
  docTreeNodes: Array<n.TreeNode>;
  treeNodes: n.TreeNodes;
  nodes: n.Nodes;
  nodeRefs: n.NodeRefs;
  nodeTreeRevision: number;
  treeNodeMetas: n.TreeNodeMetas;
  documents: Array<n.Document>;
  focus: n.Focus;
  past: Array<n.NodeModel>;
  future: Array<n.NodeModel>;
}

interface LocalState
{
  queryViewVisible: boolean;
  editingDocTitle: boolean;
}


type Props = ParamProps & ReduxProps;

// Node tree view component
export class NodeTreeViewClass extends React.Component<Props,LocalState>
{
  // All children are NodeView objects
  refs: {
    docTitle: HTMLDivElement;
    docTitleInput: HTMLInputElement;
    queryView: any;
  };

  // constructor
  constructor(props:ReduxProps) 
  {
    super(props);

    // bind <this> to the event method
    this.handleKeyPress = this.handleKeyPress.bind(this);
    this.handleOnBlur = this.handleOnBlur.bind(this);
    this.handlePaste = this.handlePaste.bind(this);
    this.handleOnFocus = this.handleOnFocus.bind(this);
    this.handleClickTreeNode = this.handleClickTreeNode.bind(this);
    this.handleClickExpandIcon = this.handleClickExpandIcon.bind(this);
    this.findInputContainerForKey = this.findInputContainerForKey.bind(this);
    this.getFocusedTreeNodeKey = this.getFocusedTreeNodeKey.bind(this);
    this.captureFocus = this.captureFocus.bind(this);
    this.mergeFocus = this.mergeFocus.bind(this);
    this.handleGlobalKeyPress = this.handleGlobalKeyPress.bind(this);
    this.setInternalFocusing = this.setInternalFocusing.bind(this);
    this.getInternalFocusing = this.getInternalFocusing.bind(this);
    this.setUndoingRedoing = this.setUndoingRedoing.bind(this);
    this.getUndoingRedoing = this.getUndoingRedoing.bind(this);
    this.showQueryDialog = this.showQueryDialog.bind(this);
    this.hideQueryDialog = this.hideQueryDialog.bind(this);
    this.startEditDocTitle = this.startEditDocTitle.bind(this);
    this.stopEditDocTitle = this.stopEditDocTitle.bind(this);

    this.state = { queryViewVisible: false, editingDocTitle: false };    
  }

  shouldComponentUpdate(nextProps:any, nextState:LocalState) 
  {
    const prevDocTreeNodeId = this.props.documentNodeRefId;
    const nextDocTreeNodeId = nextProps.documentNodeRefId;
    const prevNodeTreeRevision = this.props.nodeTreeRevision;
    const nextNodeTreeRevision = nextProps.nodeTreeRevision;

    if( prevDocTreeNodeId != nextDocTreeNodeId )
    {
      return true;
    }

    if( prevNodeTreeRevision != nextNodeTreeRevision )
    {
      return true;
    }

    if( nextState.editingDocTitle )
    {
      return true;
    }

    //console.log("Not updating NodeTreeView because prevDocTreeNodeId("+prevDocTreeNodeId+") == nextDocTreeNodeId("+nextDocTreeNodeId+") and prevNodeTreeRevision("+prevNodeTreeRevision+") == nextNodeTreeRevision("+nextNodeTreeRevision+")");

    return false;
  }

  componentDidMount()
  {
    document.addEventListener("keydown", this.handleGlobalKeyPress, false); 

    this.componentFinalize();
  }

  componentDidUpdate()
  {
    this.componentFinalize();
  }

  componentFinalize()
  {
    if( this.state.editingDocTitle )
    {
      this.refs.docTitleInput.focus();
    }
  }

  private internalFocusing:boolean = false;

  private setInternalFocusing(internalFocusing:boolean)
  { this.internalFocusing = internalFocusing; }

  private getInternalFocusing(): boolean
  { return this.internalFocusing; }

  private undoingRedoing:boolean = false;

  private setUndoingRedoing(undoingRedoing:boolean)
  { this.undoingRedoing = undoingRedoing; }

  private getUndoingRedoing(): boolean
  { return this.undoingRedoing; }


  handleGlobalKeyPress(event:KeyboardEvent): void
  {
    if( event.key == "z" && ( event.metaKey || event.ctrlKey ) )
    {
      event.preventDefault();
      if( this.props.past.length > 0 )
      {
        let priorFocusState = this.props.past[this.props.past.length-1].focus;

        // this rules out the first bogus undo state
        if( priorFocusState && priorFocusState.focusedTreeNodeKey )
        {
          let focusedTreeNodeKey = priorFocusState.focusedTreeNodeKey;
          let cursorPosition = priorFocusState.cursorPosition;

          // expand the tree if necessary
          ActionHandler.nodeAction( (n:NodeAction)=> {
            n.ensureNodeExpanded( focusedTreeNodeKey );
          }, true, true, false );

          this.setUndoingRedoing(true);

          store.dispatch( ActionCreators.undo() );

            // set the focus
          ActionHandler.nodeAction( (n:NodeAction) => {
            n.setFocus({
                focusedTreeNodeKey: focusedTreeNodeKey,
                cursorPosition: cursorPosition
              });
          });

          this.setUndoingRedoing(false);

          // persist the model after the undo and update the tree
          ActionHandler.nodeAction( (_n:NodeAction)=> {}, true, true, false );
        }
      }
      else
      {
        console.log("Nothing to undo!");
      }

    }
    else if( event.key == "y" && ( event.metaKey || event.ctrlKey ) )
    {
      event.preventDefault();
      if( this.props.future.length > 0 )
      {
        let futureFocusState = this.props.future[0].focus;
        let focusedTreeNodeKey = futureFocusState.focusedTreeNodeKey;
        let cursorPosition = futureFocusState.cursorPosition;

        // expand the tree if necessary
        ActionHandler.nodeAction( (n:NodeAction)=> {
          n.ensureNodeExpanded( focusedTreeNodeKey );
        }, true, true, false );

        this.setUndoingRedoing(true);

        store.dispatch( ActionCreators.redo() );

          // set the focus
        ActionHandler.nodeAction( (n:NodeAction) => {
          n.setFocus({
              focusedTreeNodeKey: focusedTreeNodeKey,
              cursorPosition: cursorPosition
            });
        });

        this.setUndoingRedoing(false);

        // persist the model after the redo and update the tree
        ActionHandler.nodeAction( (_n:NodeAction)=> {}, true, true, false );
     }
      else
      {
        console.log("Nothing to redo!");
      }
    }
  }

  startEditDocTitle( _nodeId:n.NodeId )
  {
    this.refs.docTitle.style.display = "none";
    this.refs.docTitleInput.style.display = "flex";

    this.setState( { editingDocTitle: true } );
  }

  handleChange( _evt:any, nodeId:n.NodeId )
  {
    ActionHandler.nodeAction( (n:NodeAction)=> {
      n.commitDocName( nodeId, this.refs.docTitleInput.value );
    }, true, true, true );    
  }

  stopEditDocTitle( _nodeId:n.NodeId )
  {
    this.refs.docTitle.style.display = "flex";
    this.refs.docTitleInput.style.display = "none";

    this.setState( { editingDocTitle: false } );
  }

  // render
  render(): JSX.Element
  {
    const { docTreeNodes, documents, documentNodeRefId, nodeRefs, nodes } = this.props;

    const docNodeRef = nodeRefs[this.props.documentNodeRefId];
    const docTitle = nodes[docNodeRef.nodeId].name;

    const thisDoc = documents.find( doc => doc.nodeRefId == documentNodeRefId );

    console.log("this.state.editingDocTitle",this.state.editingDocTitle);

    // show the list of nodes
    return (
      <div className="nodeViewMain">
        <div className="nodeViewPane">
          <div className="docTitleContainer">
            <div className="docTitle" ref="docTitle" onClick={() => this.startEditDocTitle(docNodeRef.nodeId)} >{docTitle}</div>
            <input type="text" autoFocus className="docTitleInput" ref="docTitleInput" 
              onBlur={() => this.stopEditDocTitle(docNodeRef.nodeId)} 
              onKeyDown={(evt) => { if( evt.key == "Enter" ) this.stopEditDocTitle(docNodeRef.nodeId)}} 
              onChange={(event) => this.handleChange(event,docNodeRef.nodeId)}
              value={docTitle}/>
          </div>
          <div id="nodeViewContainer" ref="nodeViewContainer" className="nodeViewContainer">
            {docTreeNodes.map((treeNode:n.TreeNode,index:number) => {
              //console.log( new NodeAction(nodeModel).debugTreeNode(treeNode) );
              return (
                <div key={treeNode.key} className="nodeViewWrapper">
                  <NodeView 
                    key={treeNode.key} // mandated by react
                    index={index} // verified used
                    treeNodeKey={treeNode.key}
                    level={treeNode.level} // we pass these in rather than the whole treeNode object
                    numChildren={treeNode.childKeys.length} // because other properties goes stale otherwise
                    handleKeyPress={this.handleKeyPress}
                    handleClickExpandIcon={this.handleClickExpandIcon}
                    handleOnBlur={this.handleOnBlur}
                    handlePaste={this.handlePaste}
                    handleClickTreeNode={this.handleClickTreeNode}
                    handleOnFocus={this.handleOnFocus}
                    mergeFocus={this.mergeFocus}
                    captureFocus={this.captureFocus}
                    getFocusedTreeNodeKey={this.getFocusedTreeNodeKey}
                    setInternalFocusing={this.setInternalFocusing}
                    getInternalFocusing={this.getInternalFocusing}
                    setUndoingRedoing={this.setUndoingRedoing}
                    getUndoingRedoing={this.getUndoingRedoing}
                    findInputContainerForKey={this.findInputContainerForKey}/>
                </div>
                );
            })}
          </div>
        </div>
        <QueryView visible={thisDoc.isView} />
      </div>
    );
  }

  showQueryDialog()
  {
    //this.setState( Object.assign( {}, this.state, { queryViewVisible:true, queryViewKey:key } ) );
    this.refs.queryView.getWrappedInstance().show( this.props.documentNodeRefId );
  }

  hideQueryDialog()
  {
    this.refs.queryView.getWrappedInstance().hide();
  }

  handleClickExpandIcon( _event:any, treeNode:n.TreeNode ): void
  {
    ActionHandler.nodeAction( (n:NodeAction)=> { 
      n.setExpanded( treeNode.key, !treeNode.expanded ) },
      true, true, false );

    // Keep inputs from losing focus during expand / collapse operations...
    // Return focus to the previously focused node
    ActionHandler.nodeAction( (n:NodeAction)=> { 
      n.setFocus({ 
        focusedTreeNodeKey:this.getLastFocusedTreeNodeKey()
      })},
    );
  }

  handleClickTreeNode( _event:any, treeNode:n.TreeNode ): void
  {
    ActionHandler.nodeAction( (n:NodeAction)=> { 
      console.log( n.debugTreeNode( treeNode ) ); }
    );
      
  }

  handleOnFocus( event:any, treeNode:n.TreeNode ): void
  {
    if( this.internalFocusing )
    {
      event.preventDefault();
      return;
    }

    const lastFocusedTreeNodeKey = this.getFocusedTreeNodeKey();

    ActionHandler.nodeAction( (n:NodeAction)=> { 
      n.captureFocus({ 
        focusedDocumentNodeRefId:this.props.documentNodeRefId,
        focusedTreeNodeKey:treeNode.key,
        lastFocusedTreeNodeKey:lastFocusedTreeNodeKey,
      })},
    );
  }

  handlePaste( event:ClipboardEvent, treeNode:n.TreeNode )
  {
    let data = event.clipboardData.getData("text");
    const lines = data.split(/\r?\n/)

    if( lines.length > 0 )
    {
      event.preventDefault();

      ActionHandler.nodeAction( (n:NodeAction)=> { 
        let treeNodeKey = treeNode.key;

        lines.forEach( (line, index) => {
          n.commitNodeName( treeNodeKey, line );

          if( index < lines.length-1 )
            treeNodeKey = n.addTreeNodeBelow( treeNodeKey );
        } );
        
        n.setFocus( { focusedTreeNodeKey: treeNodeKey, cursorPosition: -1 } );

      }, true, true, true );
    }
  }  

  handleOnBlur( _event:any, _treeNode:n.TreeNode )
  {
    /*
    // if the focus is shifting to an expand / collapse widget...
    if( event.relatedTarget && event.relatedTarget.id == "expandWidget" )
    {
      // Keep inputs from losing focus during expand / collapse operations...
      // Return focus to the previously focused node
      ActionHandler.nodeAction( (n:NodeAction)=> { 
        n.setFocus({ 
          focusedTreeNodeKey:this.getLastFocusedTreeNodeKey()
        })},
      );
    }*/
  }

  getFocusedTreeNodeKey( inputOffset?:number ): n.TreeNodeKey
  {
    const activeEltId = document.activeElement.id;
    if( activeEltId.startsWith("N,") )
    {
      const key = activeEltId;

      if( inputOffset )
      {
        const index = this.findIndexForKey(key);
        const inputs = this.getInputList();
        const newIndex = index + inputOffset;

        if( newIndex < inputs.length && newIndex >= 0 )
        {
          return (inputs[newIndex] as Element).id;
        }
      }

      return key;
    }

    if( this.props.focus.focusedTreeNodeKey )
      return this.props.focus.focusedTreeNodeKey

    throw new Error("Hmm, couldn't find a focused node, what should we do here? focusedTreeNodeKey from state is "+this.props.focus.focusedTreeNodeKey);
  }

  getLastFocusedTreeNodeKey(): n.TreeNodeKey
  {
    return this.props.focus.lastFocusedTreeNodeKey;
  }

  mergeFocus( requestedFocus:n.FocusParams ): n.Focus
  {
    let currentFocus = this.captureFocus();
    let mergedFocus = Object.assign( {}, currentFocus, requestedFocus );
    return mergedFocus;
  }

  captureFocus(): n.Focus
  {
    let focusedTreeNodeKey = this.getFocusedTreeNodeKey();
    // returning null

    // in case we're in the midst of an "onBlur" and there is no focused node,
    // use the last focused node id
    if( !focusedTreeNodeKey )
      focusedTreeNodeKey = this.getLastFocusedTreeNodeKey();
    //let index = this.findIndexForNodeId(focusedTreeNodeKey);

    // last resort, set it to null, which will be ignored
    if( focusedTreeNodeKey == null )
    {
      return { 
        focusedDocumentNodeRefId:null, 
        focusedTreeNodeKey:null };
    }

    const treeNode = this.getTreeNode( focusedTreeNodeKey );
    const input = this.findInputForNodeKey( treeNode.key );
    const cursorPosition = input.selectionStart;
    
    return { 
      focusedDocumentNodeRefId:this.props.documentNodeRefId, 
      focusedTreeNodeKey:focusedTreeNodeKey, 
      cursorPosition:cursorPosition };
  }

  // returns a nodeLevel object:
  // { node, level }
  getTreeNode(key:n.TreeNodeKey): n.TreeNode
  {
    return this.props.treeNodes[key];
  }

  getTreeNodeAbove(key:n.TreeNodeKey): n.TreeNode
  {
    const {docTreeNodes} = this.props;
    let lastIndex = -1;
    for( let i=0; i<docTreeNodes.length; i++)
    {
      if( docTreeNodes[i].key == key )
        break;

      lastIndex = i;
    }

    if( lastIndex >= 0 )
      return docTreeNodes[lastIndex];

    return null;
  }

  getTreeNodeBelow(key:n.TreeNodeKey): n.TreeNode
  {
    const {docTreeNodes} = this.props;
    let nextIndex = -1;
    for( let i=0; i<docTreeNodes.length; i++)
    {
      nextIndex = i+1;

      if( docTreeNodes[i].key == key )
        break;
    }

    if( nextIndex >= 0 && nextIndex < docTreeNodes.length )
      return docTreeNodes[nextIndex];

    return null;
  }  

  shouldExpandToReveal( me:n.TreeNode ): n.TreeNode
  {
      // check if we should expand the node above me if I'm becoming a part of it
      const treeNodeAboveMe = this.getTreeNodeAbove( me.key );

      if( treeNodeAboveMe && me && // if they all exist
          treeNodeAboveMe.level == me.level && // and our levels are equal
          !treeNodeAboveMe.expanded ) // and the node above is collapsed
      { return treeNodeAboveMe; }
    
    return null;
  }

  handleKeyPress(event:any,treeNode:n.TreeNode): void
  {
    const input = this.findInputForNodeKey(treeNode.key);
    const cursorPosition = input.selectionStart;
    const selectionEnd = input.selectionEnd;
/*
    if( event.key == "Backspace" )
    {
      console.log("cursorPosition",cursorPosition);
      console.log("treeNode.name",treeNode.name);
      console.log("treeNode.draftName",treeNode.draftName);
      console.log("NodeAction.lastVisibleRoot(nodeModel,treeNode.id)",NodeAction.lastVisibleRoot(nodeModel,treeNode.id));
    }
*/
    // they pressed tab
    if( event.key == "Tab" && !event.shiftKey )
    {
      event.preventDefault();

      ActionHandler.nodeAction( (n:NodeAction)=> { 
        let treeNodeKey = treeNode.key;

        // first update any edits in progress so we don't lose them
        if( this.updatingNodeName( treeNodeKey ) )
          treeNodeKey = n.commitNodeName( treeNodeKey );

        let newTreeNodeKey = n.indent( treeNodeKey );
        // if the indent was successful, and we need to expand our parent to reveal ourselves, do so
        if( newTreeNodeKey )
        {
          const treeNodeAboveMe = this.shouldExpandToReveal( treeNode );
          if( treeNodeAboveMe ) 
            n.setExpanded( treeNodeAboveMe.key, true );

          n.setFocus( { focusedTreeNodeKey: newTreeNodeKey } );
        }
      }, true, true, true );

    }
    else if( event.key == "Tab" && event.shiftKey ) 
    {
      event.preventDefault();

      ActionHandler.nodeAction( (n:NodeAction)=> { 
        let treeNodeKey = treeNode.key;
        // first update any edits in progress so we don't lose them
        if( this.updatingNodeName( treeNodeKey ) )
          treeNodeKey = n.commitNodeName( treeNodeKey );

        let newTreeNodeKey = n.unindent( treeNodeKey );

        if( newTreeNodeKey )
          n.setFocus( { focusedTreeNodeKey: newTreeNodeKey } );

      }, true, true, true );

    }
    else if( event.key == "ArrowLeft"  && !event.shiftKey &&
      cursorPosition == 0 && // and if at the beginning of the input
      !this.isFirstNode(treeNode.key) ) // and if not the top-most node
    {
      event.preventDefault();
      // focus the node above us and place the cursor at the end
      ActionHandler.nodeAction( (n:NodeAction) => {
        n.setFocus({
            focusedTreeNodeKey: this.getFocusedTreeNodeKey(-1),
            cursorPosition: -1 // -1 is code for "end of line"
          });
      } );

    }
    else if( event.key == "ArrowRight"  && !event.shiftKey &&
      cursorPosition == treeNode.name.length && // and if at the end of the input
      !this.isLastNode(treeNode.key) ) // and if not the last node
    {
      event.preventDefault();

      ActionHandler.nodeAction( (n:NodeAction) => {
        n.setFocus({
            focusedTreeNodeKey: this.getFocusedTreeNodeKey(1),
            cursorPosition: 0
          });
      });
    }
    else if( event.key == "ArrowUp"  && !event.shiftKey )
    {
      event.preventDefault();
      let input = this.findInputForNodeKey(treeNode.key);

      ActionHandler.nodeAction( (n:NodeAction) => {
        let keyToFocus = this.getFocusedTreeNodeKey(-1) ;
        n.setFocus({
            focusedTreeNodeKey: keyToFocus,
            cursorPosition: input.selectionStart
          });
      });

    }
    else if( event.key == "ArrowDown"  && !event.shiftKey )
    {
      event.preventDefault();
      let input = this.findInputForNodeKey(treeNode.key);      

      ActionHandler.nodeAction( (n:NodeAction) => {
        n.setFocus({
            focusedTreeNodeKey: this.getFocusedTreeNodeKey(1),
            cursorPosition: input.selectionStart
          });
      });
    }
    else if( event.key == "Enter" )
    {
      event.preventDefault();

      ActionHandler.nodeAction( (n:NodeAction)=> { 
        let treeNodeKey = treeNode.key;

        // first update any edits in progress so we don't lose them        
        if( this.updatingNodeName( treeNodeKey ) )
          treeNodeKey = n.commitNodeName( treeNodeKey ); 
                
        let newTreeNodeKey:n.TreeNodeKey;

        // if the alt/option key was used, add the node above us
        if( event.altKey )
          newTreeNodeKey = n.addTreeNodeAbove( treeNodeKey );
        else // else add below us
          newTreeNodeKey = n.addTreeNodeBelow( treeNodeKey );
        
        n.setFocus( { focusedTreeNodeKey: newTreeNodeKey } );

      }, true, true, true );

    }
    else if( event.key == "Backspace" && 
      cursorPosition == 0 && // and if at the beginning of the input
      selectionEnd == cursorPosition && // and if not a selection
      (treeNode.name == "" || this.getDraftName(treeNode.key) == "") && // and the node text is blank
      // and if I'm not the last node in my tree
      !this.lastVisibleRoot( treeNode.key ) )
    {
      event.preventDefault();
      ActionHandler.nodeAction( (n)=> {
        const nodeAbove = this.getTreeNodeAbove(treeNode.key);
        const nodeBelow = this.getTreeNodeBelow(treeNode.key);

        if( nodeAbove != null ) // it could be the first node
          n.setFocus( { focusedTreeNodeKey: nodeAbove.key, cursorPosition: -1 } );
        else if (nodeBelow != null ) // it could be the last node
          n.setFocus( { focusedTreeNodeKey: nodeBelow.key, cursorPosition: -1 } );
        
        n.deleteTreeNode( treeNode.key );
      }, true, true, true );
    }
  }

  private getDraftName( key:n.TreeNodeKey ): string
  {
    if( this.props.treeNodeMetas[key] )
      return this.props.treeNodeMetas[key].draftName;
    
    return null;
  }

  private updatingNodeName( key:n.TreeNodeKey )
  {
    if( this.props.treeNodeMetas[key] )
      return this.props.treeNodeMetas[key].updatingNodeName;
  }

  private lastVisibleRoot( key:n.TreeNodeKey ): boolean
  {
    const treeNode = this.props.treeNodes[key];
    const parentTreeNode = this.props.treeNodes[treeNode.parentKey];

    // if this is the last of its kin, and it's parent is the doc, then it is the lastVisibleRoot
    return ( parentTreeNode.childKeys.length == 1 && 
      parentTreeNode.nodeRefId == this.props.documentNodeRefId );
  }

  getInputList(): NodeList
  {
    return document.getElementsByClassName("textArea");
  }

  findInputForNodeKey(treeNodeKey:n.TreeNodeKey): HTMLTextAreaElement
  {
    return document.getElementById(treeNodeKey) as HTMLTextAreaElement;
  }

  isFirstNode(key:n.TreeNodeKey)
  {
    return this.props.docTreeNodes[0].key == key;
  }

  isLastNode(key:n.TreeNodeKey)
  {
    return this.props.docTreeNodes[ this.props.docTreeNodes.length-1 ].key == key;
  }

  findIndexForKey(key:n.TreeNodeKey): number
  {
    const textAreaNodeList = this.getInputList();

    for( let i=0; i< textAreaNodeList.length; i++ )
    {
      if( (textAreaNodeList[i] as Element).id == key )
      {
        return i;
      }
    }

    return null
  }

  findInputContainerForKey(key:n.TreeNodeKey,offset=0): InputContainer
  {
    const textAreaNodeList = this.getInputList();

    let index = this.findIndexForKey(key);

    // if index is null, it is usually because the selected node has been collapsed
    if( index == null )
    {
      // allow no selection in this case.
      return null;
    }

    // apply the offset, if valid
    if( offset != 0 )
    {
      let newIndex = index+offset;

      if( newIndex >= 0 && newIndex < textAreaNodeList.length )
        index = newIndex;
    }

    let inputElt = textAreaNodeList[index] as HTMLTextAreaElement;

    return {
      index: index,
      input: inputElt
    };

  }
/*
  focusTreeNodeId(id:n.TreeNodeId,offset=0,cursorPosition=-1):void
  {
    let input:HTMLTextAreaElement;

    if( offset == 0 )
    {
      input = this.findInputForNodeId(id)
    }
    else
    {
      const inputMap = this.findInputContainerForKey(id,offset);
      input = inputMap.input;
    }

    console.log("NodeTreeView setting focus",new Error().stack);
    input.focus();
    input.selectionStart = cursorPosition == -1 ? input.value.length : cursorPosition;
  }
*/
  focusNodeIndex(index:number)
  {
    const textAreaNodeList = document.getElementsByClassName("textArea");

    if( textAreaNodeList != null && textAreaNodeList.length > 0 &&
        index >= 0 && index < textAreaNodeList.length )
    {
      (textAreaNodeList[index] as HTMLTextAreaElement).focus();
    }
  }

}

function mapStateToProps(state:n.NodeModelState): ReduxProps
{
  return { 
    documentNodeRefId: state.nodeModel.present.documentNodeRefId,
    docTreeNodes: state.nodeModel.present.docTreeNodes,
    treeNodes: state.nodeModel.present.treeNodes,
    nodes:state.nodeModel.present.nodes, 
    nodeRefs:state.nodeModel.present.nodeRefs,
    nodeTreeRevision: state.nodeModel.present.nodeTreeRevision,
    treeNodeMetas: state.nodeModel.present.treeNodeMetas,
    documents: state.nodeModel.present.documents,
    focus: state.nodeModel.present.focus,
    past: state.nodeModel.past,
    future: state.nodeModel.future
  };
}
export const NodeTreeView = connect<{}, ReduxProps, ParamProps>(mapStateToProps,null,null,{withRef:true})(NodeTreeViewClass)
//<TStateProps, TDispatchProps, TOwnProps>
