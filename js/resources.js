(function(){
    'use strict';
    // Normal spending lives here. Developer bypasses exist only in the optional
    // module: saved flags alone must never authorize a bypass in the main game.
    const bypass=profile=>window.DeveloperTools?.allows('resources',profile)===true;
    const valid=costs=>costs&&Object.values(costs).every(amount=>Number.isFinite(amount)&&amount>=0);
    function canSpend(profile,costs,balances=profile.materials){
        return Boolean(valid(costs)&&(bypass(profile)||Object.entries(costs).every(([id,amount])=>(id==='gold'?profile.gold:balances?.[id]||0)>=amount)));
    }
    function spend(profile,costs,balances=profile.materials){
        if(!canSpend(profile,costs,balances))return false;
        if(!bypass(profile))for(const [id,amount]of Object.entries(costs)){
            if(id==='gold')profile.gold-=amount;else balances[id]=(balances[id]||0)-amount;
        }
        return true;
    }
    function payment(profile,costs){
        const copy={...profile,materials:{...profile.materials}};
        if(!spend(copy,costs))return null;
        return {gold:copy.gold,materials:copy.materials};
    }
    window.GameResources={canSpend,spend,payment};
}());
