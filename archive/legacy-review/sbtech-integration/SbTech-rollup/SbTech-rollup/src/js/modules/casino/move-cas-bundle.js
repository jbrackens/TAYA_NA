export function moveCasBundle(){
let casBundle = document.querySelector('link[rel="stylesheet"][href*="cas-bundle.css"');
  if(casBundle){
    let head = document.querySelector('head');
    head.insertBefore(casBundle, head.firstChild);
    console.log('moving cas-bundle');
  }
}
