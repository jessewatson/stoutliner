
export type NodeId = number;
export type NodeRefId = number;
export type TreeNodeKey = string;

export interface IdleCallable {
  requestIdleCallback(args:any): void;
}

export interface NodeParams
{
  id?: NodeId;
  name?: string;
  draftName?: string;
  showAsConcept?: boolean;
  childIds?: Array<NodeRefId>;
}

export interface Node 
{
  id: NodeId;
  name: string;
  draftName?: string;
  showAsConcept: boolean;
  childIds: Array<NodeRefId>;
}

export interface InsertionZone
{
  startIndex:number;
  endIndex:number;
}

export interface TreeNode extends TreeNodePointer
{
  readonly nodeRefId:NodeRefId;
  readonly nodeId:NodeId;
  readonly nodeIdPath:Array<NodeId>;
  readonly nodeRefIdPath:Array<NodeRefId>;
  readonly contextPath:ContextPath;
  readonly parentNodeRefId:NodeRefId;
  readonly parentKey:TreeNodeKey;
  readonly name:string;
  childKeys: Array<TreeNodeKey>;
  readonly level:number;
  readonly key:string;
  readonly ghost:boolean;
  readonly expanded:boolean;
}

export interface TreeNodeMeta
{
  key:string;
  expanded:boolean;
  draftName?:string;
  updatingNodeName?:boolean;
}

export interface TreeNodeMetaParams
{
  key?:string;
  expanded?:boolean;
  draftName?:string;
  updatingNodeName?:boolean;
}

export interface TreeNodePointer
{
  nodeId:NodeId;
  contextPath:ContextPath;
}

export interface NodeRef extends TreeNodePointer
{
  id:NodeRefId;
  parentNodeId:NodeId;
  nodeId:NodeId;
  contextPath:ContextPath;
  queryNode: boolean;
}

export interface NodeRefParams
{
  id?:NodeRefId;
  parentNodeId?:NodeId;
  nodeId?:NodeId;
  contextPath?:ContextPath;
  queryNode?: boolean;
}

export type ContextPath = Array<NodeId>;

export interface Concept 
{
  nodeId: NodeId;
  name: string;
  //type: "auto" | "sticky" | "hidden"
}

export interface Nodes
{
  [nodeId: number]: Node;
}

export interface NodeRefs
{
  [nodeRefId: number]: NodeRef;
}

export interface TreeNodes
{
  [treeNodeKey: string]: TreeNode;
}

export interface TreeNodeMetas
{
  [treeNodeKey: string]: TreeNodeMeta;
}


export interface NodeModel 
{
  documentNodeRefId: NodeRefId;
  nodes: Nodes;
  nodeRefs: NodeRefs;
  concepts?: Array<Concept>;
  nodeTreeRevision?: number;
  treeNodes: TreeNodes;
  treeNodeMetas: TreeNodeMetas;
  queryEntries: QueryEntries;
  focus: Focus;
  docTreeNodes: Array<TreeNode>;
  tempNodes?: Array<TempNode>;
  queryResultNodes?: Array<QueryResultNode>;
  documents: Array<Document>;
}

export interface NodeModelParams
{
  documentNodeRefId?: NodeRefId;
  nodes?: Nodes;
  nodeRefs?: NodeRefs;
  concepts?: Array<Concept>;
  nodeTreeRevision?: number;
  treeNodes?: TreeNodes;
  treeNodeMetas?: TreeNodeMetas;
  queryEntries?: QueryEntries;
  focus?: Focus;
  docTreeNodes?: Array<TreeNode>;
  tempNodes?: Array<TempNode>;
  queryResultNodes?: Array<QueryResultNode>;
  documents?: Array<Document>;
}

export interface TempNode
{
  nodeId: NodeId;
  nodeRefId: NodeRefId;
  parentNodeId: NodeId;
}

export interface NodeModelState
{
  base:BaseModel;
  nodeModel:NodeModelSnapshots;
  nodeTreeRevision: number;
}

export interface Document
{
  nodeRefId:NodeRefId;
  isView:boolean;
  query?:Query;
}

export interface DocumentParams
{
  name?:string;
  nodeRefId?:NodeRefId;
  isView?:boolean;
  query?:Query;
}

export interface BaseModel
{
  projects:Projects;
}

export interface Projects 
{
  [id: number]: Project;
}

export type ProjectId = number;

export interface Project
{
  id: ProjectId;
  name: string;
}

export interface NodeMatch
{
  nodeId:number;
  nodeName:string;
}

export interface NodeModelSnapshots
{
  present: NodeModel;
  past: Array<NodeModel>;
  future: Array<NodeModel>;
}

// for setting focus
export interface Focus
{
  performFocus?:boolean;
  focusedDocumentNodeRefId:NodeRefId;
  focusedTreeNodeKey:TreeNodeKey;
  lastFocusedTreeNodeKey?:TreeNodeKey;
  inputOffset?:number;
  cursorOffset?:number;
  cursorPosition?:number;
}

export interface FocusParams
{
  focusedDocumentNodeRefId?:NodeRefId;
  focusedTreeNodeKey?:TreeNodeKey;
  lastFocusedTreeNodeKey?:TreeNodeKey;
  inputOffset?:number;
  cursorOffset?:number;
  cursorPosition?:number;
}

export interface TreeNodeFunction
{
  (treeNode:TreeNode): void;
}

export interface NodeFunction
{
  (node:Node): void;
}

export interface NodeRefFunction
{
  (nodeRef:NodeRef): void;
}

export interface NodeRefSearchFunction
{
  (nodeRef:NodeRef): boolean;
}

export interface RecursiveNodeRefFunction
{
  (parentNodeRef:NodeRef, nodeRef:NodeRef, level?:number): boolean;
}

export interface TreeNodeMetaFunction
{
  (treeNodeMeta:TreeNodeMeta): void;
}

export const SHOW_OPTION = 'show';
export const SHOW_CHILDREN_OF_OPTION = 'showChildrenOf';
export const SHOW_ALL_CHILDREN_OF_OPTION = 'showAllChildrenOf';
export const HIDE_OPTION = 'hide';

export const SHOW_SELECT_OPTIONS = [
  { value: SHOW_OPTION, label: 'show' },
  { value: SHOW_CHILDREN_OF_OPTION, label: 'show first level of' },
  { value: SHOW_ALL_CHILDREN_OF_OPTION, label: 'show all levels of' },
  { value: HIDE_OPTION, label: 'hide this level' },
];

export interface QueryDryRun
{
  wouldInsert:number;
  treeNodeInserted: TreeNode;
}

export type QueryEntryId = number;

export interface QueryResultNode
{
  nodeId: NodeId;
  nodeRefId: NodeRefId;
  parentNodeId: NodeId;
}

export interface QueryLevel
{
  levelTreeNodes:Array<TreeNode>;
  nodesWouldBeInserted:number;
}

export interface Query
{
  nodeRefId:NodeRefId; // document id
  entryIds:Array<QueryEntryId>;
  entries?:Array<QueryEntry>;
}

export interface QueryEntry
{
  id:QueryEntryId;
  showSelect:string;
  conceptsToShowNodeId:NodeId;
  entryIds:Array<QueryEntryId>;
}

export interface QueryEntries
{
  [id: number]: QueryEntry;
}

export interface QueryEntryParams
{
  id?:QueryEntryId;
  showSelect?:string;
  conceptsToShowNodeId?:NodeId;
}

export interface SelectOption
{
  value:string|number; 
  label:string;
}
