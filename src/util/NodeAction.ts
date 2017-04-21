import * as n from "../types/nodes";
import NodeModelAPI from "../api/NodeModelAPI";
import { store } from "../store";


// Node utility static class
export default class NodeAction 
{
  // *****************************************************************
  // ******* PUBLIC STATIC MEMBERS ***********************************
  // *****************************************************************

  public static DUMMY_NODE_ID:n.NodeId = 0;
  public static MAINDOC_NODE_ID:n.NodeId = 1;
  public static DUMMY_NODEREF_ID:n.NodeRefId = 0;
  public static MAINDOC_NODEREF_ID:n.NodeRefId = 10;
  public static MAX_CONCEPT_LENGTH:number = 50;
  
  public debugTreeNode( treeNode:n.TreeNode ):string
  {
    console.log( "DEBUG "+treeNode.name );
    this.debugChildIds( treeNode.nodeId );
    console.log( "    Total Context Path:",this.debugRef( this.getNodeRef( treeNode.nodeRefId ) ));
    console.log( "    NodeId Path:       ",this.debugNodePath( treeNode.nodeIdPath ));
    console.log( "    NodeRefId Path:    ",this.debugNodeRefPath( treeNode.nodeRefIdPath ));
    console.log( "    NodeId:            ",treeNode.nodeId);
    console.log("     NodeRefId:         ",treeNode.nodeRefId );
    return "";
  }

  public static get()
  {
    const nodeModel = (store.getState() as n.NodeModelState).nodeModel.present;
    return new NodeAction( nodeModel );
  }

  // for comparing the contents of tree nodes
  public static treeNodesSame( t1:n.TreeNode, t2:n.TreeNode ):boolean
  {
    return t1.childKeys.length == t2.childKeys.length &&
            t1.nodeRefId == t2.nodeRefId &&
            t1.expanded == t2.expanded && 
            t1.nodeId == t2.nodeId &&
            t1.level == t2.level &&
            t1.name == t2.name; 
  }

  public static nodeRefsSame( tnr1:n.NodeRefParams, tnr2:n.NodeRefParams )
  {
    if( tnr1.nodeId == tnr2.nodeId &&
        this.arraysEqual( tnr1.contextPath, tnr2.contextPath ) )
    {
      return true;
    }

    return false;
  }

  // *****************************************************************
  // ******* INSTANCE METHODS ******************************
  // *****************************************************************

  private nodes:n.Nodes;
  private nodeRefs:n.NodeRefs;
  private concepts: Array<n.Concept>;
  private treeNodes:n.TreeNodes;
  private treeNodeMetas:n.TreeNodeMetas;
  private queryEntries:n.QueryEntries;
  private focus:n.Focus;
  private documentNodeRefId:n.NodeRefId;
  private docTreeNodes: Array<n.TreeNode>;
  private documents: Array<n.Document>;
  private tempNodes: Array<n.TempNode>;
  private queryNodes: Array<n.QueryResultNode>;

  public constructor( nodeModel:n.NodeModel )
  {
    this.init(nodeModel);
  }

  private init( nodeModel:n.NodeModel )
  {
    this.nodes = nodeModel.nodes;
    this.concepts = nodeModel.concepts;
    this.nodeRefs = nodeModel.nodeRefs;
    this.documentNodeRefId = nodeModel.documentNodeRefId;
    this.treeNodes = nodeModel.treeNodes;
    this.treeNodeMetas = nodeModel.treeNodeMetas;
    this.queryEntries = nodeModel.queryEntries;
    this.docTreeNodes = nodeModel.docTreeNodes;
    this.tempNodes = nodeModel.tempNodes;
    this.queryNodes = nodeModel.queryResultNodes;
    this.focus = nodeModel.focus;
    this.documents = nodeModel.documents;
  }

  public get nodeModel ():n.NodeModel
  {
    return { 
      nodes:this.nodes, 
      concepts:this.concepts, 
      nodeRefs:this.nodeRefs, 
      documentNodeRefId:this.documentNodeRefId,
      treeNodes:this.treeNodes,
      treeNodeMetas:this.treeNodeMetas,
      queryEntries:this.queryEntries,
      docTreeNodes:this.docTreeNodes,
      tempNodes:this.tempNodes,
      queryResultNodes:this.queryNodes,
      focus:this.focus,
      documents:this.documents
    };
  }

  // *****************************************************************
  // ******* DISPATCHABLE METHODS ******************************
  // *****************************************************************

  public appInit(): void
  {
    this.init( NodeModelAPI.getNodeModel() );
    this.setDocumentTreeNode(); 
    // Note that setDocumentTreeNode() does a recalc
  }

  private findEquivNodeRef(nodeRefParams:n.NodeRefParams): n.NodeRefId
  {
    let foundNodeRefId = null;

    this.forEachNodeRef( (nodeRef:n.NodeRef)=>{ 
      if( NodeAction.nodeRefsSame( nodeRef, nodeRefParams ) )
      {
        foundNodeRefId = nodeRef.id;
      }
    });

    return foundNodeRefId;
  }

  public getDocument( nodeRefId:n.NodeRefId  )
  {
    return this.documents.find( doc => doc.nodeRefId == nodeRefId );
  }

  public getDocName( nodeRefId:n.NodeRefId ): string
  {
    return this.getNodeForRef( nodeRefId ).name;
  }

  public addDocument( name:string, isView:boolean=false ): n.Document
  {
    name = name.trim();

    if( this.documents.find( doc => this.getDocName( doc.nodeRefId ) == name ) )
    {
      console.log("Duplicate named document.");
      return null;
    }

    let newDocNodeRef = this.insertChild( this.getNodeRef( NodeAction.DUMMY_NODEREF_ID ) );
    this.updateNodeAtomic( newDocNodeRef.nodeId, { name: name } );

    //this.forEachNodeRef( ref=>{console.log(this.debugRef(ref));} );

    let newDocs:Array<n.Document> = this.documents.slice();
    newDocs.push( { nodeRefId:newDocNodeRef.id, isView:isView } );
    this.documents = newDocs;

    return this.documents.find( doc => doc.nodeRefId == newDocNodeRef.id );
  }

  public updateDocument( nodeRefId:n.NodeRefId, docParams:n.DocumentParams )
  {
    let newDocs:Array<n.Document> = this.documents.slice();
    let existingDocIndex = newDocs.findIndex( doc => doc.nodeRefId == nodeRefId );
    newDocs[existingDocIndex] = Object.assign( {}, newDocs[existingDocIndex], docParams );
    this.documents = newDocs;
  }

  // documents are uniquely identified via NodeRefId
  public setActiveDocument( nodeRefId:n.NodeRefId )
  {
    let doc = this.documents.find( doc => doc.nodeRefId == nodeRefId );
    let docNodeRef = this.getNodeRef( doc.nodeRefId );

    this.deleteTempNodes();

    // if the newly activated document is not a view, and has no children
    if( !this.getDocument(nodeRefId).isView &&
        this.getNode( docNodeRef.nodeId ).childIds.length == 0 )
    {
      // insert a temporary child for typing
      this.insertChild(docNodeRef,null,null,null,true);
    }

    // assign the new doc ref id
    this.documentNodeRefId = doc.nodeRefId;

    this.recalc();
  }

  // deprecated, used with old concept display
  public setDocumentTreeNode( nodeId?:n.NodeId )
  {
    if( !nodeId )
    {
      this.documentNodeRefId = NodeAction.MAINDOC_NODEREF_ID;
    }
    else
    {
      // look for an existing matching tree node ref
      let nodeRefParams:n.NodeRefParams = { 
        nodeId:nodeId,
        contextPath:[ NodeAction.DUMMY_NODE_ID ] };

      let newDocNodeRefId = this.findEquivNodeRef(nodeRefParams);

      // if there is not already a matching nodeRef
      if( newDocNodeRefId == null )
      {
        newDocNodeRefId = this.insertNodeRefAtomic( this.buildNodeRef( NodeAction.DUMMY_NODE_ID, nodeId, nodeRefParams.contextPath ) );
        newDocNodeRefId = this.insertChild( this.getNodeRef( NodeAction.DUMMY_NODEREF_ID ), -1, this.getNodeRef(newDocNodeRefId), null ).id;
      }

      const docNodeRef = this.getNodeRef(newDocNodeRefId);
      //const treeNodeKey = NodeAction.nodeRefIdPathToKey( this.getTotalPath( docNodeRef ) );
      //const treeNode = this.getTreeNode( treeNodeKey );

      this.deleteTempNodes();

      if( this.getNode(nodeId).childIds.length == 0 )
      {
        this.insertChild(docNodeRef,null,null,null,true);
      }

      // assign the new doc ref id and recalc this branch
      this.documentNodeRefId = newDocNodeRefId;
    }

    this.recalc();
  }

  // always returns a query with inflated entries
  public getOrCreateQuery( nodeRefId:n.NodeRefId ): n.Query
  {
    let query = this.getQuery(nodeRefId);

    if( !query )
    {
      query = this.buildQuery( nodeRefId );
      this.setQuery( nodeRefId, query );
    }

    return query;
  }

  // always returns a query with inflated entries
  public getQuery( nodeRefId:n.NodeRefId ): n.Query
  {
    const doc = this.getDocument(nodeRefId);

    if( !doc ) return null;
    
    const query = doc.query;

    if( !query ) return null;

    return this.inflateQueryEntries( query );
  }  

  // depends on inflated entries for saving, but always strips inflated entries before saving
  public setQuery( nodeRefId:n.NodeRefId, query:n.Query ): n.Query
  {
    let newQuery = Object.assign( {}, query );
    newQuery.entryIds = [];

    // updates or insert entries and re-establish Ids
    query.entries.forEach( (entry, i) => {
      this.insertQueryEntryAtomic(entry);
      newQuery.entryIds[i] = entry.id;
    } );

    // blank out actual object entries before saving to prevent duplicate / stale data
    this.updateDocument( nodeRefId, { 
      query: {
        nodeRefId: nodeRefId,
        entryIds: newQuery.entryIds,
        entries: null 
    } } );

    this.recalcTreeNodes();

    return newQuery;
  }

  private inflateQueryEntries( query:n.Query ): n.Query
  {
    return Object.assign( {}, query, { 
      entries: query.entryIds.map( entryId => this.getQueryEntry(entryId) ) 
    } );
  }

  public getQueryEntry( id:n.QueryEntryId )
  {
    return this.queryEntries[id];
  }

  public addQueryEntry( query:n.Query ): n.Query
  {
    let newQueryEntry:n.QueryEntry = this.buildQueryEntry( false );
    let newQuery = Object.assign( {}, query, { entries:[...query.entries, newQueryEntry] } );
    return this.setQuery( query.nodeRefId, newQuery );
  }

  public deleteQueryEntry( query:n.Query, entryId:n.QueryEntryId ): n.Query
  {
    let newQuery = Object.assign( {}, query, { entries:query.entries.filter( (entry)=> entry.id != entryId ) } );
    this.deleteQueryEntryAtomic( entryId );
    return this.setQuery( query.nodeRefId, newQuery );
  }

  private buildQuery( nodeRefId:n.NodeRefId ): n.Query
  {
    return { nodeRefId: nodeRefId, entryIds: [], entries: [] };
  }

  private buildQueryEntry( show:boolean, nodeId?:n.NodeId ): n.QueryEntry
  {
    /* Some day, should look like this:
    /Requirements (show)
      /Features/* (show children of)
    */
    let showSelect:string, conceptsToShowSelect:n.NodeRefId;

    // if this is the root node of a doc, show the node specified by its node id
    if( show )
    {
      showSelect = n.SHOW_OPTION;
      conceptsToShowSelect = nodeId;
    }
    else // for any other node show children of the parent (-1 is code for parent)
    {
      showSelect = n.SHOW_CHILDREN_OF_OPTION;
      conceptsToShowSelect = -1;
    }

    return { id: this.genQueryEntryId(), showSelect:showSelect, conceptsToShowNodeId:conceptsToShowSelect, entryIds:[] };
  }

