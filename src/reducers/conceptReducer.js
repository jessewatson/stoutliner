import ConceptUtil from "../util/ConceptUtil";
import { store } from "../store";

// focus reducer
export default function conceptReducer(conceptModel = {}, action) {
  switch (action.type) 
  {
    case 'CONCEPTS_GET_SAVE':
      return Object.assign(
        {},
        conceptModel,
        action.conceptModel
      );

    case 'CONCEPTS_RECALCULATE_SAVE':
      return Object.assign( {}, conceptModel, 
        ConceptUtil.recalculateConcepts( store.getState().nodeModel.present.nodes, conceptModel ) );

    // initial focus
    default:
      return conceptModel;
  }
}
