
import * as nodes from "../../types/nodes";

import React from "react";
import { connect } from "react-redux";
import { NodeView, NodeViewClass } from "./NodeView";
import { NodeUtil } from "../../util";
import { store } from "../../store";
import { ActionCreators } from 'redux-undo';

interface NodeLevel
{
  node:nodes.Node;
  level:number;
}

interface InputContainer
{
  index:number;
  input:HTMLTextAreaElement;
}

// Node tree view component
export class NodeTreeViewClass extends React.PureComponent<any,any>
{
  // All children are NodeView objects
  refs: {
    [key: string]: (NodeViewClass);
  }

  private nodeLevels: Array<NodeLevel>;
  //private lastNodeIdChanged: number;
  private lastNodeIdFocused: number;
  private nodeTreeRevision: number;

  // constructor
  constructor(props:any) 
  {
    super(props);

    // bind <this> to the event method
    this.handleKeyPress = this.handleKeyPress.bind(this);
    this.handleOnBlur = this.handleOnBlur.bind(this);
    this.handleOnFocus = this.handleOnFocus.bind(this);
    this.handleClickExpandIcon = this.handleClickExpandIcon.bind(this);
    this.findInputContainerForNodeId = this.findInputContainerForNodeId.bind(this);
    this.getFocusedNodeId = this.getFocusedNodeId.bind(this);
    this.captureFocusState = this.captureFocusState.bind(this);
    this.handleGlobalKeyPress = this.handleGlobalKeyPress.bind(this);
  }

  shouldComponentUpdate(nextProps:any, _nextState:any) 
  {
    if( nextProps.rootNodeId != this.props.rootNodeId )
    {
      return true;
    }

    let thisNodeTreeRevision = this.props.nodeModel.nodeTreeRevision;
    let nextNodeTreeRevision = nextProps.nodeModel.nodeTreeRevision;

    this.nodeTreeRevision = thisNodeTreeRevision == null ? 1 : thisNodeTreeRevision;
    nextNodeTreeRevision = nextNodeTreeRevision == null ? 1 : nextNodeTreeRevision;

    // else compare the revision numbers to determine if a change is needed
    const nodeTreeRevisionChanged = this.nodeTreeRevision != nextNodeTreeRevision;

    // update this.nodeTreeRevision to the next nodeTreeRevision
    if( nodeTreeRevisionChanged )
    {
      this.nodeTreeRevision = nextNodeTreeRevision;
    }

    return nodeTreeRevisionChanged;
  }

  componentDidMount() 
  {
    document.addEventListener("keydown", this.handleGlobalKeyPress, false); 

    // When we first load, focus the first node
    this.focusNodeIndex( 0 );

    // store the focus as part of the undo model
    this.props.dispatch({
      type: 'NODES_STOREFOCUS',
      focusState: this.captureFocusState(),
      nodeTreeRevision: this.nodeTreeRevision
    });

    // recalc the concepts
    this.props.dispatch({
      type: 'CONCEPTS_RECALCULATE'
    });
  }