  public getConceptsToShow( _nodeRefId:n.NodeRefId, _querySelf:boolean=false, _queryAncestors:boolean=false ): Array<n.Concept>
  {
    /*
    const startTreeNode = this.getTreeNode(key);
    // generate ancestor list to exclude from the final list...
    let ancestors:Array<n.NodeId> = [];
    let curTreeNode = startTreeNode;

    do
    {
      curTreeNode = this.getTreeNode(curTreeNode.parentKey);
      ancestors.push(curTreeNode.nodeId);
    }
    while( curTreeNode.parentKey != null )

    // only include nodes in the list which are not my ancestors
    let valid:Array<n.Concept> = [];
    this.concepts.filter( concept => {

      valid.push( concept );

      // if I'm not supposed to query myself out, or I am, and this concept's not me
      // of if I'm not supposed to query my ancestors out, or I am, and this concept's not my ancestor
      if( !querySelf || startTreeNode.nodeId != concept.nodeId ||
          !queryAncestors || !ancestors.includes( concept.nodeId ) )

    } );
    */

    //const docNodeIds = this.documents.map( doc => this.getNodeRef(doc.nodeRefId).nodeId );

    // all concepts except documents
    //return this.concepts.filter( concept => !docNodeIds.includes( concept.nodeId ) );
    return this.concepts.filter( concept => concept.nodeId != NodeAction.MAINDOC_NODE_ID );
  }
  
  public captureFocus( focus:n.Focus )
  {
    if( focus )
    {
      this.focus = Object.assign( {}, this.focus, focus );
    }
  }

  public setFocus( focusParams:n.FocusParams )
  {
    // ignore nulls
    if( focusParams )
    {
      this.focus = Object.assign( {}, this.focus, focusParams, { performFocus:true } );
    }
  }

  public focusComplete()
  {
    this.focus = Object.assign( {}, this.focus, { performFocus:false } );
  }

  public matchSimilarNamedConcepts( key:n.TreeNodeKey, textTyped:string ): Array<n.NodeMatch>
  {
    const thisTreeNode = this.getTreeNode(key);
    const thisNode = this.getNode( thisTreeNode.nodeId );
    const siblings = this.getTreeNode(thisTreeNode.parentKey).childKeys.map( childKey => this.getTreeNode(childKey).name.trim().toUpperCase() ).filter( name => name != thisNode.name.toUpperCase().trim() );

    let matches:Array<n.NodeMatch> = [];
    const textTypedUpper = textTyped.toUpperCase();

    if( textTyped.trim().length > 0 )
    {
      this.concepts.forEach( concept => {
        const node = this.getNode( concept.nodeId );
        const thisNodeName = node.name.trim().toUpperCase();
        if( node.id != NodeAction.DUMMY_NODE_ID && 
            node.id != NodeAction.MAINDOC_NODE_ID && 
            //thisNode.id != node.id && 
            !siblings.includes( thisNodeName ) &&
            thisNodeName.includes(textTypedUpper) &&
            !this.isDoc( node.id ) )
          matches.push( { nodeId: node.id, nodeName: node.name } );
      } );
    }

    return matches;
  }

  public deleteTreeNode( key:n.TreeNodeKey ): void
  {
    const treeNode = this.getTreeNode(key);

    this.deleteNodeRefRecursive( treeNode.nodeRefId );

    this.recalc();
  }

  public addTreeNodeBelow( key:n.TreeNodeKey ):n.TreeNodeKey
  {
    const currentTreeNode = this.getTreeNode( key );
    let parentTreeNode = this.getParentTreeNode( key );
    let indexOffset:number;
    let siblingInsert:boolean;

    // If the current node has children and is expanded
    if( currentTreeNode.childKeys.length > 0 && currentTreeNode.expanded )
    {
      // Insert the new node as a child, immediately above the first visible child tree node
      parentTreeNode = currentTreeNode;
      indexOffset = 0;
      siblingInsert = false;
    }
    else
    {
      // Insert directly below the current node, as a sibling
      indexOffset = 1;
      siblingInsert = true;
    }

    let markerChildTreeNode:n.TreeNode;

    if( siblingInsert ) // find the child whose key ends in the nodeRefId of the current selected node (that we want to insert under)
    {
      markerChildTreeNode = this.getTreeNode( parentTreeNode.childKeys.find( (key) => key.endsWith(","+currentTreeNode.nodeRefId) ) );

      //this.debugTreeNode( markerChildTreeNode );

      // if the child doesn't exist in this node, insert after the last visible child
      if( markerChildTreeNode == null ) 
      {
        markerChildTreeNode = this.getTreeNode( this.last(parentTreeNode.childKeys) ); 
        throw new Error("WHEN DOES THIS HAPPEN? MAKE A COMMENT PLEASE.");
      }
    }
    else // use the first visible child of this parent
    {
      markerChildTreeNode = this.getTreeNode( parentTreeNode.childKeys[0] ); 
    }

    const newIndex = this.absoluteIndexOfChildTreeNode( markerChildTreeNode.nodeRefId, parentTreeNode.nodeId ) + indexOffset;

    const newNodeRef = this.insertChildBasedOnParentTreeNode( parentTreeNode, newIndex );

    this.recalcTreeNodes(); // regenerate treenodes

    let newChildKey = this.buildKey( parentTreeNode.key, newNodeRef.id );

    return newChildKey;
  }

  private insertChildBasedOnParentTreeNode( parentTreeNode:n.TreeNode, index:number )
  {
    const parentNodeRef = this.getNodeRef( parentTreeNode.nodeRefId );
    const newNode = this.addNewParentlessNode();
    const newNodeRefId = this.insertNodeRefAtomic( this.buildNodeRef( parentTreeNode.nodeId, newNode.id, parentTreeNode.nodeIdPath ) );
    const newNodeRef = this.getNodeRef( newNodeRefId );
    return this.insertChild( parentNodeRef, index, newNodeRef, newNode.id );
  }

  public addTreeNodeAbove( key:n.TreeNodeKey ):n.TreeNodeKey
  {
    // create new node
    let currentTreeNode = this.getTreeNode(key);
    let parentTreeNode = this.getTreeNode(currentTreeNode.parentKey);
    
    let currentNodeIndex = this.absoluteIndexOfChildTreeNode( currentTreeNode.nodeRefId, parentTreeNode.nodeId );

    // build a new node and nodeRef based on the parent
    const newNodeRef = this.insertChildBasedOnParentTreeNode( parentTreeNode, currentNodeIndex );

    this.recalc();

    let newChildKey = this.buildKey( parentTreeNode.key, newNodeRef.id );

    return newChildKey;
  }

  public commitDocName( nodeId:n.NodeId, value:string )
  {
    this.updateNodeAtomic( nodeId, { name: value } );
    this.recalc();
  }

  public commitNodeName( key:n.TreeNodeKey, value?:string, allowLink:boolean=true ): n.TreeNodeKey
  {
    if( value ) this.updateDraftNodeName( key, value );

    const treeNode = this.getTreeNode(key);
    const parentTreeNodeKey = this.getTreeNode(treeNode.parentKey).key;
    const treeNodeMeta = this.getTreeNodeMeta(treeNode.key);
    let newNodeRefId = treeNode.nodeRefId;

    console.log( "allowLink, treenodemeta", allowLink, treeNodeMeta );
    // if there is anything to commit -- treeNodeMetas are "nully"
    if( treeNodeMeta && treeNodeMeta.updatingNodeName && treeNodeMeta.draftName != null )
    {
      let matchingNode:n.Node = null;
      
      const draftNameUpper = treeNodeMeta.draftName.toUpperCase().trim();

      // concept names must be between 1 and 50 characters
      if( draftNameUpper.length >=1 )
      {
        // look to see if we should link this node based on name
        this.forEachNode( (node:n.Node) => {
          if( !this.isDoc(node.id) && node.name.toUpperCase() == draftNameUpper )
          {
            matchingNode = node;
            return;
          }
        });
      }
      
      let nodeRef = this.getNodeRef( treeNode.nodeRefId );

      // LINK THE NODE?
      // if we found a match and were not already linked to it
      if( allowLink && matchingNode && nodeRef.nodeId != matchingNode.id )
      {
        let isSibling = false;
        let parentTreeNode = this.getTreeNode( treeNode.parentKey );

        for( let childKey of parentTreeNode.childKeys )
        {
          // if the matching node is one of my siblings, but not me
          if( this.getTreeNode(childKey).nodeId == matchingNode.id &&
              childKey != treeNode.key )
            {
              isSibling = true;
              break;
            }
        }

        if( !isSibling && !this.isCycle( parentTreeNode.nodeIdPath, treeNode.nodeId ) )
        {
          // store the previous node id for deletion later
          const prevNodeId = treeNode.nodeId;

          // repoint the noderefs to point from the current node to the matching node
          this.updateNodeRefAtomic( treeNode.nodeRefId, { nodeId: matchingNode.id } );

          // get a fresh copy
          nodeRef = this.getNodeRef( treeNode.nodeRefId );
          newNodeRefId = nodeRef.id;

          this.deleteNodeIfOrphaned( prevNodeId );
          console.log( "*** LINKING '"+treeNodeMeta.draftName+"' (linked nodeId "+matchingNode.id+")" );
        }
        // delete the node that we were working on if orphaned
      }
      else
      {
        console.log( "*** COMMITTING '"+treeNodeMeta.draftName );
        this.updateNodeAtomic( treeNode.nodeId, { name: treeNodeMeta.draftName } );
      }

      //this.recalcGhosts( nodeRef );
      //this.recalcAllGhosts();
      this.recalc();
    }

    // mark this edit complete
    this.updateTreeNodeMeta( treeNode.key, { updatingNodeName:false } );

    return this.buildKey( parentTreeNodeKey, newNodeRefId );
  }
/*

  private parseKey(key:string, offset:number): n.NodeRefId
  {
    const elts = key.split(",");

    if( Math.abs(offset) > elts.length )
      throw new Error("Index "+offset+" of key "+key+" is out of bounds.");

    return parseInt(elts.slice(offset)[0]);
  }

  private recalcAllGhosts()
  {
    //this.deleteAllGhosts();
    this.insertGhostsRecursive( this.getNodeRef(NodeAction.DUMMY_NODEREF_ID) );
  }

  private recalcGhosts( nodeRef:n.NodeRef )
  {
    console.log("recalcGhosts called!")
    
    let nodeRefsToDelete = new Set<n.NodeRefId>();
    this.nodes = this.deleteGhostsRecursive( Object.assign( {}, this.nodes ), nodeRef, nodeRefsToDelete );
    nodeRefsToDelete.forEach( (nodeRefId) => this.deleteNodeRefAtomic(nodeRefId) );
    
    // recalculate for each nodeRef that points to the same node as this one
    // (all incoming lines to this node)
    
    this.forEachNodeRefDepthFirst( nodeRef, (someNodeRef) => {
      console.log(someNodeRef);
      if( someNodeRef.nodeId == nodeRef.nodeId )
        this.insertGhostsRecursive( someNodeRef );
    } );
    

  }
  private deleteGhostsRecursive( newNodes:n.Nodes, nodeRef:n.NodeRef, nodeRefsToDelete:Set<n.NodeRefId> )
  {
    const node = this.getNode(nodeRef.nodeId);

    // rebuild this node's childIds without ghosts...
    let newChildIds:Array<n.NodeRefId> = [];
    node.childIds.forEach( (childRefId) => 
    {
      if( this.nodeRefs[ childRefId ].ghost )
        nodeRefsToDelete.add(childRefId);
      else
        newChildIds.push( childRefId );
      
      this.deleteGhostsRecursive( newNodes, this.getNodeRef( childRefId ), nodeRefsToDelete );
    });
      
    newNodes = this.updateNodeFunc( newNodes, node.id, { childIds: newChildIds } );
    
    return newNodes;
  }

  private deleteAllGhosts()
  {
    let nodeRefsToDelete = new Set<n.NodeRefId>();

    // update childIds in all nodes to remove all ghosts
    let newNodes = Object.assign( {}, this.nodes );

    this.forEachNode( (node)=>
    {
      // rebuild childIds without ghosts...
      let newChildIds:Array<n.NodeRefId> = [];
      node.childIds.forEach( (childRefId) => {

        if( this.nodeRefs[ childRefId ].ghost )
          nodeRefsToDelete.add(childRefId);
        else
          newChildIds.push( childRefId );
      });
      
      newNodes = this.updateNodeFunc( newNodes, node.id, { childIds: newChildIds } );
    });

    this.nodes = newNodes;

    // delete ghost nodeRefs
    this.getParentNode

    this.forEachNodeRef( (nodeRef)=> {
      if( nodeRef.ghost )
        nodeRefsToDelete.add(nodeRef.id);
    } );

    nodeRefsToDelete.forEach( (nodeRefId) => this.deleteNodeRefAtomic(nodeRefId) );
  }
  private insertGhostsRecursive( parentNodeRef:n.NodeRef )
  {
    const node = this.getNode( parentNodeRef.nodeId );
    //console.log("called insertGhostNodeRefs with ",this.debugPath( this.getTotalPath(parentNodeRef)));

    let i=0;
    // since we modify the node.childIds array in-loop...
    const copyChildIds = node.childIds.slice();

    for( let childNodeRefId of copyChildIds )
    {
      const childNodeRef = this.getNodeRef( childNodeRefId );
      //if( parentNodeRef.nodeId == 98209 )
        //console.log( parentNodeRef.ghost ? "GHOST! " : "normal " + "Traversing ",this.getNode(childNodeRef.nodeId).name.substring(0,10),"("+childNodeRef.nodeId+") at",i,"contextPath",this.debugPath(childNodeRef.contextPath))

      // don't add ghosts of ghosts
      if( !childNodeRef.ghost )
      {
        const totalPath = this.getTotalPath(parentNodeRef);

        console.assert( childNodeRef != null, "childNodeRef Id", childNodeRefId, "is null" );
        let ghostMatch = this.ghostMatch( childNodeRef.contextPath, totalPath );

        // see if this parentNodeRef implies any ghost node refs we should add
        if( ghostMatch && !this.isCycle( totalPath, childNodeRef.nodeId ) )
        {
          //console.log(this.exactMatch( childNodeRef.contextPath, totalPath ),this.debugPath(childNodeRef.contextPath),this.debugPath(totalPath));
          let newNodeRef;

          if( !this.exactMatch( childNodeRef.contextPath, totalPath ) )
          {
            //console.log("Inserting ghost ",this.getNode(childNodeRef.nodeId).name,"at",i)
            //console.log("inserting ghost (not an exact match) for [",this.getNode(childNodeRef.nodeId).name,"]:  ghostMatch ",ghostMatch," \nCONTEXT:   ",this.debugPath( totalPath ), "\nCANDIDATE: ",this.debugPath(childNodeRef.contextPath) );

            console.log("Inserting ghost ["+this.getNode(childNodeRef.nodeId).name+"] at",i);

            // insert ghosts right after their real counterpart
            const index = this.absoluteIndexOfChildTreeNode( childNodeRef.id, parentNodeRef.nodeId ); 

            newNodeRef = this.insertChild( parentNodeRef, index+1, null, childNodeRef.nodeId, true );
            //const zone = this.getInsertionZone( parentNodeRef );

            i++;
          }
          else
          {
            //console.log("Skipping non-matching ghost ",this.getNode(childNodeRef.nodeId).name,"at",i)
            newNodeRef = childNodeRef;
          }

          this.insertGhostsRecursive( newNodeRef );
        }
      }
    }
  }
*/

/*
  private getInsertionZone( nodeRef:n.NodeRef ): n.InsertionZone
  {
    // build a depthFirst ordered list of all incoming nodeRefs that point at this node
    // optimizations later might include pruning the tree (searching less than dummy node)
    // and also we can probably stop after we've descended below the matching node level, but need to prove this to ourselves

    let zones:Array<n.ContextPath> = [];
    let myZone = null;

    this.forEachNodeRefDepthFirst( this.getNodeRef(NodeAction.DUMMY_NODEREF_ID) ,(someNodeRef)=> {
      if( NodeAction.nodeRefsSame( nodeRef, someNodeRef) )
        myZone = zones.length; // will start at zero and grow as we build the zones array

      //console.log("SHOULD FIND A MATCH -- ",this.debugRef(nodeRef),this.debugRef(someNodeRef));

      if( nodeRef.nodeId == someNodeRef.nodeId )
        zones.push( this.getTotalPath(someNodeRef) );

    } );

    if( myZone == null ) throw new Error("Target zone should not be null!");

    const destNode = this.getNode(nodeRef.nodeId);

    // GOAL: create marker zones (context paths) for the zones before and after me

    let zoneAfterMe:n.ContextPath;
    let zoneBeforeMe:n.ContextPath;
    
    if( zones.length == 0 )
    {
      throw new Error( "Something went wrong." );
    }
    else if( zones.length == 1 )
    {
      zoneBeforeMe = null;
      zoneAfterMe = null;
    }
    else if( myZone == 0 )// if I belong in the first zone
    {
      zoneBeforeMe = null;
      zoneAfterMe = zones[1];
    }
    else if( myZone == zones.length-1 ) // if the last zone
    {
      zoneBeforeMe = zones[myZone-1];
      zoneAfterMe = null;
    }
    else // else, I belong in some middle zone
    {
      zoneBeforeMe = zones[myZone-1];
      zoneAfterMe = zones[myZone+1];
    }

    // GOAL: Return the beginning and ending absolute indices of the target zone.
    // If the indices are equal, it means the zone has zero nodes
    // ( but it still has a position relative to other zones)

    let startIndex:number;
    let endIndex:number;
    
    if( zoneBeforeMe != null )
    {
      // startIndex = 1 + the index of the last childId in the zone before me
      // (inserting at this location would insert just below the zone before me)
      startIndex = 1 + this.findLastIndex<n.NodeRefId>( destNode.childIds, (childId)=> {
        return NodeAction.arraysEqual( this.getNodeRef(childId).contextPath, zoneBeforeMe )
      } );
    }
    else
    {
      startIndex = 0;
    }

    if( zoneAfterMe != null )
    {
      // endIndex = the index of the first childId in the zone after me
      // (inserting at this location would insert just above the zone after me)
      endIndex = destNode.childIds.findIndex( (childId)=> {
        return NodeAction.arraysEqual( this.getNodeRef(childId).contextPath, zoneAfterMe )
      } );
    }
    else
    {
      endIndex = destNode.childIds.length;
    }

    console.log("ZONE for "+this.debugRef(nodeRef),{ startIndex: startIndex, endIndex: endIndex });
    this.debugNode( nodeRef.nodeId );


    return { startIndex: startIndex, endIndex: endIndex };
  }

  private findLastIndex<T>( arr:Array<any>, func:(value: T) => boolean )
  {
    for(let i=arr.length-1; i>=0; i--)
    {
      if( func(arr[i]) ) return i;
    }

    return -1;
  }
*/
  public updateDraftNodeName( key:n.TreeNodeKey, name:string ): void
  {
    this.updateTreeNodeMeta( key, { draftName:name, updatingNodeName:true } );
  }

