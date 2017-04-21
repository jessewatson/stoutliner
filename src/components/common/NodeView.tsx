import nodes from "../../types/nodes";

import * as React from 'react';

import { connect } from "react-redux";
import { NodeAction } from "../../util";
import ActionHandler from "../../util/ActionHandler";
//import NodeTreeView from "./NodeTreeView";

import { NodeSenseView } from "./NodeSenseView";

interface StateProps
{
  documentNodeRefId: nodes.NodeRefId;
  docTreeNodes: Array<nodes.TreeNode>;
  treeNodes: nodes.TreeNodes;
  nodes: nodes.Nodes;
  nodeRefs: nodes.NodeRefs;
  nodeTreeRevision: number;
  treeNodeMetas: nodes.TreeNodeMetas;
  focus: nodes.Focus;
}

interface ParamProps
{
  index:number;
  treeNodeKey:nodes.TreeNodeKey;
  level:number;
  numChildren:number;
  handleKeyPress:any;
  handleClickExpandIcon:any;
  handleOnBlur:any;
  handlePaste: any;
  handleClickTreeNode:any;
  handleOnFocus:any;
  mergeFocus:any;
  captureFocus:any;
  getFocusedTreeNodeKey:any;
  setInternalFocusing:any;
  getInternalFocusing:any;
  getUndoingRedoing:any;
  setUndoingRedoing:any;
  findInputContainerForKey:any;
}

type Props = ParamProps & StateProps;

export class NodeViewClass extends React.PureComponent<Props, StateProps>
{
  refs: any;

  constructor(props: any) 
  {
    super(props);
    this.handleKeyPress = this.handleKeyPress.bind(this);
    this.textAreaAdjust = this.textAreaAdjust.bind(this);
    this.getInput = this.getInput.bind(this);
    this.focus = this.focus.bind(this);
    this.setState = this.setState.bind(this);
    this.showNodeMenu = this.showNodeMenu.bind(this);
    this.hideNodeMenu = this.hideNodeMenu.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.handleOnBlur = this.handleOnBlur.bind(this);
  }

  shouldComponentUpdate(nextProps:Props, _nextState:any) 
  {
    let { treeNodeKey } = this.props;

    if( treeNodeKey == null ) 
      return false;

    const didFocus = nextProps.focus.focusedTreeNodeKey == treeNodeKey;

    // do a fresh lookup on both tree nodes
    const nextNode = nextProps.treeNodes[treeNodeKey];
    const thisNode = this.props.treeNodes[treeNodeKey];

    // bail if we got deleted or there is no next
    if( nextNode == null ) return false;

    const didChange = !NodeAction.treeNodesSame( thisNode, nextNode );

    return didFocus || didChange;
  }

  componentDidUpdate()
  {
    this.componentFinalize();
  }

  componentDidMount()
  {
    this.componentFinalize();
  }

  componentFinalize()
  {
    let {level,numChildren} = this.props;

    // display expand or contract icons based on whether this node has children
    this.refs.nodeExpandIcon.style.display = numChildren > 0 ? "block" : "none";
    // indent based on level
    this.refs.nodeContainer.style.marginLeft = (level*15).toString() + "px";
    // adjust the text area if it is multi-line
    this.textAreaAdjust(null);
    // set focus if needed
    this.setFocusFromState();
  }

  // This is used to implement a specific action just taken to change the focus
  // e.g. arrow up, arrow down, etc.
  setFocusFromState()
  {
    if( this.props.focus.performFocus )
    {
      let { focusedTreeNodeKey, cursorOffset, cursorPosition } = this.props.focus;

      if( !cursorOffset ) { cursorOffset = 0; }

      if( focusedTreeNodeKey == null )
        focusedTreeNodeKey = this.props.docTreeNodes[0].key;

      let inputContainer = this.props.findInputContainerForKey( focusedTreeNodeKey );

      // if it's null, the node representing the input may be collapsed - just ignore the request.
      if( inputContainer != null )
      {
        let {input} = inputContainer;

        if( cursorPosition == null )
        {
          cursorPosition = input.selectionStart; 
        }
        else if( cursorPosition == -1 || // -1 is code for end of line
                cursorPosition > input.value.length )
        {
          cursorPosition = input.value.length;
        }

        this.props.setInternalFocusing(true);
        //console.log("Setting focus to ",focusedTreeNodeKey,focusedTreeNodeKey ? this.props.treeNodes[focusedTreeNodeKey] : "null" );
        input.focus();
        input.setSelectionRange( cursorPosition+cursorOffset, cursorPosition+cursorOffset );
        this.props.setInternalFocusing(false);
      }

      ActionHandler.nodeAction( (n:NodeAction) => {
        n.focusComplete();
      });
    }
  }

  textAreaAdjust(_event:any) 
  {
    this.refs.textArea.style.height = "1px";
    this.refs.textArea.style.height = (this.refs.textArea.scrollHeight)+"px";
  }

  showNodeMenu() 
  {
    this.refs.nodeMenuContainer.style.display = "block";
    this.refs.invisibleOverlay.style.display = "block";
  }

  hideNodeMenu() 
  {
    this.refs.nodeMenuContainer.style.display = "none";
    this.refs.invisibleOverlay.style.display = "none";
  }

