import * as n from "../types/nodes";
import NodeAction from "../util/NodeAction";

// until typescript supports idle callbacks

// API Nodes static class
export default class NodeModelAPI 
{
  // get a list of nodes
  static getNodeModel(): n.NodeModel
  {
    let nodeModel:n.NodeModel;
    
    let serializedModel = localStorage.getItem('JULIAN_NODEMODEL');

    if( serializedModel )
    {
      // load the model from local storage if present
      nodeModel = JSON.parse(serializedModel);
    }
    else // otherwise set up initial node model
    {
      const starterNodeId = 2;
      const starterNodeRefId = 20;

      // --- TREE NODES ---

      const dummyRootNode:n.Node = {
        id: NodeAction.DUMMY_NODE_ID, 
        showAsConcept: false, 
        name:"Dummy Root", 
        childIds:[ NodeAction.MAINDOC_NODEREF_ID ]
      };
      const rootNode:n.Node = {
        id: NodeAction.MAINDOC_NODE_ID, 
        showAsConcept: true, 
        name:"Main Document", 
        childIds:[ starterNodeRefId ],
      };
      const starterNode:n.Node = {
        id: starterNodeId, 
        showAsConcept: true, 
        name:"", 
        childIds:[],
      };

      // --- TREE NODE REFS ---
      const dummyNodeRef:n.NodeRef = {
        id: NodeAction.DUMMY_NODEREF_ID, 
        parentNodeId: null, 
        nodeId: NodeAction.DUMMY_NODE_ID, 
        contextPath:[],
        queryNode: false
      };
      const rootNodeRef:n.NodeRef = {
        id: NodeAction.MAINDOC_NODEREF_ID, 
        parentNodeId: NodeAction.DUMMY_NODE_ID, 
        nodeId: NodeAction.MAINDOC_NODE_ID, 
        contextPath:[NodeAction.DUMMY_NODE_ID],
        queryNode: false
      };
      const starterNodeRef:n.NodeRef = {
        id: starterNodeRefId, 
        parentNodeId: NodeAction.MAINDOC_NODE_ID,
        nodeId: starterNodeId, 
        contextPath:[ NodeAction.DUMMY_NODE_ID, NodeAction.MAINDOC_NODE_ID ],
        queryNode: false
      };

      nodeModel = {
        documentNodeRefId: NodeAction.MAINDOC_NODEREF_ID,
        nodeTreeRevision: 0,
        concepts: [],
        nodes: {},
        nodeRefs: {},
        treeNodes: {},
        docTreeNodes: [],
        treeNodeMetas: {},
        queryEntries: {},
        queryResultNodes: [],
        documents: [ {
          nodeRefId:NodeAction.MAINDOC_NODEREF_ID,
          isView:false } ],
        focus: {
          performFocus:true,
          focusedDocumentNodeRefId: NodeAction.MAINDOC_NODEREF_ID,
          focusedTreeNodeKey: NodeAction.nodeRefIdPathToKey( [ NodeAction.DUMMY_NODEREF_ID, NodeAction.MAINDOC_NODEREF_ID, starterNodeRefId ] ),
        }
      };

      nodeModel.nodes[NodeAction.DUMMY_NODE_ID] = dummyRootNode;
      nodeModel.nodes[NodeAction.MAINDOC_NODE_ID] = rootNode;
      nodeModel.nodes[starterNodeId] = starterNode;
      nodeModel.nodeRefs[NodeAction.DUMMY_NODEREF_ID] = dummyNodeRef;
      nodeModel.nodeRefs[NodeAction.MAINDOC_NODEREF_ID] = rootNodeRef;
      nodeModel.nodeRefs[starterNodeRefId] = starterNodeRef;
    }

    return nodeModel;
  }

  static saveNodeModel( nodeModel:n.NodeModel ): void 
  {
   let extendedWindow = <n.IdleCallable> <any> window;

    extendedWindow.requestIdleCallback(() => {
      localStorage.setItem('JULIAN_NODEMODEL', 
        JSON.stringify( nodeModel )
      );
    });
  }

  static saveAll( nodeModel:n.NodeModelSnapshots ): void 
  {
    NodeModelAPI.saveNodeModelUndoable( nodeModel );
  }

  static saveNodeModelUndoable(nodeModel:n.NodeModelSnapshots): void 
  {
    let extendedWindow = <n.IdleCallable> <any> window;

    // if there is something to save...
    if( nodeModel.present.nodes )
    {
      // doesn't save the undo past and future arrays
      extendedWindow.requestIdleCallback(() => {
        localStorage.setItem('JULIAN_NODEMODEL', 
          JSON.stringify(
            { 
              documentNodeRefId: nodeModel.present.documentNodeRefId,
              nodes: nodeModel.present.nodes, 
              nodeRefs: nodeModel.present.nodeRefs, 
              queryEntries: nodeModel.present.queryEntries, 
              queryResultNodes: nodeModel.present.queryResultNodes,
              treeNodeMetas: nodeModel.present.treeNodeMetas, 
              tempNodes: nodeModel.present.tempNodes, 
              focus: nodeModel.present.focus
            }
          )
        );
      });
    }
  }

/*
  static sleepFor( sleepDuration ){
    var now = new Date().getTime();
    while(new Date().getTime() < now + sleepDuration){ } 
 }
*/
}


