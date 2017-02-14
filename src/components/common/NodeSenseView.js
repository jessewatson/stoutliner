import React, { PropTypes } from "react";
import Radium from 'radium';
import FontAwesome from 'react-fontawesome';
import { NodeUtil, MapArray } from "../../util";
import { connect } from "react-redux";

// Node List Element component
class NodeSenseViewClass extends React.Component {

  constructor(props) {
    super(props);
    this.state = this.getResetState();

    this.senseChosen = this.senseChosen.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.handleOnBlur = this.handleOnBlur.bind(this);
  }

  getResetState()
  {
    return {
      sense:{
        sensedNodeId: null,
        sensedText: "",
        choices:[],
        visible: false,
        value: 0
      }
    };
  }

  handleChange(event)
  {
    this.setState( Object.assign(
      {},
      {
        sense:{
          visible: false,
          value: event.target.value,
        }
      }));
  }

  handleOnBlur(event)
  {
    console.log("handleOnBlur");
    this.setState( this.getResetState() );
  }

  senseChosen()
  {
    return {};
  }

  // render
  render() 
  {    
    let {nodeId} = this.props;
    let {sensedNodeId,sensedText,choices,visible} = this.state.sense;
    console.log("state",this.state.visible);
    // if there are no choices, or these are not for our nodeId...
    if( !choices || nodeId != sensedNodeId )
    {
      choices = [];
    }

    if( choices.length == 0 )
    {
      visible = false;
    }

    const style = {
      display: visible ? "flex" : "none",
    };

    return (
      <select 
        style={style} 
        value={this.state.value} 
        onChange={this.handleChange}
        onBlur={this.handleOnBlur}>
        {choices.map((choice,index) => {
          return ( <option key={index} value={index}>{choice}</option> );
        })}
      </select>
    );
  }

}
module.exports = Radium(NodeSenseView);