  handleChange(event:any,treeNode:nodes.TreeNode): void
  {
    // update the node view buffer as we type
    ActionHandler.nodeAction( (n:NodeAction)=> { 
      n.updateDraftNodeName( treeNode.key, event.target.value );
      n.captureFocus( this.props.captureFocus() );
     }, false, true, true );

    this.refs.nodeSenseView.getWrappedInstance().handleChange(event,treeNode);
  }

  handleOnBlur( event:any, treeNode:nodes.TreeNode )
  {
    // this "if" keeps us from auto-committing nodes upon redo / undo as focus is changing
    // (because that messes up state history)
    if( !this.props.getUndoingRedoing() )
    {
      const treeNodeMeta = this.props.treeNodeMetas[treeNode.key];
      if( treeNodeMeta && treeNodeMeta.updatingNodeName )
      {
        ActionHandler.nodeAction( (n:NodeAction)=> { 
          n.commitNodeName( treeNode.key );
          n.captureFocus( this.props.captureFocus() );
        }, true, true, true );
      }

      this.props.handleOnBlur(event,treeNode);
      //this.refs.nodeSenseView.getWrappedInstance().handleOnBlur(event,treeNode);
    }
  }

  handleKeyPress(event:any,treeNode:nodes.TreeNode)
  {
    if( !this.refs.nodeSenseView.getWrappedInstance().isVisible() )
    {
      this.props.handleKeyPress(event,treeNode);
      this.textAreaAdjust(event);
    }
  }

  focus()
  {
    this.getInput().focus();
  }

  getInput()
  {
    return this.refs.textArea;
  }

  // render
  render() 
  {
    const {index, treeNodeKey, treeNodes, treeNodeMetas, handleClickExpandIcon, handleOnFocus, handlePaste, handleClickTreeNode} = this.props;

    // get a fresh tree node since the flattened tree model may not have been updated above us.
    
    const treeNode = treeNodes[treeNodeKey];
    const treeNodeMeta = treeNodeMetas[treeNodeKey];

    let nodeText = treeNodeMeta && treeNodeMeta.updatingNodeName ? treeNodeMeta.draftName : treeNode.name;

    const fontName = treeNode.expanded ? "nodeExpandIcon fa fa-caret-down" : "nodeExpandIcon fa fa-caret-right";

    let textAreaClass = treeNode.ghost ? "textArea ghostTextArea" : "textArea";

    return (
      <div className="nodeContainer" id="nodeContainer" ref="nodeContainer">
        <div id="nodeIcons" className="nodeButtonContainer">
          <div ref="invisibleOverlay" className="invisibleOverlay"
            onClick={ () => this.hideNodeMenu() }></div>
          <div className="nodeMenuContainer">
            <button key="menuButton" id="menuButton" className="nodeButton"
              onClick={ () => this.showNodeMenu() }>
              <span id="menuIcon" 
                className="nodeMenuIcon fa fa-bars" 
                aria-hidden="true"></span>
            </button>
            <ul ref="nodeMenuContainer" className="nodeMenu">
              <li>Define Children</li>
              <li >Expand All</li>
              <li >Collapse All</li>
              <li >Change Sort Order</li>
            </ul>
          </div>
          <button key="expandWidget"
            id="expandWidget" className="nodeButton"
            onClick={(event) => handleClickExpandIcon(event,treeNode)}>
            <span id="expandIcon" ref="nodeExpandIcon"
              aria-hidden="true" 
              className={fontName}></span>
          </button>
        </div>
        <NodeSenseView ref="nodeSenseView" treeNodeKey={treeNode.key} textTyped={ nodeText } >
          <textarea 
            ref="textArea"
            title={"index"+index+", tree node key: "+treeNode.key+", tree node ref: "+treeNode.nodeRefId+", points at node id: "+treeNode.nodeId}
            className={textAreaClass}
            id={treeNode.key} 
            onPasteCapture={(event) => handlePaste(event,treeNode)}
            onBlur={(event) => this.handleOnBlur(event,treeNode)}
            onFocus={(event) => handleOnFocus(event,treeNode)}
            onClick={(event) => handleClickTreeNode(event,treeNode)}
            onKeyUp={(event) => this.textAreaAdjust(event)}
            onKeyDown={(event) => this.handleKeyPress(event,treeNode)} 
            onChange={(event) => this.handleChange(event,treeNode)}
            value={ nodeText }>
          </textarea>
        </NodeSenseView>
      </div>      
    );
    /*
      <NodeSenseView 
        treeNodeId={node.id}
        handleOnBlur={this.handleOnBlur}/>            
    */
  }
}

function mapStateToProps(state:any): any
{
  return { 
    documentNodeRefId: state.nodeModel.present.documentNodeRefId,
    docTreeNodes: state.nodeModel.present.docTreeNodes,
    treeNodes: state.nodeModel.present.treeNodes,
    nodes:state.nodeModel.present.nodes, 
    nodeRefs:state.nodeModel.present.nodeRefs, 
    nodeTreeRevision: state.nodeModel.present.nodeTreeRevision,
    treeNodeMetas: state.nodeModel.present.treeNodeMetas,
    focus: state.nodeModel.present.focus,
  };
}
export const NodeView = connect<StateProps, ParamProps, ParamProps>(mapStateToProps,null,null,{withRef:true})(NodeViewClass);
//<TStateProps, TDispatchProps, TOwnProps>
