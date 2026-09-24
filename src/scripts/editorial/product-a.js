document.documentElement.classList.add("js");
(function(){
  var openBtn=document.querySelector("[data-menu-open]");
  var closeBtn=document.querySelector("[data-menu-close]");
  var menu=document.querySelector("[data-menu]");
  function trapTab(e,root){
    if(e.key!=="Tab")return;
    var f=root.querySelectorAll('a[href],button:not([disabled]),summary');
    if(!f.length)return;
    var first=f[0],last=f[f.length-1];
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
  }
  if(openBtn&&closeBtn&&menu){
    var setMenu=function(open){
      if(open){menu.setAttribute("data-open","");}else{menu.removeAttribute("data-open");}
      menu.setAttribute("aria-hidden",String(!open));
      openBtn.setAttribute("aria-expanded",String(open));
      document.body.style.overflow=open?"hidden":"";
      (open?closeBtn:openBtn).focus();
    };
    openBtn.addEventListener("click",function(){setMenu(true);});
    closeBtn.addEventListener("click",function(){setMenu(false);});
    menu.addEventListener("click",function(e){if(e.target.closest("a")||e.target===menu)setMenu(false);});
    document.addEventListener("keydown",function(e){
      if(menu.getAttribute("aria-hidden")==="true")return;
      if(e.key==="Escape")setMenu(false);
      trapTab(e,menu);
    });
  }

  var backTop=document.querySelector("[data-back-to-top]");
  if(backTop){
    var onScroll=function(){backTop.toggleAttribute("data-visible",window.scrollY>560);};
    window.addEventListener("scroll",onScroll,{passive:true});
    onScroll();
    backTop.addEventListener("click",function(){window.scrollTo({top:0,behavior:"smooth"});});
  }

  var reduce=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var targets=document.querySelectorAll("[data-reveal]");
  if(reduce||!("IntersectionObserver" in window)){
    targets.forEach(function(el){el.classList.add("in");});
  }else{
    var io=new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        if(en.isIntersecting){en.target.classList.add("in");io.unobserve(en.target);}
      });
    },{rootMargin:"0px 0px -8% 0px",threshold:0.08});
    targets.forEach(function(el){io.observe(el);});
  }
})();
