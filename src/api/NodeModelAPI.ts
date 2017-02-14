import * as nodes from "../types/nodes";
import NodeUtil from "../util/NodeUtil";

// until typescript supports idle callbacks
interface IdleCallable {
  requestIdleCallback(args:any): void;
}

// API Nodes static class
export default class NodeModelAPI {

  // get a list of concepts
  static getConceptModel() : Promise<nodes.ConceptModel> {
    return new Promise(resolve => {

      setTimeout(() => {

        let conceptModel:nodes.ConceptModel;
        let serializedModel = localStorage.getItem('JULIAN_CONCEPTMODEL');

        if( serializedModel )
        {
          // load the model from local storage if present
          conceptModel = JSON.parse(serializedModel);
        }
        else // otherwise set up initial node model
        {
          conceptModel = {
             conceptNames: [],
             concepts: {}
          };
        }

        resolve(conceptModel);

      }, 1000); // end settimeout

    }); // end promise
  }

  // get a list of nodes
  static getNodeModel() : Promise<nodes.NodeModel> {
    return new Promise(resolve => {

      setTimeout(() => {

        let nodeModel:nodes.NodeModel;
        let serializedModel = localStorage.getItem('JULIAN_NODEMODEL');

        if( serializedModel )
        {
          // load the model from local storage if present
          nodeModel = JSON.parse(serializedModel);
        }
        else // otherwise set up initial node model
        {
          nodeModel = {
            nodes: [ 
              {
                id: NodeUtil.projectNodeId, 
                type: "projectroot", 
                showAsConcept: false, 
                text:"Untitled Project", 
                childIds: [NodeUtil.mainRootNodeId], 
                expanded: true, 
                showRelatedChildren: false, 
                showRelatedTrees: false, 
                relatedChildOf: null, 
                relatedTreeNodeOf: null
              },
              {
                id: NodeUtil.mainRootNodeId, 
                type: "mainroot", 
                showAsConcept: false, 
                text:"Main View", 
                childIds: [2],  
                expanded: true, 
                showRelatedChildren: false, 
                showRelatedTrees: false, 
                relatedChildOf: null, 
                relatedTreeNodeOf: null 
              },
              {
                id: 2, 
                type: "standard", 
                showAsConcept: true, 
                text:"", 
                childIds: [],  
                expanded: true, 
                showRelatedChildren: true, 
                showRelatedTrees: true, 
                relatedChildOf: null, 
                relatedTreeNodeOf: null 
              } ],
            focusState: { focusedNodeId: 2, cursorPosition: 0, inputOffset: 0 }
          };
        }

        resolve(nodeModel);

      }, 1000); // end settimeout

    }); // end promise
  }

  static saveAll( nodeModel:nodes.NodeModelSnapshots, conceptModel:nodes.ConceptModel ): Promise<any> {
    return new Promise(resolve => {

        NodeModelAPI.saveNodeModel( nodeModel );
        NodeModelAPI.saveConceptModel( conceptModel );

        resolve();

    });// end Promise
  }

  static saveNodeModel(nodeModel:nodes.NodeModelSnapshots): Promise<any> {
    return new Promise(resolve => {

      let extendedWindow = <IdleCallable> <any> window;

      extendedWindow.requestIdleCallback(() => {
        localStorage.setItem('JULIAN_NODEMODEL', 
          JSON.stringify(
            { 
              nodes: nodeModel.present.nodes, 
              focusState: nodeModel.present.focusState
            }
          )
        );

        resolve();

      }); // end idle call back
    });// end Promise
  }

  static saveConceptModel(conceptModel:nodes.ConceptModel): Promise<any> {
    return new Promise(resolve => {

      let extendedWindow = <IdleCallable> <any> window;

      extendedWindow.requestIdleCallback(() => {
        localStorage.setItem('JULIAN_CONCEPTMODEL', 
          JSON.stringify(
            { 
             conceptNames: conceptModel.conceptNames,
             concepts: conceptModel.concepts
            }
          )
        );

        resolve();

      }); // end idle call back
    });// end Promise
  }
/*
  static sleepFor( sleepDuration ){
    var now = new Date().getTime();
    while(new Date().getTime() < now + sleepDuration){ } 
 }
*/
}