  handleGlobalKeyPress(event:KeyboardEvent): void
  {
    if( event.key == "z" && ( event.metaKey || event.ctrlKey ) )
    {
      event.preventDefault();
      if( this.props.past.length > 0 )
      {
        let priorFocusState = this.props.past[this.props.past.length-1].focusState;

        // this rules out the first bogus undo state
        if( priorFocusState && priorFocusState.focusedNodeId )
        {
          let focusedNodeId = priorFocusState.focusedNodeId;
          let cursorPosition = priorFocusState.cursorPosition;
          let inputOffset = priorFocusState.inputOffset;

          if( focusedNodeId == null )
          {
            throw new Error("No focusedNodeId node while attempting undo!");
          }

          // expand the tree if necessary
          this.props.dispatch({
            type: 'NODES_ENSUREEXPANDED',
            nodeId: focusedNodeId
          });

          store.dispatch( ActionCreators.undo() );

          // set the focus
          this.props.dispatch({
            type: 'FOCUS_SET',
            focusedNodeId: focusedNodeId,
            cursorPosition: cursorPosition,
            inputOffset: inputOffset
          });

          // persist the model after the undo
          this.props.dispatch({
            type: 'NODES_PERSIST'
          });
          
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
        let futureFocusState = this.props.future[0].focusState;
        let focusedNodeId = futureFocusState.focusedNodeId;
        let cursorPosition = futureFocusState.cursorPosition;
        let inputOffset = futureFocusState.inputOffset;

        // expand the tree if necessary
        this.props.dispatch({
          type: 'NODES_ENSUREEXPANDED',
          nodeId: focusedNodeId
        });

        store.dispatch( ActionCreators.redo() );

        // set the focus
        this.props.dispatch({
          type: 'FOCUS_SET',
          focusedNodeId: focusedNodeId,
          cursorPosition: cursorPosition,
          inputOffset: inputOffset
        });

        // persist the model after the redo
        this.props.dispatch({
          type: 'NODES_PERSIST'
        });
      }
      else
      {
        console.log("Nothing to redo!");
      }
    }
  }

  // render
  render(): JSX.Element
  {
    const { rootNodeId, nodeModel } = this.props;

    const rootNode = NodeUtil.getNodeForId( nodeModel, rootNodeId );

    this.nodeLevels = this.flatten( rootNode.childIds );

    // show the list of nodes
    return (
      <div ref="nodeViewContainer" style={{display:"flex", flexDirection:"column", flexGrow: 1}}>
        {this.nodeLevels.map((nodeLevel,index) => {
          return (
            <div key={nodeLevel.node.id} style={{display:"flex", flexDirection:"column"}}>
              <NodeView 
                key={nodeLevel.node.id} 
                ref={"nodeView_"+index}
                nodeId={nodeLevel.node.id}
                index={index}
                level={nodeLevel.level}
                hasChildren={(nodeLevel.node.childIds.length>0)}
                expanded={nodeLevel.node.expanded}
                handleKeyPress={this.handleKeyPress}
                handleClickExpandIcon={this.handleClickExpandIcon}
                handleOnBlur={this.handleOnBlur}
                handleOnFocus={this.handleOnFocus}
                captureFocusState={this.captureFocusState}
                getFocusedNodeId={this.getFocusedNodeId}
                findInputContainerForNodeId={this.findInputContainerForNodeId}/>
            </div>
            );
        })}
      </div>
    );
  }

  handleClickExpandIcon( _event:any, node:nodes.Node ): void
  {
    this.props.dispatch({
      type: 'NODES_TOGGLEEXPANSION',
      nodeId: node.id,
      focusState: this.captureFocusState(),
      nodeTreeRevision: this.nodeTreeRevision+1
    });
  }

  handleOnFocus( _event:any, _node:nodes.Node ): void
  {
    this.lastNodeIdFocused = this.getFocusedNodeId();    
  }

  handleOnBlur( event:any, _node:nodes.Node )
  {
    // if the focus is shifting to an expand / collapse widget...
    if( event.relatedTarget && event.relatedTarget.id == "expandWidget" )
    {
      // Keep inputs from losing focus during expand / collapse operations...
      // Return focus to the previously focused node
      this.props.dispatch({
        type: 'FOCUS_SET',
        focusedNodeId: this.lastNodeIdFocused,
        inputOffset: 0,
      });
    } 
    /*
    // Otherwise, if a node has changed since the last time we changed focus
    // and it not already associated with a concept
    else if( this.lastNodeIdChanged != null && 
             NodeUtil.getNodeForId(this.props.nodeModel, this.lastNodeIdChanged).conceptId == null )
    {
      // Check to see if we need to create a concept based on this node
      this.props.dispatch({
        type: 'NODES_UPDATE_CONCEPTS',
        nodeId: this.lastNodeIdChanged,
        focusState: this.captureFocusState(),
        nodeTreeRevision: this.nodeTreeRevision+1
      });
    }

    // and reset our tracker
    this.lastNodeIdChanged = null;
    */
  }

  getFocusedNodeId(): number
  {
    const activeElt = document.activeElement;

    // if the id is only digits
    if( /^[0-9]+$/.test(activeElt.id) )
    {
      // just to make sure the id is actually a node id...
      const node = NodeUtil.getNodeForId( this.props.nodeModel, parseInt(activeElt.id) );

      if( node )
      {
        return node.id;
      }
    }

    return null;
  }


  getCursorPosition(nodeId:number): number
  {
    return this.findInputForNodeId(nodeId).selectionStart;
  }

  captureFocusState( inputOffset=0, cursorOffset=0 ): nodes.FocusState
  {
    let focusedNodeId = this.getFocusedNodeId();
    //let index = this.findIndexForNodeId(focusedNodeId);

    if( focusedNodeId == null )
    {
      return { focusedNodeId:null, cursorPosition:null, inputOffset:null };
    }

    const input = this.findInputForNodeId( focusedNodeId );
    const cursorPosition = input.selectionStart;
    
    return { focusedNodeId:focusedNodeId, cursorPosition:(cursorOffset+cursorPosition), inputOffset:inputOffset };
  }

  // returns a nodeLevel object:
  // { node, level }
  getNodeLevel(id:number,offset:number=0): NodeLevel
  {
    let foundNodeLevel = null;
    let index = 0;

    for(let nodeLevel of this.nodeLevels)
    {
      if( nodeLevel.node.id == id )
      {
        foundNodeLevel = nodeLevel;
        break;
      }

      index++;
    }

    if( foundNodeLevel == null ) { return null; }
    if( offset == 0 ) { return foundNodeLevel; }

    // apply offset and check index
    let newIndex = offset + index;

    if( newIndex >= 0 && newIndex < this.nodeLevels.length )
    {
      return this.nodeLevels[newIndex];
    }

    return null;
  }

  handleKeyPress(event:any,node:nodes.Node): void
  {
    const { nodeModel } = this.props;
    const input = this.findInputForNodeId(node.id);
    const cursorPosition = input.selectionStart;
    const selectionEnd = input.selectionEnd;

    // they pressed tab
    if( event.key == "Tab" && !event.shiftKey )
    {
      event.preventDefault();
      this.props.dispatch({
        type: 'NODES_INDENT',
        nodeId: node.id,
        focusState: this.captureFocusState(),
        nodeTreeRevision: this.nodeTreeRevision+1
      });

      // check if we should expand the node above me if I'm becoming a part of it
      const myNodeLevel = this.getNodeLevel(node.id);
      const nodeLevelAboveMe = this.getNodeLevel(node.id,-1);

      if( nodeLevelAboveMe && myNodeLevel && // if they all exist
          nodeLevelAboveMe.level == myNodeLevel.level && // and our levels are equal
          !nodeLevelAboveMe.node.expanded ) // and the node above is collapsed
      {
        // expand the node above me since I'm becoming a part of it
        this.props.dispatch({
          type: 'NODES_TOGGLEEXPANSION',  
          nodeId: nodeLevelAboveMe.node.id,
          focusState: this.captureFocusState(),
          nodeTreeRevision: this.nodeTreeRevision+1
        });
      }
    }
    else if( event.key == "Tab" && event.shiftKey ) 
    {
      event.preventDefault();
      this.props.dispatch({
        type: 'NODES_UNINDENT',
        nodeId: node.id,
        focusState: this.captureFocusState(),
        nodeTreeRevision: this.nodeTreeRevision+1
      });
    }
    else if( event.key == "ArrowLeft"  && !event.shiftKey &&
      cursorPosition == 0 && // and if at the beginning of the input
      !this.isFirstNode(node.id) ) // and if not the top-most node
    {
      event.preventDefault();
      // focus the node above us and place the cursor at the end
      this.props.dispatch({
        type: 'FOCUS_SET',
        focusedNodeId: this.getFocusedNodeId(),
        inputOffset: -1,
        cursorPosition: -1 // -1 is code for "end of line"
      });

    }
    else if( event.key == "ArrowRight"  && !event.shiftKey &&
      cursorPosition == NodeUtil.getNodeTextForId(nodeModel,node.id).length && // and if at the end of the input
      !this.isLastNode(node.id) ) // and if not the last node
    {
      event.preventDefault();
      // focus the node below us and place cursor at the beginning
      this.props.dispatch({
        type: 'FOCUS_SET',
        focusedNodeId: this.getFocusedNodeId(),
        inputOffset: 1,
        cursorPosition: 0
      });

    }
    else if( event.key == "Enter" )
    {
      event.preventDefault();
      const nodeId = node.id;

      // if the alt/option key was used
      // add the node above us
      if( event.altKey )
      {
        let newNodeId = null;

        this.props.dispatch({
          type: 'NODES_ADDABOVE',
          nodeId: nodeId,
          focusState: this.captureFocusState(),
          nodeTreeRevision: this.nodeTreeRevision+1,
          addedNode: (nodeAddedId:number) => 
          {
            newNodeId = nodeAddedId;
          }
        });

        // focus the newly added node
        this.props.dispatch({
          type: 'FOCUS_SET',
          focusedNodeId: newNodeId,
          inputOffset: 0,
        });

      }
      else // add below us
      {
        let newNodeId = null;
        const focus = this.captureFocusState();

        this.props.dispatch({
          type: 'NODES_ADDBELOW',
          nodeId: nodeId,
          focusState: focus,
          nodeTreeRevision: this.nodeTreeRevision+1,
          addedNode: (nodeAddedId:number) => 
          {
            newNodeId = nodeAddedId;
          }
        });

        // focus the newly added node
        this.props.dispatch({
          type: 'FOCUS_SET',
          focusedNodeId: newNodeId,
          inputOffset: 0,
        });
      }
    }
    else if( event.key == "Backspace" && 
      cursorPosition == 0 && // and if at the beginning of the input
      selectionEnd == cursorPosition && // and if not a selection
      NodeUtil.getNodeTextForId(nodeModel,node.id) == "" && // and the node text is blank
      // and if I'm not the last node in my tree
      !( (NodeUtil.getParent( nodeModel, node.id ).type == "mainroot" ||
          NodeUtil.getParent( nodeModel, node.id ).type == "autoroot" ) && 
        NodeUtil.countNodesInSubtree( nodeModel, NodeUtil.getParent( nodeModel, node.id ).id ) == 2 ) )
    {
      this.focusNodeId(node.id,-1);
      event.preventDefault();

      // delete this node
      this.props.dispatch({
        type: 'NODES_DELETE',
        nodeId: node.id,
        focusState: this.captureFocusState(1),
        nodeTreeRevision: this.nodeTreeRevision+1,
      });

      // recalc the concepts
      this.props.dispatch({
        type: 'CONCEPTS_RECALCULATE'
      });
      
    }
  }

  getInputList(): NodeList
  {
    return document.getElementsByClassName("textArea");
  }

  findInputForNodeId(id:number): HTMLTextAreaElement
  {
    return document.getElementById(id.toString()) as HTMLTextAreaElement;
  }

  isFirstNode(id:number)
  {
    return this.findInputContainerForNodeId(id).index == 0;
  }

  isLastNode(id:number)
  {
    return this.findInputContainerForNodeId(id).index == this.getInputList().length-1;
  }

  findIndexForNodeId(id:number): number
  {
    const textAreaNodeList = this.getInputList();

    for( let i=0; i< textAreaNodeList.length; i++ )
    {
      if( (textAreaNodeList[i] as Element).id == id.toString() )
      {
        return i;
      }
    }

    return null
  }

  findInputContainerForNodeId(id:number,offset=0): InputContainer
  {
    const textAreaNodeList = this.getInputList();

    let index = this.findIndexForNodeId(id);

    if( index == null ) throw new Error("ERROR: findInputForNodeId could not find textArea with node id "+id);

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

  focusNodeId(id:number,offset=0,cursorPosition=-1):void
  {
    let input:HTMLTextAreaElement;

    if( offset == 0 )
    {
      input = this.findInputForNodeId(id)
    }
    else
    {
      const inputMap = this.findInputContainerForNodeId(id,offset);
      input = inputMap.input;
    }

    input.focus();
    input.selectionStart = cursorPosition == -1 ? input.value.length : cursorPosition;
  }

  focusNodeIndex(index:number)
  {
    const textAreaNodeList = document.getElementsByClassName("textArea");

    if( textAreaNodeList != null && textAreaNodeList.length > 0 &&
        index >= 0 && index < textAreaNodeList.length )
    {
      (textAreaNodeList[index] as HTMLTextAreaElement).focus();
    }
  }

  /********
  Recursive function that returns an array of NodeLevels:
   { node:{...node object...}, level:1 }
  Where level 0 is no indentation, and
  level 1 is indented one level, etc.
  *********/
  flatten( childIds: Array<number>, level=0, flattened:Array<NodeLevel>=[] ): Array<NodeLevel>
  {
    for(let i=0; i<childIds.length; i++) 
    {
      const childId = childIds[i];
      const child = NodeUtil.getNodeForId( this.props.nodeModel, childId );
      flattened.push( { node:child, level:level } );

      if( child.expanded )
      {
        this.flatten( child.childIds, level+1, flattened );
      }
    }

    return flattened;
  }

}

function mapStateToProps(state:any): any
{
  return { 
    rootNodeId: state.root.rootNodeId,
    nodeModel: { 
      focusState:state.nodeModel.present.focusState, 
      nodes:state.nodeModel.present.nodes, 
      nodeTreeRevision: state.nodeModel.present.nodeTreeRevision 
    },
    past: state.nodeModel.past,
    future: state.nodeModel.future
  };
}
export const NodeTreeView = connect(mapStateToProps)(NodeTreeViewClass)
