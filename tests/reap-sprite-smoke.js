// Legacy test entrypoint now validates the sixteen-frame, two-layer component.
(function(){
    const source=new URL(document.currentScript.src),script=document.createElement('script');
    script.src=new URL('scythe-reap-smoke.js'+source.search,source).href;
    document.body.append(script);
}());
