import * as nodes from "../types/nodes";

// Node utility static class
export default class BaseAction 
{
  private baseModel:nodes.BaseModel;

  constructor(baseModel:nodes.BaseModel)
  {
    this.baseModel = Object.assign({},baseModel);
  }

  public get base(): nodes.BaseModel
  {
    return this.baseModel;
  }


}