  public recalc(): void
  {
    //this.recalcGhosts( this.getNodeRef(this.documentNodeRefId) );
    this.recalcTreeNodes();
    this.recalcConcepts();
  }

  // temp nodes are inserted when a new document is created
  // they are only there to give the user an initial node to type into
  // if the user switches documents without adding text, the node is removed.
  private deleteTempNodes()
  {
    if( this.tempNodes )
    {
      this.tempNodes.forEach( temp => {
        // only delete nodes with empty strings for names
        const node = this.getNode(temp.nodeId);
        // check for the node's existence first, in case it got manually removed by the user
        if( node && node.name.length == 0 )
        {
          this.deleteNodeAtomic(temp.nodeId);
          this.deleteNodeRefAtomic(temp.nodeRefId);
          this.removeChildId( this.getNode(temp.parentNodeId), temp.nodeRefId );
        }
      } );

      this.tempNodes = [];
    }
  }

  private deleteQueryNodes()
  {
    if( this.queryNodes )
    {
      this.queryNodes.forEach( queryNode => {
        let parentNode = this.getNode(queryNode.parentNodeId);
        if( parentNode ) this.removeChildId( parentNode, queryNode.nodeRefId );
        this.deleteNodeRefAtomic(queryNode.nodeRefId);
      } );

      this.forEachNode( node => {
        this.queryNodes.forEach( queryNode => {
          if( node.childIds.includes( queryNode.nodeRefId ) )
          {
            throw new Error("This should never happen: "+queryNode.nodeRefId+" in "+node.name );
          }
        } )
      } );


      this.queryNodes = [];
    }
  }

  public recalcConcepts()
  {
    let breadthFirstList:Array<n.Concept> = [];
    const key = NodeAction.nodeRefIdPathToKey( [NodeAction.DUMMY_NODEREF_ID] );
    this.recalcConceptsRecursive( this.getTreeNode( key ), breadthFirstList );
    this.concepts = breadthFirstList;
  }

  // Will generate a depth-first list of concepts with no duplicates that includes the root node passed in
  private recalcConceptsRecursive( treeNode:n.TreeNode, breadthFirstList:Array<n.Concept> ): void
  {
    for( let childKey of treeNode.childKeys )
    {
      // if this node has children (only list nodes with children as concepts)
      // and we haven't already added this concept yet
      let childTreeNode = this.getTreeNode( childKey );

      if( childTreeNode.name.length > 0 &&
          childTreeNode.name.length <= NodeAction.MAX_CONCEPT_LENGTH &&
         !this.containsConcept( breadthFirstList, childTreeNode.nodeId ) )
      {
        breadthFirstList.push({ 
          name: childTreeNode.name, 
          nodeId: childTreeNode.nodeId
        });
      }
    }

    for( let childKey of treeNode.childKeys )
    {
      let childTreeNode = this.getTreeNode( childKey );

      //Used to be: !this.isCycle( nodeRefId, this.getNodeRef(childNodeRefId2).nodeId )
      if( !this.isCycle( treeNode.nodeIdPath, childTreeNode.nodeId ) )
      {
        this.recalcConceptsRecursive( childTreeNode, breadthFirstList );
      }
    }
    // todo: add in notion of sticky concepts - see concept nodeAction
  }

  public recalcTreeNodes()
  {
    // Delete all query nodes, since they will get rebuilt by recalcTreeNodesRecursive
    this.deleteQueryNodes();

    // Rebuild the treeNodes object
    let dummyTreeNode = this.buildTreeNode( null, NodeAction.DUMMY_NODE_ID, NodeAction.DUMMY_NODEREF_ID, [], null, 0, false, [NodeAction.DUMMY_NODE_ID], [NodeAction.DUMMY_NODEREF_ID] );
    let newTreeNodes:n.TreeNodes = {};
    newTreeNodes[dummyTreeNode.key] = dummyTreeNode;
    this.recalcTreeNodesRecursive( dummyTreeNode, 0, newTreeNodes );
    this.treeNodes = newTreeNodes;
    
    // Rebuild the active document
    const depthFirstList:Array<n.TreeNode> = [];
    const docNodeRef = this.getNodeRef(this.documentNodeRefId);
    const docKey = this.buildKey( dummyTreeNode.key, docNodeRef.id );
    this.recalcDocumentTreeNodeArray( this.getTreeNode(docKey), false, depthFirstList );
    this.docTreeNodes = depthFirstList;

    // Delete any unreferenced TreeNodeMetas
    let keysToDelete:Array<n.TreeNodeKey> = []
    this.forEachTreeNodeMeta( (treeNodeMeta) => {
      if( this.treeNodes[treeNodeMeta.key] == null ) 
        keysToDelete.push(treeNodeMeta.key);
    });

    this.deleteTreeNodeMetasAtomic( keysToDelete );
  }

