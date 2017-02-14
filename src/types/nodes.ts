export type nodeTypes = "projectroot" | "mainroot" | "autoroot" | "standard";

export interface NodeParams
{
  text?: string;
  showAsConcept?: boolean;
  type?: nodeTypes;
  childIds?: Array<number>;
  expanded?: boolean;
  showRelatedChildren?: boolean;
  showRelatedTrees?: boolean;
  relatedChildOf?: number;
  relatedTreeNodeOf?: number;
  ancestorPath?:Array<string>;
}

export interface Node 
{
  id: number;
  text: string;
  showAsConcept: boolean;
  type: nodeTypes;
  childIds: Array<number>;
  expanded: boolean;
  showRelatedChildren: boolean;
  showRelatedTrees: boolean;
  relatedChildOf?: number;
  relatedTreeNodeOf?: number;
  ancestorPath?:Array<string>;
}

export interface ConceptModel
{
  conceptNames: Array<string>;
  concepts: ConceptMap;
}

export interface Concept 
{
  upperName: string; // an identifier, all uppercase
  displayName: string;
  type: "auto" | "sticky" | "hidden"
}

export interface ConceptMap
{
  [upperName: string]: Concept;
}

export interface NodeModel 
{
  nodes: Array<Node>;
  focusState?: FocusState
  nodeTreeRevision?: number;
  //nodeHash: [index: number]: Array<string>;
}

export interface FocusState
{
  focusedNodeId:number;
  cursorPosition:number;
  inputOffset:number;
}

export interface NodeModelState
{
  focus:Focus;
  nodeModel:NodeModelSnapshots
  nodeTreeRevision: number;
}

export interface NodeModelSnapshots
{
  present: NodeModel;
  past: Array<NodeModel>;
  future: Array<NodeModel>;
}

export interface Focus
{
  focusedNodeId: number,
  inputOffset?: number,
  cursorOffset?: number,
  cursorPosition?: number
}

export interface NodeEventHandler
{
  (event: any, Nodes: Node): void;
}

export interface ReturnNodeIdCallback
{
  (returnNodeId:number): void;
}
