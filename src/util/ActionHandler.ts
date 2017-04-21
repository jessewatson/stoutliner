import * as nodes from "../types/nodes";
import { NodeAction, BaseAction } from "../util";
import NodeModelAPI from "../api/NodeModelAPI";
import { store } from "../store";

export type NodeActionFunction = (nodeAction:NodeAction) => any;
export type BaseActionFunction = (baseAction:BaseAction) => any;

export default class ActionHandler
{
  private static dispatchedFuncMap:Map<string,string> = new Map<string,string>();

  public static nodeAction( func:NodeActionFunction, updateTree:boolean=false, performSave:boolean=false, undoable:boolean=false )
  {
    let type = func.toString();

    if( undoable ) type+= "_UNDOABLE";

    // get the nodeTreeRevision out of the state
    let nodeTreeRevision = (store.getState() as nodes.NodeModelState).nodeModel.present.nodeTreeRevision;

    if( nodeTreeRevision === undefined ) 
      nodeTreeRevision = 0;
    else if( updateTree )
      nodeTreeRevision++;

    let dispatchObj = {
        type: type,
        actualFunc: func,
        performSave: performSave,
        nodeTreeRevision: nodeTreeRevision
    };

    ActionHandler.doDispatch("node",type,dispatchObj);
  }

  public static nodeReducer( nodeModel:nodes.NodeModel, action:any ): nodes.NodeModelParams
  {
    const func = action.actualFunc;

    // if this is the action we ourselves just launched from the nodeAction method
    if( ActionHandler.dispatchedFuncMap.get("node") == action.type )
    {
      // call the function with a new NodeAction as a parameter
      const nodeAction = new NodeAction( nodeModel )
      // inject the dependency
      func.apply( null, [nodeAction] );
      // pull the altered nodeModel out of nodeAction
      nodeModel = nodeAction.nodeModel;
      // update remaining state items
      nodeModel.nodeTreeRevision = action.nodeTreeRevision;

      if( action.performSave )
      {
        NodeModelAPI.saveNodeModel( nodeModel );
      }
    }

    if( nodeModel == undefined )
      return {};

    return nodeModel;
  }

  public static baseAction( func:BaseActionFunction )
  {
    let type = func.toString();
    
    // build the real dispatch object
    let dispatchObj = {
        type: type,
        actualFunc: func
    };

    ActionHandler.doDispatch("base",type,dispatchObj);
  }

  public static baseReducer( base:nodes.BaseModel={ senses:{} }, action:any ): nodes.BaseModel
  {
    const func = action.actualFunc;

    // if this is the action we ourselves just launched from the baseAction method
    if( ActionHandler.dispatchedFuncMap.get("base") == action.type )
    {
      // call the function with a new BaseAction as a parameter
      const baseAction = new BaseAction( base );
      // inject the dependency
      func.apply( null, [baseAction] );
      // pull the altered base out of baseAction
      base = baseAction.base;
    }

    return base;
  }

  private static doDispatch(actionType:string, funcName:string, dispatchObj:any)
  {
    ActionHandler.dispatchedFuncMap.set(actionType, funcName);
    store.dispatch(dispatchObj);
    ActionHandler.dispatchedFuncMap.delete(actionType);

  }


}

