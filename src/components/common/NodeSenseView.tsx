import * as n from "../../types/nodes";

import * as React from 'react';

import { connect } from "react-redux";
import { NodeAction } from "../../util";
import ActionHandler from "../../util/ActionHandler";

interface Choice 
{
  chunks:Array<Chunk>;
  match:n.NodeMatch;
}

interface Chunk 
{
  text: string;
  isHint: boolean;
}

interface LocalState
{
  selectedIndex: number;
  visible: boolean;
  choices: Array<Choice>;
}

interface ReduxProps
{
}

interface ParamProps
{
  treeNodeKey: n.TreeNodeKey;
  textTyped: string;
}

type Props = ParamProps & ReduxProps;


// Node List Element component
export class NodeSenseViewClass extends React.PureComponent<ParamProps, LocalState>
{
  constructor(props:Props) 
  {
    super(props);

    //this.senseChosen = this.senseChosen.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.handleOnBlur = this.handleOnBlur.bind(this);
    this.handleClick = this.handleClick.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleMouseOver = this.handleMouseOver.bind(this);
    this.state = { selectedIndex: 0, choices: [], visible: false };
  }

  handleClick(_event:any,match:n.NodeMatch)
  {
    ActionHandler.nodeAction( (n:NodeAction) => {
      n.commitNodeName( this.props.treeNodeKey, match.nodeName, true );
    } );
    this.setState( { visible: false } );
  }

  handleOnBlur()
  {
    this.setState( { visible: false } );
  }

  handleMouseOver(_event:any,selectedIndex:number)
  {
    let { visible } = this.state;

    if( visible )
    {
      this.setState( { selectedIndex: selectedIndex } );
    }
  }

  handleKeyDown(event:React.KeyboardEvent<HTMLDivElement>)
  {
    let selectedIndex = this.state.selectedIndex;
    let { visible, choices } = this.state;

    if( visible )
    {
      if( event.key == "ArrowDown" )
      {
        event.preventDefault();
        event.stopPropagation();
        this.setState( { selectedIndex: Math.min( selectedIndex+1, choices.length-1 ) } );
      }
      else if( event.key == "ArrowUp" )
      {
        event.preventDefault();
        event.stopPropagation();
        this.setState( { selectedIndex: Math.max( selectedIndex-1, 0 ) } );
      }
      else if( event.key == "Enter" )
      {
        event.preventDefault();
        event.stopPropagation();
        ActionHandler.nodeAction( (n:NodeAction) => {
          let choice = this.state.choices[selectedIndex];
          n.commitNodeName( this.props.treeNodeKey, choice.match.nodeName, true );
        } );
        this.setState( { visible: false, selectedIndex: 0 } );
      }
    }
  }

  isVisible()
  {
    return this.state.visible;
  }

  handleChange(event:any,treeNode:n.TreeNode)
  {
    let textTyped = event.target.value;

    let matches:Array<n.NodeMatch> = [];

    // get the node matches
    ActionHandler.nodeAction( (n:NodeAction) => {
      matches = n.matchSimilarNamedConcepts( treeNode.key, textTyped );
    } );

    const visible = matches.length > 0 ? true : false;

    // set the node matches
    this.setState( { visible: visible, choices: this.getChoices( matches ) } );
  }

  getChoices( matches:Array<n.NodeMatch> )
  {
    let choices:Array<Choice> = [];

    matches.forEach( (match) => {
      choices.push( { match:match, chunks:[ { text:match.nodeName, isHint:false }, { text:"link", isHint:true } ] } );
      choices.push( { match:match, chunks:[ { text:match.nodeName, isHint:false }, { text:"link and list contents", isHint:true } ] } );
      choices.push( { match:match, chunks:[ { text:match.nodeName, isHint:false }, { text:"not a link", isHint:true } ] } );
    } );

    return choices;
  }

  // render
  render() 
  {
    let { visible, choices, selectedIndex } = this.state;

    const style = {
      display: visible ? "flex" : "none",
    };

    return (
      <div className="senseMenuContainer" onBlur={() => {this.handleOnBlur()}} onKeyDown={(event) => this.handleKeyDown(event)} >
        {this.props.children}
        <ul className="senseMenu" style={style} ref="senseMenu" >
          {choices.map( (choice, i) => {
            return ( 
              <li className={ i == selectedIndex ? "senseMenuItemSelected" : "senseMenuItem" }  
                onMouseDown={(event) => {this.handleClick(event,choice.match)}} 
                onMouseOver={(event) => {this.handleMouseOver(event,i)}} 
                key={i}>
                {choice.chunks.map( (chunk, j ) => {
                  return ( <span key={j} 
                    className={ chunk.isHint ? 
                      ( i == selectedIndex ? "itemHintSelected" : "itemHint" ) : 
                      ( i == selectedIndex ? "itemTextSelected" : "itemText") }>{chunk.text}</span> );
                } )}
              </li> );
          })}
        </ul>
      </div>
    );
  }
}

//'(props: StateProps & ParamProps & { children?: ReactNode; }, context?: any): ReactElement<any>'

function mapStateToProps(_state:n.NodeModelState): ReduxProps
{
  return { 
  };
} // withRef:true so we can access the getWrappedInstance() in NodeView.handleKeyPress

export const NodeSenseView = connect<ReduxProps,ReduxProps,ParamProps>(mapStateToProps,null,null,{withRef:true})(NodeSenseViewClass);
//<TStateProps, TDispatchProps, TOwnProps>