  public indent(key:n.TreeNodeKey):n.TreeNodeKey
  {
    const treeNode = this.getTreeNode(key);
    const parentTreeNode = this.getTreeNode(treeNode.parentKey);
    const siblingKeys = parentTreeNode.childKeys;

    // my new parent should be the sibling right before me (in the tree)
    // find my index amongst my siblings
    const myIndex = siblingKeys.indexOf(treeNode.key);

    //if I'm the first (tree node, as opposed to absolute node) child of my parent
    if (myIndex == 0 ) {
      console.log( "Refusing to indent" );
      return null; //bail out
    }

    const newParentTreeNode = this.getTreeNode( siblingKeys[myIndex-1] );
    //const newParentNodeRef = this.getNodeRef( newParentTreeNode.nodeRefId );
    const newIndex = this.getAbsoluteIndexForIndent( treeNode, newParentTreeNode );
    /*
    const newParentNode = this.getNode(newParentTreeNode.nodeId);

    // if this is a ghost node we're indenting into, there may be multiple eligible parent nodes 
    // we should choose the one in the "zone" we're getting inserted into
    // getAbsoluteIndexForIndent will put us in the right place, we just need to choose the parent of our nearest sibling
    const siblingBefore = newIndex-1 < 0 ? null : newParentNode.childIds[newIndex-1];
    const siblingAfter = newIndex > newParentNode.childIds.length ? null : newParentNode.childIds[newIndex+1];

    console.log("siblingBefore",this.debugRef(this.getNodeRef(siblingBefore)));
    console.log("siblingAfter",this.debugRef(this.getNodeRef(siblingAfter)));
    console.log("newParentTreeNode.nodeRefId",this.debugRef(this.getNodeRef(newParentTreeNode.nodeRefId)));

    console.log("compare",this.debugNodePath(treeRef.contextPath), this.debugNodePath(this.getNodeRef(newParentTreeNode.nodeRefId).contextPath ));
    console.log("exact match?",this.exactMatch( treeRef.contextPath, this.getNodeRef(newParentTreeNode.nodeRefId).contextPath ))

    //let newNodeRef = { contextPath:newParentTreeNode.nodeIdPath, nodeId: } ;

    let parentNodeRefId =
      this.exactMatch( treeRef.contextPath, this.getNodeRef(newParentTreeNode.nodeRefId).contextPath ) ?
      newParentTreeNode.nodeRefId :
      siblingBefore ? this.getParentNodeRefId( this.getNodeRef(siblingBefore) ) : 
      siblingAfter ? this.getParentNodeRefId( this.getNodeRef(siblingAfter) ) :
      newParentTreeNode.nodeRefId;
    */
    // make the (visible) sibling right before me into my new parent...
    if( this.moveTreeNode( treeNode, newParentTreeNode, parentTreeNode, newIndex ) )
    {
      this.recalc();
      return this.buildKey( newParentTreeNode.key, treeNode.nodeRefId );
    }
    else // refused to move
    {
      return key;
    }
  }
/*
  private getParentNodeRefId( nodeRef:n.NodeRef )
  {
    const contextPath = nodeRef.contextPath;
    return this.findEquivNodeRef( { contextPath: contextPath.slice(0,-1), nodeId:contextPath.slice(-1)[0] } );
  }
*/
  public unindent(key:n.TreeNodeKey):n.TreeNodeKey
  {
    let treeNode = this.getTreeNode(key);

    let parentTreeNode = this.getTreeNode(treeNode.parentKey);

    if( parentTreeNode.nodeRefId == this.documentNodeRefId ) {
      console.log( "Refusing to unindent" );
      return null;
    }

    let grandparentTreeNode = this.getTreeNode( parentTreeNode.parentKey );

    if( grandparentTreeNode == null ) {
      console.log( "Refusing to unindent" );
      return null;
    }

    // my new parent should be my parent's parent (grandparent)
    // my position should be just below what is currently my parent (but what will soon be my sibling)
    // find my parent's index amongst its siblings (its parent's children)
    let newIndex = (this.absoluteIndexOfChildTreeNode( parentTreeNode.nodeRefId, grandparentTreeNode.nodeId ))+1;
    // make my grandparent into my new parent...
    // remove myself from my current parent
    if( this.moveTreeNode( treeNode, grandparentTreeNode, parentTreeNode, newIndex ) )
    {
      this.recalc();
      return this.buildKey( grandparentTreeNode.key, treeNode.nodeRefId );
    }
    else // refused to move
    {
      return key;
    }
  }

  public setExpanded( key:n.TreeNodeKey, expanded:boolean ): void
  {
    this.updateTreeNodeMeta( key, { expanded: expanded } );
    this.recalcTreeNodes();
  }

  public ensureNodeExpanded( key:n.TreeNodeKey ): void
  {
    const treeNode = this.getTreeNode( key );

    if( treeNode != null )
    {
      let parentTreeNode = this.getTreeNode( treeNode.parentKey );

      // the root doesn't carry an expansion state (since no child ref points at it)
      if( parentTreeNode != null )
      {
        if( !treeNode.expanded )
          this.setExpanded( treeNode.key, true );
      
        // call recursively up the chain
        this.ensureNodeExpanded( parentTreeNode.key );
      }
    }
  }

  // ==================== End Dispatchable Functions ===========================

  // *****************************************************************
  // ******* PRIVATE METHODS ******************************
  // *****************************************************************

  private last( arr:Array<any> ): any
  {
    return arr[arr.length-1];
  }

  private static arraysEqual( a1:Array<any>, a2:Array<any> )
  {
    return a1.length==a2.length && a1.every((v,i)=> v === a2[i]);
  }
/*
  private forEachTreeNode( treeNodeFunc:n.TreeNodeFunction )
  {
    for( let key in this.treeNodes )
    {
      if( this.treeNodes.hasOwnProperty(key) )
      {
        let treeNode = this.treeNodes[key];
        treeNodeFunc( treeNode );
      }
    }
  }
*/
  private forEachNode( nodeFunc:n.NodeFunction )
  {
    for( let nodeId in this.nodes )
    {
      if( this.nodes.hasOwnProperty(nodeId) )
      {
        let node = this.nodes[nodeId];
        nodeFunc( node );
      }
    }
  }
/*
  private unGhostify( treeNode:n.TreeNode ): n.TreeNode
  {
    if( treeNode == null ) return null;

    if( treeNode.ghost )
    {
      const newKey = NodeAction.nodePathToKey( treeNode.nodeIdPath );
      const newTreeNode = this.getTreeNode( newKey );
      if( newTreeNode == null ) console.log("===== unGhostify should never return NULL!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! "+newKey+", made for",treeNode);
      return newTreeNode;
    }

    // else return the treeNode that was passed in
    return treeNode;
  }
*/
  private forEachNodeRef( nodeRefFunc:n.NodeRefFunction )
  {
    for( let nodeRefId in this.nodeRefs )
    {
      if( this.nodeRefs.hasOwnProperty(nodeRefId) )
      {
        let nodeRef = this.nodeRefs[nodeRefId];
        nodeRefFunc( nodeRef );
      }
    }
  }

  // returns the matching nodeRef when the nodeRefFunc returns true, keeps searching otherwise
  // returns undefined if no match is found.
  private findNodeRef( nodeRefFunc:n.NodeRefSearchFunction ): n.NodeRef
  {
    for( let nodeRefId in this.nodeRefs )
    {
      if( this.nodeRefs.hasOwnProperty(nodeRefId) )
      {
        let nodeRef = this.nodeRefs[nodeRefId];
        if( nodeRefFunc( nodeRef ) )
        {
          return nodeRef;
        }
      }
    }

    return undefined;
  }

  private forEachNodeRefDepthFirst( nodeRef:n.NodeRef, nodeRefFunc:n.RecursiveNodeRefFunction, level:number=0 )
  {
    const node = this.getNode(nodeRef.nodeId);

    for( let childRefId of node.childIds )
    {
      const childRef = this.getNodeRef(childRefId);
      //console.log( "NODE",node.name,node.childIds.forEach( nodeRefId => console.log(this.debugRef(this.getNodeRef(nodeRefId))) ) );
      //console.log( " applicableChild",this.debugRef(childRef),this.debugRef(nodeRef) );
      if( this.applicableChild( childRef, this.getTotalPath(nodeRef) ) )
      {
        //console.log("  APPLICABLE" );
        if( !nodeRefFunc( nodeRef, childRef, level ) )
          return false;

        if( !this.forEachNodeRefDepthFirst( childRef, nodeRefFunc, level + 1 ) )
          return false;
      }
    }

    return true;
  }
  
  private forEachTreeNodeMeta( treeNodeMetaFunc:n.TreeNodeMetaFunction )
  {
    for( let treeNodeMetaId in this.treeNodeMetas )
    {
      if( this.treeNodeMetas.hasOwnProperty(treeNodeMetaId) )
      {
        let nodeRef = this.treeNodeMetas[treeNodeMetaId];
        treeNodeMetaFunc( nodeRef );
      }
    }
  }

  private getAbsoluteIndexForIndent(treeNodeToIndent:n.TreeNode,newParentTreeNode:n.TreeNode): number
  {
    //const insertionZone = this.getInsertionZone( this.getNodeRef(childTreeNode.nodeRefId) );
    const newParentNode = this.getNode( newParentTreeNode.nodeId );

    if( newParentNode.childIds.length == 0 )
    {
      return 0;
    }

    let indexCounter = 0;
    
    this.forEachNodeRefDepthFirst( ( this.getNodeRef( NodeAction.DUMMY_NODEREF_ID ) ), 
      (_parentOfSomeNodeRef, someNodeRef )=> {
        if( newParentNode.childIds.includes( someNodeRef.id ) )
        {
          indexCounter++;
        }
        else if( someNodeRef.id == treeNodeToIndent.nodeRefId )
        {
          return false; // return false breaks out of the loop
        }

      return true; // return true keeps the loop going
    } );

    return indexCounter;

    /*
    // create a queryed list that consists only of the 
    // absolute child nodes and the new child, in depth first order.
    let orderedElements = this.docTreeNodes.filter( (someTreeNode)=> {
      return someTreeNode.key == childTreeNode.key ||
             this.getTreeNode(someTreeNode.parentKey).nodeId == parentTreeNode.nodeId;
    });

    console.log("getAbsoluteIndexForIndent orderedElements",orderedElements);

    // Use the position of the new child in this list as the new index
    const newIndex = orderedElements.findIndex( (someTreeNode:n.TreeNode) => {
      return someTreeNode.key == childTreeNode.key
    } );
    return newIndex;
    */

  }

  /*
  private getTreeNodeForRef( nodeRef:n.NodeRef )
  {
    return this.getTreeNode( NodeAction.nodePathToKey( this.getTotalPath(nodeRef) ) )
  }
  
  // helps find the real node ref amidst the nodeRefs in a treeNode
  private findNodeRefForContext( treeNode:n.TreeNode, context:n.ContextPath )
  {
    const nodeRefId = treeNode.nodeRefIds.find( (refId) => {
      return NodeAction.arraysEqual( context, this.getNodeRef(refId).contextPath );
    } );

    return this.getNodeRef( nodeRefId );
  }  

  private genHashCode( str:String )
  {
    var hash = 0;
    if (str.length == 0) return hash;
    for (let i = 0; i < str.length; i++) 
    {
      let char = str.charCodeAt(i);
      hash = ((hash<<5)-hash)+char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
  }
*/
  private buildTreeNode( parentKey:n.TreeNodeKey, nodeId:n.NodeId, nodeRefId:n.NodeRefId, contextPath:n.ContextPath, parentNodeRefId:n.NodeRefId, level:number, isGhost:boolean, nodeIdPath: Array<n.NodeId>, nodeRefIdPath: Array<n.NodeRefId>, ):n.TreeNode
  {
    const node = this.getNode(nodeId);
    let key = NodeAction.nodeRefIdPathToKey( nodeRefIdPath );

    if( this.getNodeRef(nodeRefId) == null )
      throw new Error("buildTreeNode: Node ref was null! "+nodeRefId);

    let newTreeNode:n.TreeNode = {
      name: node.name,
      parentKey: parentKey,
      nodeId: node.id,
      nodeRefId: nodeRefId,
      contextPath: contextPath,
      parentNodeRefId: parentNodeRefId,
      nodeIdPath: nodeIdPath,
      nodeRefIdPath: nodeRefIdPath,
      level: level,
      childKeys: [],
      ghost: isGhost,
      key: key,
      expanded: this.getTreeNodeMeta(key).expanded
    };

    return newTreeNode;
  }
/*
  private mapChildRefsByNode( parentNode:n.Node ): Map<n.NodeId,Array<n.NodeRef>>
  {
    // first, group the child refs by nodeId
    let nodeMap = new Map<n.NodeId,Array<n.NodeRef>>();
    console.log( "FOR",this.getNode(parentNode.id).name );
    
    for( let childId of parentNode.childIds )
    {
      const childRef = this.getNodeRef( childId );
      let childRefs = nodeMap.get( childRef.nodeId );
      if( !childRefs ) childRefs = [];
      childRefs.push( childRef );
      nodeMap.set( childRef.nodeId, childRefs );
      console.log( "  MAPPING",this.getNode(childRef.nodeId).name );
    }

    return nodeMap;
  }
*/
  // gets the child ref identified by this nodeRefId
  public getNodeRef( nodeRefId:n.NodeRefId ):n.NodeRef
  {
    return this.nodeRefs[nodeRefId];
  }

  public getNodeForRef( nodeRefId:n.NodeRefId ):n.Node
  {
    return this.nodes[ this.nodeRefs[nodeRefId].nodeId ];
  }


  private getTotalPath( treeNodePointer:n.TreeNodePointer )
  {
    return [...treeNodePointer.contextPath, treeNodePointer.nodeId];
  }

  // by design, final array will not include the docNodeRefId passed in
  private recalcDocumentTreeNodeArray( parentTreeNode:n.TreeNode, includeCollapsed:boolean, depthFirstList:Array<n.TreeNode> )
  {
    for( let childKey of parentTreeNode.childKeys )
    {
      const child = this.treeNodes[childKey];
      depthFirstList.push( child );

      if( includeCollapsed || child.expanded )
      {
        this.recalcDocumentTreeNodeArray( child, includeCollapsed, depthFirstList );
      }
    }
  }

