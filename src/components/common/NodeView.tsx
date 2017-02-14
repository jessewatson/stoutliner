import nodes from "../../types/nodes";

import * as React from 'react';

import { connect } from "react-redux";
import { NodeUtil } from "../../util";
//import NodeSenseView from "./NodeSenseView";

export class NodeViewClass extends React.PureComponent<any, nodes.NodeModel>
{
  refs: any;
  private didChange:boolean = false;
  private nodeTreeRevision:number;

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
    this.setFocusFromState = this.setFocusFromState.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.handleOnBlur = this.handleOnBlur.bind(this);
  }

  shouldComponentUpdate(nextProps:any, _nextState:any) 
  {
    if( this.getNode() == null) return false;
    
    const myId = this.getNode().id;
    const didFocus = nextProps.focus.focusedNodeId == myId;
    const nextNode = NodeUtil.getNodeForId(nextProps.nodeModel,myId);
    const thisNode = NodeUtil.getNodeForId(this.props.nodeModel,myId);
    this.nodeTreeRevision = this.props.thisNodeTreeRevision == null ? 1 : this.props.thisNodeTreeRevision;

    // bail if we got deleted or there is no next
    if( nextNode == null ) return false;

    const didChange = 
      nextProps.level != this.props.level ||
      nextNode.text != thisNode.text ||
      nextNode.childIds.length != thisNode.childIds.length ||
      nextNode.expanded != thisNode.expanded ||
      nextNode.showRelatedChildren != thisNode.showRelatedChildren ||
      nextNode.showRelatedTrees != thisNode.showRelatedTrees;

/* DEBUG COMMENT - DO NOT DELETE -- For debugging excessive or unecessary renders
    if( !didChange ) 
      console.log("NodeView - '"+thisNode.text+"' no change detected",this.props,nextProps);
    else
    {
      console.log("NodeView - '"+thisNode.text+"' YES change detected",this.props,nextProps);
      console.log("nextProps.level != this.props.level"+( nextProps.level != this.props.level ));
      console.log("nextNode.text != thisNode.text "+( nextNode.text != thisNode.text ));
      console.log("!NodeUtil.childrenAreEqual(nextNode,thisNode) "+( !NodeUtil.childrenAreEqual(nextNode,thisNode) ));
      console.log("nextNode.expanded != thisNode.expanded "+( nextNode.expanded != thisNode.expanded ));
      console.log("nextNode.autoAdd != thisNode.autoAdd"+( nextNode.autoAdd != thisNode.autoAdd ));
    }
*/
    return didFocus || didChange;
  }

  componentDidUpdate()
  {
    this.componentInit();
  }

  componentDidMount()
  {
    this.componentInit();
  }

  componentInit()
  {
    // On load, see if there is any additional focus state to load
    if( this.props.focus.focusedNodeId == this.getNode().id )
    {
      //console.log("Nodeview - calling setFocusfromstate for "+this.props.focus.focusedNodeId);
      this.setFocusFromState();
      // clear the state so we don't load it again next time
      this.props.dispatch({
        type: 'FOCUS_SET',
        focusedNodeId: null,
        inputOffset: null,
        cursorOffset: null,
        cursorPosition: null
      });
    }
    // display expand or contract icons based on whether this node has children
    this.refs.nodeExpandIcon.style.display = this.props.hasChildren ? "block" : "none";
    // indent based on level
    this.refs.nodeContainer.style.marginLeft = (this.props.level*15).toString() + "px";
    // adjust the text area if it is multi-line
    this.textAreaAdjust(null);
    this.didChange = false;
  }


  // This is used to implement a specific action just taken to change the focus
  // e.g. arrow up, arrow down, etc.
  setFocusFromState( focus=this.props.focus )
  {
    let { focusedNodeId, inputOffset, cursorOffset, cursorPosition } = focus;

    if( !cursorOffset ) { cursorOffset = 0; }
    if( !inputOffset ) { inputOffset = 0; }

    let inputContainer = this.props.findInputContainerForNodeId( focusedNodeId, inputOffset );

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

      input.focus();
      input.setSelectionRange( cursorPosition+cursorOffset, cursorPosition+cursorOffset );
    }
    else
    {
      console.log("WARNING: input should not be null here! (2)");
    }
  }

  textAreaAdjust(_event:any) 
  {
    this.refs.textArea.style.height = "1px";
    this.refs.textArea.style.height = (this.refs.textArea.scrollHeight)+"px";
  }

  showNodeMenu(_event:any,_node:nodes.Node) 
  {
    this.refs.nodeMenu.style.display = "block";
    this.refs.nodeMenuOverlay.style.display = "block";
  }

  hideNodeMenu(_event:any,_node:nodes.Node) 
  {
    this.refs.nodeMenu.style.display = "none";
    this.refs.nodeMenuOverlay.style.display = "none";
  }
