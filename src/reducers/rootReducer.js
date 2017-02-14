import NodeUtil from "../util/NodeUtil";

// root reducer
export default function rootReducer(root = {}, action) {
  switch (action.type) 
  {
    case 'ROOT_ESTABLISHROOT_SAVE':
      return Object.assign( {}, root, 
        {
          rootNodeId: action.rootNodeId
        } );

    // initial root
    default:
      return root;
  }
}

