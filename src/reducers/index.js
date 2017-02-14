import { combineReducers } from "redux";
import { routerReducer } from "react-router-redux";
import { reducer as formReducer } from "redux-form";
import nodeReducer from "./nodeReducer";
import focusReducer from "./focusReducer";
import senseReducer from "./senseReducer";
import conceptReducer from "./conceptReducer";
import rootReducer from "./rootReducer";
import undoable from 'redux-undo';


// main reducers
export const reducers = combineReducers({
  routing: routerReducer,
  focus: focusReducer,
  sense: senseReducer,
  root: rootReducer,
  conceptModel: conceptReducer,
  nodeModel: undoable(nodeReducer, 
  {
    filter: function filterActions(action, currentState, previousHistory) 
    {
      return action.type.endsWith("_UNDOABLE");
    }
  })
});