  private insertQueryNode( newNodeId:n.NodeId, parentTreeNode:n.TreeNode, level:number, newTreeNodes:n.TreeNodes, queryLevel:n.QueryLevel, dryRun:boolean, minCommon:number ): n.QueryDryRun
  {
    const parentNodeRef = this.getNodeRef(parentTreeNode.nodeRefId);

    // If this parent tree node does not already contain this nodeId (prevent dupes)
    if( -1 == parentTreeNode.childKeys.findIndex( childKey => newTreeNodes[childKey].nodeId == newNodeId ) )
    {
      const nodeIdPath = this.safePush<n.NodeId>( parentTreeNode.nodeIdPath, newNodeId );
      const nodeRefIdPath = this.safePush<n.NodeRefId>( parentTreeNode.nodeRefIdPath, newNodeId );

      //console.log( "Level: "+level, "["+this.getNode(newNodeId).name+ "] in ["+ this.getNode(parentNodeRef.nodeId).name+"]" );

      console.log( "Inserted",this.getNode(newNodeId).name );

      if( this.contextMatch( nodeIdPath, minCommon ) )
      {
        if( dryRun ) // bail out before we mutate anything
          return { wouldInsert:1, treeNodeInserted: null };

        // Insert the node!
        let childRef = this.insertChild( parentNodeRef, null, null, newNodeId, false, true );

        console.log( "Inserted",this.getNode(newNodeId).name );

        let childTreeNode = this.buildTreeNode( 
          parentTreeNode.key, 
          childRef.nodeId, 
          childRef.id,
          childRef.contextPath,
          parentTreeNode.nodeRefId,
          level, 
          true,
          nodeIdPath,
          nodeRefIdPath );

        newTreeNodes[childTreeNode.key] = childTreeNode;
        parentTreeNode.childKeys.push( childTreeNode.key );
        queryLevel.levelTreeNodes.push( childTreeNode );

        return { wouldInsert:1, treeNodeInserted: childTreeNode };
      }
    }

    return { wouldInsert:0, treeNodeInserted: null };
  }

  private tryBuildLevel( queryLevels:Array<n.QueryLevel>, entryIndex:number, entryId:number, parentTreeNode:n.TreeNode, level:number, newTreeNodes:n.TreeNodes, dryRun:boolean, minCommon:number )
  {
    const queryEntry = this.getQueryEntry(entryId);
    let queryLevel:n.QueryLevel = { levelTreeNodes:[], nodesWouldBeInserted: 0 };
    
    // if SHOW ONE specific parent or specific nodeId
    if( queryEntry.showSelect == n.SHOW_OPTION )
    {
      let newNodeId:n.NodeId;

      // if first entry...
      if( entryIndex == 0 )
      {
        // ...then the parent of this tree node is the parent
        const grandParentTreeNode = this.getTreeNode(parentTreeNode.parentKey);

        // CASE 1: show X, first level
        // if conceptsToShowNodeId is -1, then [show] parent, which is the grandParentTreeNode
        if( queryEntry.conceptsToShowNodeId == -1 )
          newNodeId = grandParentTreeNode.nodeId;
        else // else show a specific node id
          newNodeId = queryEntry.conceptsToShowNodeId;

        // Insert the node!
        queryLevel.nodesWouldBeInserted += this.insertQueryNode( 
          newNodeId, 
          parentTreeNode, 
          level + entryIndex, 
          newTreeNodes, 
          queryLevel,
          dryRun, minCommon).wouldInsert;
      }
      else // if some subsequent entry...
      {
        // the parent level is the previous entry
        const parentLevel = queryLevels[entryIndex-1];

        // for each parent at this level...
        for( let entryParentTreeNode of parentLevel.levelTreeNodes )
        {
          // CASE 2: show X, subsequent level
          // if conceptsToShowNodeId is -1, then [show] parent, which is the previous entry
          if( queryEntry.conceptsToShowNodeId == -1 )
            newNodeId = entryParentTreeNode.nodeId;
          else // else show a specific node id
            newNodeId = queryEntry.conceptsToShowNodeId;

          // Insert the node!
          queryLevel.nodesWouldBeInserted += this.insertQueryNode( 
            newNodeId, 
            entryParentTreeNode, 
            level + entryIndex, 
            newTreeNodes, 
            queryLevel,
            dryRun, minCommon).wouldInsert;
        }
      }
      
    }// show the CHILDREN OF parent
    else if( queryEntry.showSelect == n.SHOW_CHILDREN_OF_OPTION )
    {
      let queryFromNodeId:n.NodeId;

      // if first entry...
      if( entryIndex == 0 )
      {
        // ...then the parent to query from is the grandparent
        const grandParentTreeNode = this.getTreeNode(parentTreeNode.parentKey);

        // CASE 3: show children of X, first level
        // if conceptsToShowNodeId is -1, then show children of parent, which is the grandParentTreeNode
        if( queryEntry.conceptsToShowNodeId == -1 )
          queryFromNodeId = grandParentTreeNode.nodeId;
        else // else show children of the specified node id
          queryFromNodeId = queryEntry.conceptsToShowNodeId;
        
        const queryFromNode = this.getNode(queryFromNodeId);
        
        for( let queryChildNodeRefId of queryFromNode.childIds )
        {
          let queryChildNodeRef = this.getNodeRef(queryChildNodeRefId);

          // Insert the node!
          queryLevel.nodesWouldBeInserted += this.insertQueryNode( 
            queryChildNodeRef.nodeId, 
            parentTreeNode, 
            level + entryIndex, 
            newTreeNodes, 
            queryLevel,
            dryRun, minCommon).wouldInsert;
        }
      }
      else // if some subsequent entry...
      {
        const parentLevel = queryLevels[entryIndex-1];
        
        // for each node at this level...
        for( let entryParentTreeNode of parentLevel.levelTreeNodes )
        {
          // CASE 4: show children of X, subsequent level
          // if conceptsToShowNodeId is -1, then [show] parent, which is the previous entry
          if( queryEntry.conceptsToShowNodeId == -1 )
            queryFromNodeId = entryParentTreeNode.nodeId;
          else // else show a specific node id
            queryFromNodeId = queryEntry.conceptsToShowNodeId;

          const queryFromNode = this.getNode(queryFromNodeId);

          // for each child of the node to query
          for( let queryChildNodeRefId of queryFromNode.childIds )
          {
            let queryChildNodeRef = this.getNodeRef(queryChildNodeRefId);

            // Insert the node!
            queryLevel.nodesWouldBeInserted += this.insertQueryNode( 
              queryChildNodeRef.nodeId, 
              entryParentTreeNode, 
              level + entryIndex, 
              newTreeNodes, 
              queryLevel,
              dryRun, minCommon).wouldInsert;
          }
        }
      }
    }
    else if( queryEntry.showSelect == n.SHOW_ALL_CHILDREN_OF_OPTION )
    {
      let queryFromNodeId:n.NodeId;

      // if first entry...
      if( entryIndex == 0 )
      {
        // ...then the parent to query from is the grandparent
        const grandParentTreeNode = this.getTreeNode(parentTreeNode.parentKey);

        // CASE 5: show ALL children of X, first level
        // if conceptsToShowNodeId is -1, then show children of parent, which is the grandParentTreeNode
        if( queryEntry.conceptsToShowNodeId == -1 )
          queryFromNodeId = grandParentTreeNode.nodeId;
        else // else show children of the specified node id
          queryFromNodeId = queryEntry.conceptsToShowNodeId;
        
        const queryFromNode = this.getNode(queryFromNodeId);

        for( let queryChildNodeRefId of queryFromNode.childIds )
        {
          this.forEachNodeRefDepthFirst( this.getNodeRef(queryChildNodeRefId), 
            (parentNodeRef,childNodeRef,thisLevel) => {

            let parentTotalPath = this.getTotalPath(parentNodeRef);
            let thisParentTreeNode = thisLevel == 0 ? parentTreeNode : newTreeNodes[ NodeAction.nodeRefIdPathToKey(parentTotalPath) ];

            if( !this.isCycle( parentTotalPath, childNodeRef.nodeId ) )
            {
              // Insert the node!
              let dryRunResult = this.insertQueryNode( 
                childNodeRef.nodeId, 
                thisParentTreeNode, 
                level + entryIndex + thisLevel, 
                newTreeNodes, 
                queryLevel,
                dryRun, minCommon);

              queryLevel.nodesWouldBeInserted += dryRunResult.wouldInsert;

              if( dryRun ) // no need to keep recursing if this is a dry run
                return false;
            }

            return true;
          } );
        }
      }
      else // if some subsequent entry...
      {
        const parentLevel = queryLevels[entryIndex-1];
        
        // for each node at this level...
        for( let entryParentTreeNode of parentLevel.levelTreeNodes )
        {
          // CASE 6: show ALL children of X, subsequent level
          // if conceptsToShowNodeId is -1, then [show] parent, which is the previous entry
          if( queryEntry.conceptsToShowNodeId == -1 )
            queryFromNodeId = entryParentTreeNode.nodeId;
          else // else show a specific node id
            queryFromNodeId = queryEntry.conceptsToShowNodeId;

          const queryFromNode = this.getNode(queryFromNodeId);

          for( let queryChildNodeRefId of queryFromNode.childIds )
          {
            this.forEachNodeRefDepthFirst( this.getNodeRef(queryChildNodeRefId), 
              (parentNodeRef,childNodeRef,thisLevel) => {
            console.log("subs 3 entry got here! level = ",thisLevel,dryRun);

              let parentTotalPath = this.getTotalPath(parentNodeRef);
              let thisParentTreeNode = thisLevel == 0 ? parentTreeNode : newTreeNodes[ NodeAction.nodeRefIdPathToKey(parentTotalPath) ];

              if( !this.isCycle( parentTotalPath, childNodeRef.nodeId ) )
              {
                // Insert the node!
                let dryRunResult = this.insertQueryNode( 
                  childNodeRef.nodeId, 
                  thisParentTreeNode, 
                  level + entryIndex + thisLevel, 
                  newTreeNodes, 
                  queryLevel,
                  dryRun, minCommon);

                queryLevel.nodesWouldBeInserted += dryRunResult.wouldInsert;
              }

              if( dryRun ) // no need to keep recursing if this is a dry run
                return false;

              return true;
            } );
          }
        }
      }
    }

    return queryLevel;
  }

  private recalcQueryTree( parentTreeNode:n.TreeNode, query:n.Query, level:number, newTreeNodes:n.TreeNodes )
  {
    let entryIndex =0;
    let entryLevels:Array<n.QueryLevel> = [];

    // loop over the query entries
    for( let entryId of query.entryIds )
    {
      let queryLevel;

      for( let minCommon=query.entryIds.length; minCommon>0; minCommon-- )
      {
        console.log("level",entryIndex,"minCommon:",minCommon);
        // do a dry run starting with the most restrictive matching depth (highest)
        queryLevel = this.tryBuildLevel( entryLevels, entryIndex, entryId, parentTreeNode, level, newTreeNodes, true, minCommon );

        // if it would result in nodes being inserted
        if( queryLevel.nodesWouldBeInserted > 0 )
        {
          // do it for reals
          console.log("  Matched at min common",minCommon);
          queryLevel = this.tryBuildLevel( entryLevels, entryIndex, entryId, parentTreeNode, level, newTreeNodes, false, minCommon );
          break;
        }
      }
      /*
      // if this would result in no nodes being inserted...
      if( queryLevel.nodesWouldBeInserted == 0 )
      {
        queryLevel = this.tryBuildLevel( entryLevels, entryIndex, entryId, parentTreeNode, level, newTreeNodes, true, "three" );

        // if this would result in no nodes being inserted...
        if( queryLevel.nodesWouldBeInserted == 0 )
        {
          console.log("Level: "+entryIndex+" **** PARENT RESTRICTIVE");
          // ... do the real thing with the less restrictive "parent" match
          queryLevel = this.tryBuildLevel( entryLevels, entryIndex, entryId, parentTreeNode, level, newTreeNodes, false, "parent" );
        }
        else
        {
          console.log("Level: "+entryIndex+" **** THREE RESTRICTIVE");
          queryLevel = this.tryBuildLevel( entryLevels, entryIndex, entryId, parentTreeNode, level, newTreeNodes, false, "three" );
        }
      }
      else
      {
        console.log("Level: "+entryIndex+" **** TOTAL RESTRICTIVE");
        // ... do the real thing with the most restrictive "total" match
        queryLevel = this.tryBuildLevel( entryLevels, entryIndex, entryId, parentTreeNode, level, newTreeNodes, false, "total" );
      }
      */

      entryLevels.push( queryLevel );
      entryIndex++;
    }
  }

