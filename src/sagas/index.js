import { takeLatest } from "redux-saga";
import { fork } from "redux-saga/effects";
import { call, put } from "redux-saga/effects";
import { store } from "../store";
import NodeModelAPI from "../api/NodeModelAPI";
import NodeUtil from "../util/NodeUtil";

function saveAll()
{
  NodeModelAPI.saveAll( store.getState().nodeModel, store.getState().conceptModel );
}

function* changeRoot(action)
{
  let rootNodeId = null;

  if( action.query )
  {
    // build and save an alternative tree if query is present
    // return the root for later
    // update the state
    yield put({
      type: 'NODES_GETORADDNODEFORQUERY_SAVE',
      query: action.query,
      returnNodeId: (nodeId) => 
      {
        rootNodeId = nodeId;
      }
    });

    if( rootNodeId == null )
    {
      console.log("WARNING: App init could not find node for query: '"+action.query+"'. Defaulting to root.");      
    }
  }

  // establish the root node id
  rootNodeId = rootNodeId ? rootNodeId : NodeUtil.mainRootNodeId;

  // save it in state
  yield put({ 
    type: "ROOT_ESTABLISHROOT",
    rootNodeId: rootNodeId,
    nodeTreeRevision: action.nodeTreeRevision
  });
}

function* getNodesImpl(action)
{
  // call the api to get the node model
  const nodeModel = yield call(NodeModelAPI.getNodeModel);

  // save the nodes in state
  yield put({
    type: 'NODES_GET_SAVE_UNDOABLE',
    nodeModel: nodeModel,
    nodeTreeRevision: action.nodeTreeRevision
  });
}

function* getConceptsImpl(action)
{
  // call the api to get the concepts model
  const conceptModel = yield call(NodeModelAPI.getConceptModel);

  // save the concepts in state
  yield put({
    type: 'CONCEPTS_GET_SAVE',
    conceptModel: conceptModel
  });
}

