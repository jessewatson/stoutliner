import NodeUtil from "../util/NodeUtil";

// focus reducer
export default function focusReducer(focus = {}, action) {
  switch (action.type) 
  {
    case 'FOCUS_SET_SAVE':
      return Object.assign( {}, focus, 
        {
          focusedNodeId: action.focusedNodeId,
          inputOffset: action.inputOffset,
          cursorOffset: action.cursorOffset,
          cursorPosition: action.cursorPosition
        } );

    // initial focus
    default:
      return focus;
  }
}
