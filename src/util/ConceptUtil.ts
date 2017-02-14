import * as nodes from "../types/nodes";

export default class ConceptUtil 
{
  // *****************************************************************
  // ******* PUBLIC STATIC METHODS ***********************************
  // *****************************************************************

  // returns entire nodeModel
  // designed only to work on a node which has NOT yet had a concept created for it
  // otherwise, it is a no-op
  static recalculateConcepts( nodes:Array<nodes.Node>, cm:nodes.ConceptModel ): nodes.ConceptModel
  {
    let newConceptNames:Array<string> = [];
    let newConcepts:nodes.ConceptMap = {};

    for( let node of nodes )
    {
      // Only add non-leaf nodes that are marked to be shown as concepts
      if( node.showAsConcept && node.childIds.length > 0 )
      {
        let displayName = node.text.trim();
        let upperName = displayName.toUpperCase();

        //build a non deuped set of concepts and names
        if( newConcepts[upperName] == null )
        {
          newConceptNames.push( upperName );
          newConcepts[upperName] = { displayName:displayName, upperName:upperName, type:"auto" };
        }
      }
    }

    // add in any sticky concepts
    for( let priorConceptName of cm.conceptNames )
    {
      // for any existing concept that is sticky, and that
      // wasn't reconstituted from the latest node set
      if( cm.concepts[priorConceptName].type == "sticky" &&
          newConceptNames.indexOf( priorConceptName ) == -1 )
      {
        // add it back
        newConceptNames.push( priorConceptName );
        newConcepts[ priorConceptName ] = cm.concepts[priorConceptName];
      }
    }

    newConceptNames.sort();

    const newConceptModel = { conceptNames: newConceptNames, concepts: newConcepts };
    
    return newConceptModel;

  }
}