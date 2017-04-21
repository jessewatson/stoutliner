import { combineReducers } from "redux";
import { routerReducer } from "react-router-redux";
import { reducer as formReducer } from "redux-form";
//import nodeReducer from "./nodeReducer";
//import baseReducer from "./baseReducer";
//import senseReducer from "./senseReducer";
import undoable from 'redux-undo';
import ActionHandler from "../util/ActionHandler";

// main reducers
export const reducers = combineReducers({
  routing: routerReducer,
  base: ActionHandler.baseReducer,
  nodeModel: undoable( ActionHandler.nodeReducer, 
  {
    query: function queryActions(action, currentState, previousHistory) 
    {
      let undoable = action.type.endsWith("_UNDOABLE")

      return action.type.endsWith("_UNDOABLE");
    }
  })
});

