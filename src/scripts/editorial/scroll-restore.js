(function(){
  var hash=window.location.hash;
  var key="yauum:hp:scroll";
  try{
    var saved=sessionStorage.getItem(key);
    if(saved&&!hash)window.scrollTo(0,parseInt(saved,10)||0);
  }catch(_){}
  window.addEventListener("scroll",function(){
    try{sessionStorage.setItem(key,String(window.scrollY));}catch(_){}
  },{passive:true});
})();
