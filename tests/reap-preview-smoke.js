// Keep the existing test entrypoint focused on the current sprite integration.
(function(){
    const source=new URL(document.currentScript.src),script=document.createElement('script');
    script.src=new URL('reap-local-file-smoke.js'+source.search,source).href;
    document.body.append(script);
}());