/*
  showRelatedChildrenChecked()
  {
    this.props.dispatch({
      type: 'NODES_UPDATE',
      nodeId: node.id,
      text: event.target.value,
      focusState: this.props.captureFocusState()
    });
  }
*/

  handleChange(event:any,node:nodes.Node): void
  {
    this.props.dispatch({
      type: 'NODES_UPDATE',
      nodeId: node.id,
      text: event.target.value,
      focusState: this.props.captureFocusState()
    });

    this.props.dispatch({
      type: 'CONCEPTS_RECALCULATE'
    });

    this.didChange = true;
/* todo - finish intellisense system
    this.props.dispatch({
      type: 'SENSE_GET',
      nodeId: node.id,
      text: event.target.value
    });
*/
  }

  handleOnBlur( event:any, node:nodes.Node )
  {
    this.props.handleOnBlur(event,node);

    console.log( ">> NodeView handleOnBlur is calling NODES_UPDATEAUTO_SAVE" );
    // trigger a cascading node refresh for this node
    this.props.dispatch({
      type: 'NODES_UPDATEAUTO_SAVE',
      nodeId: NodeUtil.mainRootNodeId,
      nodeTreeRevision: this.nodeTreeRevision+1,
    });

  }

  handleKeyPress(event:any,node:nodes.Node)
  {
    if( event.key == "ArrowUp"  && !event.shiftKey )
    {
      event.preventDefault();
      this.props.dispatch({
        type: 'FOCUS_SET',
        focusedNodeId: this.props.getFocusedNodeId(),
        inputOffset: -1,
        cursorPosition: this.getInput().selectionStart
      });
    }
    else if( event.key == "ArrowDown"  && !event.shiftKey )
    {
      event.preventDefault();
      this.props.dispatch({
        type: 'FOCUS_SET',
        focusedNodeId: this.props.getFocusedNodeId(),
        inputOffset: 1,
        cursorPosition: this.getInput().selectionStart
      });
    }
    else
    {
      this.props.handleKeyPress(event,node);
    }


    this.textAreaAdjust(event);
  }

  focus()
  {
    this.getInput().focus();
  }

  getInput()
  {
    return this.refs.textArea;
  }

  getNode()
  {
    return NodeUtil.getNodeForId(this.props.nodeModel,this.props.nodeId);
  }


  // render
  render() 
  {
    const {nodeModel, nodeId, expanded, handleClickExpandIcon, handleOnFocus} = this.props;

    const node = NodeUtil.getNodeForId(nodeModel,nodeId);
    const nodeText = NodeUtil.getNodeTextForId(nodeModel,node.id);

    const fontName = expanded ? "nodeExpandIcon fa fa-caret-down" : "nodeExpandIcon fa fa-caret-right";

    return (
      <div className="nodeContainer" id="nodeContainer" ref="nodeContainer">
        <div id="nodeIcons" className="nodeButtonContainer">
          <div ref="nodeMenuOverlay" className="nodeMenuOverlay"
            onClick={(event) => this.hideNodeMenu(event,node)}></div>
          <div className="nodeMenu">
            <button key="menuButton" id="menuButton" className="nodeButton"
              onClick={(event) => this.showNodeMenu(event,node)}>
              <span id="menuIcon" 
                className="nodeMenuIcon fa fa-bars" 
                aria-hidden="true"></span>
            </button>
            <ul ref="nodeMenu" className="dropDownMenu">
              <li><input type="checkbox"/> Show Related Children</li>
              <li><input type="checkbox"/> Show Related Trees</li>
            </ul>
          </div>
          <button key="expandWidget"
            id="expandWidget" className="nodeButton"
            onClick={(event) => handleClickExpandIcon(event,node)}>
            <span id="expandIcon" ref="nodeExpandIcon"
              aria-hidden="true" 
              className={fontName}></span>
          </button>
        </div>
        <textarea 
          title={"id: "+node.id+", relatedChildOf: "+node.relatedChildOf}
          className="textArea" 
          id={node.id.toString()}
          ref="textArea"
          onBlur={(event) => this.handleOnBlur(event,node)}
          onFocus={(event) => handleOnFocus(event,node)}
          onKeyUp={(event) => this.textAreaAdjust(event)}
          onKeyDown={(event) => this.handleKeyPress(event,node)} 
          onChange={(event) => this.handleChange(event,node)}
          value={ nodeText }></textarea>
      </div>      
    );
    /*
      <NodeSenseView 
        nodeId={node.id}
        handleOnBlur={this.handleOnBlur}/>            
    */
  }
}

function mapStateToProps(state:any): any
{
  return { 
    nodeModel: { 
      nodes:state.nodeModel.present.nodes, 
      nodeTreeRevision: state.nodeModel.present.nodeTreeRevision 
    },
    focus: state.focus    
  };
}
export const NodeView = connect(mapStateToProps)(NodeViewClass);