  // creates a depth-first, flat object of keys mapped to tree nodes, suitable for display
  // expanded tree nodes are included
  // the final array returned will not include the first (root) tree node passed in
  private recalcTreeNodesRecursive( parentTreeNode:n.TreeNode, level:number=0, newTreeNodes:n.TreeNodes ): void
  {
    //const parentNodeRefId = parentTreeNode.nodeRefId;
    const parentKey = parentTreeNode.key;
    const parentNode = this.getNode(parentTreeNode.nodeId);
    const query = this.getQuery( parentTreeNode.nodeRefId );

    // if there is a query present and it is the active document
    if( query && this.documentNodeRefId == parentTreeNode.nodeRefId )
    {
      this.recalcQueryTree( parentTreeNode, query, level, newTreeNodes );
    }
    else
    {
      let nodeSet:Set<n.NodeId> = new Set();

      for( let childRefId of parentNode.childIds )
      {
        let childRef = this.getNodeRef(childRefId);
        //console.log( "recalcTreeNodesRecursive " + (this.getNode(childRef.nodeId)).name + " "+(childRef.ghost ? "ghost" : "native" )+", -- context: " + this.debugPath( parentTreeNode.contextPath ) + ", candidate: " + this.debugPath( childRef.contextPath ) );

        // if this is at least a ghost match and not a cycle and the node is not already represented in this child list
        // why would the same node appear twice in the same child list? -- if it were a ghost "merging" into same named ghosts
        if( !childRef.queryNode &&
            this.exactMatch( childRef.contextPath, parentTreeNode.nodeIdPath ) &&
            !this.isCycle( parentTreeNode.nodeIdPath, childRef.nodeId ) &&
            !nodeSet.has( childRef.nodeId ) )
        {
          // if also a native match 
          const isGhost = !this.exactMatch( childRef.contextPath, parentTreeNode.nodeIdPath );

          const nodeIdPath = this.safePush<n.NodeId>( parentTreeNode.nodeIdPath, childRef.nodeId );
          const nodeRefIdPath = this.safePush<n.NodeRefId>( parentTreeNode.nodeRefIdPath, childRef.id );

          let childTreeNode = this.buildTreeNode( 
            parentKey, 
            childRef.nodeId, 
            childRefId,
            childRef.contextPath,
            parentTreeNode.nodeRefId,
            level, 
            isGhost,
            nodeIdPath,
            nodeRefIdPath );

          newTreeNodes[childTreeNode.key] = childTreeNode;

          //console.log( childTreeNode.name, nodeRefIdPath );

          parentTreeNode.childKeys.push( childTreeNode.key );

          nodeSet.add( childRef.nodeId );

          this.recalcTreeNodesRecursive( childTreeNode, level+1, newTreeNodes );
        }
      }
    }
  }
  
  private applicableChild( childRef:n.NodeRef, totalParentNodeIdPath:n.ContextPath )
  {
    return this.exactMatch( childRef.contextPath, totalParentNodeIdPath ) && 
    !this.isCycle( totalParentNodeIdPath, childRef.nodeId );
  }

  private safePush<T>( arr:Array<T>, elt:T ): Array<T>
  {
    let copy = arr.slice();
    copy.push(elt);
    return copy;
  }

  private debugChildIds( nodeId:n.NodeId )
  {
    const node = this.getNode( nodeId );

    for( let i=0; i<node.childIds.length; i++ )
    {
      const nodeRef = this.getNodeRef(node.childIds[i]);
      console.log( "  ", i, "["+this.getNode(nodeRef.nodeId).name+"]",this.debugRef(nodeRef) );
    }
  }

  private debugNodePath( path:Array<number> ): Array<string>
  {
    return path.map( nodeId => "["+this.getNode(nodeId).name+"]" );
  }

  private debugNodeRefPath( path:Array<number> ): Array<string>
  {
    path.forEach( nodeRefId =>
    {
      if( this.getNodeRef(nodeRefId) == null )
      {
        console.log( "BAD GUNKY!!",nodeRefId );
      }
    });

    return path.map( nodeRefId => "["+this.getNode(this.getNodeRef(nodeRefId).nodeId).name+"]" );
  }

  private debugRef( ref:n.NodeRef ): Array<string>
  {
    if( ref == null ) return ["null"];

    return this.getTotalPath(ref).map( nodeId => "["+this.getNode(nodeId).name+"]" );
  }

  private isCycle( parentNodeIdPath:Array<n.NodeId>, childNodeId:n.NodeId ) 
  {
    return parentNodeIdPath.includes( childNodeId );
  }

  private inCommon( list1:Array<n.NodeId>, list2:Array<n.NodeId>, min:number )
  {
    let intersection = list1.filter( nodeId => list2.includes(nodeId) );

    if( intersection.length >= min )
      return true;
  }

  // returns true if the parentNodeId is an ancestor
  private contextMatch( totalPathOfCandidate:Array<n.NodeId>, minCommonNodes:number ): boolean
  {
    // all nodes match when directly under a document or view
    if( this.isDoc( this.getParentOfTotalPath(totalPathOfCandidate) ) )
    {
      return true;
    }

    //const candidateNodeId = totalPathOfCandidate[totalPathOfCandidate.length-1];
    const relativeCandidatePath = this.relativePath( totalPathOfCandidate );
    //const limitedCandidatePath = relativeCandidatePath.slice( -minCommonNodes );
    const candidateNodeId = this.last(totalPathOfCandidate);

    // a direct relationship exists if a context path exists where both the candidate and parent are present
    const foundNodeRef = this.findNodeRef( nodeRef => {
      const relativePath = this.relativePath(this.getTotalPath(nodeRef));
      //const limitedPath = relativePath.slice( -minCommonNodes );

      if( !nodeRef.queryNode && 
          relativePath.includes(candidateNodeId) && 
          this.inCommon( relativePath, relativeCandidatePath, minCommonNodes ) )
      {
        return true;
        /*
        let match = true;
        //console.log( "candidate",this.debugNodePath( limitedCandidatePath ) );
        //console.log( "context  ",this.debugNodePath( limitedPath ) );
        for( let candidateNodeId of limitedCandidatePath )
        {
          if( !limitedPath.includes(candidateNodeId) )
          {
            match = false;
            //console.log( "  context Not Match: ",this.getNode(candidateNodeId).name, this.debugNodePath(relativePath) );
            break;
          }
        }

        if( match )
        {
          //console.log( "  contextMatch: ",this.debugNodePath(relativePath) );
          return true;
        }
        */
      }

      return false;
    } );

    return foundNodeRef != undefined;
  }
/*
  // returns true if the parentNodeId is an ancestor or a descendant of the candidate node Id
  private contextMatchParent( totalPathOfCandidate:Array<n.NodeId> ): boolean
  {
    const parentNodeId = this.getParentOfTotalPath(totalPathOfCandidate);
    // all nodes match when directly under a document or view
    if( this.isDoc( parentNodeId ) )
    {
      return true;
    }

    const candidateNodeId = totalPathOfCandidate[totalPathOfCandidate.length-1];

    // a direct relationship exists if a context path exists where both the candidate and parent are present
    const foundNodeRef = this.findNodeRef( nodeRef => {
      const relativePath = this.relativePath(this.getTotalPath(nodeRef));

      if( !nodeRef.queryNode &&
          relativePath.includes(candidateNodeId) &&
          relativePath.includes(parentNodeId) )
      {
          return true;
      }

      return false;
    } );

    return foundNodeRef != undefined;
  }
*/
  private isDoc( nodeId:n.NodeId )
  {
    // all nodes match when directly under a document or view
    return -1 != this.documents.findIndex( doc => this.getNodeRef(doc.nodeRefId).nodeId == nodeId );
  }

  private getParentOfTotalPath( path:Array<n.NodeId> )
  {
    return path[path.length-2];
  }
/*

  // returns true if the parentNodeId is an ancestor or a descendant of the candidate node Id
  private contextMatchTotal( totalPathOfCandidate:Array<n.NodeId> ): boolean
  {
    // all nodes match when directly under a document or view
    if( this.isDoc( this.getParentOfTotalPath(totalPathOfCandidate) ) )
    {
      return true;
    }

    //const candidateNodeId = totalPathOfCandidate[totalPathOfCandidate.length-1];
    const relativeCandidatePath = this.relativePath( totalPathOfCandidate );

    // a direct relationship exists if a context path exists where both the candidate and parent are present
    const foundNodeRef = this.findNodeRef( nodeRef => {
      const relativePath = this.relativePath(this.getTotalPath(nodeRef));

      if( !nodeRef.queryNode )
      {
        let match = true;
        for( let candidateNodeId of relativeCandidatePath )
        {
          if( !relativePath.includes(candidateNodeId) )
          {
            match = false;
            //console.log( "  context Not Match: ",this.getNode(candidateNodeId).name, this.debugNodePath(relativePath) );
            break;
          }
        }

        if( match )
        {
          //console.log( "  contextMatch: ",this.debugNodePath(relativePath) );
          return true;
        }
      }

      return false;
    } );

    return foundNodeRef != undefined;
  }

  private isAncestor( soughtAfterNodeId:n.NodeId, startingNodeId:n.NodeId ): boolean
  {
    // for each node ref that points at the starting node
    const foundAncestor = this.findNodeRef( nodeRef => {
      if( !nodeRef.queryNode && nodeRef.nodeId == startingNodeId )
      {
        const relativePath = this.relativePath(nodeRef.contextPath);
        // examine all the elements of its context path, which represent all possible ancestors of this node
        for( let nodeId of relativePath )
        {
          if( soughtAfterNodeId == nodeId )
          {
            //console.log(  );
            return true;
          }
        }
      }
      return false;      
    } );

    return foundAncestor != undefined;
  }



  private isDescendant( soughtAfterNodeId:n.NodeId, startingNodeId:n.NodeId, searchedNodes:Set<n.NodeId>=new Set<n.NodeId>() )
  {
    const startingNode = this.getNode( startingNodeId );

    // breadth-first -- search this level first
    for( let childId of startingNode.childIds )
    {
      const childNodeRef = this.getNodeRef( childId );

      if( !childNodeRef.queryNode && 
          soughtAfterNodeId == childNodeRef.nodeId )
      {
        console.log( "     isDescendant: ",this.getNode(soughtAfterNodeId).name,"is descendant of",this.getNode(startingNodeId) )
        return true;
      }
    }

    // add this nodeId to mark it as searched
    searchedNodes.add( startingNode.id );

    // descend into the next level
    for( let childId of startingNode.childIds )
    {
      const childNodeRef = this.getNodeRef( childId );

      // if we haven't searched this child node, and it contains the sought-after nodeId, return true
      if( !searchedNodes.has( childNodeRef.nodeId ) && 
          this.isDescendant( 
            soughtAfterNodeId, 
            childNodeRef.nodeId, 
            searchedNodes ) )
      {
        return true;
      }
    }

    return false;
  }
*/

/*
  // ghostMatch is a right-wise match minus roots
  // note that the context path passed in should be a total path, 
  // including the parent considering adoption of the candidate ghost
  private ghostMatch( childContextPath:n.ContextPath, parentTotalPath:n.ContextPath ): boolean
  {
    let rootlessContext = this.relativePath(childContextPath);
    const rootlessCandidate = this.relativePath(parentTotalPath);

    //const match = this.leftwiseSubsetMatch(rootlessContext,rootlessCandidate);
    const match = this.rightwiseSubsetMatch( rootlessContext, rootlessCandidate );
    //console.log("CONTEXT  ",this.debugPath(rootlessContext));
    //console.log("CANDIDATE",this.debugPath(rootlessCandidate));
    //console.log("MATCH ",match);

    return match;
  }
  // returns true if candidate is a right-wise subset of context
  // therefore, candidate must be shorter than context
  private rightwiseSubsetMatch( context:n.ContextPath, candidate:n.ContextPath ): boolean
  {
    for(let i=candidate.length-1, j=context.length-1; i>=0 && j>=0; i--, j--)
    {
      if( candidate[i] != context[j] )
      {
        return false;
      }
    }

    return true;
  }



*/


  // strips out the first two segments of the array, which are always the dummy node, and the document
  private relativePath( path:Array<number> )
  {
    return path.slice(2);
  }  

  // returns true if all the elements of context match the same elements of candidate
  private exactMatch( context:n.ContextPath, candidate:n.ContextPath ): boolean
  {
    return NodeAction.arraysEqual(context, candidate);
    /*
    if( context.length+1 != candidate.length )
    {
        return false;
    }

    for(let i=0; i<context.length; i++)
    {
        if( context[i] != candidate[i] )
        {
          return false
        }
    }

    return true;
    */
  }


