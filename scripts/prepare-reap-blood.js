// Run through prepare-reap-blood.ps1 with local image readback enabled.
(async function(){
    const report=document.createElement('pre');report.id='smoke-results';
    try{
        const source=new Image();await new Promise((resolve,reject)=>{source.onload=resolve;source.onerror=reject;source.src='assets/effects/blood-4x4-normalized.png';});
        const prepared=ScytheReapEffect.prepareBlood(source);
        report.textContent='SMOKE PASSED\nREAP_BLOOD_PNG='+prepared.toDataURL('image/png').split(',')[1];
    }catch(error){report.textContent='ERROR '+error.stack;}
    document.body.append(report);
}());
