import * as n from "../../types/nodes";

import React from "react";
import { connect } from "react-redux";
import ActionHandler from "../../util/ActionHandler"
import { NodeAction } from "../../util";;
//import Draggable from 'react-draggable';
import Select from 'react-select';

interface LocalState
{
  activeDrags?: number;
  query?:n.Query;
  conceptsToShow?:Array<n.Concept>;
}

interface ReduxState
{
  documentNodeRefId?: n.NodeRefId;
  treeNodes?: n.TreeNodes;
  documents?: Array<n.Document>;
}

type State = LocalState & ReduxState;

interface ParamProps
{
  visible: boolean;
}

type Props = ParamProps & ReduxState;

class QueryViewClass extends React.Component<Props, State>
{
  refs: any;

  constructor( props:any )
  {
    super(props);
    this.state = { activeDrags: 0 };
    this.setShowSelect = this.setShowSelect.bind(this);
    this.setConceptsToShowSelect = this.setConceptsToShowSelect.bind(this);
    this.defineChildrenClicked = this.defineChildrenClicked.bind(this);
    this.deleteEntryClicked = this.deleteEntryClicked.bind(this);
  }

  componentWillReceiveProps( nextProps:Props )
  {
    if( nextProps.visible )
    {
      this.refresh( nextProps.documentNodeRefId );
    }

    return true;
  }

  refresh( documentNodeRefId:n.NodeRefId )
  {
    const n = NodeAction.get();

    this.state = {
      query:n.getOrCreateQuery(documentNodeRefId),
      conceptsToShow:n.getConceptsToShow(documentNodeRefId)
    };
  }

  defineChildrenClicked()
  {
    let { query } = this.state;
    ActionHandler.nodeAction( n => {
      this.setState( { query: n.addQueryEntry( query ) } );
    }, true, true, true );
  }

  deleteEntryClicked( entryId:n.QueryEntryId )
  {
    let { query } = this.state;
    ActionHandler.nodeAction( n => {
      this.setState( { query: n.deleteQueryEntry( query, entryId ) } );
    }, true, true, true );
  }

  setShowSelect(showSelectOption:n.SelectOption, index:n.QueryEntryId) 
  {
    this.setSelected( index, showSelectOption.value as string );
  }

  setConceptsToShowSelect(conceptsToShowSelectOption:n.SelectOption, index:number) 
  {
    this.setSelected( index, null, conceptsToShowSelectOption.value as number );
  }

  setSelected( index:number, showSelectNewValue?:string, conceptsToShowNodeIdNewValue?:n.NodeId )
  {
    const { documentNodeRefId } = this.props;
    const queryParams:n.QueryEntryParams = 
      showSelectNewValue ? { showSelect:showSelectNewValue } : { conceptsToShowNodeId:conceptsToShowNodeIdNewValue };
    
    const { query } = this.state;
    
    // set the select value
    const newEntry = Object.assign( {}, query.entries[ index ], queryParams );
    let newEntries = query.entries.slice();
    newEntries[index] = newEntry;

    // merge it into the query
    let newQuery:n.Query = { nodeRefId:documentNodeRefId, entryIds: null, entries: newEntries };

    // save the query
    ActionHandler.nodeAction( n => {
      // set the query in the redux state, returns the finished query obj
      newQuery = n.setQuery( documentNodeRefId, newQuery );
      // set the query in the local state
      this.setState( { query:newQuery } );
      n.recalcTreeNodes();
    }, true, true, false );
  }

  render() 
  {
    const { query, conceptsToShow } = this.state;
    const { visible, documents, documentNodeRefId } = this.props;

    if( !visible ) return null;

    //const dragHandlers = { onStart: this.onStart, onStop: this.onStop };
    const thisDoc = documents.find( doc => doc.nodeRefId == documentNodeRefId );
    const thisDocName = NodeAction.get().getDocName( thisDoc.nodeRefId );

    // generate concepts to show dropdown
    const conceptsToShowOptions:Array<n.SelectOption> = [];
    conceptsToShowOptions.push( { value: -1, label: "parent" } );

    for( let concept of conceptsToShow )
      conceptsToShowOptions.push( { value: concept.nodeId, label: concept.name } );

    //https://github.com/JedWatson/react-select

    return (
      <div ref="queryView" className="queryView">
        <div className="queryViewHeader">
          <span className="nonModalDialogTitle">Query for {thisDocName}</span>
        </div>
        <div className="queryViewBody">
          { query.entries.map( (queryEntry, index) => {
            return (
            <div className="showLine" key={queryEntry.id} style={{marginLeft:index*15}}>

              <Select className="showSelect1"
                clearable={false}
                searchable={false}
                name="showSelect"
                value={queryEntry.showSelect}
                options={n.SHOW_SELECT_OPTIONS}
                onChange={(option:n.SelectOption) => this.setShowSelect(option, index) }/>

              <Select className="showSelect2"
                clearable={false}
                name="conceptsToShowSelect"
                value={queryEntry.conceptsToShowNodeId}
                options={conceptsToShowOptions}
                onChange={(option:n.SelectOption) => this.setConceptsToShowSelect(option, index)}/>

              <i className="removeCircle fa-times-circle" aria-hidden="true" 
                onClick={()=>this.deleteEntryClicked(queryEntry.id)}></i>

            </div> 
            );
          })}
          <div 
            className="defineQueryRow" 
            style={{marginLeft:query.entries.length*15}} 
            onClick={() => this.defineChildrenClicked()}>
            <span className="defineQuery">
              <i className="plusCircle fa fa-plus-circle" aria-hidden="true"></i> define children</span>
          </div>
        </div>
      </div>
    );
  }
}


// export the connected class
function mapStateToProps(state:n.NodeModelState): ReduxState
{
  return { 
    documentNodeRefId: state.nodeModel.present.documentNodeRefId,
    treeNodes:state.nodeModel.present.treeNodes,
    documents:state.nodeModel.present.documents,
  };
}
export const QueryView = connect<State,ParamProps,ParamProps>(mapStateToProps,null,null,{withRef:true})(QueryViewClass)
//<TStateProps, TDispatchProps, TOwnProps>