  // Returns true if candidate is equal to, or a left-to-right superset of context
  /*
      [A,B]     context
      [A,B,C]   candidate
      TRUE

      [A]       context
      [A,B,C]   candidate
      TRUE

      [A,B,C]   context
      [A,B]     candidate
      FALSE

      []        context
      [A,B,C]   candidate
      TRUE
  */
  private leftwiseMatch( context:n.ContextPath, candidate:n.ContextPath ): boolean
  {
    for(let i=0; i<context.length; i++)
    {
      if( i > candidate.length ||
          context[i] != candidate[i] )
      {
        return false;
      }
    }

    return true;
  }
/*
  private leftwiseSubsetMatch( context:n.ContextPath, candidate:n.ContextPath ): boolean
  {
    if( context.length == 0 )
      return true;

    let { contextIndex, candidateIndex } = this.leftwiseIndexOfFirstCommonElt(context,candidate);

    if( contextIndex == -1 )
      return false;

    for(let i=contextIndex, j=candidateIndex; i<context.length && j<candidate.length; i++, j++)
    {
      if( candidate[i] != context[j] )
        return false;
    }

    return true;
  }


  // Returns the index in contextPath of the first common element of the two arrays, leftwise
  private leftwiseIndexOfFirstCommonElt( contextPath:n.ContextPath, candidate:n.ContextPath ): n.IndexTuple
  {
    for(let i=0; i<contextPath.length; i++ )
    {
      for(let j=0; j<candidate.length; j++ )
      {
        if( contextPath[i] == candidate[j]  )
        {
          return { contextIndex: i, candidateIndex: j };
        }
      }
    }

    return { contextIndex: -1, candidateIndex: -1 };
  }  
*/



  private containsConcept( concepts:Array<n.Concept>, nodeId:n.NodeId )
  {
    for( let concept of concepts )
    {
      if( concept.nodeId == nodeId )
      {
        return true;
      }
    }

    return false;
  }

  private genId( collisionArray:Array<number> )
  {
    let newId;
    do { newId = Math.floor(Math.random() * (99999 - 10000 + 1)) + 10000; }
    while( collisionArray.includes( newId ) )

    return newId;
  }

  private addNewParentlessNode( overrides?:n.NodeParams ):n.Node
  {
    let collisionArray:Array<n.NodeId> = [];

    this.forEachNode( (node:n.Node) => {
      collisionArray.push(node.id);
    } );

    let newNode :n.Node = 
      { id: this.genId(collisionArray), 
        name: "", 
        showAsConcept: true,
        childIds: []
      };

    if( overrides )
      Object.assign( newNode, overrides );

    this.insertNodeAtomic( newNode );

    return newNode;
  }

  public getNode( id:n.NodeId ):n.Node
  {
    return this.nodes[id];
  }

  private moveTreeNode(treeNodeToMove:n.TreeNode, newParentTreeNode:n.TreeNode, oldParentTreeNode:n.TreeNode, absoluteIndex:number):n.NodeRef
  {
    // update this parent's context path, and all ancestor's context paths

    let treeNodeToMoveRef = this.getNodeRef( treeNodeToMove.nodeRefId );
    let newParentNodeRef = this.getNodeRef( newParentTreeNode.nodeRefId );
    let oldContextPath = treeNodeToMoveRef.contextPath;

    let isGhost = !this.exactMatch( oldParentTreeNode.nodeIdPath, oldContextPath );

    if( isGhost )
    {
      console.log("Refused to move ghost node.");
      return null;
    }

    // WHY? Unindenting a ghost node out of a ghost area can duplicate the node!
    // This is because a ghost node may actually represent many "overlapping" ghost nodes.
    // It would be very strange to unindent all of them automatically.
    let totalNewParentPath = newParentTreeNode.nodeIdPath;
    //let totalNewParentPath = isGhost ? this.getTotalPath(newParentNodeRef) : newParentTreeNode.nodeIdPath;
    let totalNodeToMovePath = this.getTotalPath(treeNodeToMoveRef);

    let newContextPath = totalNewParentPath;//newParentTreeNode.nodeIdPath
    //console.log("treeNodeToMoveRef (full)",this.debugRef(treeNodeToMoveRef));
    //console.log("newParentNodeRef (full)",this.debugRef(newParentNodeRef));
    //console.log("oldContextPath",this.debugPath(oldContextPath));
    //console.log("newContextPath",this.debugPath(newContextPath));

    let childRefsToUpdate:Array<n.NodeRef> = [];
    let allMatchie = true;

    // recalculate all matching context paths, replacing the first segment with a new segment
    this.forEachNodeRef( (nodeRef:n.NodeRef) => {

      //console.log( "leftwise match",this.debugPath(totalNodeToMovePath),this.debugPath(nodeRef.contextPath) );
      if( this.leftwiseMatch( totalNodeToMovePath, nodeRef.contextPath ) )
      {
        // copy the child ref
        let newChildRef = Object.assign({},nodeRef);
        // replace the context path with a copy we can mutate
        newChildRef.contextPath = newChildRef.contextPath.slice();

        // delete the first section (context path) of the array and replace with a new context path
        //console.log( this.getNode(nodeRef.nodeId).name,"before",this.debugPath(newChildRef.contextPath) );
        newChildRef.contextPath.splice( 0, oldContextPath.length, ...newContextPath );
        //console.log( this.getNode(nodeRef.nodeId).name,"after",this.debugPath(newChildRef.contextPath) );

        // update the child ref in the master list of nodeRefs
        childRefsToUpdate.push(newChildRef);
      }

    } );

    if( allMatchie )
    {
      childRefsToUpdate.forEach( (nodeRef) => this.updateNodeRefAtomic(nodeRef.id,nodeRef) );
    }
    else
    {
      console.log("Refused to move.");
      return null;
    }
      
 /*
    // update this parent's context path, and all ancestor's context paths
    let totalNewParentPath = this.getTotalPath(newParentNodeRef);
    let totalNodeToMovePath = this.getTotalPath(treeNodeToMoveRef);

    // recalculate all matching context paths, replacing the first segment with a new segment
    this.forEachNodeRef( (nodeRef:n.NodeRef) => {

      if( this.leftwiseCandidateMatch( totalNodeToMovePath, nodeRef.contextPath ) )
      {
        // copy the child ref
        let newChildRef = Object.assign({},nodeRef);
        // replace the context path with a copy we can mutate
        newChildRef.contextPath = newChildRef.contextPath.slice();
        // replace the first segment of the array with a new ancestor path
        newChildRef.contextPath.splice( 0, totalNodeToMovePath.length-1, ...totalNewParentPath );
        // update the child ref in the master list of nodeRefs
        this.updateNodeRefAtomic(newChildRef.id,newChildRef);
      }

    } );
    */

    let parentNode = this.getParentNode(treeNodeToMoveRef);
    //console.log("parentNode",parentNode.name);

    // NOTES: ParentNodeRef doesn't contain enough information
    // If it is a ghost, then it inherently out of context and its contextPath is wrong
    // So we need to know the REAL context path we want the new node to be placed in
    // But for that, we need more information passed into this method

    // update the context path
    let newNodeRef = this.buildNodeRef( parentNode.id, treeNodeToMoveRef.nodeId, newContextPath, treeNodeToMoveRef.id )
    //console.log("built newNodeRef",this.debugRef(newNodeRef));

    newNodeRef = this.insertChild( newParentNodeRef, absoluteIndex, newNodeRef );

    //console.log("inserted newNodeRef",this.debugRef(newNodeRef));

    // detach child from current parent
    this.removeChildId( parentNode, newNodeRef.id );

    return newNodeRef;
  }
/*
  // reassigns this node ref to point at a different (existing) nodeId
  // in the process, this function accounts for re-associating context paths of all descendants
  private mergeNode(treeNodeToMoveRef:n.NodeRef, newNodeId:n.NodeId ):void
  {
    // update this parent's context path, and all descendants's context paths
    let pathToMatch = this.getTotalPath(treeNodeToMoveRef);
    //console.log( "pathToMatch", pathToMatch );
    const newNode = this.getNode(newNodeId);
    // the length of the context path should be equal to the index of the nodeId we need to replace
    let indexToReplace = treeNodeToMoveRef.contextPath.length;

    // recalculate all matching context paths, replacing the first segment with a new segment
    this.forEachNodeRef( (nodeRef:n.NodeRef) => {

      // Returns true if nodeRef.contextPath is a left-to-right subset of pathToMatch
      if( this.leftwiseMatch( pathToMatch, nodeRef.contextPath ) )
      {
        //console.log( "   MATCHED",nodeRef.contextPath );
        // copy the child ref
        let newChildRef = Object.assign({},nodeRef);
        // replace the context path with a copy we can mutate
        newChildRef.contextPath = newChildRef.contextPath.slice();
        // replace the old node Id with the new one
        newChildRef.contextPath.splice( indexToReplace, 1, newNodeId );
        // update the child ref in the master list of nodeRefs
        this.updateNodeRefAtomic( newChildRef.id, newChildRef );

        // if the last elt of contextPath is the old nodeId, this is a direct child of treeNodeToMoveRef
        // make sure we create children in the new node for each of these
        if( this.last( newChildRef.contextPath ) == treeNodeToMoveRef.nodeId )
        {
          const newChildIds = newNode.childIds.slice();
          newChildIds.push( newChildRef.id );
          this.updateNodeAtomic( newNodeId, { childIds: newChildIds } );
        }
      }

    } );

    // repoint the actual node ref
    let updated = this.updateNodeRefAtomic( treeNodeToMoveRef.id, { nodeId: newNodeId } );

    // if the node ref already existed then we should delete this redundant node ref
    if( !updated ) this.deleteNodeRefAtomic( treeNodeToMoveRef.id );

    // finally, remove the old childId entry from the parent
    this.removeChildId( this.getParentNode(treeNodeToMoveRef), treeNodeToMoveRef.id );

  }
*/
  private wouldBeDuplicateChild( parentNode:n.Node, childRefToInsert:n.NodeRef )
  {
    return parentNode.childIds.find( (childId) => NodeAction.nodeRefsSame( this.getNodeRef( childId ), childRefToInsert ) )
  }

  // This function creates a new child at the specified index and returns a reference to the tree node
  // or adds to the end if no index is supplied. It can also insert an existing child,
  // but assumes that the descendants already have correct context paths (moveTreeNode does this)
  private insertChild(parentNodeRef:n.NodeRef, absoluteIndex:number=-1, existingChildNodeRef?:n.NodeRef, existingChildNodeId?:n.NodeId, tempNode:boolean=false, queryNode:boolean=false ):n.NodeRef
  {
    const newChildIds:Array<n.NodeRefId> = [];
    const parentNode = this.getNode( parentNodeRef.nodeId );
    const newNodeId = existingChildNodeRef ? existingChildNodeRef.nodeId : existingChildNodeId ? existingChildNodeId : this.addNewParentlessNode().id;
    let nodeRefToInsertId = existingChildNodeRef ? existingChildNodeRef.id : this.genNodeRefId();

    // the full tree node path of my parent is my context path!
    const contextPath = this.getTotalPath( parentNodeRef );

    // build the new child ref
    let childRefToInsert = existingChildNodeRef ? existingChildNodeRef : this.buildNodeRef( parentNode.id, newNodeId, contextPath, nodeRefToInsertId, queryNode );    

    // protect against functionally duplicated child ids
    const dupe = this.wouldBeDuplicateChild( parentNode, childRefToInsert );

    if( !dupe )
    {
      if( existingChildNodeRef )
        this.updateNodeRefAtomic(nodeRefToInsertId,childRefToInsert);
      else
        childRefToInsert = this.getNodeRef( this.insertNodeRefAtomic(childRefToInsert) );

          //console.log("To be inserted at",absoluteIndex);
      let insertSuccess = false;
      
      if( absoluteIndex > parentNode.childIds.length )
        throw new Error( "Cannot insert at index "+absoluteIndex+" because it's greater than node ["+parentNode.name+"]'s childId list of length "+parentNode.childIds.length );

      // rebuild the list of child ids with the new child in the correct location
      for( let i=0; i<parentNode.childIds.length; i++ ) 
      { 
        if (i === absoluteIndex)
        {
          //console.log("Inserted at (A)",absoluteIndex);
          newChildIds.push( childRefToInsert.id );
          insertSuccess = true;
        }

        newChildIds.push( parentNode.childIds[i] );
      }

      // if they did not supply an index param,
      // or it is equal to the length (should be inserted at the end)
      if( absoluteIndex == null || absoluteIndex < 0 || absoluteIndex === newChildIds.length ) 
      {
          //console.log("Inserted at (B)",absoluteIndex);
        newChildIds.push( childRefToInsert.id );
        insertSuccess = true;
      }

      if( !insertSuccess )
        throw new Error( "Cannot insert at index "+absoluteIndex+" because it doesn't exist." );

      // stash this away if it is a temp
      if( tempNode )
      {
        if( !this.tempNodes ) this.tempNodes = [];
        this.tempNodes = this.safePush( this.tempNodes, { parentNodeId: parentNode.id, nodeId: childRefToInsert.nodeId, nodeRefId: childRefToInsert.id } );
      }

      this.updateNodeAtomic( parentNodeRef.nodeId, {childIds: newChildIds} );
      //console.log( this.debugNode(parentNodeRef.nodeId) );
    }
    else
    {
      throw new Error( "Attempt to insert duplicate child node ref: "+childRefToInsert+", node id,"+childRefToInsert.nodeId+", node name: "+this.getNode(childRefToInsert.nodeId).name );
    }

    return childRefToInsert;
  }