// main saga generators
export function* sagas() {
  yield [
    // * getNodes ***********************************

    fork(takeLatest, 'NODES_GET',
      function* getNodes(action) 
      {
        yield getNodesImpl(action);
      }),

    fork(takeLatest, 'CONCEPTS_GET',
      function* getConcepts(action) 
      {
        yield getConceptsImpl(action);
      }),

    // * appInit ***********************************

    fork(takeLatest, 'APP_INIT', 
      function* appInit(action) 
      {
        yield getNodesImpl(action);

        yield getConceptsImpl(action);

        yield changeRoot(action);

        yield call (saveAll);
      }
    ),

    // * resetRoot ***********************************

    fork(takeLatest, 'RESET_ROOT', 
      function* resetRoot(action) 
      {
        yield changeRoot(action);
        
        yield call (saveAll);
      }
    ),

    // * indentNodes ***********************************

    fork(takeLatest, 'NODES_STOREFOCUS',
      function* indentNodes(action) 
      {
        // update the state
        yield put({
          type: 'NODES_STOREFOCUS_SAVE',
          focusState: action.focusState,
          nodeTreeRevision: action.nodeTreeRevision
        });
      }
    ),

    // * indentNodes ***********************************

    fork(takeLatest, 'NODES_INDENT', 
      function* indentNodes(action) 
      {
        // update the state
        yield put({
          type: 'NODES_INDENT_SAVE_UNDOABLE',
          nodeId: action.nodeId,
          focusState: action.focusState,
          nodeTreeRevision: action.nodeTreeRevision
        });

        // call the api to update the nodes
        saveAll();
      }
    ),

    // * unindentNodes ***********************************

    fork(takeLatest, 'NODES_UNINDENT', 
      function* unindentNodes(action) 
      {
        // update the state
        yield put({
          type: 'NODES_UNINDENT_SAVE_UNDOABLE',
          nodeId: action.nodeId,
          focusState: action.focusState,
          nodeTreeRevision: action.nodeTreeRevision
        });

        // call the api to update the nodes
        saveAll();

      }
    ),

    // * addNodeBelow ***********************************

    fork(takeLatest, 'NODES_ADDBELOW', 
      function* addNodeBelow(action) 
      {
        // update the state
        yield put({
          type: 'NODES_ADDBELOW_SAVE_UNDOABLE',
          nodeId: action.nodeId,
          focusState: action.focusState,
          addedNode: action.addedNode,
          nodeTreeRevision: action.nodeTreeRevision
        });

        // call the api to update the nodes
        saveAll();

      }
    ),

    // * addNodeAbove ***********************************

    fork(takeLatest, 'NODES_ADDABOVE', 
      function* addNodeAbove(action) 
      {
        // update the state
        yield put({
          type: 'NODES_ADDABOVE_SAVE_UNDOABLE',
          nodeId: action.nodeId,
          focusState: action.focusState,
          nodeTreeRevision: action.nodeTreeRevision,
          addedNode: action.addedNode
        });

        // call the api to update the nodes
        saveAll();

      }
    ),

    // * deleteNode ***********************************

    fork(takeLatest, 'NODES_DELETE', 
      function* deleteNode(action) 
      {
        // update the state
        yield put({
          type: 'NODES_DELETE_SAVE_UNDOABLE',
          nodeId: action.nodeId,
          focusState: action.focusState,
          nodeTreeRevision: action.nodeTreeRevision,
        });

        // call the api to update the nodes
        saveAll();
      }
    ),

    // * updateNode ***********************************

    fork(takeLatest, 'NODES_UPDATE', 
      function* updateNode(action) 
      {
        // update the state
        yield put({
          type: 'NODES_UPDATE_SAVE_UNDOABLE',
          nodeId: action.nodeId,
          text: action.text,
          focusState: action.focusState,
          nodeTreeRevision: action.nodeTreeRevision,
        });

        // call the api to update the nodes
        saveAll();
      }
    ),

    // * toggleExpansion ***********************************

    fork(takeLatest, 'NODES_TOGGLEEXPANSION', 
      function* toggleExpansion(action) 
      {
        // update the state
        yield put({
          type: 'NODES_TOGGLEEXPANSION_SAVE',
          nodeId: action.nodeId,
          focusState: action.focusState,
          nodeTreeRevision: action.nodeTreeRevision,
        });

        // call the api to update the nodes
        saveAll();
      }
    ),

    // * establishRoot ***********************************

    fork(takeLatest, 'ROOT_ESTABLISHROOT', 
      function* establishRoot(action) 
      {
        // update the state
        yield put({
          type: 'ROOT_ESTABLISHROOT_SAVE',
          rootNodeId: action.rootNodeId
        });

        // call the api to update the nodes
        saveAll();
      }
    ),

    // * ensureNodeExpanded ***********************************

    fork(takeLatest, 'NODES_ENSUREEXPANDED', 
      function* ensureNodeExpanded(action) 
      {
        // update the state
        yield put({
          type: 'NODES_ENSUREEXPANDED_SAVE',
          nodeId: action.nodeId,
          nodeTreeRevision: action.nodeTreeRevision,
        });

        // call the api to update the nodes
        saveAll();
      }
    ),

    // * updateConcepts ***********************************

    fork(takeLatest, 'CONCEPTS_RECALCULATE', 
      function* conceptsRecalc(action) 
      {
        // update the state
        yield put({
          type: 'CONCEPTS_RECALCULATE_SAVE'
        });

        // call the api to update the nodes
        saveAll();
      }
    ),

    // * addRelatedChildren ***********************************

    fork(takeLatest, 'NODES_UPDATEAUTO', 
      function* autoAddNodes(action) 
      {
        // update the state
        yield put({
          type: 'NODES_UPDATEAUTO_SAVE',
          nodeId: action.nodeId,
          nodeTreeRevision: action.nodeTreeRevision,
        });

        // call the api to update the nodes
        saveAll();
      }
    ),

    // * persist - no-op for saving the model ***********************************

    fork(takeLatest, 'NODES_PERSIST', 
      function* perist(action) 
      {
        // update the state
        yield put({ type: 'NODES_PERSIST_SAVE' });

        // call the api to update the nodes
        saveAll();
      }
    ),
    // * setFocusState ***********************************

    fork(takeLatest, 'FOCUS_SET', 
      function* setFocusState(action) 
      {
        // update the state
        yield put({
          type: 'FOCUS_SET_SAVE',
          focusedNodeId: action.focusedNodeId,
          inputOffset: action.inputOffset,
          cursorOffset: action.cursorOffset,
          cursorPosition: action.cursorPosition,
        });
      }
    ),

    // * setFocusState ***********************************

    fork(takeLatest, 'SENSE_GET', 
      function* senseDisplay(action) 
      {
        // update the state
        yield put({
          type: 'SENSE_GET_SAVE',
          nodeId: action.nodeId,
          text: action.text
        });

      }
    ),


  ];
}
