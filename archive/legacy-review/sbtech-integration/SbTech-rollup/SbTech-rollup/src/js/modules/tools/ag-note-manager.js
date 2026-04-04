import { generateSBToken } from '../utils/generateSbToken.js';
import { agHttpRequestT } from '../utils/agHttpRequest';

function AgNoteManager(){
  function addNote(note){
    return new Promise(function(resolve,reject){
      if(typeof note === 'string'){
        generateSBToken.onceToken().then(function(token){
          let data = {sb_token: decodeURIComponent(token), note: note };
          let payload = JSON.stringify(data);
          return agHttpRequestT('POST', 'https://api.rewardsmatrix.com/pc/atm/add_note', true, payload).then(function (response) {
            console.log(response);
            resolve(response);
          });
        })
      } else {
        reject( new Error('note must be of type: string'));
      }
    })
  }
  return{
    add: addNote
  }
}
export const agNoteManager = AgNoteManager();