  private removeChildId(parent:n.Node, nodeRefIdToRemove:n.NodeRefId ): void
  {
    // filter out the nodeRefId to remove...
    let newChildIds = parent.childIds.filter( 
      (childId:n.NodeRefId)=> childId != nodeRefIdToRemove );

    this.updateNodeAtomic( parent.id, {childIds: newChildIds} );
  }
/*
  private removeChildIds(parent:n.Node, nodeRefIdsToRemove:Array<n.NodeRefId> ): void
  {
    // query out the nodeRefId to remove...
    let newChildIds = parent.childIds.filter( 
      (childId:n.NodeRefId)=> !nodeRefIdsToRemove.includes(childId) );

    this.updateNodeAtomic( parent.id, {childIds: newChildIds} );
  }
*/
  private getParentTreeNode( key:n.TreeNodeKey ):n.TreeNode
  {
    let treeNode = this.getTreeNode( key );
    return this.getTreeNode( treeNode.parentKey );
  }

  private getParentNode(treeNodePointer:n.TreeNodePointer):n.Node
  {
    return this.getNode( this.last( treeNodePointer.contextPath ) );
  }

  private deleteNodeIfOrphaned( nodeId:n.NodeId ): boolean
  {
    let hasReferences = false;

    // check for references to the node
    this.forEachNodeRef( (nodeRef:n.NodeRef) => {
      if( nodeRef.nodeId == nodeId )
      {
        // this node has at least one reference
        hasReferences = true;
        return;
      }
    });

    if( !hasReferences )
    {
      this.deleteNodeAtomic(nodeId);
      return true; // we deleted a node
    }

    return false; // we didn't delete a node
  }
/*
  // gets the relative index of the given tree node child, with respect to only visible child tree nodes
  private relativeIndexOfChildTreeNode(treeNode:n.TreeNode, parentTreeNode:n.TreeNode): number
  {
    for (let i=0; i<parentTreeNode.childKeys.length; i++) 
    {
      let childTreeNode = this.getTreeNode(parentTreeNode.childKeys[i]);

      if ( childTreeNode.key == treeNode.key )
        return i;
    }

    return -1;
  }
*/
  // gets the absolute index of the given tree node child, with respect to ALL child nodes, visible or not
  private absoluteIndexOfChildTreeNode(childNodeRefId:n.NodeRefId, parentNodeId:n.NodeId): number
  {
    const parentNode = this.getNode(parentNodeId);
    return parentNode.childIds.indexOf(childNodeRefId);
  }

  private deleteNodeRefRecursive( nodeRefId:n.NodeRefId )
  {
    const nodeRef = this.getNodeRef( nodeRefId );
    let nodeRefsToDelete:n.NodeRefs = {};
    // delete all treenode refs below this one
    // this should include the one passed in, thus deleting it and its associated node, if orphaned
    this.forEachNodeRef( (candidateNodeRef:n.NodeRef)=> {
      if( this.leftwiseMatch( this.getTotalPath(nodeRef), this.getTotalPath(candidateNodeRef) ) )
      {
        nodeRefsToDelete[candidateNodeRef.id] = candidateNodeRef;
      }
    });

    // we make a copy of this array since we will be modifying the underlying this.nodes array
    const allNodes = Object.keys(this.nodes).map( (nodeId:(string)) => this.nodes[Number.parseInt(nodeId)]);

    for( let node of allNodes )
    {
      for( let childId of node.childIds )
      {
        if( nodeRefsToDelete[childId] )
        {
          this.removeChildId( node, childId );
        }
      }
    }

    // delete all referenced tree node refs
    for( let nodeRefId in nodeRefsToDelete )
    {
      if( nodeRefsToDelete.hasOwnProperty(nodeRefId) )
      {
        let nodeRefToDelete = nodeRefsToDelete[nodeRefId];
             
        this.deleteNodeRefAtomic(nodeRefToDelete.id);
        this.deleteNodeIfOrphaned(nodeRefToDelete.nodeId);
      }
    }
    
  }

  // ========================================================================================
  // =====  CRUD OPERATIONS                                                            ======
  // ========================================================================================

  // --- Node Refs ---

  private genNodeRefId()
  {
    // create a collisionArray of all current nodeRefIds
    let collisionArray:Array<n.NodeRefId> = [];

    for( let nodeRefId in this.nodeRefs )
    {
      let nodeRef = this.nodeRefs[nodeRefId];
      if( this.nodeRefs.hasOwnProperty(nodeRefId) )
        collisionArray.push(nodeRef.id);
    }

    // generate a new id
    return this.genId(collisionArray);    
  }


  private buildNodeRef( parentNodeId:n.NodeId, nodeId:n.NodeId, contextPath:n.ContextPath, id?:n.NodeRefId, queryNode:boolean=false): n.NodeRef
  {
    return {
      id: id ? id : this.genNodeRefId(),
      parentNodeId: parentNodeId,
      nodeId: nodeId,
      contextPath: contextPath,
      queryNode: queryNode };
  }

  private insertNodeRefAtomic( nodeRef:n.NodeRef ): n.NodeRefId
  {
    let newNodeRefs = Object.assign({},this.nodeRefs);

    let nodeRefId = this.findEquivNodeRef( nodeRef );

    // don't allow duplicates
    if( nodeRefId == null )
    {
      newNodeRefs[ nodeRef.id ] = nodeRef;
      this.nodeRefs = newNodeRefs;
      nodeRefId = nodeRef.id;
    }

    // stash this away if it is a query node
    if( nodeRef.queryNode )
    {
      this.queryNodes = this.safePush( this.queryNodes, { parentNodeId: nodeRef.parentNodeId, nodeId: nodeRef.nodeId, nodeRefId: nodeRef.id } );
    }

    return nodeRefId;
  }

  // returns true if the operation succeeded, false if it failed due to the nodeRef already existing
  private updateNodeRefAtomic( id:n.NodeRefId, updates:n.NodeRefParams ): boolean
  {
    // update nodeRef
    let newNodeRefs = Object.assign({},this.nodeRefs);
    let existingNodeRef = this.nodeRefs[ id ];

    if( existingNodeRef == null ) throw new Error("Could not find nodeRefId "+id+" to update.");

    let newNodeRef = Object.assign({},existingNodeRef,updates);

    // don't allow duplicates
    if( this.findEquivNodeRef( newNodeRef ) == null )
    {
      newNodeRefs[ id ] = newNodeRef;
      this.nodeRefs = newNodeRefs;
      return true;
    }

    return false;
  }

  /*
  private updateNodeRefFunc( id:n.NodeRefId, updates:n.NodeRefParams ): n.NodeRefs
  {
    // update nodeRef
    let newNodeRefs = Object.assign({},this.nodeRefs);
    let existingNodeRef = this.nodeRefs[ id ];

    if( existingNodeRef == null ) throw new Error("Could not find nodeRefId "+id+" to update.");

    let newNodeRef = Object.assign({},existingNodeRef,updates);

    // don't allow duplicates
    if( this.findEquivNodeRef( newNodeRef ) == null )
    {
      newNodeRefs[ id ] = newNodeRef;
    }

    return newNodeRefs;
  } 
  */ 

  private deleteNodeRefAtomic(idToDelete:n.NodeId): void
  {
    let newNodeRefs:n.NodeRefs = {};
    this.forEachNodeRef( (nodeRef:n.NodeRef) => {
      if( nodeRef.id != idToDelete )
        newNodeRefs[nodeRef.id] = nodeRef; 
    });

    this.nodeRefs = newNodeRefs;
  }

  // --- Nodes ---

  private insertNodeAtomic( newNode:n.Node )
  {
    let newNodes:n.Nodes = {};
    newNodes[ newNode.id ] = newNode;
    this.nodes = Object.assign({},this.nodes,newNodes);
  }

  private updateNodeAtomic(id:n.NodeId, updates:n.NodeParams): void
  {
    this.nodes = this.updateNodeFunc( Object.assign({},this.nodes), id, updates );
  }

  private updateNodeFunc(nodesCopy:n.Nodes, nodeId:n.NodeId, updates:n.NodeParams): n.Nodes
  {
    let existingNode = nodesCopy[ nodeId ];
    let newNode = Object.assign({}, existingNode, updates );
    nodesCopy[ nodeId ] = newNode;
    return nodesCopy;
  }

  private deleteNodeAtomic(idToDelete:n.NodeId): void
  {
    let newNodes:n.Nodes = {};
    this.forEachNode( (node:n.Node) => {
      if( node.id != idToDelete )
        newNodes[node.id] = node; 
    });

    this.nodes = newNodes;
  }  

  // -- Tree Node Methods --

  private getTreeNode( key:n.TreeNodeKey ):n.TreeNode
  {
    return this.treeNodes[key];
  }

  // 123 -> "N,123"
  public static nodeRefIdPathToKey( totalNodeRefIdPath:Array<n.NodeRefId> ):n.TreeNodeKey
  {
    return "N," + totalNodeRefIdPath.map(String).join(",");
  }

  private buildKey( parentTreeNodeKey:n.TreeNodeKey, childNodeRefId:n.NodeRefId )
  {
    return parentTreeNodeKey + "," + childNodeRefId;
  }

/*
  // "N,123" -> 123
  public static keyToRefId( key:n.TreeNodeKey ):n.NodeRefId
  {
    return Number.parseInt(key.split(",")[1]);
  }
*/
  private getTreeNodeMeta(key:n.TreeNodeKey):n.TreeNodeMeta
  {
    let existingTreeNodeMeta = this.treeNodeMetas[ key ];
    if(!existingTreeNodeMeta) existingTreeNodeMeta = { key:key, expanded:true };
    return existingTreeNodeMeta;
  }

  private updateTreeNodeMeta(key:n.TreeNodeKey, updates:n.TreeNodeMetaParams): void
  {
    let newTreeNodeMetas = Object.assign({},this.treeNodeMetas);
    let existingTreeNodeMeta = this.getTreeNodeMeta(key);

    let newTreeNodeMeta = Object.assign( {}, existingTreeNodeMeta, updates );

    newTreeNodeMetas[ key ] = newTreeNodeMeta;
    this.treeNodeMetas = newTreeNodeMetas;
  }

  private deleteTreeNodeMetasAtomic(keysToDelete:Array<n.TreeNodeKey>): void
  {
    let newTreeNodeMetas:n.TreeNodeMetas = {};
    this.forEachTreeNodeMeta( (treeNodeMeta:n.TreeNodeMeta) => {
      if( !keysToDelete.includes( treeNodeMeta.key ) )
        newTreeNodeMetas[treeNodeMeta.key] = treeNodeMeta; 
    });

    this.treeNodeMetas = newTreeNodeMetas;
  }


  // --- Query Entries ---

  private genQueryEntryId()
  {
    // generate a new id
    return this.genId( this.queryEntries ? Object.keys(this.queryEntries).map(parseInt) : [] );    
  }

  private insertQueryEntryAtomic( newQueryEntry:n.QueryEntry )
  {
    let newEntries:n.QueryEntries = {};
    newEntries[ newQueryEntry.id ] = newQueryEntry;
    this.queryEntries = Object.assign({},this.queryEntries,newEntries);
  }
/*
  private updateQueryEntryAtomic( id:n.QueryEntryId, updates:n.QueryEntryParams ): void
  {
    let newEntries:n.QueryEntries = {};

    let existingEntry = this.queryEntries[ id ];
    let newEntry = Object.assign({}, existingEntry, updates );
    newEntries[ id ] = newEntry;

    this.queryEntries = Object.assign({},this.queryEntries,newEntries);
  }
*/
  // consider https://facebook.github.io/immutable-js/
  
  private deleteQueryEntryAtomic(idToDelete:n.QueryEntryId): void
  {
    this.queryEntries = 
      Object.keys(this.queryEntries).reduce((newEntries:n.QueryEntries, id) => {
        if( parseInt(id) !== idToDelete )
          newEntries[parseInt(id)] = this.queryEntries[parseInt(id)];

        return newEntries;
      }, {});
  }

}
