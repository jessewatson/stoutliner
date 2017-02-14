
// sense reducer
export default function senseReducer(sense = {}, action) {
  switch (action.type) 
  {
    case 'SENSE_GET_SAVE':
      return Object.assign( {}, 
        {
          nodeId: action.nodeId,
          text: action.text,
          choices: ["foo","bar","baz"],
          visible: true,
          value: 0
        } );

    // initial sense
    default:
      return sense;
  }
}
