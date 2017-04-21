import * as n from "../types/nodes";

// API Base static class
export default class BaseModelAPI 
{
  // get a list of nodes
  static loadBaseModel(): n.BaseModel
  {
    let baseModel:n.BaseModel;
    
    let serializedModel = localStorage.getItem('JULIAN_BASEMODEL');

    if( serializedModel )
    {
      // load the model from local storage if present
      baseModel = JSON.parse(serializedModel);
    }
    else // otherwise set up initial node model
    {
      const project = { id: 0, name: "Unnamed Project" };

      baseModel = {
        projects: {
          0: project
        },
      };
    }

    return baseModel;
  }

  static saveBaseModel( baseModel:n.BaseModel ): void 
  {
   let extendedWindow = <n.IdleCallable> <any> window;

    extendedWindow.requestIdleCallback(() => {
      localStorage.setItem('JULIAN_BASEMODEL', 
        JSON.stringify( baseModel )
      );
    });
  }

}


